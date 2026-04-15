"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import WageLedger from "@/components/admin/WageLedger";

type DispatchMatch = {
  id: string;
  round: number;
  match_number: number;
  court: string | null;
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

type RefereeAvailabilityTemplate = {
  id: string;
  user_id: string;
  slot_template_id: string;
};

type SlotTemplate = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  code?: string | null;
};

interface RefereeDispatchBoardProps {
  eventId: string;
  matches: DispatchMatch[];
  initialAssignments: MatchReferee[];
  teamRosters: TeamRoster[];
  availabilityTemplates: RefereeAvailabilityTemplate[];
  slotTemplates: SlotTemplate[];
  candidateUserIds: string[];
  teamLabelMap: Record<string, string>;
  userLabelMap: Record<string, string>;
}

const WEEKDAY_CH = ["日", "一", "二", "三", "四", "五", "六"];
const SLOT_ROLE_COLUMNS = [
  { key: "main1", role: "Main", label: "主裁判 1" },
  { key: "main2", role: "Main", label: "主裁判 2" },
  { key: "side1", role: "Side", label: "邊裁判 1" },
  { key: "side2", role: "Side", label: "邊裁判 2" },
] as const;
type SlotKey = (typeof SLOT_ROLE_COLUMNS)[number]["key"];
type CandidateStateReason =
  | "bias"
  | "playing"
  | "busy"
  | "slot_unavailable"
  | "no_slot_match"
  | "unscheduled"
  | null;
type CandidateState = { hidden: boolean; disabled: boolean; reason: CandidateStateReason };

export default function RefereeDispatchBoard({
  eventId,
  matches,
  initialAssignments,
  teamRosters,
  availabilityTemplates,
  slotTemplates,
  candidateUserIds,
  teamLabelMap,
  userLabelMap,
}: RefereeDispatchBoardProps) {
  const supabase = createClient();
  const [assignments, setAssignments] = useState<MatchReferee[]>(initialAssignments);
  const [drafts, setDrafts] = useState<
    Record<string, Record<SlotKey, { userId: string; wage: string }>>
  >({});
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

  const availableTemplateSet = useMemo(() => {
    const set = new Set<string>();
    for (const row of availabilityTemplates) {
      set.add(`${row.user_id}__${row.slot_template_id}`);
    }
    return set;
  }, [availabilityTemplates]);

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

  const getMatchingTemplateIds = (match: DispatchMatch) => {
    if (!match.scheduled_time) return [] as string[];
    const dt = new Date(match.scheduled_time);
    if (Number.isNaN(dt.getTime())) return [];
    const weekday = dt.getDay();
    const hh = dt.getHours().toString().padStart(2, "0");
    const mm = dt.getMinutes().toString().padStart(2, "0");
    const current = `${hh}:${mm}`;

    return slotTemplates
      .filter((slot) => {
        const start = slot.start_time.slice(0, 5);
        const end = slot.end_time.slice(0, 5);
        return slot.day_of_week === weekday && start <= current && current < end;
      })
      .map((slot) => slot.id);
  };

  const getReasonLabel = (reason: CandidateStateReason) => {
    if (reason === "bias") return "Bias conflict";
    if (reason === "playing") return "Playing another match";
    if (reason === "busy") return "Refereeing another match";
    if (reason === "slot_unavailable") return "Not available in this slot";
    if (reason === "no_slot_match") return "No matching scheduling slot";
    if (reason === "unscheduled") return "Match is unscheduled";
    return "Available";
  };

  const getCandidateState = (match: DispatchMatch, userId: string): CandidateState => {
    const teamsInMatch = new Set([match.player1_id, match.player2_id].filter(Boolean) as string[]);
    const userTeams = userTeamMap.get(userId) ?? new Set<string>();

    for (const teamId of userTeams) {
      if (teamsInMatch.has(teamId)) {
        return { hidden: false, disabled: true, reason: "bias" };
      }
    }

    if (!match.scheduled_time) {
      return { hidden: false, disabled: true, reason: "unscheduled" };
    }

    const playingKey = `${userId}__${match.scheduled_time}`;
    const playingMatches = playerBusyIndex.get(playingKey);
    if (playingMatches && Array.from(playingMatches).some((id) => id !== match.id)) {
      return { hidden: false, disabled: true, reason: "playing" };
    }

    const busyKey = `${userId}__${match.scheduled_time}`;
    const busyMatches = refereeBusyIndex.get(busyKey);
    if (busyMatches && Array.from(busyMatches).some((id) => id !== match.id)) {
      return { hidden: false, disabled: true, reason: "busy" };
    }

    const matchingTemplateIds = getMatchingTemplateIds(match);
    if (matchingTemplateIds.length === 0) {
      return { hidden: false, disabled: true, reason: "no_slot_match" };
    }
    const hasAvailability = matchingTemplateIds.some((templateId) =>
      availableTemplateSet.has(`${userId}__${templateId}`)
    );
    if (!hasAvailability) {
      return { hidden: false, disabled: true, reason: "slot_unavailable" };
    }

    return { hidden: false, disabled: false, reason: null };
  };

  const getRefOptions = (match: DispatchMatch) => {
    const options = candidateUserIds
      .map((userId) => {
        const state = getCandidateState(match, userId);
        if (state.hidden) return null;

        const labelBase = userLabelMap[userId] ?? userId;
        const label = state.reason ? `${labelBase} (${getReasonLabel(state.reason)})` : labelBase;

        return {
          userId,
          label,
          disabled: state.disabled,
          reason: state.reason,
        };
      })
      .filter(Boolean) as {
      userId: string;
      label: string;
      disabled: boolean;
      reason: CandidateStateReason;
    }[];

    return options.sort((a, b) => a.label.localeCompare(b.label));
  };

  const setDraft = (
    matchId: string,
    slotKey: SlotKey,
    next: Partial<{ userId: string; wage: string }>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? {
          main1: { userId: "", wage: "" },
          main2: { userId: "", wage: "" },
          side1: { userId: "", wage: "" },
          side2: { userId: "", wage: "" },
        }),
        [slotKey]: {
          userId: prev[matchId]?.[slotKey]?.userId ?? "",
          wage: prev[matchId]?.[slotKey]?.wage ?? "",
          ...next,
        },
      },
    }));
  };

  const addAssignment = async (matchId: string, slotKey: SlotKey, role: string) => {
    const draft = drafts[matchId]?.[slotKey];
    if (!draft?.userId) return toast.error("Select a referee first.");
    const wage = Number(draft.wage);
    if (!Number.isFinite(wage) || wage < 0) return toast.error("Enter a valid wage.");

    setSavingByMatch((prev) => ({ ...prev, [matchId]: true }));
    const { data, error } = await supabase
      .from("match_referees")
      .insert({
        match_id: matchId,
        user_id: draft.userId,
        role,
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
    setDraft(matchId, slotKey, { userId: "", wage: "" });
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

      <WageLedger eventId={eventId} assignments={assignments} userLabelMap={userLabelMap} />

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-xl font-semibold text-ntu-green">Referee Dispatch</h2>
          <p className="mt-1 text-sm text-gray-600">
            Schedule-style dispatch table with slot-aware availability and conflict reasons.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Day</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Field</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Team A</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Team B</th>
                {SLOT_ROLE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const rows = assignmentsByMatch.get(match.id) ?? [];
                const options = getRefOptions(match);
                const draft = drafts[match.id] ?? {
                  main1: { userId: "", wage: "" },
                  main2: { userId: "", wage: "" },
                  side1: { userId: "", wage: "" },
                  side2: { userId: "", wage: "" },
                };
                const saving = !!savingByMatch[match.id];
                const home = match.player1_id ? teamLabelMap[match.player1_id] ?? match.player1_id : "TBD";
                const away = match.player2_id ? teamLabelMap[match.player2_id] ?? match.player2_id : "TBD";
                const dt = match.scheduled_time ? new Date(match.scheduled_time) : null;
                const dateLabel =
                  dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleDateString("en-CA") : "Unscheduled";
                const dayLabel = dt && !Number.isNaN(dt.getTime()) ? WEEKDAY_CH[dt.getDay()] : "-";

                const mainRows = rows.filter((r) => r.role === "Main");
                const sideRows = rows.filter((r) => r.role === "Side");
                const getAssignedForSlot = (slotKey: SlotKey) => {
                  if (slotKey === "main1") return mainRows[0] ?? null;
                  if (slotKey === "main2") return mainRows[1] ?? null;
                  if (slotKey === "side1") return sideRows[0] ?? null;
                  return sideRows[1] ?? null;
                };

                return (
                  <tr key={match.id} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{dateLabel}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{dayLabel}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{match.court || "-"}</td>
                    <td className="px-3 py-3 text-sm text-gray-800">{home}</td>
                    <td className="px-3 py-3 text-sm text-gray-800">{away}</td>
                    {SLOT_ROLE_COLUMNS.map((col) => {
                      const assigned = getAssignedForSlot(col.key);
                      const slotDraft = draft[col.key];
                      return (
                        <td key={col.key} className="px-3 py-3">
                          {assigned ? (
                            <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-2">
                              <p className="text-sm font-medium text-gray-800">
                                {userLabelMap[assigned.user_id] ?? assigned.user_id}
                              </p>
                              <p className="text-xs text-gray-600">
                                {assigned.role} · NT$ {Number(assigned.wage).toLocaleString()}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeAssignment(assigned)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={slotDraft.userId}
                                onChange={(e) => setDraft(match.id, col.key, { userId: e.target.value })}
                                className="w-56 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                              >
                                <option value="">Select ref...</option>
                                {options.map((option) => (
                                  <option
                                    key={`${col.key}-${option.userId}`}
                                    value={option.userId}
                                    disabled={option.disabled}
                                    style={{
                                      backgroundColor: option.disabled ? "#fee2e2" : "#dcfce7",
                                      color: option.disabled ? "#7f1d1d" : "#14532d",
                                    }}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={slotDraft.wage}
                                  onChange={(e) => setDraft(match.id, col.key, { wage: e.target.value })}
                                  placeholder="Wage"
                                  className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => addAssignment(match.id, col.key, col.role)}
                                  disabled={saving}
                                  className="rounded-lg bg-ntu-green px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                                >
                                  {saving ? "..." : "Add"}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-600">
          <span className="mr-4 inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-green-100" /> Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-red-100" /> Unavailable (reason shown in
            dropdown)
          </span>
        </div>
      </section>
    </div>
  );
}
