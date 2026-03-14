import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import CaptainPortalClient from "./CaptainPortalClient";
import type { Player, TeamMember, RosterChangeRequest } from "@/types/database";

interface CaptainPageProps {
  params: Promise<{ token: string }>;
}

export default async function CaptainPortalPage({ params }: CaptainPageProps) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const supabase = createServiceClient();

  const { data: team, error: teamError } = await supabase
    .from("players")
    .select("id, event_id, name")
    .eq("type", "team")
    .eq("custom_fields->>captain_token", token)
    .maybeSingle();

  if (teamError || !team) notFound();

  const [{ data: event }, { data: members }, { data: requests }] = await Promise.all([
    supabase.from("events").select("id, name, sport").eq("id", team.event_id).single(),
    supabase
      .from("team_members")
      .select("*")
      .eq("player_id", team.id)
      .order("jersey_number", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true }),
    supabase
      .from("roster_change_requests")
      .select("*")
      .eq("player_id", team.id)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const teamData = team as Player & { name: string };
  const membersList = (members ?? []) as TeamMember[];
  const changeRequests = (requests ?? []) as RosterChangeRequest[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
          <h1 className="text-xl font-bold text-gray-900">
            {teamData.name}
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {event?.name ?? "賽事"}
            {event?.sport && ` · ${event.sport}`}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {changeRequests.filter((r) => r.status === "rejected" && r.admin_note).length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-2">管理員回覆</h2>
              <ul className="space-y-2 text-sm text-amber-800">
                {changeRequests
                  .filter((r) => r.status === "rejected" && r.admin_note)
                  .slice(0, 5)
                  .map((r) => (
                    <li key={r.id}>
                      {r.admin_note}
                      {r.requested_by && (
                        <span className="text-amber-600 ml-1">（由 {r.requested_by} 申請）</span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">目前名單</h2>
            {membersList.length === 0 ? (
              <p className="text-sm text-gray-500">尚無隊員，請使用下方「申請新增隊員」。</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {membersList.map((m) => (
                  <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-gray-900">
                      {m.name}
                      {m.jersey_number != null && (
                        <span className="text-gray-500 ml-2">#{m.jersey_number}</span>
                      )}
                      {(m as TeamMember & { is_captain?: boolean }).is_captain && (
                        <span className="ml-2 text-xs bg-ntu-green/20 text-ntu-green px-1.5 py-0.5 rounded">隊長</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CaptainPortalClient
            token={token}
            teamId={team.id}
            members={membersList}
            pendingCount={changeRequests.filter((r) => r.status === "pending").length}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600">返回首頁</Link>
      </p>
    </div>
  );
}
