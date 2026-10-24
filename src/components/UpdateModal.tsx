import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ExternalLinkIcon,
  LoadingSpinner,
  RefreshIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "./icons";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { UpdateInfo } from "../types";

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo }) => {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenReleaseWeb = () => {
    invoke("open_url", { url: updateInfo.url }).catch(() => {
      window.open(updateInfo.url, "_blank");
    });
  };

  const handleUpdateClick = async () => {
    if (!updateInfo.download_url) {
      handleOpenReleaseWeb();
      return;
    }

    try {
      setUpdating(true);
      setErrorMsg(null);
      await invoke("install_update", { downloadUrl: updateInfo.download_url });
    } catch (err: unknown) {
      console.error("Auto update failed:", err);
      setUpdating(false);
      setErrorMsg(
        typeof err === "string"
          ? err
          : t("app.autoUpdateFailed", "Otomatik güncelleme indirilemedi.")
      );
    }
  };

  const currentVersion = updateInfo.current_version.startsWith("v")
    ? updateInfo.current_version
    : `v${updateInfo.current_version}`;
  const latestVersion = updateInfo.latest_version.startsWith("v")
    ? updateInfo.latest_version
    : `v${updateInfo.latest_version}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/95 backdrop-blur-2xl p-4 sm:p-6 md:p-10 animate-fade-in select-none">
      {/* Background ambient glow effect */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-[var(--color-accent)]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-[var(--color-accent)]/5 blur-[120px]" />

      {/* Main Fullscreen Dashboard Card */}
      <div className="relative flex h-full max-h-[820px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)]/90 shadow-2xl backdrop-blur-xl">
        {/* Top Header Section */}
        <div className="relative border-b border-[var(--color-app-border)] px-6 py-5 sm:px-8 sm:py-6 bg-gradient-to-b from-[var(--color-app-surface-2)]/60 to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 px-3 py-1 text-[11px] font-bold text-[var(--color-accent)] uppercase tracking-wider shadow-sm">
                <SparklesIcon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                {t("app.mandatoryUpdate", "Zorunlu Güncelleme")}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                <span className="chip px-2.5 py-0.5 text-[var(--color-text-secondary)]">{currentVersion}</span>
                <span className="text-[var(--color-accent)] font-bold">→</span>
                <span className="chip px-2.5 py-0.5 bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/40 font-bold">
                  {latestVersion}
                </span>
              </div>
            </div>

            <span className="chip text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase">
              Sophy Studio Desktop
            </span>
          </div>

          <h1 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t("app.updateHeaderTitle", "Yeni Sürüm Kullanıma Hazır")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
            {t(
              "app.updateHeaderDesc",
              "Sophy Studio daha yüksek kararlılık, yeni özellikler ve güvenlik iyileştirmeleriyle güncellendi. Kesintisiz deneyim için lütfen yeni sürüme geçin."
            )}
          </p>
        </div>

        {/* Release Notes Body */}
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4 sm:px-8 sm:py-5 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-app-border)]/60">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                {t("app.releaseNotes", "Yenilikler & Güncelleme Notları")}
              </h2>
            </div>
            <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
              Release {latestVersion}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/40 p-4 sm:p-5 pr-3 shadow-inner">
            {updateInfo.release_notes ? (
              <MarkdownRenderer content={updateInfo.release_notes} />
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] italic">
                {t("app.noNotesAvailable", "Bu sürüm için detaylı not bulunamadı.")}
              </p>
            )}
          </div>
        </div>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div className="mx-6 sm:mx-8 mb-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-3 animate-shake">
            <div className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              !
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-rose-200">{errorMsg}</p>
              <p className="mt-0.5 text-[11px] text-rose-300/80">
                {t("app.manualWebNotice", "Web sayfasından kurulum dosyasını doğrudan indirebilirsiniz.")}
              </p>
            </div>
          </div>
        )}

        {/* Footer & Actions */}
        <div className="border-t border-[var(--color-app-border)] bg-[var(--color-app-surface-2)]/80 px-6 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] leading-snug">
              {t(
                "app.dataGuaranteedNotice",
                "Arama geçmişiniz, stüdyo ayarlarınız ve indirilen parçalarınız güvenle korunur."
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {errorMsg ? (
              <>
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleUpdateClick}
                  className="btn btn-secondary text-xs px-4 py-2.5 flex items-center gap-1.5"
                >
                  <RefreshIcon className="h-3.5 w-3.5" />
                  <span>{t("common.retry", "Yeniden Dene")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenReleaseWeb}
                  className="btn btn-primary text-xs px-5 py-2.5 flex items-center gap-2 flex-1 sm:flex-initial"
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                  <span>{t("app.manualDownload", "Manuel İndir (Web)")}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={updating}
                onClick={handleUpdateClick}
                className="btn btn-primary w-full sm:w-auto px-8 py-3 text-sm font-bold shadow-xl shadow-[var(--color-accent-soft)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5"
              >
                {updating ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 animate-spin" />
                    <span>{t("app.downloadingUpdate", "İndiriliyor ve Hazırlanıyor...")}</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>
                      {t("app.updateNowBtn", "Hemen Güncelle")} ({latestVersion})
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
