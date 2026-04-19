"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";

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
  assignment_status?: "assigned" | "completed";
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

type RefereeJob = {
  id: string;
  name: string;
  display_order: number;
  default_wage?: number;
};

interface RefereeDispatchBoardProps {
  eventId: string;
  matches: DispatchMatch[];
  initialAssignments: MatchReferee[];
  teamRosters: TeamRoster[];
  availabilityTemplates: RefereeAvailabilityTemplate[];
  slotTemplates: SlotTemplate[];
  refereeJobs: RefereeJob[];
  candidateUserIds: string[];
  teamLabelMap: Record<string, string>;
  userLabelMap: Record<string, string>;
}

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  refereeJobs,
  candidateUserIds,
  teamLabelMap,
  userLabelMap,
}: RefereeDispatchBoardProps) {
  const { t, locale } = useI18n();
  const supabase = createClient();
  const weekdayLabels = locale === "zh" ? WEEKDAY_ZH : WEEKDAY_EN;

  const getReasonLabel = (reason: CandidateStateReason) => {
    if (reason === "bias") return t("referee.dispatch.reasonBias");
    if (reason === "playing") return t("referee.dispatch.reasonPlaying");
    if (reason === "busy") return t("referee.dispatch.reasonBusy");
    if (reason === "slot_unavailable") return t("referee.dispatch.reasonSlotUnavailable");
    if (reason === "no_slot_match") return t("referee.dispatch.reasonNoSlotMatch");
    if (reason === "unscheduled") return t("referee.dispatch.reasonUnscheduled");
    return t("referee.dispatch.reasonAvailable");
  };

  const [assignments, setAssignments] = useState<MatchReferee[]>(initialAssignments);
  const [drafts, setDrafts] = useState<Record<string, Record<string, { userId: string; wage: string }>>>({});
  const [savingByMatch, setSavingByMatch] = useState<Record<string, boolean>>({});

  const sortedJobs = useMemo(
    () =>
      [...refereeJobs].sort(
        (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)
      ),
    [refereeJobs]
  );

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

  const roleForJob = (jobId: string) => `job:${jobId}`;
  const jobIdFromRole = (role: string) => (role.startsWith("job:") ? role.slice(4) : null);

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
    jobId: string,
    next: Partial<{ userId: string; wage: string }>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? {}),
        [jobId]: {
          userId: prev[matchId]?.[jobId]?.userId ?? "",
          wage: prev[matchId]?.[jobId]?.wage ?? "",
          ...next,
        },
      },
    }));
  };

  const addAssignment = async (matchId: string, jobId: string) => {
    const draft = drafts[matchId]?.[jobId];
    if (!draft?.userId) return toast.error(t("referee.dispatch.toastSelectRef"));
    const wage = Number(draft.wage);
    if (!Number.isFinite(wage) || wage < 0) return toast.error(t("referee.dispatch.toastValidWage"));

    setSavingByMatch((prev) => ({ ...prev, [matchId]: true }));
    const { data, error } = await supabase
      .from("match_referees")
      .insert({
        match_id: matchId,
        user_id: draft.userId,
        role: roleForJob(jobId),
        wage,
        assignment_status: "assigned",
      })
      .select("match_id, user_id, role, wage, assignment_status")
      .single();

    setSavingByMatch((prev) => ({ ...prev, [matchId]: false }));

    if (error || !data) {
      toast.error(error?.message || t("referee.dispatch.toastAssignFailed"));
      return;
    }

    setAssignments((prev) => [...prev, data]);
    setDraft(matchId, jobId, { userId: "", wage: "" });
    toast.success(t("referee.dispatch.toastAssignOk"));
  };

  const removeAssignment = async (row: MatchReferee) => {
    const { error } = await supabase
      .from("match_referees")
      .delete()
      .eq("match_id", row.match_id)
      .eq("user_id", row.user_id)
      .eq("role", row.role);

    if (error) {
      toast.error(error.message || t("referee.dispatch.toastRemoveFailed"));
      return;
    }

    setAssignments((prev) =>
      prev.filter(
        (item) =>
          !(item.match_id === row.match_id && item.user_id === row.user_id && item.role === row.role)
      )
    );
    toast.success(t("referee.dispatch.toastRemoveOk"));
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-xl font-semibold text-ntu-green">{t("referee.dispatch.title")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("referee.dispatch.subtitle")}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("referee.dispatch.colDate")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("referee.dispatch.colDay")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("referee.dispatch.colField")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("referee.dispatch.colTeamA")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("referee.dispatch.colTeamB")}
                </th>
                {sortedJobs.map((job) => (
                  <th
                    key={job.id}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {job.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const rows = assignmentsByMatch.get(match.id) ?? [];
                const options = getRefOptions(match);
                const draft = drafts[match.id] ?? {};
                const saving = !!savingByMatch[match.id];
                const home = match.player1_id
                  ? teamLabelMap[match.player1_id] ?? match.player1_id
                  : t("referee.dispatch.tbd");
                const away = match.player2_id
                  ? teamLabelMap[match.player2_id] ?? match.player2_id
                  : t("referee.dispatch.tbd");
                const dt = match.scheduled_time ? new Date(match.scheduled_time) : null;
                const dateLabel =
                  dt && !Number.isNaN(dt.getTime())
                    ? dt.toLocaleDateString(locale === "zh" ? "zh-TW" : "en-CA")
                    : t("referee.dispatch.unscheduled");
                const dayLabel =
                  dt && !Number.isNaN(dt.getTime()) ? weekdayLabels[dt.getDay()] : t("referee.dispatch.dash");

                const assignmentByJob = new Map<string, MatchReferee>();
                for (const row of rows) {
                  const jobId = jobIdFromRole(row.role);
                  if (!jobId) continue;
                  if (!assignmentByJob.has(jobId)) assignmentByJob.set(jobId, row);
                }

                return (
                  <tr key={match.id} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{dateLabel}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{dayLabel}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {match.court || t("referee.dispatch.dash")}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-800">{home}</td>
                    <td className="px-3 py-3 text-sm text-gray-800">{away}</td>
                    {sortedJobs.map((job) => {
                      const assigned = assignmentByJob.get(job.id) ?? null;
                      const slotDraft = draft[job.id] ?? { userId: "", wage: "" };
                      return (
                        <td key={job.id} className="px-3 py-3">
                          {assigned ? (
                            <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-2">
                              <p className="text-sm font-medium text-gray-800">
                                {userLabelMap[assigned.user_id] ?? assigned.user_id}
                              </p>
                              <p className="text-xs text-gray-600">
                                {job.name} · {t("referee.admin.currency")}{" "}
                                {Number(assigned.wage).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {assigned.assignment_status === "completed"
                                  ? t("referee.dispatch.statusCompleted")
                                  : t("referee.dispatch.statusAssigned")}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeAssignment(assigned)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                {t("referee.dispatch.remove")}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={slotDraft.userId}
                                onChange={(e) =>
                                  setDraft(match.id, job.id, {
                                    userId: e.target.value,
                                    wage:
                                      (draft[job.id]?.wage ?? "").trim() !== ""
                                        ? draft[job.id]?.wage
                                        : String(Number(job.default_wage ?? 0)),
                                  })
                                }
                                className="w-56 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                              >
                                <option value="">{t("referee.dispatch.selectRefPlaceholder")}</option>
                                {options.map((option) => (
                                  <option
                                    key={`${job.id}-${option.userId}`}
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
                                  value={slotDraft.wage === "" ? String(Number(job.default_wage ?? 0)) : slotDraft.wage}
                                  onChange={(e) => setDraft(match.id, job.id, { wage: e.target.value })}
                                  placeholder={t("referee.dispatch.wagePlaceholder")}
                                  className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => addAssignment(match.id, job.id)}
                                  disabled={saving}
                                  className="rounded-lg bg-ntu-green px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                                >
                                  {saving ? t("referee.dispatch.savingShort") : t("referee.dispatch.add")}
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
          {sortedJobs.length === 0 && (
            <div className="px-5 py-4 text-sm text-gray-600">
              {t("referee.dispatch.noJobsHint")}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-600">
          <span className="mr-4 inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-green-100" /> {t("referee.dispatch.legendAvailable")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-red-100" /> {t("referee.dispatch.legendUnavailable")}
          </span>
        </div>
      </section>
    </div>
  );
}
