import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import RefereePortalClient from "./RefereePortalClient";
import { verifyRefereeAccessToken } from "@/lib/utils/refereeAccessToken";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function RefereePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const token = ((await params).token ?? "").trim();
  const claims = verifyRefereeAccessToken(token);
  if (!token || !claims) notFound();

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    notFound();
  }

  const locale = await getLocale();
  const t = getT(locale);

  const [{ data: event }, { data: assignedMatches }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, sport, registration_type")
      .eq("id", claims.eventId)
      .maybeSingle(),
    supabase
      .from("match_referees")
      .select(`
        match_id,
        match:matches!match_referees_match_id_fkey(
          id, event_id, round, match_number, status, scheduled_time, score1, score2, winner_id,
          player1:players!matches_player1_id_fkey(id, name),
          player2:players!matches_player2_id_fkey(id, name)
        )
      `)
      .eq("user_id", claims.userId),
  ]);

  const matches = (assignedMatches ?? [])
    .map((row: any) => row.match)
    .filter((match: any) => match?.id && match?.event_id === claims.eventId)
    .sort((a: any, b: any) => {
      const ta = a?.scheduled_time ? new Date(a.scheduled_time).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b?.scheduled_time ? new Date(b.scheduled_time).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

  if (!event) notFound();

  const matchIds = matches.map((m: any) => m.id).filter(Boolean);
  const teamIds = Array.from(
    new Set(matches.flatMap((m: any) => [m?.player1?.id, m?.player2?.id]).filter(Boolean))
  );
  const [statDefsResult, existingStatsResult] = await Promise.all([
    supabase
      .from("sport_stat_definitions")
      .select("stat_name, stat_label, stat_type, default_value, stat_level, display_order")
      .eq("sport", event.sport ?? "")
      .or("stat_level.eq.player,stat_name.like.player\\_%")
      .order("display_order", { ascending: true }),
    supabase
      .from("match_player_stats")
      .select("match_id, player_id, team_member_id, stat_name, stat_value")
      .in("match_id", matchIds.length ? matchIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const { data: teamMembersRaw } = await supabase
    .from("team_members")
    .select("id, player_id, name, jersey_number")
    .in("player_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
    .order("jersey_number", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });
  const teamMembersByTeam: Record<string, any[]> = {};
  for (const row of teamMembersRaw ?? []) {
    if (!teamMembersByTeam[row.player_id]) teamMembersByTeam[row.player_id] = [];
    teamMembersByTeam[row.player_id].push(row);
  }

  const portalSubtitle = event.sport
    ? t("referee.portalSubtitleWithSport", { eventName: event.name ?? "", sport: event.sport })
    : t("referee.portalSubtitleNoSport", { eventName: event.name ?? "" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-ntu-green">{t("referee.portalTitle")}</h1>
        <p className="mt-1 text-sm text-gray-600">{portalSubtitle}</p>
      </div>

      <RefereePortalClient
        token={token}
        matches={matches as any[]}
        playerStatDefinitions={(statDefsResult.data ?? []) as any[]}
        existingPlayerStats={(existingStatsResult.data ?? []) as any[]}
        teamMembersByTeam={teamMembersByTeam}
        isTeamEvent={event.registration_type === "team"}
        hasTeamMembersData={Object.keys(teamMembersByTeam).length > 0}
      />

      <p className="mt-8 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600">
          {t("referee.backHome")}
        </Link>
      </p>
    </div>
  );
}
