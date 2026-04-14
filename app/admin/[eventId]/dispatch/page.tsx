import { createClient } from "@/lib/supabase/server";
import RefereeDispatchBoard from "@/components/admin/RefereeDispatchBoard";

export default async function DispatchPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .single();

  const { data: matchesRaw } = await supabase
    .from("matches")
    .select("id, round, match_number, scheduled_time, player1_id, player2_id")
    .eq("event_id", eventId)
    .neq("status", "bye")
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  const matches = (matchesRaw ?? []).map((match) => ({
    ...match,
    player1_id: match.player1_id ?? null,
    player2_id: match.player2_id ?? null,
    scheduled_time: match.scheduled_time ?? null,
  }));

  const matchIds = matches.map((match) => match.id);
  const teamIds = Array.from(
    new Set(
      matches
        .flatMap((match) => [match.player1_id, match.player2_id])
        .filter(Boolean) as string[]
    )
  );

  const { data: assignmentsRaw } = await supabase
    .from("match_referees")
    .select("match_id, user_id, role, wage")
    .in("match_id", matchIds.length ? matchIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: teamRostersRaw } = await supabase
    .from("team_rosters")
    .select("team_id, user_id")
    .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: availabilityRaw } = await supabase
    .from("referee_availability")
    .select("user_id");

  const { data: organizersRaw } = await supabase
    .from("organizers")
    .select("user_id")
    .eq("event_id", eventId);

  const { data: teamsRaw } = await supabase
    .from("players")
    .select("id, name")
    .in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const teamLabelMap: Record<string, string> = {};
  for (const team of teamsRaw ?? []) {
    teamLabelMap[team.id] = team.name ?? team.id;
  }

  const assignments = (assignmentsRaw ?? []).map((row) => ({
    ...row,
    wage: Number(row.wage) || 0,
  }));
  const teamRosters = teamRostersRaw ?? [];

  const candidateUserIds = Array.from(
    new Set([
      ...(teamRostersRaw ?? []).map((row) => row.user_id),
      ...(availabilityRaw ?? []).map((row) => row.user_id),
      ...(organizersRaw ?? []).map((row) => row.user_id),
      ...(assignmentsRaw ?? []).map((row) => row.user_id),
    ])
  ).filter(Boolean);

  const userLabelMap: Record<string, string> = {};
  for (const userId of candidateUserIds) {
    userLabelMap[userId] = `User ${userId.slice(0, 8)}`;
  }

  return (
    <div className="pt-6 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-ntu-green">Referee Dispatch</h1>
          <p className="text-lg text-gray-600">
            {event?.name} — Assign referees, block conflicts, and track wages.
          </p>
        </div>

        <RefereeDispatchBoard
          matches={matches}
          initialAssignments={assignments}
          teamRosters={teamRosters}
          candidateUserIds={candidateUserIds}
          teamLabelMap={teamLabelMap}
          userLabelMap={userLabelMap}
        />
      </div>
    </div>
  );
}
