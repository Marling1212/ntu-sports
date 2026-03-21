"use client";

import { useState, useMemo } from "react";
import { submitRosterChangeRequest, addCaptainBlackoutTemplate, deleteCaptainBlackoutTemplate } from "./actions";
import type { TeamMember, TeamBlackoutTemplate, EventSlotTemplate } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";

interface CaptainPortalClientProps {
  token: string;
  teamId: string;
  members: TeamMember[];
  pendingCount: number;
  captainBlackoutsOpen: boolean;
  blackoutTemplates: TeamBlackoutTemplate[];
  slotTemplates: EventSlotTemplate[];
  blackoutLimit: number | null;
}

export default function CaptainPortalClient({
  token,
  teamId,
  members,
  pendingCount,
  captainBlackoutsOpen,
  blackoutTemplates,
  slotTemplates,
  blackoutLimit,
}: CaptainPortalClientProps) {
  const { t, locale } = useI18n();
  const [addName, setAddName] = useState("");
  const [addJersey, setAddJersey] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [blackoutSubmitting, setBlackoutSubmitting] = useState(false);

  const WEEKDAY_LABELS = [
    t("admin.weekday0"),
    t("admin.weekday1"),
    t("admin.weekday2"),
    t("admin.weekday3"),
    t("admin.weekday4"),
    t("admin.weekday5"),
    t("admin.weekday6"),
  ];

  const uniqueSlotTemplatesForBlackout = useMemo(() => {
    const seen = new Set<string>();
    return slotTemplates.filter((st) => {
      const key = `${st.day_of_week},${st.start_time},${st.end_time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [slotTemplates]);

  const clearMessage = () => setMessage(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setSubmitting(true);
    setMessage(null);
    const result = await submitRosterChangeRequest(
      token,
      "add",
      { name: addName.trim(), jersey_number: addJersey.trim() ? parseInt(addJersey, 10) : undefined },
      requestedBy.trim() || undefined
    );
    setSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: t("captain.submitSuccess") });
      setAddName("");
      setAddJersey("");
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleUpdate = async (memberId: string) => {
    if (!editName.trim()) return;
    setSubmitting(true);
    setMessage(null);
    const result = await submitRosterChangeRequest(
      token,
      "update",
      { member_id: memberId, name: editName.trim(), jersey_number: editJersey.trim() ? parseInt(editJersey, 10) : undefined },
      requestedBy.trim() || undefined
    );
    setSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: t("captain.updateSuccess") });
      setEditingId(null);
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(t("captain.blackouts.confirmDeleteMember", { name }))) return;
    setSubmitting(true);
    setMessage(null);
    const result = await submitRosterChangeRequest(
      token,
      "remove",
      { member_id: memberId, name },
      requestedBy.trim() || undefined
    );
    setSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: t("captain.removeSuccess") });
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleAddBlackoutTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;
    setBlackoutSubmitting(true);
    setMessage(null);
    const result = await addCaptainBlackoutTemplate(token, selectedSlotId);
    setBlackoutSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: t("captain.blackouts.addSuccess") });
      setSelectedSlotId("");
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleDeleteBlackoutTemplate = async (id: string) => {
    if (!confirm(t("captain.blackouts.confirmDelete"))) return;
    setBlackoutSubmitting(true);
    setMessage(null);
    const result = await deleteCaptainBlackoutTemplate(token, id);
    setBlackoutSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: t("captain.blackouts.deleteSuccess") });
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const atBlackoutLimit = blackoutLimit != null && blackoutTemplates.length >= blackoutLimit;

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          {t("captain.pendingNotice", { count: String(pendingCount) })}
        </p>
      )}

      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
          <button type="button" onClick={clearMessage} className="ml-2 underline">
            {t("common.close")}
          </button>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("captain.requestAdd")}</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">{t("captain.formName")}</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-ntu-green focus:border-ntu-green"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">{t("captain.formJersey")}</label>
            <input
              type="number"
              min={0}
              value={addJersey}
              onChange={(e) => setAddJersey(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-20 focus:ring-2 focus:ring-ntu-green"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">{t("captain.formRequestedBy")}</label>
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:ring-2 focus:ring-ntu-green"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t("captain.submitting") : t("captain.submitAdd")}
          </button>
        </form>
      </section>

      {members.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("captain.requestEditRemove")}</h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                {editingId === m.id ? (
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm w-32"
                    />
                    <input
                      type="number"
                      min={0}
                      value={editJersey}
                      onChange={(e) => setEditJersey(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm w-16"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(m.id)}
                      disabled={submitting}
                      className="text-sm bg-ntu-green text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
                    >
                      {t("captain.submitEdit")}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-sm text-gray-600 hover:underline">
                      {t("captain.cancel")}
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-gray-900">
                      {m.name}
                      {m.jersey_number != null && <span className="text-gray-500 ml-1">#{m.jersey_number}</span>}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(m.id);
                          setEditName(m.name);
                          setEditJersey(m.jersey_number != null ? String(m.jersey_number) : "");
                        }}
                        className="text-sm text-ntu-green hover:underline"
                      >
                        {t("captain.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id, m.name)}
                        disabled={submitting}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        {t("captain.remove")}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {captainBlackoutsOpen && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">{t("captain.blackouts.title")}</h2>
          <p className="text-xs text-gray-500 mb-2 whitespace-pre-line">{t("captain.blackouts.description")}</p>
          <p className="text-xs text-gray-600 mb-3">
            {blackoutLimit != null
              ? t("captain.blackouts.limitCount", { limit: String(blackoutLimit), count: String(blackoutTemplates.length) })
              : t("captain.blackouts.noLimitHint")}
          </p>
          {blackoutTemplates.length > 0 && (
            <ul className="space-y-2 mb-4">
              {blackoutTemplates.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-700">
                    {WEEKDAY_LABELS[b.day_of_week]} {String(b.start_time).slice(0, 5)}–{String(b.end_time).slice(0, 5)}
                    {b.reason && <span className="text-gray-500 ml-1">（{b.reason}）</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlackoutTemplate(b.id)}
                    disabled={blackoutSubmitting}
                    className="text-red-600 hover:underline text-xs disabled:opacity-50"
                  >
                    {t("captain.blackouts.delete")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!atBlackoutLimit && uniqueSlotTemplatesForBlackout.length > 0 && (
            <form onSubmit={handleAddBlackoutTemplate} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">{t("captain.blackouts.selectSlot")}</label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[12rem] focus:ring-2 focus:ring-ntu-green"
                  required
                >
                  <option value="">{t("captain.blackouts.selectPlaceholder")}</option>
                  {uniqueSlotTemplatesForBlackout.map((st) => (
                    <option key={st.id} value={st.id}>
                      {WEEKDAY_LABELS[st.day_of_week]} {String(st.start_time).slice(0, 5)}–{String(st.end_time).slice(0, 5)}
                      {st.code ? ` (${st.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={blackoutSubmitting}
                className="bg-ntu-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {blackoutSubmitting ? t("captain.blackouts.processing") : t("captain.blackouts.add")}
              </button>
            </form>
          )}
          {uniqueSlotTemplatesForBlackout.length === 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{t("captain.blackouts.noTemplates")}</p>
          )}
        </section>
      )}
    </div>
  );
}
