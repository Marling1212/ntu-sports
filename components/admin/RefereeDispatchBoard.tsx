"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import WageLedger from "@/components/admin/WageLedger";

type DispatchMatch = {
  id: string;
  round: number;
  match_number: number;
  scheduled_time: string | null;
  player1_id: string | null;
  player2_id: string | null;
};

type MatchReferee = {
  match_id: string;
  user_id: string;
  role: string;
  wage: number;
};

type TeamRoster = {
  team_id: string;
  user_id: string;
};

interface RefereeDispatchBoardProps {
  matches: DispatchMatch[];
  initialAssignments: MatchReferee[];
  teamRosters: TeamRoster[];
  candidateUserIds: string[];
  teamLabelMap: Record<string, string>;
  userLabelMap: Record<string, string>;
}

const ROLE_OPTIONS = ["Main", "Side", "Reserve"];

export default function RefereeDispatchBoard({
  matches,
  initialAssignments,
  teamRosters,
  candidateUserIds,
  teamLabelMap,
  userLabelMap,
}: RefereeDispatchBoardProps) {
  const supabase = createClient();
  const [assignments, setAssignments] = useState<MatchReferee[]>(initialAssignments);
  const [drafts, setDrafts] = useState<Record<string, { userId: string; role: string; wage: string }>>({});
  const [savingByMatch, setSavingByMatch] = useState<Record<string, boolean>>({});

  const userTeamMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const roster of teamRosters) {
      if (!map.has(roster.user_id)) map.set(roster.user_id, new Set<string>());
      map.get(roster.user_id)!.add(roster.team_id);
    }
    return map;
  }, [teamRosters]);

  const matchesById = useMemo(() => {
    return new Map(matches.map((match) => [match.id, match]));
  }, [matches]);

  const assignmentsByMatch = useMemo(() => {
    const map = new Map<string, MatchReferee[]>();
    for (const assignment of assignments) {
      if (!map.has(assignment.match_id)) map.set(assignment.match_id, []);
      map.get(assignment.match_id)!.push(assignment);
    }
    return map;
  }, [assignments]);

  const refereeBusyIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const match = matchesById.get(assignment.match_id);
      if (!match?.scheduled_time) continue;
      const key = `${assignment.user_id}__${match.scheduled_time}`;
      if (!map.has(key)) map.set(key, new Set<string>());
      map.get(key)!.add(assignment.match_id);
    }
    return map;
  }, [assignments, matchesById]);

  const playerBusyIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const match of matches) {
      if (!match.scheduled_time) continue;
      const teams = [match.player1_id, match.player2_id].filter(Boolean) as string[];
      for (const teamId of teams) {
        for (const roster of teamRosters) {
          if (roster.team_id !== teamId) continue;
          const key = `${roster.user_id}__${match.scheduled_time}`;
          if (!map.has(key)) map.set(key, new Set<string>());
          map.get(key)!.add(match.id);
        }
      }
    }
    return map;
  }, [matches, teamRosters]);

  const getCandidateState = (match: DispatchMatch, userId: string) => {
    const teamsInMatch = new Set([match.player1_id, match.player2_id].filter(Boolean) as string[]);
    const userTeams = userTeamMap.get(userId) ?? new Set<string>();

    for (const teamId of userTeams) {
      if (teamsInMatch.has(teamId)) {
        return { hidden: true, disabled: true, reason: "bias" as const };
      }
    }

    if (!match.scheduled_time) {
      return { hidden: false, disabled: false, reason: null as const };
    }

    const playingKey = `${userId}__${match.scheduled_time}`;
    const playingMatches = playerBusyIndex.get(playingKey);
    if (playingMatches && Array.from(playingMatches).some((id) => id !== match.id)) {
      return { hidden: false, disabled: true, reason: "playing" as const };
    }

    const busyKey = `${userId}__${match.scheduled_time}`;
    const busyMatches = refereeBusyIndex.get(busyKey);
    if (busyMatches && Array.from(busyMatches).some((id) => id !== match.id)) {
      return { hidden: false, disabled: true, reason: "busy" as const };
    }

    return { hidden: false, disabled: false, reason: null as const };
  };

  const getRefOptions = (match: DispatchMatch) => {
    const options = candidateUserIds
      .map((userId) => {
        const state = getCandidateState(match, userId);
        if (state.hidden) return null;

        const labelBase = userLabelMap[userId] ?? userId;
        let label = labelBase;
        if (state.reason === "playing") label += " (Playing)";
        if (state.reason === "busy") label += " (Busy)";

        return {
          userId,
          label,
          disabled: state.disabled,
        };
      })
      .filter(Boolean) as { userId: string; label: string; disabled: boolean }[];

    return options.sort((a, b) => a.label.localeCompare(b.label));
  };

  const setDraft = (matchId: string, next: Partial<{ userId: string; role: string; wage: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        userId: prev[matchId]?.userId ?? "",
        role: prev[matchId]?.role ?? "Main",
        wage: prev[matchId]?.wage ?? "",
        ...next,
      },
    }));
  };

  const addAssignment = async (matchId: string) => {
    const draft = drafts[matchId];
    if (!draft?.userId) return toast.error("Select a referee first.");
    if (!draft.role) return toast.error("Select a role.");
    const wage = Number(draft.wage);
    if (!Number.isFinite(wage) || wage < 0) return toast.error("Enter a valid wage.");

    setSavingByMatch((prev) => ({ ...prev, [matchId]: true }));
    const { data, error } = await supabase
      .from("match_referees")
      .insert({
        match_id: matchId,
        user_id: draft.userId,
        role: draft.role,
        wage,
      })
      .select("match_id, user_id, role, wage")
      .single();

    setSavingByMatch((prev) => ({ ...prev, [matchId]: false }));

    if (error || !data) {
      toast.error(error?.message || "Failed to assign referee.");
      return;
    }

    setAssignments((prev) => [...prev, data]);
    setDraft(matchId, { userId: "", role: "Main", wage: "" });
    toast.success("Referee assigned.");
  };

  const removeAssignment = async (row: MatchReferee) => {
    const { error } = await supabase
      .from("match_referees")
      .delete()
      .eq("match_id", row.match_id)
      .eq("user_id", row.user_id)
      .eq("role", row.role);

    if (error) {
      toast.error(error.message || "Failed to remove assignment.");
      return;
    }

    setAssignments((prev) =>
      prev.filter(
        (item) =>
          !(item.match_id === row.match_id && item.user_id === row.user_id && item.role === row.role)
      )
    );
    toast.success("Assignment removed.");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <WageLedger assignments={assignments} userLabelMap={userLabelMap} />

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-xl font-semibold text-ntu-green">Referee Dispatch</h2>
          <p className="mt-1 text-sm text-gray-600">
            Assign referees with role and wage. Conflict blocks are enforced in the selector.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Match</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned Referees</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Add Referee</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const rows = assignmentsByMatch.get(match.id) ?? [];
                const options = getRefOptions(match);
                const draft = drafts[match.id] ?? { userId: "", role: "Main", wage: "" };
                const saving = !!savingByMatch[match.id];
                const matchLabel = `R${match.round} - #${match.match_number}`;
                const home = match.player1_id ? teamLabelMap[match.player1_id] ?? match.player1_id : "TBD";
                const away = match.player2_id ? teamLabelMap[match.player2_id] ?? match.player2_id : "TBD";

                return (
                  <tr key={match.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-4 text-sm">
                      <p className="font-semibold text-gray-800">{matchLabel}</p>
                      <p className="mt-1 text-gray-600">{home} vs {away}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {match.scheduled_time ? new Date(match.scheduled_time).toLocaleString() : "Unscheduled"}
                    </td>
                    <td className="px-4 py-4">
                      {rows.length === 0 ? (
                        <span className="text-sm text-gray-500">No assignments yet</span>
                      ) : (
                        <div className="space-y-2">
                          {rows.map((row, idx) => (
                            <div
                              key={`${row.match_id}-${row.user_id}-${row.role}-${idx}`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                            >
                              <span className="text-gray-700">
                                <span className="font-medium">{userLabelMap[row.user_id] ?? row.user_id}</span>
                                {" · "}
                                {row.role}
                                {" · "}
                                NT$ {Number(row.wage).toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAssignment(row)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid gap-2">
                        <select
                          value={draft.userId}
                          onChange={(e) => setDraft(match.id, { userId: e.target.value })}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                        >
                          <option value="">Select referee...</option>
                          {options.map((option) => (
                            <option key={option.userId} value={option.userId} disabled={option.disabled}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={draft.role}
                            onChange={(e) => setDraft(match.id, { role: e.target.value })}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min={0}
                            value={draft.wage}
                            onChange={(e) => setDraft(match.id, { wage: e.target.value })}
                            placeholder="Wage"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                          />

                          <button
                            type="button"
                            onClick={() => addAssignment(match.id)}
                            disabled={saving}
                            className="rounded-lg bg-ntu-green px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Add"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
