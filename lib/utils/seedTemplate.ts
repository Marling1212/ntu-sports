/**
 * Standard outer-to-inner mirrored seeding template generator for single-elimination brackets.
 *
 * Symmetrical bracket properties for any draw size N (power of 2):
 * - Seed 1 is always placed at slot index 0 (outer extreme top of Top Half).
 * - Seed 2 is always placed at slot index N - 1 (outer extreme bottom of Bottom Half).
 * - Quarter 1 (top of top half) meets Quarter 2 (bottom of top half) in Semifinal 1.
 * - Quarter 3 (top of bottom half) meets Quarter 4 (bottom of bottom half) in Semifinal 2.
 * - Seeds 1 and 2 can only project to meet in the Championship Final (Round log2(N)).
 *
 * Example outputs:
 * - Size 2: [1, 2]
 * - Size 4: [1, 4, 3, 2]
 * - Size 8: [1, 8, 4, 5, 3, 6, 7, 2]
 * - Size 16: [1, 16, 8, 9, 4, 13, 5, 12, 3, 14, 6, 11, 7, 10, 15, 2]
 */
export function buildSeedTemplate(size: number): number[] {
  if (size <= 1) return [1];
  if (size === 2) return [1, 2];
  const rounds = Math.log2(size);
  let bracket = [1, 2];
  for (let r = 2; r <= rounds; r++) {
    const curSize = Math.pow(2, r);
    const next: number[] = [];
    for (let i = 0; i < bracket.length; i++) {
      const s = bracket[i];
      const opp = curSize + 1 - s;
      if (s === 2 && i === bracket.length - 1) {
        // Outer extreme: complement first, Seed 2 anchored at the last slot (boundary - 1)
        next.push(opp);
        next.push(s);
      } else {
        next.push(s);
        next.push(opp);
      }
    }
    bracket = next;
  }
  return bracket;
}

