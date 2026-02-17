"use server";

import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  round: number;
  match_number: number;
  status: string | null;
  slot1_seed: number | null;
  slot1_group: number | null;
  slot2_seed: number | null;
  slot2_group: number | null;
};

/**
 * Recompute R2+ slot1/slot2 from current R1 (and above) slot state.
 * Only advance when status is "bye" and exactly one slot is filled (true BYE). TBD (one slot empty, status not bye) does not advance.
 */
export async function syncPlayoffBracketFromR1(eventId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: rows, error: fetchErr } = await supabase
    .from("matches")
    .select("id, round, match_number, status, slot1_seed, slot1_group, slot2_seed, slot2_group")
    .eq("event_id", eventId)
    .gte("round", 1)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!rows?.length) return { ok: true };

  const matches = rows as Row[];
  const maxRound = Math.max(...matches.map((m) => m.round));
  const roundNum = (m: Row) => Number(m.round) || 0;
  const matchNum = (m: Row) => Number(m.match_number) ?? 0;

  const getAdvancingSlot = (m: Row): { seed: number; group: number } | null => {
    if (m.status !== "bye") return null; // TBD (one side empty) is not a bye
    const has1 = m.slot1_seed != null && m.slot1_group != null;
    const has2 = m.slot2_seed != null && m.slot2_group != null;
    if (has1 && !has2) return { seed: m.slot1_seed!, group: m.slot1_group! };
    if (!has1 && has2) return { seed: m.slot2_seed!, group: m.slot2_group! };
    return null;
  };

  const findMatch = (round: number, matchNumber: number) =>
    matches.find((m) => roundNum(m) === round && matchNum(m) === matchNumber);

  for (const m of matches) {
    const r = roundNum(m);
    if (r < 2) continue;
    if (r === maxRound && matchNum(m) === 2) continue; // 3rd place match

    const prevRound = r - 1;
    const mn = matchNum(m);
    const feed1Num = (mn - 1) * 2 + 1;
    const feed2Num = (mn - 1) * 2 + 2;
    const prev1 = findMatch(prevRound, feed1Num);
    const prev2 = findMatch(prevRound, feed2Num);

    const adv1 = prev1 ? getAdvancingSlot(prev1) : null;
    const adv2 = prev2 ? getAdvancingSlot(prev2) : null;

    const updates: {
      slot1_seed: number | null;
      slot1_group: number | null;
      slot2_seed: number | null;
      slot2_group: number | null;
    } = {
      slot1_seed: adv1?.seed ?? null,
      slot1_group: adv1?.group ?? null,
      slot2_seed: adv2?.seed ?? null,
      slot2_group: adv2?.group ?? null,
    };

    const { error: updateErr } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", m.id);

    if (updateErr) return { ok: false, error: updateErr.message };
  }

  return { ok: true };
}
