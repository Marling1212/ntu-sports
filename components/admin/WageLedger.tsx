"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";
import { publicRefereePortalUrl } from "@/lib/utils/publicSiteUrl";
import { clampRefereeLinkTtlDays } from "@/lib/utils/refereeAccessToken";

const REFEREE_LINK_DAY_OPTIONS = [7, 14, 30, 60, 90, 180, 365] as const;

interface MatchRefereeRow {
  match_id: string;
  user_id: string;
  role: string;
  wage: number;
  assignment_status?: "assigned" | "completed";
}

interface WageLedgerProps {
  eventId: string;
  assignments: MatchRefereeRow[];
  userLabelMap: Record<string, string>;
  defaultRefereeLinkTtlDays?: number;
}

export default function WageLedger({
  eventId,
  assignments,
  userLabelMap,
  defaultRefereeLinkTtlDays = 14,
}: WageLedgerProps) {
  const { t, locale } = useI18n();
  const [linkValidityDays, setLinkValidityDays] = useState(() =>
    clampRefereeLinkTtlDays(defaultRefereeLinkTtlDays)
  );

  useEffect(() => {
    setLinkValidityDays(clampRefereeLinkTtlDays(defaultRefereeLinkTtlDays));
  }, [defaultRefereeLinkTtlDays]);

  const linkDaySelectOptions = useMemo(() => {
    const s = new Set<number>([...REFEREE_LINK_DAY_OPTIONS]);
    s.add(clampRefereeLinkTtlDays(defaultRefereeLinkTtlDays));
    s.add(clampRefereeLinkTtlDays(linkValidityDays));
    return Array.from(s).sort((a, b) => a - b);
  }, [defaultRefereeLinkTtlDays, linkValidityDays]);
  const rows = useMemo(() => {
    const summary = new Map<string, { totalWage: number; assignedWage: number; completedWage: number; roleCount: Record<string, number> }>();

    for (const entry of assignments) {
      const current = summary.get(entry.user_id) ?? {
        totalWage: 0,
        assignedWage: 0,
        completedWage: 0,
        roleCount: {},
      };
      current.totalWage += Number(entry.wage) || 0;
      if (entry.assignment_status === "completed") current.completedWage += Number(entry.wage) || 0;
      else current.assignedWage += Number(entry.wage) || 0;
      current.roleCount[entry.role] = (current.roleCount[entry.role] ?? 0) + 1;
      summary.set(entry.user_id, current);
    }

    return Array.from(summary.entries())
      .map(([userId, data]) => ({
        userId,
        label: userLabelMap[userId] ?? userId,
        totalWage: data.totalWage,
        assignedWage: data.assignedWage,
        completedWage: data.completedWage,
        roleSummary: Object.entries(data.roleCount)
          .map(([role, count]) => `${role} x${count}`)
          .join(", "),
      }))
      .sort((a, b) => b.totalWage - a.totalWage);
  }, [assignments, userLabelMap]);

  const totalBudget = useMemo(
    () => rows.reduce((sum, row) => sum + row.totalWage, 0),
    [rows]
  );
  const totalAssigned = useMemo(
    () => rows.reduce((sum, row) => sum + row.assignedWage, 0),
    [rows]
  );
  const totalCompleted = useMemo(
    () => rows.reduce((sum, row) => sum + row.completedWage, 0),
    [rows]
  );

  const copyRefereePortalLink = async (userId: string) => {
    const response = await fetch(`/api/admin/events/${eventId}/referee-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, validityDays: linkValidityDays }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.token) {
      toast.error(payload?.message || t("referee.admin.toastLinkGenFail"));
      return;
    }
    const url = publicRefereePortalUrl(payload.token);
    await navigator.clipboard.writeText(url);
    const days = clampRefereeLinkTtlDays(payload.validityDays ?? linkValidityDays);
    const expiresAt = typeof payload.expiresAt === "string" ? payload.expiresAt : null;
    const dateStr = expiresAt
      ? new Date(expiresAt).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";
    toast.success(
      dateStr
        ? t("referee.admin.toastLinkCopiedWithExpiry", { date: dateStr, days })
        : t("referee.admin.toastLinkCopied")
    );
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ntu-green">{t("referee.admin.ledgerTitle")}</h2>
        <div className="flex flex-wrap gap-2 text-sm font-medium">
          <p className="rounded-lg bg-white px-3 py-1 text-gray-700">
            Assigned: <span className="text-amber-700">NT$ {totalAssigned.toLocaleString()}</span>
          </p>
          <p className="rounded-lg bg-white px-3 py-1 text-gray-700">
            Completed: <span className="text-emerald-700">NT$ {totalCompleted.toLocaleString()}</span>
          </p>
          <p className="rounded-lg bg-white px-3 py-1 text-gray-700">
            Total: <span className="text-ntu-green">NT$ {totalBudget.toLocaleString()}</span>
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-white/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <label className="block text-xs font-medium text-gray-800" htmlFor="wage-ledger-link-ttl">
            {t("referee.admin.linkValidityLabel")}
          </label>
          <p className="text-xs text-gray-600">{t("referee.admin.linkValidityHint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            id="wage-ledger-link-ttl"
            value={linkValidityDays}
            onChange={(e) => setLinkValidityDays(clampRefereeLinkTtlDays(Number(e.target.value)))}
            className="rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          >
            {linkDaySelectOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-700 whitespace-nowrap">{locale === "zh" ? "天" : "days"}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No referee assignments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Referee</th>
                <th className="px-3 py-2 font-medium">Roles</th>
                <th className="px-3 py-2 text-right font-medium">Assigned</th>
                <th className="px-3 py-2 text-right font-medium">Completed</th>
                <th className="px-3 py-2 text-right font-medium">Total Wage</th>
                <th className="px-3 py-2 text-right font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-emerald-100 last:border-b-0">
                  <td className="px-3 py-2 font-medium text-gray-800">{row.label}</td>
                  <td className="px-3 py-2 text-gray-600">{row.roleSummary || "-"}</td>
                  <td className="px-3 py-2 text-right text-amber-700">NT$ {row.assignedWage.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-emerald-700">NT$ {row.completedWage.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold text-ntu-green">
                    NT$ {row.totalWage.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => copyRefereePortalLink(row.userId)}
                      className="text-xs font-semibold text-ntu-green hover:underline"
                    >
                      {t("referee.admin.copyRefLinkReissue")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
