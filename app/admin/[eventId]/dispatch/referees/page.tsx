import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RefereeDirectoryManager from "@/components/admin/RefereeDirectoryManager";

export default async function RefereeDirectoryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;

  const [{ data: event }, { data: refsRaw }] = await Promise.all([
    supabase.from("events").select("id, name").eq("id", eventId).single(),
    supabase
      .from("event_referees")
      .select("id, event_id, user_id, display_name, note")
      .eq("event_id", eventId)
      .order("display_name", { ascending: true }),
  ]);

  return (
    <div className="pt-6 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-ntu-green">Referee Directory</h1>
          <p className="text-lg text-gray-600">
            {event?.name} — Create and maintain your referee list.
          </p>
          <div className="mt-3 flex gap-4">
            <Link
              href={`/admin/${eventId}/dispatch`}
              className="text-sm font-medium text-ntu-green hover:underline"
            >
              ← Back to Dispatch
            </Link>
            <Link
              href={`/admin/${eventId}/dispatch/scheduling`}
              className="text-sm font-medium text-ntu-green hover:underline"
            >
              Open Ref Scheduling →
            </Link>
          </div>
        </div>

        <RefereeDirectoryManager eventId={eventId} initialReferees={refsRaw ?? []} />
      </div>
    </div>
  );
}
