import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RefereeSchedulingManager from "@/components/admin/RefereeSchedulingManager";

export default async function RefereeSchedulingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;
  const { data: eventMatchIds } = await supabase
    .from("matches")
    .select("id")
    .eq("event_id", eventId);
  const matchIds = (eventMatchIds ?? []).map((m) => m.id);

  const [{ data: event }, { data: availabilityRaw }, { data: assignmentsRaw }, { data: organizersRaw }, { data: slotTemplatesRaw }] =
    await Promise.all([
      supabase.from("events").select("id, name").eq("id", eventId).single(),
      supabase
        .from("referee_availability_templates")
        .select("id, user_id, slot_template_id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase
        .from("match_referees")
        .select("user_id")
        .in(
          "match_id",
          matchIds.length ? matchIds : ["00000000-0000-0000-0000-000000000000"]
        ),
      supabase.from("organizers").select("user_id").eq("event_id", eventId),
      supabase
        .from("event_slot_templates")
        .select("id, day_of_week, start_time, end_time, code")
        .eq("event_id", eventId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
    ]);
  const { data: eventRefsRaw } = await supabase
    .from("event_referees")
    .select("user_id, display_name, email")
    .eq("event_id", eventId);

  const candidateUserIds = Array.from(
    new Set([
      ...(availabilityRaw ?? []).map((r) => r.user_id),
      ...(assignmentsRaw ?? []).map((r) => r.user_id),
      ...(eventRefsRaw ?? []).map((r) => r.user_id),
      ...(organizersRaw ?? []).map((r) => r.user_id),
    ])
  );

  const userLabelMap: Record<string, string> = {};
  for (const row of eventRefsRaw ?? []) {
    if (row.display_name?.trim()) userLabelMap[row.user_id] = row.display_name.trim();
  }
  for (const userId of candidateUserIds) {
    if (!userLabelMap[userId]) userLabelMap[userId] = `User ${userId.slice(0, 8)}`;
  }

  return (
    <div className="pt-6 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-ntu-green">Referee Scheduling</h1>
          <p className="text-lg text-gray-600">
            {event?.name} — Manage referee availability in a separate scheduling workspace.
          </p>
          <div className="mt-3">
            <Link
              href={`/admin/${eventId}/referees`}
              className="mr-4 text-sm font-medium text-ntu-green hover:underline"
            >
              Manage Referees →
            </Link>
            <Link
              href={`/admin/${eventId}/dispatch`}
              className="text-sm font-medium text-ntu-green hover:underline"
            >
              ← Back to Referee Dispatch
            </Link>
          </div>
        </div>

        <RefereeSchedulingManager
          eventId={eventId}
          initialAvailability={availabilityRaw ?? []}
          slotTemplates={slotTemplatesRaw ?? []}
          candidateUserIds={candidateUserIds}
          userLabelMap={userLabelMap}
        />
      </div>
    </div>
  );
}
