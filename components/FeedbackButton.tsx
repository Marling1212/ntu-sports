"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { submitFeedback, type FeedbackCategory } from "@/lib/actions/submitFeedback";
import toast from "react-hot-toast";

const CATEGORIES: { value: FeedbackCategory; labelKey: string }[] = [
  { value: "general", labelKey: "feedback.categoryGeneral" },
  { value: "bug", labelKey: "feedback.categoryBug" },
  { value: "idea", labelKey: "feedback.categoryIdea" },
  { value: "design", labelKey: "feedback.categoryDesign" },
];

export default function FeedbackButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const result = await submitFeedback({
        message: message.trim(),
        category,
        email: email.trim() || undefined,
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
      });
      if (result.ok) {
        toast.success(t("feedback.success"));
        setMessage("");
        setEmail("");
        setCategory("general");
        setOpen(false);
      } else {
        toast.error(result.error || t("feedback.error"));
      }
    } catch {
      toast.error(t("feedback.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-green-100 hover:text-white transition-colors text-xs sm:text-sm underline"
        aria-label={t("footer.feedback")}
      >
        {t("footer.feedback")}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !submitting && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="feedback-title" className="text-lg font-semibold text-gray-900 mb-2">
              {t("feedback.title")}
            </h2>
            <p className="text-sm text-gray-600 mb-4">{t("feedback.description")}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="feedback-category" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("feedback.category")}
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t(c.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("feedback.messageLabel")}
                </label>
                <textarea
                  id="feedback-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("feedback.messagePlaceholder")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  maxLength={5000}
                />
              </div>
              <div>
                <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("feedback.emailPlaceholder")}
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("feedback.emailPlaceholder")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {t("feedback.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-ntu-green rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "…" : t("feedback.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
