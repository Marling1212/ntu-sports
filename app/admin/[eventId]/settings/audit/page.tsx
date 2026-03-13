import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import AuditLogClient from "@/components/admin/AuditLogClient";

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ entityType?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;
  const { entityType, dateFrom, dateTo } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

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

  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("id", eventId)
    .single();

  let query = supabase
    .from("admin_audit_log")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (entityType && entityType !== "all") {
    query = query.eq("entity_type", entityType);
  }
  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const { data: logs } = await query;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/admin/${eventId}/settings`}
          className="text-ntu-green hover:underline mb-2 inline-block"
        >
          ← 返回設定
        </Link>
        <h1 className="text-3xl font-bold text-ntu-green">操作紀錄 (Audit Log)</h1>
        <p className="text-gray-600 mt-1">{event?.name}</p>
      </div>

      <Suspense fallback={<div className="text-gray-500">載入中…</div>}>
        <AuditLogClient
          eventId={eventId}
          initialLogs={logs ?? []}
          currentUserId={user.id}
          entityTypeFilter={entityType ?? "all"}
          dateFromFilter={dateFrom ?? ""}
          dateToFilter={dateTo ?? ""}
        />
      </Suspense>
    </div>
  );
}
