"use client";

import { useState } from "react";
import { submitRosterChangeRequest, upsertCaptainBlackout, deleteCaptainBlackout } from "./actions";
import type { TeamMember, TeamBlackout } from "@/types/database";

interface CaptainPortalClientProps {
  token: string;
  teamId: string;
  members: TeamMember[];
  pendingCount: number;
  captainBlackoutsOpen: boolean;
  blackouts: TeamBlackout[];
  blackoutLimit: number | null;
}

function formatBlackoutTime(iso: string) {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function CaptainPortalClient({
  token,
  teamId,
  members,
  pendingCount,
  captainBlackoutsOpen,
  blackouts,
  blackoutLimit,
}: CaptainPortalClientProps) {
  const [addName, setAddName] = useState("");
  const [addJersey, setAddJersey] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("");
  const [blackoutSubmitting, setBlackoutSubmitting] = useState(false);

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
      setMessage({ type: "success", text: "已送出申請，請等候管理員審核。" });
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
      setMessage({ type: "success", text: "已送出修改申請。" });
      setEditingId(null);
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`確定要申請移除「${name}」嗎？`)) return;
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
      setMessage({ type: "success", text: "已送出移除申請。" });
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleAddBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutStart.trim() || !blackoutEnd.trim()) return;
    setBlackoutSubmitting(true);
    setMessage(null);
    const result = await upsertCaptainBlackout(token, {
      start_time: blackoutStart,
      end_time: blackoutEnd,
      reason: blackoutReason.trim() || null,
    });
    setBlackoutSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: "已新增不可出賽時段。" });
      setBlackoutStart("");
      setBlackoutEnd("");
      setBlackoutReason("");
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    if (!confirm("確定要刪除此不可出賽時段？")) return;
    setBlackoutSubmitting(true);
    setMessage(null);
    const result = await deleteCaptainBlackout(token, id);
    setBlackoutSubmitting(false);
    if (result.ok) {
      setMessage({ type: "success", text: "已刪除。" });
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  const atBlackoutLimit = blackoutLimit != null && blackouts.length >= blackoutLimit;

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          目前有 {pendingCount} 筆申請審核中，請靜候管理員處理。
        </p>
      )}

      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
          <button type="button" onClick={clearMessage} className="ml-2 underline">關閉</button>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">申請新增隊員</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">姓名 *</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-ntu-green focus:border-ntu-green"
              placeholder="姓名"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">背號（選填）</label>
            <input
              type="number"
              min={0}
              value={addJersey}
              onChange={(e) => setAddJersey(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-20 focus:ring-2 focus:ring-ntu-green"
              placeholder="—"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">申請人（選填）</label>
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:ring-2 focus:ring-ntu-green"
              placeholder="您的名字"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "送出中…" : "申請新增"}
          </button>
        </form>
      </section>

      {members.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">申請編輯／移除隊員</h2>
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
                      placeholder="姓名"
                    />
                    <input
                      type="number"
                      min={0}
                      value={editJersey}
                      onChange={(e) => setEditJersey(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm w-16"
                      placeholder="背號"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(m.id)}
                      disabled={submitting}
                      className="text-sm bg-ntu-green text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
                    >
                      送出
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      取消
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
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id, m.name)}
                        disabled={submitting}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        移除
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">不可出賽時段</h2>
          <p className="text-xs text-gray-500 mb-2">
            {blackoutLimit != null
              ? `每隊最多 ${blackoutLimit} 筆，目前 ${blackouts.length} 筆。`
              : "填寫隊伍無法出賽的時段，供主辦排程參考。"}
          </p>
          {blackouts.length > 0 && (
            <ul className="space-y-2 mb-4">
              {blackouts.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-700">
                    {formatBlackoutTime(b.start_time)} ～ {formatBlackoutTime(b.end_time)}
                    {b.reason && <span className="text-gray-500 ml-1">（{b.reason}）</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlackout(b.id)}
                    disabled={blackoutSubmitting}
                    className="text-red-600 hover:underline text-xs disabled:opacity-50"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!atBlackoutLimit && (
            <form onSubmit={handleAddBlackout} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">開始</label>
                <input
                  type="datetime-local"
                  value={blackoutStart}
                  onChange={(e) => setBlackoutStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ntu-green"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">結束</label>
                <input
                  type="datetime-local"
                  value={blackoutEnd}
                  onChange={(e) => setBlackoutEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ntu-green"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">說明（選填）</label>
                <input
                  type="text"
                  value={blackoutReason}
                  onChange={(e) => setBlackoutReason(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:ring-2 focus:ring-ntu-green"
                  placeholder="例：上課"
                />
              </div>
              <button
                type="submit"
                disabled={blackoutSubmitting}
                className="bg-ntu-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {blackoutSubmitting ? "處理中…" : "新增"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
