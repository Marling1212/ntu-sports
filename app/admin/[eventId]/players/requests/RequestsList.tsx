"use client";

import { useState } from "react";
import { approveRequest, rejectRequest } from "./actions";

interface RequestRow {
  id: string;
  player_id: string;
  action: string;
  member_data: Record<string, unknown>;
  status: string;
  requested_by?: string | null;
  admin_note?: string | null;
  created_at: string;
  team_name: string;
}

interface RequestsListProps {
  eventId: string;
  requests: RequestRow[];
}

const actionLabels: Record<string, string> = {
  add: "新增隊員",
  update: "編輯隊員",
  remove: "移除隊員",
};

export default function RequestsList({ eventId, requests }: RequestsListProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    setResolvingId(requestId);
    setError(null);
    const result = await approveRequest(requestId, eventId);
    setResolvingId(null);
    if (!result.ok) setError(result.error);
    else window.location.reload();
  };

  const handleReject = async (requestId: string) => {
    setResolvingId(requestId);
    setError(null);
    const note = rejectNote[requestId] ?? "";
    const result = await rejectRequest(requestId, eventId, note || undefined);
    setResolvingId(null);
    if (!result.ok) setError(result.error);
    else window.location.reload();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
        {requests.map((r) => {
          const md = r.member_data || {};
          const isResolving = resolvingId === r.id;
          return (
            <li key={r.id} className="p-4 hover:bg-gray-50/50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{r.team_name}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <span className="font-medium">{actionLabels[r.action] ?? r.action}</span>
                    {r.action === "add" && (
                      <span>
                        {" "}
                        · {String(md.name ?? "—")}
                        {md.jersey_number != null && ` #${md.jersey_number}`}
                      </span>
                    )}
                    {r.action === "update" && (
                      <span>
                        {" "}
                        · 姓名: {String(md.name ?? "—")}
                        {md.jersey_number != null && ` · 背號: ${md.jersey_number}`}
                      </span>
                    )}
                    {r.action === "remove" && (
                      <span> · 移除：{String(md.name ?? md.member_id ?? "—")}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.requested_by && `申請人: ${r.requested_by} · `}
                    {new Date(r.created_at).toLocaleString("zh-TW")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="拒絕時可填理由（選填）"
                    value={rejectNote[r.id] ?? ""}
                    onChange={(e) =>
                      setRejectNote((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm w-40"
                  />
                  <button
                    type="button"
                    onClick={() => handleReject(r.id)}
                    disabled={isResolving}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    拒絕
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id)}
                    disabled={isResolving}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-ntu-green rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {isResolving ? "處理中…" : "核准"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
