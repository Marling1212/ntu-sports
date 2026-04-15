import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import RefereeOnboardingWizard from "@/components/admin/RefereeOnboardingWizard";
import RefereeSchedulingManager from "@/components/admin/RefereeSchedulingManager";
import RefereeDispatchBoard from "@/components/admin/RefereeDispatchBoard";

export default async function DispatchPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;

  const { data: eventPlayers } = await supabase
    .from("players")
    .select("id, name, email, type")
    .eq("event_id", eventId)
    .order("name", { ascending: true });
  const eventPlayerIds = (eventPlayers ?? []).map((p) => p.id);

  const [
    { data: event },
    { data: refsRaw },
    { data: rosterRaw },
    { data: teamMembersRaw },
    { data: matchesRaw },
    { data: availabilityRaw },
    { data: slotTemplatesRaw },
  ] = await Promise.all([
    supabase.from("events").select("id, name").eq("id", eventId).single(),
    supabase
      .from("event_referees")
      .select("id, event_id, user_id, display_name, email, linked_player_id, note")
      .eq("event_id", eventId)
      .order("display_name", { ascending: true }),
    supabase
      .from("team_rosters")
      .select("*, player:players!team_rosters_team_id_fkey(id, name, email)")
      .in("team_id", eventPlayerIds.length ? eventPlayerIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("team_members")
      .select("id, name, player_id, team:players!team_members_player_id_fkey(id, name, email)")
      .in("player_id", eventPlayerIds.length ? eventPlayerIds : ["00000000-0000-0000-0000-000000000000"])
      .order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("id, round, match_number, court, scheduled_time, player1_id, player2_id")
      .eq("event_id", eventId)
      .neq("status", "bye")
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
    supabase
      .from("referee_availability_templates")
      .select("id, user_id, slot_template_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_slot_templates")
      .select("id, day_of_week, start_time, end_time, code")
      .eq("event_id", eventId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const matches = (matchesRaw ?? []).map((match) => ({
    ...match,
    court: match.court ?? null,
    player1_id: match.player1_id ?? null,
    player2_id: match.player2_id ?? null,
    scheduled_time: match.scheduled_time ?? null,
  }));

  const matchIds = matches.map((match) => match.id);
  const { data: assignmentsRaw } = await supabase
    .from("match_referees")
    .select("match_id, user_id, role, wage")
    .in("match_id", matchIds.length ? matchIds : ["00000000-0000-0000-0000-000000000000"]);
  const teamIds = Array.from(
    new Set(
      matches
        .flatMap((match) => [match.player1_id, match.player2_id])
        .filter(Boolean) as string[]
    )
  );

  const { data: teamRostersRaw } = await supabase
    .from("team_rosters")
    .select("team_id, user_id")
    .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: teamsRaw } = await supabase
    .from("players")
    .select("id, name")
    .in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const teamLabelMap: Record<string, string> = {};
  for (const team of teamsRaw ?? []) {
    teamLabelMap[team.id] = team.name ?? team.id;
  }

  const assignments = (assignmentsRaw ?? []).map((row) => ({
    ...row,
    wage: Number(row.wage) || 0,
  }));
  const teamRosters = teamRostersRaw ?? [];

  const candidateUserIds = Array.from(new Set([...(refsRaw ?? []).map((row) => row.user_id), ...(assignmentsRaw ?? []).map((row) => row.user_id)])).filter(Boolean);

  const userLabelMap: Record<string, string> = {};
  for (const row of refsRaw ?? []) {
    if (row.display_name?.trim()) userLabelMap[row.user_id] = row.display_name.trim();
  }
  for (const userId of candidateUserIds) {
    if (!userLabelMap[userId]) userLabelMap[userId] = `User ${userId.slice(0, 8)}`;
  }

  const grouped = new Map<
    string,
    { user_id: string; linked_player_id: string | null; name: string; email: string | null; teams: string[] }
  >();
  const userIds = Array.from(new Set((rosterRaw ?? []).map((r: any) => r.user_id).filter(Boolean)));
  const authNameByUserId = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    try {
      const service = createServiceClient();
      const authRows = await Promise.allSettled(
        userIds.slice(0, 300).map(async (userId) => {
          const { data } = await service.auth.admin.getUserById(userId);
          return {
            userId,
            name:
              (data.user?.user_metadata?.name as string | undefined) ||
              (data.user?.user_metadata?.full_name as string | undefined) ||
              null,
            email: data.user?.email ?? null,
          };
        })
      );
      for (const row of authRows) {
        if (row.status === "fulfilled" && row.value.userId) {
          authNameByUserId.set(row.value.userId, {
            name: row.value.name,
            email: row.value.email,
          });
        }
      }
    } catch {
      // Keep roster-only fallback when service role is unavailable.
    }
  }

  for (const row of rosterRaw ?? []) {
    const playerRow = Array.isArray((row as any).player) ? (row as any).player[0] : (row as any).player;
    const rawRow = row as Record<string, unknown>;
    const userId = (row as any).user_id as string;
    const playerId = playerRow?.id as string;
    const teamName = playerRow?.name as string;
    const authProfile = authNameByUserId.get(userId);
    const rosterName =
      authProfile?.name ||
      (typeof rawRow.name === "string" && rawRow.name) ||
      (typeof rawRow.member_name === "string" && rawRow.member_name) ||
      (typeof rawRow.user_name === "string" && rawRow.user_name) ||
      (typeof rawRow.display_name === "string" && rawRow.display_name) ||
      (typeof rawRow.student_id === "string" && rawRow.student_id) ||
      userId;
    const email =
      authProfile?.email ||
      ((typeof rawRow.email === "string" && rawRow.email) as string | undefined) ||
      ((typeof rawRow.user_email === "string" && rawRow.user_email) as string | undefined) ||
      (playerRow?.email as string | null) ||
      null;
    if (!userId) continue;
    const prev = grouped.get(userId);
    if (!prev) {
      grouped.set(userId, {
        user_id: userId,
        linked_player_id: playerId || null,
        name: rosterName,
        email,
        teams: teamName ? [teamName] : [],
      });
    } else if (teamName && !prev.teams.includes(teamName)) {
      prev.teams.push(teamName);
    }
  }
  const candidateIdentities = Array.from(grouped.values());
  const manualPlayerOptionsFromMembers = (teamMembersRaw ?? []).map((m: any) => {
    const team = Array.isArray(m.team) ? m.team[0] : m.team;
    const teamName = (team?.name as string | undefined) ?? "Team";
    return {
      option_id: `${m.player_id as string}::member::${m.id as string}`,
      team_id: m.player_id as string,
      team_name: teamName,
      player_id: m.player_id as string,
      name: m.name as string,
      email: (team?.email as string | null) ?? null,
      member_name: m.name as string,
    };
  });
  const manualPlayerOptionsFromPlayers = (eventPlayers ?? []).map((p: any) => ({
    option_id: `${p.id as string}::player`,
    team_id: p.id as string,
    team_name: p.type === "team" ? (p.name as string) : "Individual Players",
    player_id: p.id as string,
    name: p.name as string,
    email: (p.email as string | null) ?? null,
    member_name: p.type === "team" ? null : (p.name as string),
  }));
  const manualPlayerOptions = [...manualPlayerOptionsFromMembers, ...manualPlayerOptionsFromPlayers].filter(
    (option, index, arr) => index === arr.findIndex((x) => x.option_id === option.option_id)
  );
  const manualTeams = Array.from(
    new Map(
      manualPlayerOptions.map((option) => [
        option.team_id,
        { team_id: option.team_id, team_name: option.team_name },
      ])
    ).values()
  ).sort((a, b) => a.team_name.localeCompare(b.team_name));

  return (
    <div className="pt-6 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-ntu-green">Referee Operations</h1>
          <p className="text-lg text-gray-600">
            {event?.name} — One flow: directory, availability, then dispatch.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium">
            <a href="#ref-directory" className="rounded-full border border-ntu-green px-3 py-1 text-ntu-green hover:bg-ntu-green hover:text-white">
              1. Ref Directory
            </a>
            <span className="text-gray-400">→</span>
            <a href="#ref-availability" className="rounded-full border border-ntu-green px-3 py-1 text-ntu-green hover:bg-ntu-green hover:text-white">
              2. Ref Availability
            </a>
            <span className="text-gray-400">→</span>
            <a href="#ref-dispatch" className="rounded-full border border-ntu-green px-3 py-1 text-ntu-green hover:bg-ntu-green hover:text-white">
              3. Dispatch
            </a>
          </div>
        </div>

        <div className="space-y-8">
          <section id="ref-directory" className="scroll-mt-24">
            <RefereeOnboardingWizard
              eventId={eventId}
              initialReferees={(refsRaw ?? []) as any[]}
              candidateIdentities={candidateIdentities}
              manualPlayerOptions={manualPlayerOptions}
              manualTeams={manualTeams}
            />
          </section>

          <section id="ref-availability" className="scroll-mt-24">
            <RefereeSchedulingManager
              eventId={eventId}
              initialAvailability={availabilityRaw ?? []}
              slotTemplates={slotTemplatesRaw ?? []}
              candidateUserIds={candidateUserIds}
              userLabelMap={userLabelMap}
            />
          </section>

          <section id="ref-dispatch" className="scroll-mt-24">
            <RefereeDispatchBoard
              eventId={eventId}
              matches={matches}
              initialAssignments={assignments}
              teamRosters={teamRosters}
              availabilityTemplates={availabilityRaw ?? []}
              slotTemplates={slotTemplatesRaw ?? []}
              candidateUserIds={candidateUserIds}
              teamLabelMap={teamLabelMap}
              userLabelMap={userLabelMap}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
