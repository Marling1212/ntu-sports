"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

interface RefereeRow {
  id: string;
  event_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  linked_player_id: string | null;
  note: string | null;
}

interface CandidateIdentity {
  user_id: string;
  linked_player_id: string | null;
  name: string;
  email: string | null;
  teams: string[];
}

interface ManualPlayerOption {
  option_id: string;
  team_id: string;
  team_name: string;
  player_id: string;
  name: string;
  email: string | null;
  member_name: string | null;
}

interface ManualTeamOption {
  team_id: string;
  team_name: string;
}

interface MatchRefereeRow {
  user_id: string;
  role: string;
  wage: number;
  assignment_status?: "assigned" | "completed";
}

export default function RefereeOnboardingWizard({
  eventId,
  initialReferees,
  assignments,
  candidateIdentities,
  manualPlayerOptions,
  manualTeams,
}: {
  eventId: string;
  initialReferees: RefereeRow[];
  assignments: MatchRefereeRow[];
  candidateIdentities: CandidateIdentity[];
  manualPlayerOptions: ManualPlayerOption[];
  manualTeams: ManualTeamOption[];
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<RefereeRow[]>(initialReferees);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [matches, setMatches] = useState<CandidateIdentity[]>([]);
  const [decision, setDecision] = useState<string>("");
  const [manualTeamId, setManualTeamId] = useState("");
  const [manualOptionId, setManualOptionId] = useState("");
  const [manualPlayerQuery, setManualPlayerQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const existingUserIds = useMemo(() => new Set(rows.map((r) => r.user_id)), [rows]);
  const wageByUser = useMemo(() => {
    const map = new Map<string, { assigned: number; completed: number; total: number; assignmentCount: number }>();
    for (const row of assignments) {
      const current = map.get(row.user_id) ?? {
        assigned: 0,
        completed: 0,
        total: 0,
        assignmentCount: 0,
      };
      const wage = Number(row.wage) || 0;
      current.total += wage;
      if (row.assignment_status === "completed") current.completed += wage;
      else current.assigned += wage;
      current.assignmentCount += 1;
      map.set(row.user_id, current);
    }
    return map;
  }, [assignments]);
  const teamScopedManualPlayers = useMemo(
    () => (manualTeamId ? manualPlayerOptions.filter((p) => p.team_id === manualTeamId) : manualPlayerOptions),
    [manualPlayerOptions, manualTeamId]
  );

  const filteredManualPlayers = useMemo(() => {
    const q = manualPlayerQuery.trim().toLowerCase();
    if (!q) return teamScopedManualPlayers;
    return teamScopedManualPlayers.filter((p) =>
      `${p.name} ${p.member_name || ""} ${p.email || ""}`.toLowerCase().includes(q)
    );
  }, [teamScopedManualPlayers, manualPlayerQuery]);
  const selectedManualOption = useMemo(
    () => filteredManualPlayers.find((p) => p.option_id === manualOptionId) || null,
    [filteredManualPlayers, manualOptionId]
  );
  const hasManualSelection = !!selectedManualOption;
  const canSubmit =
    !saving &&
    (decision === "new" || !!decision || matches.length === 0 || hasManualSelection);

  const runCheck = () => {
    const q = name.trim().toLowerCase();
    if (!q) return toast.error("Enter a name first.");
    const found = candidateIdentities
      .filter((c) => !existingUserIds.has(c.user_id))
      .filter((c) => {
        const target = [
          c.name,
          c.email || "",
          c.user_id,
          ...c.teams,
        ]
          .join(" ")
          .toLowerCase();
        return target.includes(q);
      })
      .slice(0, 8);
    setMatches(found);
    setDecision(found.length === 0 ? "new" : "");
  };

  const completeOnboarding = async () => {
    const resolvedName = name.trim() || selectedManualOption?.member_name || selectedManualOption?.name || "";
    if (!resolvedName) return toast.error("Name is required.");
    setSaving(true);

    if (decision && decision !== "new") {
      const chosen = matches.find((m) => m.user_id === decision);
      if (!chosen) {
        setSaving(false);
        return toast.error("Please choose a valid linked profile.");
      }
      const { data, error } = await supabase
        .from("event_referees")
        .insert({
          event_id: eventId,
          user_id: chosen.user_id,
          linked_player_id: chosen.linked_player_id,
          display_name: chosen.name,
          email: chosen.email,
          note: note.trim() || null,
        })
        .select("id, event_id, user_id, display_name, email, linked_player_id, note")
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message || "Failed to link referee.");
      setRows((prev) => [...prev, data]);
      setName("");
      setEmail("");
      setNote("");
      setMatches([]);
      setDecision("");
      return toast.success("Linked to existing player identity.");
    }

    const response = await fetch(`/api/admin/events/${eventId}/referees/external`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: resolvedName,
        email: email || selectedManualOption?.email || "",
        note,
        linkedPlayerId: selectedManualOption?.player_id || null,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || !payload?.referee) {
      return toast.error(payload?.message || "Failed to create new referee.");
    }
    setRows((prev) => [...prev, payload.referee]);
    setName("");
    setEmail("");
    setNote("");
    setMatches([]);
    setDecision("");
    setManualTeamId("");
    setManualOptionId("");
    setManualPlayerQuery("");
    toast.success("Created new referee identity.");
  };

  const removeReferee = async (id: string) => {
    const { error } = await supabase.from("event_referees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Referee removed.");
  };

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
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Onboard Referee</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter name. We check matching player identities and ask you whether it is the same person.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional, for new person)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={runCheck}
            className="rounded-lg border border-ntu-green px-4 py-2 text-sm font-semibold text-ntu-green hover:bg-ntu-green hover:text-white"
          >
            Check Matching Players
          </button>
          <button
            type="button"
            onClick={completeOnboarding}
            disabled={!canSubmit}
            className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Complete Onboarding"}
          </button>
        </div>

        {matches.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-sm font-medium text-amber-900">
              We found possible same-person matches in team rosters. Is this the same person?
            </p>
            <div className="space-y-2">
              {matches.map((m) => (
                <label key={m.user_id} className="flex cursor-pointer items-start gap-2 rounded border border-amber-200 bg-white p-2">
                  <input
                    type="radio"
                    name="identity-choice"
                    checked={decision === m.user_id}
                    onChange={() => setDecision(m.user_id)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-800">
                    <span className="block font-medium">{m.name}</span>
                    <span className="block text-xs text-gray-600">
                      Teams: {m.teams.join(", ") || "-"} · user {m.user_id.slice(0, 8)}
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded border border-amber-200 bg-white p-2">
                <input
                  type="radio"
                  name="identity-choice"
                  checked={decision === "new"}
                  onChange={() => setDecision("new")}
                />
                <span className="text-sm text-gray-800">Not the same person — create new referee identity.</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-3 rounded-lg bg-emerald-50 px-3 py-3">
          <p className="text-sm text-emerald-800">
            Manual fallback: pick team first, then pick player. This stays available even if auto-check succeeds.
          </p>
          <select
            value={manualTeamId}
            onChange={(e) => {
              setManualTeamId(e.target.value);
              setManualOptionId("");
            }}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          >
            <option value="">Pick team</option>
            {manualTeams.map((team) => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={manualPlayerQuery}
            onChange={(e) => setManualPlayerQuery(e.target.value)}
            placeholder="Search player (all teams if team not selected)..."
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <select
            value={manualOptionId}
            onChange={(e) => setManualOptionId(e.target.value)}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          >
            <option value="">No linked player (external only)</option>
            {filteredManualPlayers.map((p) => (
              <option key={p.option_id} value={p.option_id}>
                {p.member_name || p.name}
                {p.email ? ` · ${p.email}` : ""}
              </option>
            ))}
          </select>
        </div>

        {matches.length === 0 && decision === "new" && (
          <div className="mt-3 space-y-3 rounded-lg bg-emerald-50 px-3 py-3">
            <p className="text-sm text-emerald-800">
              No automatic match found. You can still complete onboarding with the manual Team → Player picker above.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Current Referees + Wage Ledger</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Linked Player Profile</th>
                <th className="px-3 py-2 font-medium">Assignments</th>
                <th className="px-3 py-2 text-right font-medium">Assigned</th>
                <th className="px-3 py-2 text-right font-medium">Completed</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Access</th>
                <th className="px-3 py-2 text-right font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No referees yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                    {(() => {
                      const wage = wageByUser.get(row.user_id) ?? {
                        assigned: 0,
                        completed: 0,
                        total: 0,
                        assignmentCount: 0,
                      };
                      return (
                        <>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {row.display_name || `User ${row.user_id.slice(0, 8)}`}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{row.email || "-"}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {row.linked_player_id ? `Linked (${row.linked_player_id.slice(0, 8)})` : "External / None"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{wage.assignmentCount || "-"}</td>
                    <td className="px-3 py-2 text-right text-amber-700">NT$ {wage.assigned.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">NT$ {wage.completed.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ntu-green">NT$ {wage.total.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => copyRefereePortalLink(row.user_id)}
                        className="text-xs font-semibold text-ntu-green hover:underline"
                      >
                        Copy Ref Link
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeReferee(row.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
