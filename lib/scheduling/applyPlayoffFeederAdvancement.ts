/** Match row shape used by admin schedule grid / postpone grid. */
export type MatchRowForFeederAdvancement = {
  id: string;
  round: number;
  match_number: number;
  status: string;
  player1_id?: string | null;
  player2_id?: string | null;
  slot1_seed?: number | null;
  slot1_group?: number | null;
  slot2_seed?: number | null;
  slot2_group?: number | null;
  winner_id?: string | null;
  player1?: { id?: string; name?: string; seed?: number | null } | null;
  player2?: { id?: string; name?: string; seed?: number | null } | null;
  winner?: { id?: string; name?: string; seed?: number | null } | null;
};

const WINNER_STATUSES = new Set(["completed", "forfeit", "walkover"]);

function roundNum(m: MatchRowForFeederAdvancement) {
  return Number(m.round) || 0;
}

function matchNum(m: MatchRowForFeederAdvancement) {
  return Number(m.match_number) ?? 0;
}

function playerFromId(
  id: string,
  m: MatchRowForFeederAdvancement,
  playersById?: Map<string, { id: string; name: string; seed?: number | null }>
): { id: string; name: string; seed?: number | null } {
  if (m.winner?.id === id && m.winner.name) return { id: m.winner.id, name: m.winner.name, seed: m.winner.seed };
  if (m.player1?.id === id && m.player1.name) return { id: m.player1.id, name: m.player1.name, seed: m.player1.seed };
  if (m.player2?.id === id && m.player2.name) return { id: m.player2.id, name: m.player2.name, seed: m.player2.seed };
  const pl = playersById?.get(id);
  if (pl) return pl;
  return { id, name: id };
}

/**
 * Fill R2+ sides from feeder matches (completed winner or R1 BYE), aligned with SeasonPlayDisplay.
 */
export function getPlayoffFeederAdvancing(
  m: MatchRowForFeederAdvancement,
  playersById?: Map<string, { id: string; name: string; seed?: number | null }>
): { id: string; name: string; seed?: number | null } | null {
  if (WINNER_STATUSES.has(m.status) && m.winner_id) {
    return playerFromId(m.winner_id, m, playersById);
  }
  if (m.status !== "bye") return null;
  const has1 = m.slot1_seed != null && m.slot1_group != null;
  const has2 = m.slot2_seed != null && m.slot2_group != null;
  if (has1 && has2) return null;
  if (!has1 && !has2) return null;
  if (has1 && m.player1_id) return playerFromId(m.player1_id, m, playersById);
  if (has2 && m.player2_id) return playerFromId(m.player2_id, m, playersById);
  return null;
}

/**
 * Overlay feeder winners onto later-round matches for admin/public schedule lists.
 */
export function applyPlayoffFeederAdvancement<T extends MatchRowForFeederAdvancement>(
  matches: T[],
  playersById?: Map<string, { id: string; name: string; seed?: number | null }>
): T[] {
  const playoff = matches.filter((m) => roundNum(m) >= 1);
  if (playoff.length === 0) return matches;

  const maxRound = Math.max(...playoff.map(roundNum));
  const byKey = new Map<string, T>();
  const working = new Map<string, T>();
  for (const m of matches) {
    if (roundNum(m) >= 1) {
      const key = `${roundNum(m)}-${matchNum(m)}`;
      byKey.set(key, m);
      working.set(m.id, { ...m });
    }
  }

  for (let r = 2; r <= maxRound; r++) {
    for (const m of matches) {
      if (roundNum(m) !== r) continue;
      const mn = matchNum(m);
      if (r === maxRound && mn === 2) continue;

      const feed1Num = (mn - 1) * 2 + 1;
      const feed2Num = (mn - 1) * 2 + 2;
      const prev1 = byKey.get(`${r - 1}-${feed1Num}`);
      const prev2 = byKey.get(`${r - 1}-${feed2Num}`);
      const w = working.get(m.id)!;
      const adv1 = prev1 ? getPlayoffFeederAdvancing(working.get(prev1.id) ?? prev1, playersById) : null;
      const adv2 = prev2 ? getPlayoffFeederAdvancing(working.get(prev2.id) ?? prev2, playersById) : null;

      const base = byKey.get(`${r}-${mn}`)!;
      if (prev1) {
        if (adv1) {
          w.player1_id = adv1.id;
          w.player1 = { id: adv1.id, name: adv1.name, seed: adv1.seed ?? null };
        } else if (base.player1_id) {
          // Feeder not decided in bracket sim yet — keep DB-synced id from match save / syncPlayoffBracketFromR1
          w.player1_id = base.player1_id;
          w.player1 = base.player1
            ? { ...base.player1, id: base.player1_id, name: base.player1.name ?? base.player1_id }
            : playersById?.get(base.player1_id)
              ? {
                  id: base.player1_id,
                  name: playersById.get(base.player1_id)!.name,
                  seed: playersById.get(base.player1_id)!.seed ?? null,
                }
              : { id: base.player1_id, name: base.player1_id, seed: null };
        } else {
          w.player1_id = null;
          w.player1 = null;
        }
      }
      if (prev2) {
        if (adv2) {
          w.player2_id = adv2.id;
          w.player2 = { id: adv2.id, name: adv2.name, seed: adv2.seed ?? null };
        } else if (base.player2_id) {
          w.player2_id = base.player2_id;
          w.player2 = base.player2
            ? { ...base.player2, id: base.player2_id, name: base.player2.name ?? base.player2_id }
            : playersById?.get(base.player2_id)
              ? {
                  id: base.player2_id,
                  name: playersById.get(base.player2_id)!.name,
                  seed: playersById.get(base.player2_id)!.seed ?? null,
                }
              : { id: base.player2_id, name: base.player2_id, seed: null };
        } else {
          w.player2_id = null;
          w.player2 = null;
        }
      }
    }
  }

  return matches.map((m) => (roundNum(m) >= 2 ? (working.get(m.id) ?? m) : m));
}
