import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import {
  FolderIcon,
  GlobeDownloadIcon,
  PaletteIcon,
  RefreshIcon,
  SparklesIcon,
  CheckIcon,
  InstagramIcon,
  TikTokIcon,
  TwitterXIcon,
  YouTubeIcon,
  SpotifyIcon,
  GitHubIcon,
  DiscordIcon,
  SunIcon,
  MoonIcon,
} from "./icons";
import { ACCENT_COLORS, loadSavedTheme, saveTheme } from "../utils/theme";
import type { AppThemeConfig, FolderSettings, ThemeMode } from "../types";
import { ColorWheelPicker } from "./ColorWheelPicker";
import logoImg from "../assets/logo.png";

interface SettingsPageProps {
  onShowToast: (msg: string) => void;
}

const LANGUAGES = [
  { code: "en", label: "English", tag: "EN" },
  { code: "tr", label: "Türkçe", tag: "TR" },
  { code: "de", label: "Deutsch", tag: "DE" },
  { code: "fr", label: "Français", tag: "FR" },
  { code: "es", label: "Español", tag: "ES" },
  { code: "ru", label: "Русский", tag: "RU" },
  { code: "pt", label: "Português", tag: "PT" },
  { code: "ja", label: "日本語", tag: "JA" },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast }) => {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<"appearance" | "folders" | "language" | "about">("appearance");

  const [folderSettings, setFolderSettings] = useState<FolderSettings>({});
  const [themeConfig, setThemeConfig] = useState<AppThemeConfig>(loadSavedTheme());

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const res = await invoke<FolderSettings>("get_folder_settings");
      setFolderSettings(res);
    } catch (err: any) {
      console.warn("Folder settings error:", err);
    }
  };

  const handleSelectFolder = async (key: keyof FolderSettings, title: string) => {
    try {
      const selected = await invoke<string | null>("select_folder", { title });
      if (selected) {
        const updated = { ...folderSettings, [key]: selected };
        setFolderSettings(updated);
        await invoke("save_folder_settings", { settings: updated });
        onShowToast(t("settings.folderSaved", "Klasör konumu kaydedildi!"));
      }
    } catch (err: any) {
      onShowToast(`Klasör seçilemedi: ${err?.toString()}`);
    }
  };

  const handleOpenFolder = async (path?: string | null) => {
    if (!path) return;
    try {
      await invoke("open_folder_path", { folderPath: path });
    } catch (err: any) {
      onShowToast(`Klasör açılamadı: ${err?.toString()}`);
    }
  };

  const handleResetFolders = async () => {
    try {
      const emptySettings: FolderSettings = {
        all: null,
        audio: null,
        coverArt: null,
        lyrics: null,
        universal: null,
      };
      await invoke("save_folder_settings", { settings: emptySettings });
      await loadFolders();
      onShowToast(t("settings.foldersReset", "Klasör konumları varsayılana sıfırlandı!"));
    } catch (err: any) {
      onShowToast(`Sıfırlama hatası: ${err?.toString()}`);
    }
  };

  const handleModeChange = (mode: ThemeMode) => {
    const updated = { ...themeConfig, mode };
    setThemeConfig(updated);
    saveTheme(updated);
  };

  const handleCustomColorChange = (newHex: string) => {
    const updated: AppThemeConfig = {
      ...themeConfig,
      color: newHex,
      customHex: newHex,
    };
    setThemeConfig(updated);
    saveTheme(updated);
  };

  const currentAccentHex =
    themeConfig.customHex ||
    (ACCENT_COLORS[themeConfig.color]?.hex) ||
    (typeof themeConfig.color === "string" && themeConfig.color.startsWith("#") ? themeConfig.color : "#38bdf8");

  const categories = [
    {
      id: "appearance" as const,
      label: t("settings.tabAppearance", "Görünüm"),
      Icon: PaletteIcon,
    },
    {
      id: "folders" as const,
      label: t("settings.tabFolders", "Klasörler"),
      Icon: FolderIcon,
    },
    {
      id: "language" as const,
      label: t("settings.tabLanguage", "Dil"),
      Icon: GlobeDownloadIcon,
    },
    {
      id: "about" as const,
      label: t("settings.tabAbout", "Hakkında"),
      Icon: SparklesIcon,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row items-start gap-6 w-full pb-10">
      {/* Left Sidebar: Categories Navigation matching Image 2 */}
      <aside className="w-full md:w-60 shrink-0 flex flex-col gap-2">
        <div className="px-2 py-1 mb-1">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t("nav.settings", "Settings")}
          </h1>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            {t("settings.aboutDesc", "Stüdyo ve arayüz yapılandırması")}
          </p>
        </div>

        <nav className="flex flex-col gap-1.5">
          {categories.map((cat) => {
            const Icon = cat.Icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-left text-xs transition-all ${
                  isSelected
                    ? "bg-[var(--color-app-surface-2)] text-[var(--color-text-primary)] font-semibold border border-[var(--color-app-border)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-app-surface)] hover:text-[var(--color-text-primary)] border border-transparent"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-[var(--color-accent)] text-black"
                      : "bg-[var(--color-app-surface-2)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right Content Pane matching Image 2 */}
      <section className="flex-1 flex flex-col gap-6 min-w-0">
        {/* TAB 1: APPEARANCE (Matching Image 2 & 3) */}
        {activeCategory === "appearance" && (
          <div className="flex flex-col gap-8 rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                {t("settings.appearance", "Appearance")}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {t("settings.themeModeDesc", "Arayüz temasını, vurgu rengini ve tipografiyi özelleştirin.")}
              </p>
            </div>

            {/* Subsection 1: Theme Window Mockup Cards (Light, Dark, System) */}
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t("settings.theme", "Theme")}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("settings.themeDesc", "Customize your UI theme")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* 1. Light Theme Card */}
                <div
                  onClick={() => handleModeChange("light")}
                  className={`group relative flex flex-col gap-2.5 rounded-2xl border p-3 cursor-pointer transition-all ${
                    themeConfig.mode === "light"
                      ? "border-[var(--color-accent)] bg-[var(--color-app-surface-2)] shadow-md"
                      : "border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/40 hover:border-[var(--color-accent)]/40"
                  }`}
                >
                  {/* Mini window mockup */}
                  <div className="relative h-28 w-full rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Window traffic lights */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </div>
                      {/* Mockup content lines */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-4 w-4 rounded-full bg-zinc-300" />
                        <span className="h-2 w-16 rounded bg-zinc-200" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="h-1.5 w-24 rounded bg-zinc-200" />
                        <span className="h-1.5 w-20 rounded bg-zinc-100" />
                        <span className="h-1.5 w-28 rounded bg-zinc-200" />
                      </div>
                    </div>

                    {/* Selected Check Badge */}
                    {themeConfig.mode === "light" && (
                      <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-black shadow">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {t("settings.modeLight", "Light")}
                    </span>
                    <SunIcon className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </div>

                {/* 2. Dark Theme Card */}
                <div
                  onClick={() => handleModeChange("dark")}
                  className={`group relative flex flex-col gap-2.5 rounded-2xl border p-3 cursor-pointer transition-all ${
                    themeConfig.mode === "dark"
                      ? "border-[var(--color-accent)] bg-[var(--color-app-surface-2)] shadow-md"
                      : "border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/40 hover:border-[var(--color-accent)]/40"
                  }`}
                >
                  {/* Mini window mockup */}
                  <div className="relative h-28 w-full rounded-xl border border-zinc-800 bg-[#161922] p-2.5 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Window traffic lights */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      {/* Mockup content lines */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-4 w-4 rounded-full bg-zinc-700" />
                        <span className="h-2 w-16 rounded bg-zinc-700" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="h-1.5 w-24 rounded bg-zinc-700" />
                        <span className="h-1.5 w-20 rounded bg-zinc-800" />
                        <span className="h-1.5 w-28 rounded bg-zinc-700" />
                      </div>
                    </div>

                    {/* Selected Check Badge */}
                    {themeConfig.mode === "dark" && (
                      <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-black shadow">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {t("settings.modeDark", "Dark")}
                    </span>
                    <MoonIcon className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                </div>

                {/* 3. System Theme Card */}
                <div
                  onClick={() => handleModeChange("system")}
                  className={`group relative flex flex-col gap-2.5 rounded-2xl border p-3 cursor-pointer transition-all ${
                    themeConfig.mode === "system"
                      ? "border-[var(--color-accent)] bg-[var(--color-app-surface-2)] shadow-md"
                      : "border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/40 hover:border-[var(--color-accent)]/40"
                  }`}
                >
                  {/* Mini window mockup */}
                  <div className="relative h-28 w-full rounded-xl border border-zinc-700 bg-gradient-to-r from-zinc-200 via-zinc-400 to-[#161922] p-2.5 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Window traffic lights */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      {/* Mockup content lines */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-4 w-4 rounded-full bg-zinc-600" />
                        <span className="h-2 w-16 rounded bg-zinc-600" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="h-1.5 w-24 rounded bg-zinc-600" />
                        <span className="h-1.5 w-20 rounded bg-zinc-700" />
                      </div>
                    </div>

                    {/* Selected Check Badge */}
                    {themeConfig.mode === "system" && (
                      <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-black shadow">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {t("settings.modeSystem", "System")}
                    </span>
                    <SparklesIcon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Subsection 2: Accent color (Custom Color Wheel & Swatches matching Image 3) */}
            <div className="flex flex-col gap-3 pt-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t("settings.accentColor", "Accent color")}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("settings.accentColorDesc", "Renk tekerleği üzerinden istediğiniz rengi seçin.")}
                </p>
              </div>

              {/* Color Wheel Component */}
              <div className="pt-1">
                <ColorWheelPicker
                  color={currentAccentHex}
                  onChange={handleCustomColorChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FOLDERS */}
        {activeCategory === "folders" && (
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-app-border)]">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                  {t("settings.folderPathsTitle", "İndirme & Kayıt Klasörleri")}
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {t("settings.folderPathsDesc", "Her indirme türü için hedef klasörü ayrı ayrı özelleştirebilirsiniz.")}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetFolders}
                className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                title={t("settings.foldersReset", "Varsayılana Sıfırla")}
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                <span>{t("settings.resetDefaults", "Varsayılana Sıfırla")}</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {/* Audio Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-3.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("settings.folderAudio", "Audio (MP3 / WAV)")}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] truncate max-w-md mt-0.5">
                    {folderSettings.audio || "Documents/Sophy Studio/Audio"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(folderSettings.audio)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    {t("settings.openFolder", "Aç")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectFolder(
                        "audio",
                        t("settings.dialogSelectAudioFolder", "Audio Klasörü Seç")
                      )
                    }
                    className="btn btn-primary text-xs px-3 py-1"
                  >
                    {t("settings.changeFolder", "Değiştir")}
                  </button>
                </div>
              </div>

              {/* All Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-3.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("settings.folderAll", "All (Toplu .zip Arşivleri)")}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] truncate max-w-md mt-0.5">
                    {folderSettings.all || "Documents/Sophy Studio/All"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(folderSettings.all)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    {t("settings.openFolder", "Aç")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectFolder(
                        "all",
                        t("settings.dialogSelectAllFolder", "Toplu İndirme Klasörü Seç")
                      )
                    }
                    className="btn btn-primary text-xs px-3 py-1"
                  >
                    {t("settings.changeFolder", "Değiştir")}
                  </button>
                </div>
              </div>

              {/* Cover Art Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-3.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("settings.folderCover", "Cover Art (Albüm Kapakları)")}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] truncate max-w-md mt-0.5">
                    {folderSettings.coverArt || "Documents/Sophy Studio/Cover Art"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(folderSettings.coverArt)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    {t("settings.openFolder", "Aç")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectFolder(
                        "coverArt",
                        t("settings.dialogSelectCoverFolder", "Cover Art Klasörü Seç")
                      )
                    }
                    className="btn btn-primary text-xs px-3 py-1"
                  >
                    {t("settings.changeFolder", "Değiştir")}
                  </button>
                </div>
              </div>

              {/* Lyrics Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-3.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("settings.folderLyrics", "Lyrics (Şarkı Sözleri)")}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] truncate max-w-md mt-0.5">
                    {folderSettings.lyrics || "Documents/Sophy Studio/Lyrics"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(folderSettings.lyrics)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    {t("settings.openFolder", "Aç")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectFolder(
                        "lyrics",
                        t("settings.dialogSelectLyricsFolder", "Lyrics Klasörü Seç")
                      )
                    }
                    className="btn btn-primary text-xs px-3 py-1"
                  >
                    {t("settings.changeFolder", "Değiştir")}
                  </button>
                </div>
              </div>

              {/* Universal Media Downloader Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-3.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("settings.folderUniversal", "Universal Media (Medya İndirici)")}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] truncate max-w-md mt-0.5">
                    {folderSettings.universal || "Documents/Sophy Studio/Universal Media"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenFolder(folderSettings.universal)}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    {t("settings.openFolder", "Aç")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectFolder(
                        "universal",
                        t("settings.dialogSelectUniversalFolder", "Universal Media Klasörü Seç")
                      )
                    }
                    className="btn btn-primary text-xs px-3 py-1"
                  >
                    {t("settings.changeFolder", "Değiştir")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LANGUAGE */}
        {activeCategory === "language" && (
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                {t("settings.languageTitle", "Uygulama Dili")}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {t("settings.languageDesc", "Arayüz için tercih ettiğiniz dili seçin.")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
              {LANGUAGES.map((lang) => {
                const isSelected = (i18n.language || "en").startsWith(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      try {
                        localStorage.setItem("sophy_lang", lang.code);
                      } catch {}
                    }}
                    className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-[var(--color-app-surface-2)] text-[var(--color-accent)] font-semibold shadow-sm"
                        : "border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/30 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="chip font-mono text-[10px] font-semibold">{lang.tag}</span>
                      <span className="text-xs">{lang.label}</span>
                    </div>
                    {isSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-black">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: ABOUT */}
        {activeCategory === "about" && (
          <div className="flex flex-col gap-6 rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-app-border)]">
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-app-surface-2)] to-black/70 p-1.5 shadow-xl border border-[var(--color-app-border)] overflow-hidden">
                  <img src={logoImg} alt="Sophy Studio Logo" className="h-full w-full object-contain rounded-xl" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">Sophy Studio</h2>
                    <span className="chip text-[10px] font-bold px-2 py-0.5 bg-[var(--color-accent)] text-black border-transparent">
                      v1.1
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    All-in-One Audio & Media Production Suite • by Beli!
                  </p>
                </div>
              </div>

              <span className="chip text-[11px] font-mono">Official Release</span>
            </div>

            {/* Social Media Links for Beli! */}
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">
                {t("settings.developer", "Geliştirici")} & {t("settings.socialMedia", "Sosyal Medya")} (Beli!):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a
                  href="https://www.instagram.com/umw26t/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <InstagramIcon className="h-4 w-4 shrink-0 text-pink-400" />
                  <span className="truncate">@umw26t</span>
                </a>
                <a
                  href="https://www.instagram.com/_beli26/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <InstagramIcon className="h-4 w-4 shrink-0 text-pink-400" />
                  <span className="truncate">@_beli26</span>
                </a>
                <a
                  href="https://www.tiktok.com/@belionthebeat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <TikTokIcon className="h-4 w-4 shrink-0 text-cyan-400" />
                  <span className="truncate">@belionthebeat</span>
                </a>
                <a
                  href="https://x.com/_beli26"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <TwitterXIcon className="h-4 w-4 shrink-0 text-zinc-300" />
                  <span className="truncate">@_beli26</span>
                </a>
                <a
                  href="https://www.youtube.com/@beli26"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <YouTubeIcon className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="truncate">@beli26</span>
                </a>
                <a
                  href="https://open.spotify.com/intl-tr/artist/0abGcEf1RCkROklu9iYoR7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <SpotifyIcon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="truncate">Beli! (Spotify)</span>
                </a>
                <a
                  href="https://github.com/umwt26"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <GitHubIcon className="h-4 w-4 shrink-0 text-purple-300" />
                  <span className="truncate">@umwt26</span>
                </a>
                <a
                  href="https://discord.gg/R9c7g78g"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] p-2.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all"
                >
                  <DiscordIcon className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span className="truncate">Filera Discord</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
