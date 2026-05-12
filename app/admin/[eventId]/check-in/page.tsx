import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import BracketCheckInClient from "@/components/admin/BracketCheckInClient";
import type { Match } from "@/types/tournament";
import type { Player as DbPlayer } from "@/types/database";

export default async function BracketCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ divisionId?: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;
  const { divisionId: divisionIdParam } = await searchParams;

  const divisions = await getEventDivisions(eventId);
  if (divisions.length > 1 && !divisionIdParam) {
    redirect(`/admin/${eventId}/check-in?divisionId=${divisions[0].id}`);
  }
  const selectedDivision = divisionIdParam ? divisions.find((d) => d.id === divisionIdParam) : (divisions[0] ?? null);
  const effectiveDivisionId = selectedDivision?.id ?? (divisions.length === 1 ? divisions[0].id : null);
  const divisionQuery = effectiveDivisionId ? `?divisionId=${effectiveDivisionId}` : "";

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
  const tournamentType = (selectedDivision?.tournament_type ?? event?.tournament_type) as string | undefined;

  if (tournamentType !== "single_elimination") {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">籤表報到</h1>
        <p className="text-gray-600 mb-4">此頁僅適用單淘汰賽制。</p>
        <a href={`/admin/${eventId}/players${divisionQuery}`} className="text-ntu-green underline font-medium">
          返回報名管理
        </a>
      </div>
    );
  }

  let matchesQuery = supabase
    .from("matches")
    .select(
      `
      id,
      round,
      match_number,
      status,
      score1,
      score2,
      winner_id,
      player1:players!matches_player1_id_fkey(id, name, seed, department),
      player2:players!matches_player2_id_fkey(id, name, seed, department),
      winner:players!matches_winner_id_fkey(id, name, seed, department)
    `
    )
    .eq("event_id", eventId)
    .gte("round", 1)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  if (effectiveDivisionId) {
    matchesQuery = matchesQuery.eq("division_id", effectiveDivisionId);
  }

  const { data: rawMatches } = await matchesQuery;

  let playersQuery = supabase.from("players").select("*").eq("event_id", eventId).order("seed", { ascending: true, nullsFirst: false }).order("name", { ascending: true });
  if (effectiveDivisionId) {
    playersQuery = playersQuery.eq("division_id", effectiveDivisionId);
  }
  const { data: playersRaw } = await playersQuery;
  const players = (playersRaw ?? []) as DbPlayer[];

  const initialMatches: Match[] = (rawMatches ?? []).map((m: any) => ({
    id: m.id,
    round: m.round,
    matchNumber: m.match_number,
    player1: m.player1?.id
      ? {
          id: m.player1.id,
          name: m.player1.name,
          seed: m.player1.seed ?? undefined,
          school: m.player1.department ?? undefined,
        }
      : null,
    player2: m.player2?.id
      ? {
          id: m.player2.id,
          name: m.player2.name,
          seed: m.player2.seed ?? undefined,
          school: m.player2.department ?? undefined,
        }
      : null,
    winner: m.winner?.id
      ? {
          id: m.winner.id,
          name: m.winner.name,
          seed: m.winner.seed ?? undefined,
          school: m.winner.department ?? undefined,
        }
      : null,
    score:
      m.score1 != null && m.score2 != null ? `${m.score1}-${m.score2}` : undefined,
    status: m.status,
  }));

  const sport = selectedDivision?.sport ?? event?.sport ?? "tennis";
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase() : "Tennis";

  return (
    <div className="flex min-w-0 flex-1 pt-6 pb-12">
      <div className="container mx-auto min-w-0 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ntu-green mb-1">籤表報到</h1>
          <p className="text-gray-600">
            {event?.name}
            {selectedDivision && (
              <span className="ml-2 font-medium text-ntu-green">
                · {selectedDivision.name ? `${selectedDivision.sport} – ${selectedDivision.name}` : selectedDivision.sport}
              </span>
            )}
          </p>
        </div>
        <BracketCheckInClient
          eventId={eventId}
          divisionQuery={divisionQuery}
          sportLabel={sportLabel}
          initialMatches={initialMatches}
          initialPlayers={players}
        />
      </div>
    </div>
  );
}
