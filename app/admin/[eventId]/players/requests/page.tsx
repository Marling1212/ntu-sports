import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RequestsList from "./RequestsList";

interface RequestsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function RosterRequestsPage({ params }: RequestsPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .single();

  const { data: requests } = await supabase
    .from("roster_change_requests")
    .select(`
      id,
      player_id,
      action,
      member_data,
      status,
      requested_by,
      admin_note,
      created_at
    `)
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const teamIds = [...new Set((requests ?? []).map((r) => r.player_id))];
  const { data: teams } = teamIds.length
    ? await supabase.from("players").select("id, name").in("id", teamIds)
    : { data: [] as { id: string; name: string }[] };
  const teamNames = Object.fromEntries((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/admin/${eventId}/players`}
          className="text-ntu-green hover:underline text-sm font-medium"
        >
          ← 返回選手／隊伍表
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        名單變更申請
      </h1>
      <p className="text-gray-600 mb-6">
        {event?.name ?? "賽事"} · 審核隊長送出的名單異動
      </p>

      {!requests?.length ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-600">
          目前沒有待審核的申請。
        </div>
      ) : (
        <RequestsList
          eventId={eventId}
          requests={requests.map((r) => ({
            ...r,
            team_name: teamNames[r.player_id] ?? "—",
          }))}
        />
      )}
    </div>
  );
}
