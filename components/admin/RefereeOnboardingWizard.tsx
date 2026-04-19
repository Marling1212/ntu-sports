"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";
import { clampRefereeLinkTtlDays } from "@/lib/utils/refereeAccessToken";

const REFEREE_LINK_DAY_OPTIONS = [7, 14, 30, 60, 90, 180, 365] as const;

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
  defaultRefereeLinkTtlDays,
  initialReferees,
  assignments,
  candidateIdentities,
  manualPlayerOptions,
  manualTeams,
}: {
  eventId: string;
  /** Saved event default (1–365); each copy can override via `linkValidityDays` before copying. */
  defaultRefereeLinkTtlDays: number;
  initialReferees: RefereeRow[];
  assignments: MatchRefereeRow[];
  candidateIdentities: CandidateIdentity[];
  manualPlayerOptions: ManualPlayerOption[];
  manualTeams: ManualTeamOption[];
}) {
  const { t, locale } = useI18n();
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
  const [editingEmailById, setEditingEmailById] = useState<Record<string, string>>({});
  const [savingEmailId, setSavingEmailId] = useState<string>("");
  const [saving, setSaving] = useState(false);
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
    if (!q) return toast.error(t("referee.admin.toastEnterNameFirst"));
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
    const resolvedEmail = email.trim();
    if (!resolvedName) return toast.error(t("referee.admin.toastNameRequired"));
    setSaving(true);

    if (decision && decision !== "new") {
      const chosen = matches.find((m) => m.user_id === decision);
      if (!chosen) {
        setSaving(false);
        return toast.error(t("referee.admin.toastChooseValidProfile"));
      }
      const { data, error } = await supabase
        .from("event_referees")
        .insert({
          event_id: eventId,
          user_id: chosen.user_id,
          linked_player_id: chosen.linked_player_id,
          display_name: chosen.name,
          email: resolvedEmail || null,
          note: note.trim() || null,
        })
        .select("id, event_id, user_id, display_name, email, linked_player_id, note")
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message || t("referee.admin.toastFailedLink"));
      setRows((prev) => [...prev, data]);
      setName("");
      setEmail("");
      setNote("");
      setMatches([]);
      setDecision("");
      return toast.success(t("referee.admin.toastLinkedSuccess"));
    }

    const response = await fetch(`/api/admin/events/${eventId}/referees/external`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: resolvedName,
        email: resolvedEmail,
        note,
        linkedPlayerId: selectedManualOption?.player_id || null,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || !payload?.referee) {
      return toast.error(payload?.message || t("referee.admin.toastFailedCreate"));
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
    toast.success(t("referee.admin.toastCreatedSuccess"));
  };

  const removeReferee = async (id: string) => {
    const { error } = await supabase.from("event_referees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t("referee.admin.toastRemoved"));
  };

  const saveRefereeEmail = async (row: RefereeRow) => {
    const nextEmail = (editingEmailById[row.id] ?? row.email ?? "").trim();
    setSavingEmailId(row.id);
    const { data, error } = await supabase
      .from("event_referees")
      .update({ email: nextEmail || null })
      .eq("id", row.id)
      .select("id, event_id, user_id, display_name, email, linked_player_id, note")
      .single();
    setSavingEmailId("");
    if (error || !data) return toast.error(error?.message || t("referee.admin.toastEmailUpdateFail"));
    setRows((prev) => prev.map((r) => (r.id === row.id ? data : r)));
    toast.success(t("referee.admin.toastEmailUpdated"));
  };

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
    const url = `${window.location.origin}/referee/${payload.token}`;
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
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">{t("referee.admin.onboardTitle")}</h2>
        <p className="mt-1 text-sm text-gray-600">{t("referee.admin.onboardIntro")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("referee.admin.placeholderName")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("referee.admin.placeholderRefereeEmail")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("referee.admin.placeholderNote")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={runCheck}
            className="rounded-lg border border-ntu-green px-4 py-2 text-sm font-semibold text-ntu-green hover:bg-ntu-green hover:text-white"
          >
            {t("referee.admin.checkMatchingPlayers")}
          </button>
          <button
            type="button"
            onClick={completeOnboarding}
            disabled={!canSubmit}
            className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? t("referee.admin.saving") : t("referee.admin.completeOnboarding")}
          </button>
        </div>

        {matches.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-sm font-medium text-amber-900">{t("referee.admin.matchFoundTitle")}</p>
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
                      {t("referee.admin.teamsLine", {
                        teams: m.teams.join(", ") || "-",
                        userShort: m.user_id.slice(0, 8),
                      })}
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
                <span className="text-sm text-gray-800">{t("referee.admin.notSamePerson")}</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-3 rounded-lg bg-emerald-50 px-3 py-3">
          <p className="text-sm text-emerald-800">{t("referee.admin.manualFallbackHelp")}</p>
          <select
            value={manualTeamId}
            onChange={(e) => {
              setManualTeamId(e.target.value);
              setManualOptionId("");
            }}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          >
            <option value="">{t("referee.admin.pickTeam")}</option>
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
            placeholder={t("referee.admin.searchPlayerPlaceholder")}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <select
            value={manualOptionId}
            onChange={(e) => setManualOptionId(e.target.value)}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          >
            <option value="">{t("referee.admin.noLinkedPlayerOption")}</option>
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
            <p className="text-sm text-emerald-800">{t("referee.admin.noAutoMatchHelp")}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">{t("referee.admin.ledgerTitle")}</h2>
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <label className="block text-xs font-medium text-emerald-900" htmlFor="ref-link-ttl">
              {t("referee.admin.linkValidityLabel")}
            </label>
            <p className="text-xs text-emerald-800">{t("referee.admin.linkValidityHint")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              id="ref-link-ttl"
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
            <span className="text-xs text-emerald-900 whitespace-nowrap">
              {locale === "zh" ? "天" : "days"}
            </span>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">{t("referee.admin.colName")}</th>
                <th className="px-3 py-2 font-medium">{t("referee.admin.colEmail")}</th>
                <th className="px-3 py-2 font-medium">{t("referee.admin.colLinkedProfile")}</th>
                <th className="px-3 py-2 font-medium">{t("referee.admin.colAssignments")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("referee.admin.colAssigned")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("referee.admin.colCompleted")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("referee.admin.colTotal")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("referee.admin.colAccess")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("referee.admin.colRemove")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    {t("referee.admin.noRefereesYet")}
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
                      {row.display_name ||
                        t("referee.admin.userFallback", { short: row.user_id.slice(0, 8) })}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="flex items-center justify-end gap-2 md:justify-start">
                        <input
                          type="email"
                          value={editingEmailById[row.id] ?? row.email ?? ""}
                          onChange={(e) =>
                            setEditingEmailById((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          placeholder={t("referee.admin.addEmailPlaceholder")}
                          className="w-52 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                        />
                        <button
                          type="button"
                          onClick={() => saveRefereeEmail(row)}
                          disabled={savingEmailId === row.id}
                          className="text-xs font-semibold text-ntu-green hover:underline disabled:opacity-60"
                        >
                          {savingEmailId === row.id ? t("referee.admin.saving") : t("referee.admin.save")}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {row.linked_player_id
                        ? t("referee.admin.linkedShort", { short: row.linked_player_id.slice(0, 8) })
                        : t("referee.admin.externalNone")}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{wage.assignmentCount || "-"}</td>
                    <td className="px-3 py-2 text-right text-amber-700">
                      {t("referee.admin.currency")} {wage.assigned.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      {t("referee.admin.currency")} {wage.completed.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-ntu-green">
                      {t("referee.admin.currency")} {wage.total.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => copyRefereePortalLink(row.user_id)}
                        className="text-xs font-semibold text-ntu-green hover:underline"
                      >
                        {t("referee.admin.copyRefLinkReissue")}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeReferee(row.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        {t("referee.admin.remove")}
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
