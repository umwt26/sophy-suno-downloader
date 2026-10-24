import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CloseIcon,
  GlobeDownloadIcon,
  HomeIcon,
  PianoIcon,
  SettingsIcon,
  SunoIcon,
  TagIcon,
  ScissorsIcon,
  ChatBubbleIcon,
} from "./icons";
import logoImg from "../assets/logo.png";
import type { AppTab } from "../types";

interface StudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenFeedback: () => void;
}

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenFeedback,
}) => {
  const { t } = useTranslation();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tools: {
    id: AppTab;
    title: string;
    desc: string;
    Icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "home",
      title: t("nav.home", "Ana Sayfa"),
      desc: t("drawer.homeDesc", "Genel bakış ve araçlar"),
      Icon: HomeIcon,
    },
    {
      id: "suno",
      title: t("nav.suno", "Suno Downloader"),
      desc: t("drawer.sunoDesc", "320k MP3, WAV, kapak ve sözler"),
      Icon: SunoIcon,
    },
    {
      id: "universal",
      title: t("nav.universal", "Universal Downloader"),
      desc: t("drawer.universalDesc", "YouTube, Insta, TikTok MP4 & MP3"),
      Icon: GlobeDownloadIcon,
    },
    {
      id: "sample-cutter",
      title: t("nav.cutter", "Sample Kesici"),
      desc: t("drawer.cutterDesc", "8 saniyelik hassas sample kırpıcı"),
      Icon: ScissorsIcon,
    },
    {
      id: "metadata",
      title: t("nav.metadata", "Metadata Editor"),
      desc: t("drawer.metadataDesc", "ID3 etiket & albüm kapağı"),
      Icon: TagIcon,
    },
    {
      id: "detector",
      title: t("nav.detector", "Key & BPM Detect"),
      desc: t("drawer.detectorDesc", "Camelot nota ve tempo tespiti"),
      Icon: PianoIcon,
    },
    {
      id: "settings",
      title: t("nav.settings", "Ayarlar"),
      desc: t("drawer.settingsDesc", "Klasör yolları, temalar ve dil"),
      Icon: SettingsIcon,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer content */}
      <aside className="relative flex h-full w-80 max-w-[85vw] flex-col border-r border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-5 shadow-2xl z-10 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-app-border)]">
          <div className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="Sophy Studio"
              className="h-8 w-8 rounded-lg object-contain shadow-md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-[var(--color-text-primary)]">
                  Sophy Studio
                </span>
                <span className="chip text-[10px] font-mono">v1.1</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {t("app.subtitle", "Ses & Medya Araçları")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", "Kapat")}
            className="icon-btn"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tools Navigation Section */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <p className="eyebrow px-2 mb-2">{t("drawer.toolsSection", "Menü")}</p>

          <div className="flex flex-col gap-1">
            {tools.map((item) => {
              const isActive = activeTab === item.id;
              const IconComp = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={isActive ? "true" : "false"}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className="nav-item h-auto py-2.5"
                >
                  <IconComp className={isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Section - Distinct from STUDIO TOOLS */}
        <div className="pt-3 pb-2 border-t border-[var(--color-app-border)]">
          <button
            type="button"
            onClick={() => {
              onOpenFeedback();
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-xs transition-all border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/60 hover:bg-[var(--color-app-surface-2)] hover:border-[var(--color-accent)]/50 text-[var(--color-text-primary)] group shadow-sm"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-black transition-colors">
              <ChatBubbleIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-xs text-[var(--color-text-primary)]">
                {t("feedback.drawerButton", "Geri Bildirim Gönder")}
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)] truncate">
                {t("feedback.drawerSub", "Hata bildir veya öneri paylaş")}
              </span>
            </div>
          </button>
        </div>

        {/* Footer info - clean and respectful */}
        <div className="pt-4 border-t border-[var(--color-app-border)] text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
          <p className="font-medium text-[var(--color-text-primary)]">Sophy Studio</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">© 2026 Beli!</span>
        </div>
      </aside>
    </div>
  );
};
