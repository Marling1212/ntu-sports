import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import RefereePortalClient from "./RefereePortalClient";
import { verifyRefereeAccessToken } from "@/lib/utils/refereeAccessToken";

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

  const [{ data: event }, { data: assignedMatches }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, sport")
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
  const [statDefsResult, existingStatsResult] = await Promise.all([
    supabase
      .from("sport_stat_definitions")
      .select("stat_name, stat_label, stat_type, default_value, stat_level, display_order")
      .eq("sport", event.sport ?? "")
      .or("stat_level.eq.player,stat_name.like.player\\_%")
      .order("display_order", { ascending: true }),
    supabase
      .from("match_player_stats")
      .select("match_id, player_id, stat_name, stat_value")
      .in("match_id", matchIds.length ? matchIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-ntu-green">Referee Match Portal</h1>
        <p className="mt-1 text-sm text-gray-600">
          {event.name} {event.sport ? `· ${event.sport}` : ""} — update scores and result status for your assigned matches.
        </p>
      </div>

      <RefereePortalClient
        token={token}
        matches={matches as any[]}
        playerStatDefinitions={(statDefsResult.data ?? []) as any[]}
        existingPlayerStats={(existingStatsResult.data ?? []) as any[]}
      />

      <p className="mt-8 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600">
          返回首頁
        </Link>
      </p>
    </div>
  );
}
