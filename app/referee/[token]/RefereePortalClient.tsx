"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { DRAW_WINNER_ID } from "@/lib/constants/matchConstants";
import { updateRefereeMatchResult } from "./actions";
import { useI18n } from "@/lib/i18n/context";

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

const REFEREE_ERROR_I18N: Record<string, string> = {
  "Invalid or expired referee link.": "referee.errorInvalidToken",
  "Referee portal is unavailable.": "referee.errorPortalUnavailable",
  "You are not assigned to this match.": "referee.errorNotAssigned",
  "Match not found for this event.": "referee.errorMatchNotFound",
  "Winner must be one of the teams in this match.": "referee.errorWinnerInvalid",
};

function identityAckStorageKey(token: string) {
  return `refereePortalIdentityAck:${token}`;
}

export default function RefereePortalClient({
  token,
  eventName,
  refereeDisplayName,
  matches,
  initialMatchId,
  playerStatDefinitions,
  existingPlayerStats,
  teamMembersByTeam,
  isTeamEvent,
  hasTeamMembersData,
}: {
  token: string;
  eventName: string;
  refereeDisplayName: string;
  matches: MatchRow[];
  /** Deep link: `/referee/[token]?match=<uuid>` */
  initialMatchId?: string | null;
  playerStatDefinitions: PlayerStatDef[];
  existingPlayerStats: ExistingPlayerStat[];
  teamMembersByTeam: Record<string, TeamMember[]>;
  isTeamEvent: boolean;
  hasTeamMembersData: boolean;
}) {
  const { t, locale } = useI18n();
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
  const [formByMatch, setFormByMatch] = useState<
    Record<string, { score1: string; score2: string; winner_id: string; status: string }>
  >(
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

  const [activeMatchId, setActiveMatchId] = useState(() => {
    if (initialMatchId && matches.some((m) => m.id === initialMatchId)) return initialMatchId;
    return matches[0]?.id ?? "";
  });

  const [identityAcknowledged, setIdentityAcknowledged] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage.getItem(identityAckStorageKey(token)) === "1") {
        setIdentityAcknowledged(true);
      }
    } catch {
      // sessionStorage blocked — user must confirm each visit
    }
  }, [token]);

  const confirmIdentity = useCallback(() => {
    try {
      window.sessionStorage.setItem(identityAckStorageKey(token), "1");
    } catch {
      // still allow entry for this tab session
    }
    setIdentityAcknowledged(true);
  }, [token]);

  const selectMatch = useCallback((id: string) => {
    setActiveMatchId(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("match", id);
      const qs = url.searchParams.toString();
      window.history.replaceState(null, "", qs ? `${url.pathname}?${qs}` : url.pathname);
    }
  }, []);

  const dateLocale = locale === "zh" ? "zh-TW" : "en-US";

  const activeMatch = useMemo(
    () => matches.find((m) => m.id === activeMatchId) ?? matches[0] ?? null,
    [matches, activeMatchId]
  );

  const statusLabel = (status: string) => {
    const key =
      status === "upcoming"
        ? "referee.statusUpcoming"
        : status === "live"
          ? "referee.statusLive"
          : status === "completed"
            ? "referee.statusCompleted"
            : status === "delayed"
              ? "referee.statusDelayed"
              : null;
    return key ? t(key) : status;
  };

  const translateError = (message: string) => {
    const i18nKey = REFEREE_ERROR_I18N[message];
    return i18nKey ? t(i18nKey) : message;
  };

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
      toast.error(translateError(result.error));
      return;
    }
    toast.success(t("referee.toastMatchUpdated"));
  };

  const identityGate = !identityAcknowledged ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="referee-identity-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 id="referee-identity-title" className="text-lg font-semibold text-ntu-green">
          {t("referee.identityConfirmTitle")}
        </h2>
        <p className="mt-3 text-sm text-gray-600">{t("referee.identityConfirmLead")}</p>
        <p className="mt-4 text-base font-medium text-gray-900">
          {t("referee.identityConfirmQuestion", { name: refereeDisplayName })}
        </p>
        {eventName ? (
          <p className="mt-2 text-sm text-gray-500">{t("referee.identityConfirmEvent", { eventName })}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/"
            className="order-2 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 sm:order-1"
          >
            {t("referee.identityConfirmNo")}
          </Link>
          <button
            type="button"
            onClick={confirmIdentity}
            className="order-1 rounded-lg bg-ntu-green px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:order-2"
          >
            {t("referee.identityConfirmYes")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (matches.length === 0) {
    return (
      <>
        {identityGate}
        {identityAcknowledged ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
            {t("referee.emptyNoMatches")}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start">
      {identityGate}
      <Toaster position="top-right" />
      <aside className="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:max-w-[20rem] lg:sticky lg:top-4 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("referee.navYourMatches")}</p>
        <p className="mt-1 text-xs text-gray-600">{t("referee.navHint")}</p>
        <ul className="mt-3 max-h-[min(70vh,32rem)] space-y-1.5 overflow-y-auto">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => selectMatch(m.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  m.id === activeMatchId
                    ? "border-ntu-green bg-emerald-50 font-semibold text-ntu-green shadow-sm"
                    : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-white"
                }`}
              >
                <span className="block truncate text-gray-900">
                  {m.player1?.name ?? t("referee.tbd")} {t("referee.vs")} {m.player2?.name ?? t("referee.tbd")}
                </span>
                <span className="mt-1 block truncate text-xs text-gray-500">
                  {t("referee.roundMatch", { round: m.round, matchNumber: m.match_number })}
                  {m.scheduled_time
                    ? ` · ${new Date(m.scheduled_time).toLocaleString(dateLocale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ` · ${t("referee.unscheduled")}`}
                </span>
                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {statusLabel(m.status)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1">
        {activeMatch &&
          (() => {
            const match = activeMatch;
            const form = formByMatch[match.id];
            return (
          <section key={match.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-xl font-semibold text-ntu-green">
                  {t("referee.roundMatch", { round: match.round, matchNumber: match.match_number })}
                </h3>
                <p className="text-sm text-gray-600">
                  {match.player1?.name ?? t("referee.tbd")} {t("referee.vs")}{" "}
                  {match.player2?.name ?? t("referee.tbd")}
                </p>
                <p className="text-xs text-gray-500">
                  {match.scheduled_time
                    ? new Date(match.scheduled_time).toLocaleString(dateLocale)
                    : t("referee.unscheduled")}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel(match.status)}
              </span>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("referee.score1")}</label>
                <input
                  type="text"
                  value={form?.score1 ?? ""}
                  onChange={(e) => setField(match.id, "score1", e.target.value)}
                  placeholder={t("referee.score1Placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("referee.score2")}</label>
                <input
                  type="text"
                  value={form?.score2 ?? ""}
                  onChange={(e) => setField(match.id, "score2", e.target.value)}
                  placeholder={t("referee.score2Placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("referee.winner")}</label>
                <select
                  value={form?.winner_id ?? ""}
                  onChange={(e) => setField(match.id, "winner_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                >
                  <option value="">{t("referee.noWinner")}</option>
                  <option value={DRAW_WINNER_ID}>{t("referee.draw")}</option>
                  {match.player1 && <option value={match.player1.id}>{match.player1.name}</option>}
                  {match.player2 && <option value={match.player2.id}>{match.player2.name}</option>}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("referee.status")}</label>
                <select
                  value={form?.status ?? "upcoming"}
                  onChange={(e) => setField(match.id, "status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                >
                  <option value="upcoming">{t("referee.statusUpcoming")}</option>
                  <option value="live">{t("referee.statusLive")}</option>
                  <option value="completed">{t("referee.statusCompleted")}</option>
                  <option value="delayed">{t("referee.statusDelayed")}</option>
                </select>
              </div>
            </div>

            {playerStatDefinitions.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h4 className="text-lg font-semibold text-ntu-green">{t("referee.playerLevelStats")}</h4>
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
                                        <option value="">{t("referee.booleanUnset")}</option>
                                        <option value="true">{t("referee.booleanYes")}</option>
                                        <option value="false">{t("referee.booleanNo")}</option>
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
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                {t("referee.choosePlayer")}
                              </label>
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
                                <option value="">{t("referee.selectTeamMember")}</option>
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
                                {t("referee.noTeamMembersHint")}
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
                                          <option value="">{t("referee.booleanUnset")}</option>
                                          <option value="true">{t("referee.booleanYes")}</option>
                                          <option value="false">{t("referee.booleanNo")}</option>
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
                {savingId === match.id ? t("referee.saving") : t("referee.saveMatch")}
              </button>
            </div>
          </section>
            );
          })()}
      </div>
    </div>
  );
}
