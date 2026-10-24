import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { CloseIcon, ChatBubbleIcon, SendIcon } from "./icons";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { t } = useTranslation();

  const [category, setCategory] = useState<string>("Hata / Sorun Bildir");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !sending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, sending]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setSending(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatusMessage(t("feedback.errEmptyMessage", "Lütfen bir mesaj veya açıklama yazın."));
      return;
    }

    setSending(true);
    setStatusMessage(null);

    try {
      const res = await invoke<string>("send_feedback", {
        category,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      if (res === "activation_needed") {
        onShowToast(t("feedback.activationSent", "Geri bildirim gönderildi! Aktivasyon maili umutszg46@gmail.com adresine iletildi."));
      } else {
        onShowToast(t("feedback.successToast", "Geri bildiriminiz başarıyla iletildi, teşekkürler!"));
      }

      // Clear and close
      setMessage("");
      onClose();
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      setStatusMessage(t("feedback.errFailed", "Gönderilemedi: ") + (err?.toString() || "Bilinmeyen hata"));
    } finally {
      setSending(false);
    }
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(
      `[Sophy Studio v1.1] ${category} - ${name || t("feedback.anonymousUser", "Kullanıcı")}`
    );
    const body = encodeURIComponent(
      `Bildirim Türü: ${category}\n` +
      `Ad Soyad: ${name}\n` +
      `E-posta: ${email}\n` +
      `Mesaj:\n${message}\n\n` +
      `--\nSophy Studio v1.1`
    );
    window.open(`mailto:umutszg46@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!sending) onClose();
        }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-6 shadow-2xl z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--color-app-border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm">
              <ChatBubbleIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                {t("feedback.title", "Geri Bildirim Gönder")}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {t("feedback.subtitle", "Fikir, öneri veya karşılaştığınız hataları doğrudan iletin.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            aria-label={t("common.close", "Kapat")}
            className="icon-btn text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
          {/* Field 1: Konu / Bildirim Türü (Dropdown) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              {t("feedback.labelType", "Konu / Bildirim Türü")}
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={sending}
                className="w-full appearance-none rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="Hata / Sorun Bildir">{t("feedback.typeBug", "Hata / Sorun Bildir")}</option>
                <option value="Öneri / Fikir">{t("feedback.typeIdea", "Öneri / Fikir")}</option>
                <option value="Diğer">{t("feedback.typeOther", "Diğer")}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[var(--color-text-secondary)]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Field 2 & 3: Ad Soyad & E-posta (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                {t("feedback.labelName", "Ad Soyad")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={sending}
                placeholder={t("feedback.placeholderName", "Örn: Jack Smith")}
                className="w-full rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                {t("feedback.labelEmail", "E-posta Adresi")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
                placeholder={t("feedback.placeholderEmail", "name@example.com")}
                className="w-full rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Field 4: Mesaj / Durum Açıklaması (Textarea) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              {t("feedback.labelMessage", "Mesaj / Durum Açıklaması")} *
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              placeholder={t("feedback.placeholderMessage", "Geri bildiriminizi, karşılaştığınız sorunu veya yeni özellik fikrinizi detaylandırın...")}
              className="w-full resize-none rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors leading-relaxed"
            />
          </div>

          {/* Error / Status Alert */}
          {statusMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {statusMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenMailto}
              className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors underline underline-offset-4"
            >
              {t("feedback.orMailto", "veya varsayılan mail uygulamasıyla gönder")}
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                disabled={sending}
                onClick={onClose}
                className="btn btn-secondary text-xs px-4 py-2 flex-1 sm:flex-initial"
              >
                {t("common.cancel", "İptal")}
              </button>

              <button
                type="submit"
                disabled={sending}
                className="btn btn-primary text-xs px-5 py-2 flex-1 sm:flex-initial flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>{t("feedback.sending", "Gönderiliyor...")}</span>
                  </>
                ) : (
                  <>
                    <SendIcon className="h-3.5 w-3.5" />
                    <span>{t("feedback.sendBtn", "Gönder")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
