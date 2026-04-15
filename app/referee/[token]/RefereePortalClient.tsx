"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { DRAW_WINNER_ID } from "@/lib/constants/matchConstants";
import { updateRefereeMatchResult } from "./actions";

interface MatchRow {
  id: string;
  round: number;
  match_number: number;
  status: string;
  scheduled_time: string | null;
  score1: string | null;
  score2: string | null;
  winner_id: string | null;
  player1: { id: string; name: string } | null;
  player2: { id: string; name: string } | null;
}

interface PlayerStatDef {
  stat_name: string;
  stat_label: string;
  stat_type: "number" | "text" | "boolean";
  default_value?: string | null;
}

interface ExistingPlayerStat {
  match_id: string;
  player_id: string;
  team_member_id?: string | null;
  stat_name: string;
  stat_value: string | null;
}

interface TeamMember {
  id: string;
  player_id: string;
  name: string;
  jersey_number?: number | null;
}

export default function RefereePortalClient({
  token,
  matches,
  playerStatDefinitions,
  existingPlayerStats,
  teamMembersByTeam,
  isTeamEvent,
  hasTeamMembersData,
}: {
  token: string;
  matches: MatchRow[];
  playerStatDefinitions: PlayerStatDef[];
  existingPlayerStats: ExistingPlayerStat[];
  teamMembersByTeam: Record<string, TeamMember[]>;
  isTeamEvent: boolean;
  hasTeamMembersData: boolean;
}) {
  const [savingId, setSavingId] = useState<string>("");
  const [playerStatsByMatch, setPlayerStatsByMatch] = useState<
    Record<string, Record<string, Record<string, string>>>
  >(
    (() => {
      const initial: Record<string, Record<string, Record<string, string>>> = {};
      for (const match of matches) {
        initial[match.id] = {};
        const players = [match.player1, match.player2].filter(Boolean) as Array<{ id: string; name: string }>;
        for (const player of players) {
          initial[match.id][player.id] = {};
          for (const def of playerStatDefinitions) {
            initial[match.id][player.id][def.stat_name] = def.default_value ?? "";
          }
        }
      }
      for (const row of existingPlayerStats) {
        if (row.team_member_id) continue;
        if (!initial[row.match_id]) continue;
        if (!initial[row.match_id][row.player_id]) continue;
        initial[row.match_id][row.player_id][row.stat_name] = row.stat_value ?? "";
      }
      return initial;
    })()
  );
  const [teamMemberStatsByMatch, setTeamMemberStatsByMatch] = useState<
    Record<string, Record<string, Record<string, Record<string, string>>>>
  >(
    (() => {
      const initial: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
      for (const match of matches) {
        initial[match.id] = {};
      }
      for (const row of existingPlayerStats) {
        if (!row.team_member_id) continue;
        if (!initial[row.match_id]) initial[row.match_id] = {};
        if (!initial[row.match_id][row.player_id]) initial[row.match_id][row.player_id] = {};
        if (!initial[row.match_id][row.player_id][row.team_member_id]) {
          initial[row.match_id][row.player_id][row.team_member_id] = {};
        }
        initial[row.match_id][row.player_id][row.team_member_id][row.stat_name] = row.stat_value ?? "";
      }
      return initial;
    })()
  );
  const [selectedMemberByMatch, setSelectedMemberByMatch] = useState<Record<string, Record<string, string>>>(
    (() => {
      const initial: Record<string, Record<string, string>> = {};
      for (const match of matches) {
        initial[match.id] = {};
        const players = [match.player1, match.player2].filter(Boolean) as Array<{ id: string; name: string }>;
        for (const player of players) {
          const members = teamMembersByTeam[player.id] ?? [];
          initial[match.id][player.id] = members[0]?.id ?? "";
        }
      }
      return initial;
    })()
  );
  const [formByMatch, setFormByMatch] = useState<Record<string, { score1: string; score2: string; winner_id: string; status: string }>>(
    Object.fromEntries(
      matches.map((m) => [
        m.id,
        {
          score1: m.score1 ?? "",
          score2: m.score2 ?? "",
          winner_id:
            m.status === "completed" && !m.winner_id && m.score1 && m.score2 && m.score1 === m.score2
              ? DRAW_WINNER_ID
              : m.winner_id ?? "",
          status: m.status || "upcoming",
        },
      ])
    )
  );

  const setField = (matchId: string, key: "score1" | "score2" | "winner_id" | "status", value: string) => {
    setFormByMatch((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? { score1: "", score2: "", winner_id: "", status: "upcoming" }),
        [key]: value,
      },
    }));
  };

  const setPlayerStatField = (
    matchId: string,
    playerId: string,
    statName: string,
    value: string
  ) => {
    setPlayerStatsByMatch((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? {}),
        [playerId]: {
          ...(prev[matchId]?.[playerId] ?? {}),
          [statName]: value,
        },
      },
    }));
  };

  const setTeamMemberStatField = (
    matchId: string,
    teamId: string,
    memberId: string,
    statName: string,
    value: string
  ) => {
    setTeamMemberStatsByMatch((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? {}),
        [teamId]: {
          ...(prev[matchId]?.[teamId] ?? {}),
          [memberId]: {
            ...(prev[matchId]?.[teamId]?.[memberId] ?? {}),
            [statName]: value,
          },
        },
      },
    }));
  };

  const saveMatch = async (matchId: string) => {
    const form = formByMatch[matchId];
    if (!form) return;
    const playerStats = Object.entries(playerStatsByMatch[matchId] ?? {}).flatMap(
      ([playerId, stats]) =>
        Object.entries(stats).map(([statName, statValue]) => ({
          player_id: playerId,
          stat_name: statName,
          stat_value: statValue,
        }))
    );
    const teamMemberStats = Object.entries(teamMemberStatsByMatch[matchId] ?? {}).flatMap(
      ([playerId, members]) =>
        Object.entries(members).flatMap(([teamMemberId, stats]) =>
          Object.entries(stats).map(([statName, statValue]) => ({
            player_id: playerId,
            team_member_id: teamMemberId,
            stat_name: statName,
            stat_value: statValue,
          }))
        )
    );
    setSavingId(matchId);
    const result = await updateRefereeMatchResult(token, matchId, {
      ...form,
      playerStats,
      teamMemberStats,
    });
    setSavingId("");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Match updated.");
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      {matches.map((match) => {
        const form = formByMatch[match.id];
        return (
          <section key={match.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-xl font-semibold text-ntu-green">
                  Round {match.round} · Match {match.match_number}
                </h3>
                <p className="text-sm text-gray-600">
                  {match.player1?.name ?? "TBD"} vs {match.player2?.name ?? "TBD"}
                </p>
                <p className="text-xs text-gray-500">
                  {match.scheduled_time ? new Date(match.scheduled_time).toLocaleString() : "Unscheduled"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {match.status}
              </span>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Score 1</label>
                <input
                  type="text"
                  value={form?.score1 ?? ""}
                  onChange={(e) => setField(match.id, "score1", e.target.value)}
                  placeholder="Score 1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Score 2</label>
                <input
                  type="text"
                  value={form?.score2 ?? ""}
                  onChange={(e) => setField(match.id, "score2", e.target.value)}
                  placeholder="Score 2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Winner</label>
                <select
                  value={form?.winner_id ?? ""}
                  onChange={(e) => setField(match.id, "winner_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                >
                  <option value="">No winner</option>
                  <option value={DRAW_WINNER_ID}>Draw</option>
                  {match.player1 && <option value={match.player1.id}>{match.player1.name}</option>}
                  {match.player2 && <option value={match.player2.id}>{match.player2.name}</option>}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form?.status ?? "upcoming"}
                  onChange={(e) => setField(match.id, "status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                >
                  <option value="upcoming">upcoming</option>
                  <option value="live">live</option>
                  <option value="completed">completed</option>
                  <option value="delayed">delayed</option>
                </select>
              </div>
            </div>

            {playerStatDefinitions.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h4 className="text-lg font-semibold text-ntu-green">Player-level stats</h4>
                </div>
                <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
                  {[match.player1, match.player2].filter(Boolean).map((player) => (
                    <div key={player!.id}>
                      <h5 className="mb-3 border-b pb-2 text-base font-semibold text-gray-900">{player!.name}</h5>
                      {(() => {
                        const memberOptions = teamMembersByTeam[player!.id] ?? [];
                        const showTeamMemberPicker = isTeamEvent || hasTeamMembersData || memberOptions.length > 0;
                        if (!showTeamMemberPicker) {
                          return (
                            <div className="space-y-3">
                              {playerStatDefinitions.map((def) => {
                                const value = playerStatsByMatch[match.id]?.[player!.id]?.[def.stat_name] ?? "";
                                return (
                                  <div key={`${player!.id}-${def.stat_name}`}>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                      {def.stat_label}
                                    </label>
                                    {def.stat_type === "boolean" ? (
                                      <select
                                        value={value}
                                        onChange={(e) =>
                                          setPlayerStatField(match.id, player!.id, def.stat_name, e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                                      >
                                        <option value="">-</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                      </select>
                                    ) : (
                                      <input
                                        type={def.stat_type === "number" ? "number" : "text"}
                                        value={value}
                                        onChange={(e) =>
                                          setPlayerStatField(match.id, player!.id, def.stat_name, e.target.value)
                                        }
                                        placeholder={def.stat_label}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Choose Player</label>
                            <select
                              value={selectedMemberByMatch[match.id]?.[player!.id] ?? ""}
                              onChange={(e) =>
                                setSelectedMemberByMatch((prev) => ({
                                  ...prev,
                                  [match.id]: {
                                    ...(prev[match.id] ?? {}),
                                    [player!.id]: e.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                            >
                              <option value="">Select team member...</option>
                              {memberOptions.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name}
                                  {member.jersey_number !== null && member.jersey_number !== undefined
                                    ? ` #${member.jersey_number}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          {memberOptions.length === 0 && (
                            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                              No team members found for this team yet. Add members in admin to assign player-level stats.
                            </p>
                          )}
                          {(selectedMemberByMatch[match.id]?.[player!.id] ?? "") !== "" && (
                            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                              {playerStatDefinitions.map((def) => {
                                const memberId = selectedMemberByMatch[match.id]?.[player!.id] ?? "";
                                const value =
                                  teamMemberStatsByMatch[match.id]?.[player!.id]?.[memberId]?.[def.stat_name] ?? "";
                                return (
                                  <div key={`${player!.id}-${memberId}-${def.stat_name}`}>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                      {def.stat_label}
                                    </label>
                                    {def.stat_type === "boolean" ? (
                                      <select
                                        value={value}
                                        onChange={(e) =>
                                          setTeamMemberStatField(
                                            match.id,
                                            player!.id,
                                            memberId,
                                            def.stat_name,
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                                      >
                                        <option value="">-</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                      </select>
                                    ) : (
                                      <input
                                        type={def.stat_type === "number" ? "number" : "text"}
                                        value={value}
                                        onChange={(e) =>
                                          setTeamMemberStatField(
                                            match.id,
                                            player!.id,
                                            memberId,
                                            def.stat_name,
                                            e.target.value
                                          )
                                        }
                                        placeholder={def.stat_label}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => saveMatch(match.id)}
                disabled={savingId === match.id}
                className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {savingId === match.id ? "Saving..." : "Save Match"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
