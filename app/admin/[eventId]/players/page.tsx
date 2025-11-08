import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import PlayersTable from "@/components/admin/PlayersTable";
import GenerateBracket from "@/components/admin/GenerateBracket";
import GenerateSeasonPlay from "@/components/admin/GenerateSeasonPlay";
import ImportBracket from "@/components/admin/ImportBracket";

export default async function PlayersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient();
  const { eventId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is an organizer for this event
  const { data: organizer } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (!organizer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p>You are not an authorized organizer for this event.</p>
      </div>
    );
  }

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  // Get players for this event
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Manage Players</h1>
          <p className="text-lg text-gray-600">{event?.name}</p>
        </div>

        {event?.tournament_type === 'season_play' ? (
          <GenerateSeasonPlay 
            eventId={eventId}
            players={players || []}
          />
        ) : (
          <div className="space-y-6">
            <GenerateBracket 
              eventId={eventId}
              players={players || []}
            />
            <ImportBracket 
              eventId={eventId}
              players={players || []}
            />
          </div>
        )}

        <PlayersTable eventId={eventId} initialPlayers={players || []} />
      </div>
    </>
  );
}

