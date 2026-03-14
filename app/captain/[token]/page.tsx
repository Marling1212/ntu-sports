import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import CaptainPortalClient from "./CaptainPortalClient";
import type { Player, TeamMember, RosterChangeRequest, TeamBlackout } from "@/types/database";

interface CaptainPageProps {
  params: Promise<{ token: string }>;
}

export default async function CaptainPortalPage({ params }: CaptainPageProps) {
  const rawToken = (await params).token ?? "";
  const token = rawToken.trim();
  if (!token) notFound();

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error("[Captain portal] Service client init failed (check SUPABASE_SERVICE_ROLE_KEY):", e);
    notFound();
  }

  let team: { id: string; event_id: string; name: string } | null = null;
  let teamError: Error | null = null;

  const byContains = await supabase
    .from("players")
    .select("id, event_id, name")
    .eq("type", "team")
    .contains("custom_fields", { captain_token: token })
    .maybeSingle();
  if (byContains.error) teamError = byContains.error;
  else if (byContains.data) team = byContains.data;

  if (!team) {
    const byKey = await supabase
      .from("players")
      .select("id, event_id, name")
      .eq("type", "team")
      .eq("custom_fields->>captain_token", token)
      .maybeSingle();
    if (!byKey.error && byKey.data) team = byKey.data;
  }

  if (teamError && !team) notFound();
  if (!team) notFound();

  const [{ data: event }, { data: members }, { data: requests }, { data: blackouts }] = await Promise.all([
    supabase.from("events").select("id, name, sport, captain_blackouts_open, blackout_limit").eq("id", team.event_id).maybeSingle(),
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
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("team_blackouts")
      .select("*")
      .eq("player_id", team.id)
      .eq("event_id", team.event_id)
      .order("start_time", { ascending: true }),
  ]);

  const teamData = team as Player & { name: string };
  const membersList = (members ?? []) as TeamMember[];
  const changeRequests = (requests ?? []) as RosterChangeRequest[];
  const captainBlackoutsOpen = !!(event as { captain_blackouts_open?: boolean } | null)?.captain_blackouts_open;
  const blackoutLimit = (event as { blackout_limit?: number | null } | null)?.blackout_limit ?? null;
  const blackoutsList = (blackouts ?? []) as TeamBlackout[];

  const actionLabel = (r: RosterChangeRequest) => {
    const a = r.action;
    const md = (r.member_data || {}) as Record<string, unknown>;
    const name = md.name != null ? String(md.name) : "";
    if (a === "add") return `新增：${name || "—"}`;
    if (a === "update") return `編輯：${name || "—"}`;
    if (a === "remove") return "移除隊員";
    return r.action;
  };

  const statusLabel: Record<string, { text: string; className: string }> = {
    pending: { text: "審核中", className: "bg-amber-100 text-amber-800" },
    approved: { text: "已核准", className: "bg-green-100 text-green-800" },
    rejected: { text: "已拒絕", className: "bg-red-100 text-red-800" },
  };

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
          {changeRequests.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">名單變更申請狀態</h2>
              <ul className="space-y-2">
                {changeRequests.map((r) => {
                  const status = statusLabel[r.status] ?? { text: r.status, className: "bg-gray-100 text-gray-700" };
                  return (
                    <li key={r.id} className="flex flex-wrap items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${status.className}`}>
                        {status.text}
                      </span>
                      <span className="text-sm text-gray-700">{actionLabel(r)}</span>
                      {r.requested_by && (
                        <span className="text-xs text-gray-500">（{r.requested_by}）</span>
                      )}
                      {r.status === "rejected" && r.admin_note && (
                        <span className="w-full text-sm text-red-700 mt-1">管理員說明：{r.admin_note}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
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
            captainBlackoutsOpen={captainBlackoutsOpen}
            blackouts={blackoutsList}
            blackoutLimit={blackoutLimit}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600">返回首頁</Link>
      </p>
    </div>
  );
}
