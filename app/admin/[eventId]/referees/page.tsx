import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RefereeOnboardingManager from "@/components/admin/RefereeOnboardingManager";

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

  const candidateProfiles = (rosterRaw ?? [])
    .map((r: any) => ({
      user_id: r.user_id,
      player_id: r.player?.id as string,
      name: r.player?.name as string,
      email: (r.player?.email as string | null) ?? null,
    }))
    .filter((row) => row.user_id && row.player_id && row.name);

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

        <RefereeOnboardingManager
          eventId={eventId}
          initialReferees={(refsRaw ?? []) as any[]}
          candidateProfiles={candidateProfiles}
        />
      </div>
    </div>
  );
}
