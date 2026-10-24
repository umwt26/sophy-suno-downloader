import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type Event } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import { Header } from "./components/Header";
import { StudioDrawer } from "./components/StudioDrawer";
import { HomePage } from "./components/HomePage";
import { SunoDownloaderPage } from "./components/SunoDownloaderPage";
import { UniversalDownloaderPage } from "./components/UniversalDownloaderPage";
import { MetadataEditorPage } from "./components/MetadataEditorPage";
import { KeyBpmDetectPage } from "./components/KeyBpmDetectPage";
import { SampleCutterPage } from "./components/SampleCutterPage";
import { SettingsPage } from "./components/SettingsPage";
import { AudioFormatModal } from "./components/AudioFormatModal";
import { FeedbackModal } from "./components/FeedbackModal";
import { SunoHistoryDrawer } from "./components/SunoHistoryDrawer";
import { AdModal } from "./components/AdModal";
import { UpdateModal } from "./components/UpdateModal";
import { Toast } from "./components/Toast";
import { applyTheme, loadSavedTheme } from "./utils/theme";
import type { AppTab, AudioFormat, SongClip, SongData, UpdateInfo } from "./types";

const HISTORY_STORAGE_KEY = "sophy_search_history";

function formatDuration(sec?: number): string {
  if (sec == null || isNaN(sec)) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60}`;
}

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [song, setSong] = useState<SongData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [sunoDrawerOpen, setSunoDrawerOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Ad interstitial modal state for Suno downloads
  const [pendingSunoFormat, setPendingSunoFormat] = useState<
    "mp3" | "wav" | "cover" | "lyrics" | "all" | "original" | null
  >(null);
  const [adModalOpen, setAdModalOpen] = useState(false);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [history, setHistory] = useState<SongData[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize theme on app mount
  useEffect(() => {
    applyTheme(loadSavedTheme());
  }, []);

  // Check for updates from GitHub in the background
  useEffect(() => {
    invoke<UpdateInfo>("check_for_updates")
      .then((res) => {
        if (res && res.has_update) {
          setUpdateInfo(res);
          setUpdateModalOpen(true);
        }
      })
      .catch((e) => {
        console.debug("Update check:", e);
      });
  }, []);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load search history", e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (items: SongData[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to persist search history", e);
    }
  };

  const addToHistory = (newSong: SongData) => {
    const songId = newSong.clip?.id;
    const filtered = history.filter((item) => {
      if (songId && item.clip?.id) {
        return item.clip.id !== songId;
      }
      return item.title !== newSong.title;
    });
    const updated = [newSong, ...filtered].slice(0, 40);
    saveHistory(updated);
  };

  const handleClearHistory = () => {
    saveHistory([]);
    showToast(t("app.clearHistory", "Geçmiş temizlendi."));
  };

  const handleRemoveHistoryItem = (id: string) => {
    const updated = history.filter(
      (item, idx) => (item.clip?.id || item.title + idx) !== id
    );
    saveHistory(updated);
  };

  const handleSelectHistorySong = (selected: SongData) => {
    setSong(selected);
    setSunoDrawerOpen(false);
    setActiveTab("suno");
    showToast(`${t("app.loadSong", "Yüklendi")}: ${selected.title}`);
  };

  useEffect(() => {
    const unlisten = listen("download-status", (event: Event<string>) => {
      showToast(event.payload);
    });
    return () => {
      unlisten.then((f: () => void) => f());
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastMessage(null), 3400);
  };

  const handleFetch = async (url: string) => {
    const trimmed = url.trim();

    if (!trimmed) {
      showToast(t("app.errorEmptyLink", "Lütfen bir Suno şarkı linki girin."));
      return;
    }

    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const isSunoUrl = /suno\.(com|ai)/i.test(trimmed);
    if (!isSunoUrl && !uuidRegex.test(trimmed)) {
      showToast(t("app.errorInvalidLink", "Lütfen geçerli bir Suno şarkı linki girin."));
      return;
    }

    setLoading(true);
    setSong(null);

    try {
      const clip = await invoke<SongClip>("resolve_song", { input: trimmed });
      const mappedSong: SongData = {
        title: clip.title || "Untitled Track",
        artist: `${clip.display_name || "Unknown Artist"} ${clip.handle ? `(@${clip.handle})` : ""}`,
        duration: formatDuration(clip.duration),
        createdAt: clip.major_model_version ? clip.major_model_version.toUpperCase() : "Suno AI",
        genres: clip.tags
          ? clip.tags.split(",").map((g) => g.trim()).filter(Boolean).slice(0, 5)
          : ["AI Music"],
        coverUrl: clip.image_large_url || clip.image_url,
        lyrics: clip.prompt || "(No lyrics / Instrumental track)",
        clip,
      };
      setSong(mappedSong);
      addToHistory(mappedSong);
    } catch (err: any) {
      const errMsg = err?.toString?.() || "";
      if (errMsg.includes("404") || errMsg.toLowerCase().includes("not found")) {
        showToast(t("app.errorNotFound", "Şarkı bulunamadı. Silinmiş veya gizli olabilir."));
      } else {
        showToast(t("app.errorFetchFailed", "Şarkı bilgileri alınamadı. Bağlantıyı kontrol edin."));
      }
    } finally {
      setLoading(false);
    }
  };

  // User selects format to download -> open 5s Ad Interstitial Modal first
  const requestDownload = (format: "mp3" | "wav" | "cover" | "lyrics" | "all" | "original") => {
    if (!song) return;
    setPendingSunoFormat(format);
    setAdModalOpen(true);
  };

  const executeDownload = async (format: "mp3" | "wav" | "cover" | "lyrics" | "all" | "original") => {
    if (!song) return;

    setDownloading(true);
    try {
      const savedPath = await invoke<string>("download_media", {
        clip: song.clip,
        targetFormat: format === "original" ? "m4a" : format,
      });
      showToast(`Kaydedildi: ${savedPath.split(/[\\/]/).pop()}`);
    } catch (err: any) {
      showToast(`İndirme hatası: ${err.toString()}`);
    } finally {
      setDownloading(false);
      setPendingSunoFormat(null);
    }
  };

  const handleAudioFormatSelect = (format: AudioFormat) => {
    setAudioModalOpen(false);
    requestDownload(format);
  };

  const handleOpenFolder = async () => {
    try {
      await invoke("open_sophy_folder");
    } catch (err: any) {
      showToast(`Klasör açılamadı: ${err.toString()}`);
    }
  };

  const getFormatActionTitle = (format: string | null) => {
    if (format === "cover") return "Kapak Resmini İndir";
    if (format === "lyrics") return "Şarkı Sözlerini İndir";
    if (format === "all") return "Tümünü İndir (.zip)";
    if (format === "mp3") return "MP3 Olarak İndir (320k)";
    if (format === "wav") return "Kayıpsız WAV İndir";
    if (format === "original") return "Orijinal Ses İndir";
    return "İndirmeyi Başlat";
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--color-app-bg)] text-[var(--color-text-primary)]">
      <Header
        activeTab={activeTab}
        onOpenMenu={() => setDrawerOpen(true)}
        onNavigateHome={() => setActiveTab("home")}
        onOpenSettings={() => setActiveTab("settings")}
        updateVersion={updateInfo?.has_update ? updateInfo.latest_version : undefined}
        onOpenUpdate={() => setUpdateModalOpen(true)}
      />

      <StudioDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenFeedback={() => setFeedbackModalOpen(true)}
      />

      <main
        className="flex-1 overflow-y-scroll bg-[var(--color-app-bg)]"
        style={{ scrollbarGutter: "stable" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-5">
          {activeTab === "home" && (
            <HomePage
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenFolder={handleOpenFolder}
            />
          )}

          {activeTab === "suno" && (
            <SunoDownloaderPage
              song={song}
              loading={loading}
              downloading={downloading}
              onFetch={handleFetch}
              onAudioClick={() => setAudioModalOpen(true)}
              onCoverClick={() => requestDownload("cover")}
              onLyricsClick={() => requestDownload("lyrics")}
              onDownloadAllClick={() => requestDownload("all")}
              onOpenHistory={() => setSunoDrawerOpen(true)}
              historyCount={history.length}
            />
          )}

          {activeTab === "universal" && (
            <UniversalDownloaderPage
              onShowToast={showToast}
              onOpenFolder={handleOpenFolder}
            />
          )}

          {activeTab === "metadata" && (
            <MetadataEditorPage onShowToast={showToast} />
          )}

          {activeTab === "detector" && (
            <KeyBpmDetectPage onShowToast={showToast} />
          )}

          {activeTab === "sample-cutter" && (
            <SampleCutterPage
              onShowToast={showToast}
              onOpenFolder={handleOpenFolder}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPage onShowToast={showToast} />
          )}
        </div>
      </main>

      {audioModalOpen && (
        <AudioFormatModal
          onClose={() => setAudioModalOpen(false)}
          onSelect={handleAudioFormatSelect}
        />
      )}

      {/* User Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Suno History Slide-over Drawer (1/4 screen) */}
      <SunoHistoryDrawer
        isOpen={sunoDrawerOpen}
        onClose={() => setSunoDrawerOpen(false)}
        history={history}
        onSelectSong={handleSelectHistorySong}
        onClearHistory={handleClearHistory}
        onRemoveItem={handleRemoveHistoryItem}
      />

      {/* Action Ad Interstitial Modal with 5s countdown lock for Suno downloads */}
      {adModalOpen && pendingSunoFormat && (
        <AdModal
          actionTitle={getFormatActionTitle(pendingSunoFormat)}
          actionDesc={song?.title || "Suno şarkısı indirilmeye hazır"}
          lockSeconds={5}
          onClose={() => {
            setAdModalOpen(false);
            setPendingSunoFormat(null);
          }}
          onConfirm={() => {
            if (pendingSunoFormat) {
              executeDownload(pendingSunoFormat);
            }
          }}
        />
      )}

      {updateModalOpen && updateInfo && (
        <UpdateModal updateInfo={updateInfo} />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
