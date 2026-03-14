"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export interface AuditLogEntry {
  id: string;
  event_id: string | null;
  organizer_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogClientProps {
  eventId: string;
  initialLogs: AuditLogEntry[];
  currentUserId: string;
  entityTypeFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Taipei",
  }).format(d);
}

function summarizeChange(entry: AuditLogEntry): string {
  const before = entry.before_data ?? {};
  const after = entry.after_data ?? {};
  const parts: string[] = [];

  if (entry.action === "match.updated") {
    const keys = ["score1", "score2", "status", "winner_id", "court"] as const;
    for (const key of keys) {
      const b = before[key];
      const a = after[key];
      if (a !== undefined && String(b) !== String(a)) {
        if (key === "score1" || key === "score2") {
          const s1 = after.score1 ?? "—";
          const s2 = after.score2 ?? "—";
          if (parts.length === 0) parts.push(`比分 ${before.score1 ?? "—"}-${before.score2 ?? "—"} → ${s1}-${s2}`);
          break;
        }
        if (key === "status") parts.push(`狀態 ${String(b)} → ${String(a)}`);
        else parts.push(`${key} ${String(b)} → ${String(a)}`);
      }
    }
    if (parts.length === 0) {
      const keys = Object.keys(after);
      if (keys.length) parts.push("已更新");
    }
  } else if (entry.action === "match.postponed") {
    if (after.status !== undefined && String(before.status) !== String(after.status))
      parts.push(`狀態 ${String(before.status)} → ${String(after.status)}`);
    if (after.scheduled_time !== undefined && String(before.scheduled_time ?? "") !== String(after.scheduled_time ?? "")) {
      const t = after.scheduled_time;
      const dateStr = typeof t === "string" || typeof t === "number" ? new Date(t).toLocaleString() : "—";
      parts.push(`時間 → ${dateStr}`);
    }
    if (after.court !== undefined && String(before.court ?? "") !== String(after.court ?? ""))
      parts.push(`場地 ${String(before.court) || "—"} → ${String(after.court) || "—"}`);
    if (parts.length === 0) parts.push("延後並改期");
  } else {
    parts.push(entry.action);
  }

  return parts.length ? parts.join("；") : "—";
}

export default function AuditLogClient({
  eventId,
  initialLogs,
  currentUserId,
  entityTypeFilter,
  dateFromFilter,
  dateToFilter,
}: AuditLogClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const applyFilters = (updates: { entityType?: string; dateFrom?: string; dateTo?: string }) => {
    const p = new URLSearchParams(searchParams?.toString() ?? "");
    if (updates.entityType !== undefined) {
      if (updates.entityType === "all") p.delete("entityType");
      else p.set("entityType", updates.entityType);
    }
    if (updates.dateFrom !== undefined) {
      if (!updates.dateFrom) p.delete("dateFrom");
      else p.set("dateFrom", updates.dateFrom);
    }
    if (updates.dateTo !== undefined) {
      if (!updates.dateTo) p.delete("dateTo");
      else p.set("dateTo", updates.dateTo);
    }
    router.push(`/admin/${eventId}/settings/audit?${p.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t("admin.audit.filterType")}</span>
          <select
            value={entityTypeFilter}
            onChange={(e) => applyFilters({ entityType: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ntu-green"
          >
            <option value="all">{t("admin.audit.filterAll")}</option>
            <option value="match">{t("admin.audit.filterMatch")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t("admin.audit.filterDateFrom")}</span>
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => applyFilters({ dateFrom: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ntu-green"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t("admin.audit.filterDateTo")}</span>
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => applyFilters({ dateTo: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ntu-green"
          />
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {initialLogs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {t("admin.audit.noLogs")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("admin.audit.time")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("admin.audit.action")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("admin.audit.entity")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("admin.audit.changeSummary")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("admin.audit.actor")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {entry.action === "match.updated" ? t("admin.audit.matchUpdated") : entry.action === "match.postponed" ? t("admin.audit.matchPostponed") : entry.action}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.entity_type === "match" && entry.entity_id ? (
                        <Link
                          href={`/admin/${eventId}/matches/${entry.entity_id}`}
                          className="text-ntu-green hover:underline font-medium"
                        >
                          比賽 #{entry.entity_id.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-gray-500">{entry.entity_type}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={summarizeChange(entry)}>
                      {summarizeChange(entry)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.organizer_id === currentUserId ? (
                        <span className="text-ntu-green font-medium">{t("admin.audit.you")}</span>
                      ) : entry.organizer_id ? (
                        <span className="text-gray-500">{t("admin.audit.admin")}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
