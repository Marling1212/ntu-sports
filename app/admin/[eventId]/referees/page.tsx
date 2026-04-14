import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RefereeOnboardingWizard from "@/components/admin/RefereeOnboardingWizard";

export default async function AdminRefereesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;

  const [{ data: event }, { data: refsRaw }, { data: rosterRaw }] = await Promise.all([
    supabase.from("events").select("id, name").eq("id", eventId).single(),
    supabase
      .from("event_referees")
      .select("id, event_id, user_id, display_name, email, linked_player_id, note")
      .eq("event_id", eventId)
      .order("display_name", { ascending: true }),
    supabase
      .from("team_rosters")
      .select("user_id, team_id, player:players!team_rosters_team_id_fkey(id, name, email)")
      .in(
        "team_id",
        (await supabase.from("players").select("id").eq("event_id", eventId)).data?.map((p) => p.id) ?? [
          "00000000-0000-0000-0000-000000000000",
        ]
      ),
  ]);

  const grouped = new Map<
    string,
    { user_id: string; linked_player_id: string | null; name: string; email: string | null; teams: string[] }
  >();
  for (const row of rosterRaw ?? []) {
    const playerRow = Array.isArray(row.player) ? row.player[0] : row.player;
    const userId = row.user_id as string;
    const playerId = playerRow?.id as string;
    const teamName = playerRow?.name as string;
    const email = (playerRow?.email as string | null) ?? null;
    if (!userId || !teamName) continue;
    const prev = grouped.get(userId);
    if (!prev) {
      grouped.set(userId, {
        user_id: userId,
        linked_player_id: playerId || null,
        name: teamName,
        email,
        teams: [teamName],
      });
    } else if (!prev.teams.includes(teamName)) {
      prev.teams.push(teamName);
    }
  }
  const candidateIdentities = Array.from(grouped.values());

  return (
    <div className="pt-6 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-ntu-green">Referee Directory & Onboarding</h1>
          <p className="text-lg text-gray-600">
            {event?.name} — onboard referees and link identities to player profiles.
          </p>
          <div className="mt-3">
            <Link
              href={`/admin/${eventId}/dispatch`}
              className="text-sm font-medium text-ntu-green hover:underline"
            >
              ← Back to Dispatch
            </Link>
          </div>
        </div>

        <RefereeOnboardingWizard
          eventId={eventId}
          initialReferees={(refsRaw ?? []) as any[]}
          candidateIdentities={candidateIdentities}
        />
      </div>
    </div>
  );
}
