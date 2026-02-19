import { createClient } from "@/lib/supabase/server";
import { getSportMatches } from "@/lib/utils/getSportEvent";
import { EventNavProvider } from "@/lib/context/EventNavContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TennisEventLayout({
  params,
  children,
}: {
  params: Promise<{ eventId: string }>;
  children: React.ReactNode;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("tournament_type")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .maybeSingle();

  let regularSeasonComplete: boolean | undefined;
  if (event?.tournament_type === "season_play") {
    const dbMatches = await getSportMatches(eventId);
    const regularMatches = (dbMatches || []).filter((m: { round: number }) => m.round === 0);
    regularSeasonComplete =
      regularMatches.length > 0 &&
      regularMatches.every((m: { status: string }) => m.status === "completed" || m.status === "bye");
  }

  return (
    <EventNavProvider
      regularSeasonComplete={regularSeasonComplete}
      tournamentType={event?.tournament_type}
    >
      {children}
    </EventNavProvider>
  );
}
