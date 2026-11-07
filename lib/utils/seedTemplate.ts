/**
 * Universal recursive outer-to-inner mirrored seeding template generator for single-elimination brackets.
 *
 * Symmetrical bracket properties for any draw size N (power of 2: 4, 8, 16, 32, 64, 128, ...):
 * - Seed 1 is always placed at slot index 0 (outer extreme top of Top Half).
 * - Seed 2 is always placed at slot index N - 1 (outer extreme bottom of Bottom Half).
 * - Seed 4 anchors the bottom extreme of the Top Half (e.g. Slot 3 in 8-draw, Slot 7 in 16-draw).
 * - Seed 3 anchors the top extreme of the Bottom Half (e.g. Slot 4 in 8-draw, Slot 8 in 16-draw).
 * - Within every sub-bracket / match block, higher seeds anchor the outer boundaries so branches fold inward cleanly.
 *
 * Example outputs:
 * - Size 2: [1, 2]
 * - Size 4: [1, 4, 3, 2]
 * - Size 8: [1, 8, 5, 4, 3, 6, 7, 2]
 * - Size 16: [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2]
 */
export function buildSeedTemplate(size: number): number[] {
  if (size <= 1) return [1];
  if (size === 2) return [1, 2];

  const rounds = Math.log2(size);
  if (!Number.isInteger(rounds)) {
    throw new Error(`Bracket size must be a power of 2, received: ${size}`);
  }

  let template = [1, 2];
  for (let r = 2; r <= rounds; r++) {
    const currentSize = 2 ** r;
    const nextTemplate: number[] = [];
    for (let i = 0; i < template.length; i++) {
      const seed = template[i];
      const pairedSeed = currentSize + 1 - seed;
      // Invert odd-indexed match pairs so the higher seed anchors the outer boundary
      if (i % 2 === 0) {
        nextTemplate.push(seed, pairedSeed);
      } else {
        nextTemplate.push(pairedSeed, seed);
      }
    }
    template = nextTemplate;
  }
  return template;
}
