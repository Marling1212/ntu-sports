import { createClient } from "@/lib/supabase/server";
import EventDataBackupRestore from "@/components/admin/EventDataBackupRestore";

export default async function EventBackupPage({ params }: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient();
  const { eventId } = await params;

  const { data: event } = await supabase.from("events").select("name").eq("id", eventId).single();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-ntu-green mb-2">資料備份與還原</h1>
      <p className="text-gray-600 mb-8">{event?.name}</p>
      <EventDataBackupRestore eventId={eventId} eventName={event?.name || "Event"} />
    </div>
  );
}
