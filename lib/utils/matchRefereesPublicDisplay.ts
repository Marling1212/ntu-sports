import { createServiceClient } from "@/lib/supabase/service";

export type MatchRefereePublicLine = { displayName: string; jobName: string };

/**
 * Read-only: match officials for a public match page (service role; no PII beyond names shown on site).
 */
export async function getMatchRefereesPublicDisplay(
  eventId: string,
  matchId: string
): Promise<MatchRefereePublicLine[]> {
  try {
    const service = createServiceClient();
    const { data: mr, error: mrErr } = await service
      .from("match_referees")
      .select("user_id, role")
      .eq("match_id", matchId);
    if (mrErr || !mr?.length) return [];

    const userIds = [...new Set(mr.map((r) => r.user_id as string))];
    const { data: dirs } = await service
      .from("event_referees")
      .select("user_id, display_name")
      .eq("event_id", eventId)
      .in("user_id", userIds);

    const { data: jobs } = await service
      .from("event_referee_jobs")
      .select("id, name")
      .eq("event_id", eventId);

    const dirMap = new Map(
      (dirs ?? []).map((d) => [d.user_id as string, ((d.display_name as string) || "").trim()])
    );
    const jobMap = new Map((jobs ?? []).map((j) => [j.id as string, (j.name as string) || ""]));

    return mr.map((row) => {
      const uid = row.user_id as string;
      const jid = typeof row.role === "string" && row.role.startsWith("job:") ? row.role.slice(4) : "";
      const jobName = (jid && jobMap.get(jid)) || (typeof row.role === "string" ? row.role : "Official");
      const displayName = dirMap.get(uid) || "Official";
      return {
        displayName: displayName || "Official",
        jobName,
      };
    });
  } catch {
    return [];
  }
}
