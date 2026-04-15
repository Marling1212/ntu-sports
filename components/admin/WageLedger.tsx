"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";

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
}

export default function WageLedger({ eventId, assignments, userLabelMap }: WageLedgerProps) {
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
      body: JSON.stringify({ userId }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.token) {
      toast.error(payload?.message || "Failed to generate referee link.");
      return;
    }
    const url = `${window.location.origin}/referee/${payload.token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Referee link copied.");
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ntu-green">Wage Ledger</h2>
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
                      Copy Ref Link
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
