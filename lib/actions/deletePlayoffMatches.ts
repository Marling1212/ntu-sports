"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Delete all playoff matches (round >= 1) for an event.
 * Uses server Supabase client so auth/session is consistent (fixes client-side delete returning 0 rows).
 */
export async function deletePlayoffMatches(eventId: string): Promise<{ deleted: number; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .delete()
    .eq("event_id", eventId)
    .gte("round", 1)
    .select("id");
  if (error) return { deleted: 0, error: error.message };
  return { deleted: data?.length ?? 0 };
}
