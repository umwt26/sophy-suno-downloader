use sophy_core::{decrypt_suno_stream, fetch_song_clip, resolve_to_uuid, MediaConverter, SongClip, SophyPaths};
use tauri::Emitter;

#[tauri::command]
pub async fn resolve_song(input: String) -> Result<SongClip, String> {
    let client = reqwest::Client::new();
    let uuid = resolve_to_uuid(&client, &input).await?;
    let clip = fetch_song_clip(&client, &uuid).await?;
    Ok(clip)
}

#[tauri::command]
pub fn get_sophy_paths() -> Result<Vec<String>, String> {
    let paths = SophyPaths::init()?;
    Ok(vec![
        paths.base.to_string_lossy().to_string(),
        paths.audio.to_string_lossy().to_string(),
        paths.cover_art.to_string_lossy().to_string(),
        paths.lyrics.to_string_lossy().to_string(),
        paths.all.to_string_lossy().to_string(),
    ])
}

#[tauri::command]
pub async fn open_sophy_folder() -> Result<(), String> {
    let paths = SophyPaths::init()?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&paths.base)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = open::that(&url);
    }
    Ok(())
}


async fn obtain_clean_audio_bytes(
    client: &reqwest::Client,
    clip: &SongClip,
) -> Result<Vec<u8>, String> {
    // 1. Direct unencrypted MP3/audio candidate if available:
    if !clip.audio_url.is_empty() && !clip.audio_url.contains("forbidden") {
        if let Ok(resp) = client.get(&clip.audio_url).send().await {
            if resp.status().is_success() {
                if let Ok(b) = resp.bytes().await {
                    return Ok(b.to_vec());
                }
            }
        }
    }

    // 2. Direct cdn1 mp3 candidate:
    let cdn1_mp3 = format!("https://cdn1.suno.ai/{}.mp3", clip.id);
    if let Ok(resp) = client.get(&cdn1_mp3).send().await {
        if resp.status().is_success() {
            if let Ok(b) = resp.bytes().await {
                return Ok(b.to_vec());
            }
        }
    }

    // 3. Encrypted Cloudfront stream with Suno Mango DRM:
    let cloudfront_url = if let Some(ref fb) = clip.fallback_stream_url {
        fb.clone()
    } else {
        format!("https://d2lwuy8qc234o3.cloudfront.net/1/clip/{}.m4a", clip.id)
    };

    let resp = client
        .get(&cloudfront_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| format!("Failed to download audio stream: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("CloudFront stream returned status: {}", resp.status()));
    }

    let encrypted_bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read stream bytes: {}", e))?;

    decrypt_suno_stream(client, &clip.id, &encrypted_bytes).await
}

#[tauri::command]
pub async fn download_media(
    app: tauri::AppHandle,
    clip: SongClip,
    target_format: String, // "mp3", "wav", "cover", "lyrics", "video", "all"
) -> Result<String, String> {
    let paths = SophyPaths::init()?;
    let client = reqwest::Client::new();

    let safe_title = SophyPaths::sanitize_filename(&clip.title);
    let safe_artist = SophyPaths::sanitize_filename(&clip.display_name);
    let base_name = format!("{} - {}", safe_title, safe_artist);

    match target_format.as_str() {
        "mp3" | "wav" | "m4a" | "original" => {
            let _ = app.emit("download-status", "Downloading audio stream...");
            let clean_bytes = obtain_clean_audio_bytes(&client, &clip).await?;

            if target_format == "m4a" || target_format == "original" {
                let out_file = paths.audio.join(format!("{}.m4a", base_name));
                std::fs::write(&out_file, clean_bytes)
                    .map_err(|e| format!("Failed to save audio file: {}", e))?;
                return Ok(out_file.to_string_lossy().to_string());
            }

            let temp_input = paths.audio.join(format!("{}.m4a", clip.id));
            std::fs::write(&temp_input, clean_bytes)
                .map_err(|e| format!("Failed to write temp audio file: {}", e))?;

            if target_format == "mp3" {
                let _ = app.emit("download-status", "Converting to high quality MP3 (320kbps)...");
                let out_file = paths.audio.join(format!("{}.mp3", base_name));
                let res = MediaConverter::convert_to_mp3(&temp_input, &out_file).await;
                let _ = std::fs::remove_file(&temp_input);
                res?;
                Ok(out_file.to_string_lossy().to_string())
            } else {
                let _ = app.emit("download-status", "Converting to lossless WAV...");
                let out_file = paths.audio.join(format!("{}.wav", base_name));
                let res = MediaConverter::convert_to_wav(&temp_input, &out_file).await;
                let _ = std::fs::remove_file(&temp_input);
                res?;
                Ok(out_file.to_string_lossy().to_string())
            }
        }
        "cover" => {
            let _ = app.emit("download-status", "Downloading high resolution cover art...");
            let cover_url = if !clip.image_large_url.is_empty() {
                &clip.image_large_url
            } else {
                &clip.image_url
            };
            let resp = client
                .get(cover_url)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .send()
                .await
                .map_err(|e| format!("Failed to download cover: {}", e))?;

            if !resp.status().is_success() {
                return Err(format!("Cover server returned status: {}", resp.status()));
            }

            let bytes = resp
                .bytes()
                .await
                .map_err(|e| format!("Failed to read cover bytes: {}", e))?;

            let out_file = paths.cover_art.join(format!("{}.jpg", base_name));
            std::fs::write(&out_file, bytes)
                .map_err(|e| format!("Failed to write cover art: {}", e))?;
            Ok(out_file.to_string_lossy().to_string())
        }
        "lyrics" => {
            let _ = app.emit("download-status", "Saving lyrics...");
            let content = format!(
                "Title: {}\nArtist: {}\nModel: {}\nTags: {}\n\nLyrics / Prompt:\n{}\n",
                clip.title, clip.display_name, clip.major_model_version, clip.tags, clip.prompt
            );
            let out_file = paths.lyrics.join(format!("{}.txt", base_name));
            std::fs::write(&out_file, content)
                .map_err(|e| format!("Failed to write lyrics: {}", e))?;
            Ok(out_file.to_string_lossy().to_string())
        }
        "video" => {
            Err("Video download is no longer supported.".to_string())
        }
        "all" => {
            let _ = app.emit("download-status", "Preparing complete package (.zip)...");
            // 1. Audio MP3
            let audio_bytes = obtain_clean_audio_bytes(&client, &clip).await?;
            let temp_input = paths.all.join(format!("{}.m4a", clip.id));
            std::fs::write(&temp_input, audio_bytes).map_err(|e| e.to_string())?;
            let mp3_file = paths.all.join(format!("{}.mp3", base_name));
            MediaConverter::convert_to_mp3(&temp_input, &mp3_file).await?;
            let _ = std::fs::remove_file(&temp_input);

            // 2. Cover
            let cover_url = if !clip.image_large_url.is_empty() {
                &clip.image_large_url
            } else {
                &clip.image_url
            };
            let resp_cover = client
                .get(cover_url)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let cover_file = paths.all.join(format!("{}.jpg", base_name));
            std::fs::write(&cover_file, resp_cover.bytes().await.map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;

            // 3. Lyrics
            let lyrics_content = format!(
                "Title: {}\nArtist: {}\nModel: {}\nTags: {}\n\nLyrics / Prompt:\n{}\n",
                clip.title, clip.display_name, clip.major_model_version, clip.tags, clip.prompt
            );
            let lyrics_file = paths.all.join(format!("{}.txt", base_name));
            std::fs::write(&lyrics_file, lyrics_content).map_err(|e| e.to_string())?;

            let zip_file = paths.all.join(format!("{}.zip", base_name));
            let mp3_name = format!("{}.mp3", base_name);
            let cover_name = format!("{}.jpg", base_name);
            let lyrics_name = format!("{}.txt", base_name);

            let files_to_zip = [
                (mp3_name.as_str(), mp3_file.as_path()),
                (cover_name.as_str(), cover_file.as_path()),
                (lyrics_name.as_str(), lyrics_file.as_path()),
            ];

            sophy_core::create_all_zip(&zip_file, &files_to_zip)?;

            // Clean up individual temp files in All folder
            let _ = std::fs::remove_file(&mp3_file);
            let _ = std::fs::remove_file(&cover_file);
            let _ = std::fs::remove_file(&lyrics_file);

            Ok(zip_file.to_string_lossy().to_string())
        }
        _ => Err("Unsupported target format".to_string()),
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UpdateCheckResult {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub url: String,
    pub download_url: Option<String>,
}

fn compare_semver(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u64> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse::<u64>().ok())
            .collect()
    };

    let l = parse(latest);
    let c = parse(current);

    for (a, b) in l.iter().zip(c.iter()) {
        if a > b {
            return true;
        } else if a < b {
            return false;
        }
    }
    l.len() > c.len()
}

#[tauri::command]
pub async fn check_for_updates(repo: Option<String>) -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let client = reqwest::Client::builder()
        .user_agent(&format!("Sophy-Studio/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| e.to_string())?;

    let default_repo = "umwt26/Sophy-Studio";
    let target_repo = repo.as_deref().unwrap_or(default_repo);

    let endpoints = [
        format!("https://api.github.com/repos/{}/releases/latest", target_repo),
        format!("https://raw.githubusercontent.com/{}/main/version.json", target_repo),
    ];

    for endpoint in endpoints {
        if let Ok(resp) = client.get(&endpoint).send().await {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    let tag = json["tag_name"]
                        .as_str()
                        .or_else(|| json["version"].as_str())
                        .unwrap_or("")
                        .trim_start_matches('v')
                        .to_string();

                    if !tag.is_empty() {
                        let is_newer = compare_semver(&tag, &current_version);
                        let release_url = json["html_url"]
                            .as_str()
                            .or_else(|| json["url"].as_str())
                            .unwrap_or(&format!("https://github.com/{}/releases", target_repo))
                            .to_string();
                        let notes = json["body"].as_str().unwrap_or("").to_string();

                        let download_url = json["assets"].as_array().and_then(|arr| {
                            arr.iter().find_map(|asset| {
                                let name = asset["name"].as_str().unwrap_or("").to_lowercase();
                                if name.ends_with(".exe") {
                                    asset["browser_download_url"].as_str().map(|s| s.to_string())
                                } else {
                                    None
                                }
                            })
                        });

                        return Ok(UpdateCheckResult {
                            has_update: is_newer,
                            current_version: current_version.clone(),
                            latest_version: tag,
                            release_notes: notes,
                            url: release_url,
                            download_url,
                        });
                    }
                }
            }
        }
    }

    Ok(UpdateCheckResult {
        has_update: false,
        current_version: current_version.clone(),
        latest_version: current_version,
        release_notes: String::new(),
        url: format!("https://github.com/{}/releases", target_repo),
        download_url: None,
    })
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle, download_url: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent(&format!("Sophy-Studio/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&download_url).send().await.map_err(|e| format!("İndirme hatası: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Dosya sunucudan alınamadı: HTTP {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| format!("İndirilen veri okunamadı: {}", e))?;
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("Sophy_Studio_Update_Setup.exe");
    std::fs::write(&installer_path, bytes).map_err(|e| format!("Dosya yazılamadı: {}", e))?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        let mut cmd = std::process::Command::new(&installer_path);
        cmd.creation_flags(CREATE_NEW_PROCESS_GROUP);
        cmd.spawn().map_err(|e| format!("Kurulum sihirbazı başlatılamadı: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new(&installer_path)
            .spawn()
            .map_err(|e| format!("Kurulum başlatılamadı: {}", e))?;
    }

    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(600));
        app.exit(0);
    });

    Ok(())
}

#[tauri::command]
pub async fn read_audio_metadata(file_path: String) -> Result<sophy_core::AudioMetadata, String> {
    let path = std::path::Path::new(&file_path);
    sophy_core::MetadataManager::read_metadata(path)
}

#[tauri::command]
pub async fn save_audio_metadata(input: sophy_core::SaveMetadataInput) -> Result<(), String> {
    sophy_core::MetadataManager::save_metadata(&input)
}

#[tauri::command]
pub async fn select_audio_file() -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Audio Files", &["mp3", "wav", "flac", "m4a", "ogg", "aac"])
        .set_title("Sophy Studio - Ses Dosyası Seç")
        .pick_file()
        .await;

    Ok(file.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn select_image_file() -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Images", &["jpg", "jpeg", "png", "webp", "bmp"])
        .set_title("Sophy Studio - Kapak Görseli Seç")
        .pick_file()
        .await;

    Ok(file.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn read_file_binary(file_path: Option<String>, path: Option<String>) -> Result<Vec<u8>, String> {
    let p = file_path.or(path).ok_or_else(|| "Dosya yolu belirtilmedi".to_string())?;
    std::fs::read(&p).map_err(|e| format!("Dosya okunamadı: {}", e))
}

#[tauri::command]
pub async fn read_file_base64(file_path: Option<String>, path: Option<String>) -> Result<String, String> {
    use base64::Engine;
    let p = file_path.or(path).ok_or_else(|| "Dosya yolu belirtilmedi".to_string())?;
    let bytes = std::fs::read(&p).map_err(|e| format!("Dosya okunamadı: {}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

#[tauri::command]
pub async fn get_folder_settings() -> Result<sophy_core::FolderSettings, String> {
    let paths = SophyPaths::init()?;
    let saved = SophyPaths::load_saved_settings();
    Ok(sophy_core::FolderSettings {
        all: Some(saved.all.unwrap_or_else(|| paths.all.to_string_lossy().to_string())),
        audio: Some(saved.audio.unwrap_or_else(|| paths.audio.to_string_lossy().to_string())),
        cover_art: Some(saved.cover_art.unwrap_or_else(|| paths.cover_art.to_string_lossy().to_string())),
        lyrics: Some(saved.lyrics.unwrap_or_else(|| paths.lyrics.to_string_lossy().to_string())),
        universal: Some(saved.universal.unwrap_or_else(|| paths.universal.to_string_lossy().to_string())),
    })
}

#[tauri::command]
pub async fn save_folder_settings(settings: sophy_core::FolderSettings) -> Result<(), String> {
    SophyPaths::save_settings(&settings)?;
    let _ = SophyPaths::init();
    Ok(())
}

#[tauri::command]
pub async fn select_folder(title: Option<String>) -> Result<Option<String>, String> {
    let t = title.unwrap_or_else(|| "Sophy Studio - Klasör Seç".to_string());
    let folder = rfd::AsyncFileDialog::new()
        .set_title(&t)
        .pick_folder()
        .await;

    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn open_folder_path(folder_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&folder_path);
    if !path.exists() {
        let _ = std::fs::create_dir_all(path);
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = std::process::Command::new("explorer");
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.arg(&folder_path);
        let _ = cmd.spawn();
    }
    Ok(())
}

#[tauri::command]
pub async fn fetch_universal_media_info(url: String) -> Result<sophy_core::UniversalMediaInfo, String> {
    sophy_core::UniversalDownloader::fetch_info(&url).await
}

#[tauri::command]
pub async fn download_universal_media(
    app: tauri::AppHandle,
    url: String,
    format_type: Option<String>,
    format: Option<String>,
    custom_dir: Option<String>,
) -> Result<String, String> {
    let resolved_format = format_type
        .or(format)
        .unwrap_or_else(|| "mp4".to_string());

    let target_dir = if let Some(dir) = custom_dir.filter(|s| !s.trim().is_empty()) {
        std::path::PathBuf::from(dir)
    } else {
        let paths = SophyPaths::init()?;
        paths.universal
    };

    let _ = app.emit("download-status", "Medya indiriliyor...");
    sophy_core::UniversalDownloader::download(&url, &resolved_format, &target_dir).await
}

#[tauri::command]
pub async fn cut_audio_sample(
    app: tauri::AppHandle,
    input_path: String,
    start_sec: f64,
    duration_sec: f64,
    target_format: String, // "mp3" or "wav"
) -> Result<String, String> {
    let in_path = std::path::PathBuf::from(&input_path);
    if !in_path.exists() {
        return Err("Kaynak ses dosyası bulunamadı.".to_string());
    }

    let paths = SophyPaths::init()?;
    let file_stem = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("sample");

    let sanitized_stem = SophyPaths::sanitize_filename(file_stem);
    let start_int = (start_sec * 10.0).round() as u64;
    let ext = if target_format.to_lowercase() == "wav" { "wav" } else { "mp3" };
    let out_filename = format!("{}_sample_{}s_8s.{}", sanitized_stem, start_int as f64 / 10.0, ext);
    let out_path = paths.audio.join(out_filename);

    let _ = app.emit("download-status", "8 saniyelik sample kesiliyor...");
    MediaConverter::cut_audio_sample(&in_path, &out_path, start_sec, duration_sec, &target_format).await?;

    Ok(out_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn send_feedback(
    category: String,
    name: String,
    email: String,
    message: String,
) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Lütfen mesaj alanını doldurun.".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("HTTP istemcisi başlatılamadı: {}", e))?;

    let sender_name = if name.trim().is_empty() {
        "Anonim Kullanıcı".to_string()
    } else {
        name.trim().to_string()
    };

    let sender_email = if email.trim().is_empty() {
        "belirtilmedi@sophy.studio".to_string()
    } else {
        email.trim().to_string()
    };

    let payload = serde_json::json!({
        "_subject": format!("[Sophy Studio v1.0] {}: {}", category, sender_name),
        "Bildirim Türü": category,
        "Ad Soyad": sender_name,
        "E-posta": sender_email,
        "Mesaj": message.trim(),
        "Sürüm": "Sophy Studio v1.1 (Windows x64)",
        "_template": "table"
    });

    let resp = client
        .post("https://formsubmit.co/ajax/umutszg46@gmail.com")
        .header("User-Agent", "SophyStudio/1.1")
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .header("Origin", "https://sophy.studio")
        .header("Referer", "https://sophy.studio/feedback")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Geri bildirim sunucusuna bağlanılamadı: {}", e))?;

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Sunucu yanıtı okunamadı: {}", e))?;

    if text.contains("needs Activation") {
        Ok("activation_needed".to_string())
    } else {
        Ok("success".to_string())
    }
}

pub fn cleanup_legacy_installations() {
    #[cfg(target_os = "windows")]
    {
        // Delete legacy machine-wide shortcuts left from v0.1.0 (Public Desktop & ProgramData)
        let public_desktop = std::path::PathBuf::from(r"C:\Users\Public\Desktop");
        let _ = std::fs::remove_file(public_desktop.join("Sophy Studio.lnk"));
        let _ = std::fs::remove_file(public_desktop.join("Sophy.lnk"));

        if let Ok(program_data) = std::env::var("ProgramData") {
            let common_programs = std::path::PathBuf::from(program_data).join(r"Microsoft\Windows\Start Menu\Programs");
            let _ = std::fs::remove_file(common_programs.join("Sophy Studio.lnk"));
            let _ = std::fs::remove_file(common_programs.join("Sophy.lnk"));
        }

        // If legacy C:\Program Files\Sophy Studio\uninstall.exe exists, invoke silent uninstall
        let legacy_uninst = std::path::PathBuf::from(r"C:\Program Files\Sophy Studio\uninstall.exe");
        if legacy_uninst.exists() {
            let _ = std::process::Command::new(&legacy_uninst)
                .args(&["/S", r"_?=C:\Program Files\Sophy Studio"])
                .spawn();
        }
    }
}

