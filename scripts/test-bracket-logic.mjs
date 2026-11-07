#!/usr/bin/env node
/**
 * Test script for bracket generation logic and UI slot mapping
 * Run: node scripts/test-bracket-logic.mjs
 */

// Mock players: 3 seeds (1,2,3) + N unseeded (seed 0 = null)
function makePlayers(count, numSeeds = 3) {
  const players = [];
  for (let i = 0; i < numSeeds; i++) {
    players.push({ id: `s${i + 1}`, name: `Seed${i + 1}`, seed: i + 1 });
  }
  for (let i = numSeeds; i < count; i++) {
    players.push({ id: `u${i}`, name: `Unseeded${i}`, seed: null });
  }
  return players;
}

// Run bracket logic (simplified from GenerateBracket.tsx)
function runBracketLogic(players) {
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
  const numByes = bracketSize - players.length;

  const seeded = players.filter((p) => p.seed).sort((a, b) => (a.seed || 0) - (b.seed || 0));
  const shuffledUnseeded = [...players.filter((p) => !p.seed)];

  const seed1 = seeded.find((p) => p.seed === 1);
  const seed2 = seeded.find((p) => p.seed === 2);
  const seeds34 = seeded.filter((p) => p.seed === 3 || p.seed === 4);
  const seeds58 = seeded.filter((p) => p.seed && p.seed >= 5 && p.seed <= 8);

  const positions = new Array(bracketSize).fill(null);

  if (seed1) positions[0] = seed1;
  if (seed2) positions[bracketSize - 1] = seed2;

  const pos34 = [Math.floor(bracketSize / 2), Math.floor(bracketSize / 2) - 1];
  seeds34.forEach((player, index) => {
    if (pos34[index] !== undefined) positions[pos34[index]] = player;
  });

  const pos58 = [
    Math.floor(bracketSize / 4),
    bracketSize - 1 - Math.floor(bracketSize / 4),
    Math.floor(bracketSize / 2) + Math.floor(bracketSize / 4),
    Math.floor(bracketSize / 4) - 1,
  ].filter((p) => p >= 0 && p < bracketSize);
  seeds58.forEach((player, index) => {
    if (pos58[index] !== undefined) positions[pos58[index]] = player;
  });

  const remainingSlots = bracketSize - seeded.length * 2;
  const unseededMatchesPossible = Math.floor(Math.min(remainingSlots, shuffledUnseeded.length) / 2);
  const seedsWithAdvantage = Math.min(seeded.length, unseededMatchesPossible);

  let unseededIndex = 0;
  const seedPositions = [];
  positions.forEach((p, i) => {
    if (p && p.seed) seedPositions.push(i);
  });
  seedPositions.sort((a, b) => (positions[a]?.seed || 999) - (positions[b]?.seed || 999));

  for (let i = 0; i < seedsWithAdvantage && unseededIndex + 1 < shuffledUnseeded.length; i++) {
    const seedPos = seedPositions[i];
    const round1MatchNum = Math.floor(seedPos / 2);
    const opponentMatchNum = round1MatchNum % 2 === 0 ? round1MatchNum + 1 : round1MatchNum - 1;
    const op1 = opponentMatchNum * 2;
    const op2 = op1 + 1;
    if (!positions[op1] && !positions[op2]) {
      positions[op1] = shuffledUnseeded[unseededIndex++];
      positions[op2] = shuffledUnseeded[unseededIndex++];
    }
  }

  const emptyPairs = [];
  for (let i = 0; i < bracketSize; i += 2) {
    if ((positions[i]?.seed || positions[i + 1]?.seed)) continue;
    if (!positions[i] || !positions[i + 1]) emptyPairs.push([i, i + 1]);
  }
  const fullyEmptyPairs = emptyPairs.filter(([p1, p2]) => !positions[p1] && !positions[p2]);

  fullyEmptyPairs.forEach(([pos1, pos2]) => {
    if (unseededIndex < shuffledUnseeded.length) {
      const fillPos = Math.random() < 0.5 ? pos1 : pos2;
      positions[fillPos] = shuffledUnseeded[unseededIndex++];
    }
  });

  if (numByes === 0) {
    for (let i = 0; i < bracketSize; i++) {
      if (!positions[i] && unseededIndex < shuffledUnseeded.length) {
        positions[i] = shuffledUnseeded[unseededIndex++];
      }
    }
  } else {
    const seedByesNeeded = Math.min(seeded.length, numByes);
    const seedOpponentPositionsForBye = new Set();
    for (let i = 0; i < seedByesNeeded && i < seedPositions.length; i++) {
      const seedPos = seedPositions[i];
      const matchPos = Math.floor(seedPos / 2) * 2;
      const opponentPos = seedPos % 2 === 0 ? matchPos + 1 : matchPos;
      if (!positions[opponentPos]) seedOpponentPositionsForBye.add(opponentPos);
    }
    for (let i = 0; i < bracketSize; i++) {
      if (!positions[i] && unseededIndex < shuffledUnseeded.length && !seedOpponentPositionsForBye.has(i)) {
        positions[i] = shuffledUnseeded[unseededIndex++];
      }
    }
  }

  let seedByeCount = 0;
  let unseededByeCount = 0;
  let byeVsByeCount = 0;
  let filledCount = 0;
  for (let i = 0; i < bracketSize; i += 2) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    if (!p1 && !p2) byeVsByeCount++;
    else if (p1?.seed && !p2) seedByeCount++;
    else if (p2?.seed && !p1) seedByeCount++;
    else if ((p1 && !p2) || (p2 && !p1)) unseededByeCount++;
    if (p1) filledCount++;
    if (p2) filledCount++;
  }

  return {
    bracketSize,
    numByes,
    positions,
    seedByeCount,
    unseededByeCount,
    byeVsByeCount,
    filledCount,
    unseededUsed: unseededIndex,
    totalUnseeded: shuffledUnseeded.length,
    seededCount: seeded.length,
  };
}

// Tests
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log("  ✓", msg);
    passed++;
  } else {
    console.log("  ✗ FAIL:", msg);
    failed++;
  }
}

console.log("\n=== Bracket Logic Tests ===\n");

// Test 1: 16 players - no BYE
console.log("Test 1: 16 players (3 seeds, 13 unseeded)");
for (let run = 0; run < 5; run++) {
  const players = makePlayers(16);
  const result = runBracketLogic(players);
  assert(result.numByes === 0, `numByes = 0`);
  assert(result.seedByeCount === 0, `No seed gets BYE`);
  assert(result.byeVsByeCount === 0, `No BYE vs BYE`);
  assert(result.filledCount === 16, `All 16 positions filled`);
  assert(result.unseededUsed === 13, `All 13 unseeded placed`);
}
console.log("");

// Test 2: 15 players - 1 BYE for seed 1 only
console.log("Test 2: 15 players - 1 BYE, only seed 1 gets it");
for (let run = 0; run < 5; run++) {
  const players = makePlayers(15);
  const result = runBracketLogic(players);
  assert(result.numByes === 1, `numByes = 1`);
  assert(result.seedByeCount === 1, `Exactly 1 seed BYE`);
  assert(result.unseededByeCount === 0, `No unseeded BYE`);
  assert(result.byeVsByeCount === 0, `No BYE vs BYE`);
  assert(result.filledCount === 15, `15 positions filled`);
  assert(result.unseededUsed === 12, `All 12 unseeded placed`);
}
console.log("");

// Test 3: 10 players - 6 BYEs (seeds prioritized)
console.log("Test 3: 10 players - 6 BYEs");
for (let run = 0; run < 3; run++) {
  const players = makePlayers(10);
  const result = runBracketLogic(players);
  assert(result.numByes === 6, `numByes = 6`);
  assert(result.seedByeCount <= 3, `At most 3 seed BYEs`);
  assert(result.unseededUsed === 7, `All 7 unseeded placed`);
}
console.log("");

// Test 4: pos58 bounds - bracketSize 2
console.log("Test 4: 2 players (edge case - pos58)");
const players2 = makePlayers(2, 2);
const result2 = runBracketLogic(players2);
assert(result2.byeVsByeCount === 0, `No BYE vs BYE with 2 players`);
assert(result2.filledCount === 2, `2 positions filled`);
console.log("");

// Test 5: Outer-to-inner mirrored buildSeedTemplate
console.log("Test 5: buildSeedTemplate across sizes 4, 8, 16, 32, 64");
function buildSeedTemplate(size) {
  if (size <= 1) return [1];
  if (size === 2) return [1, 2];
  const rounds = Math.log2(size);
  let bracket = [1, 2];
  for (let r = 2; r <= rounds; r++) {
    const curSize = Math.pow(2, r);
    const next = [];
    for (let i = 0; i < bracket.length; i++) {
      const s = bracket[i];
      const opp = curSize + 1 - s;
      if (s === 2 && i === bracket.length - 1) {
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

const t4 = buildSeedTemplate(4);
assert(JSON.stringify(t4) === JSON.stringify([1, 4, 3, 2]), "Size 4 is [1, 4, 3, 2]");
assert(t4[0] === 1 && t4[3] === 2, "Size 4: Seed 1 at slot 0, Seed 2 at slot 3");

const t8 = buildSeedTemplate(8);
assert(JSON.stringify(t8) === JSON.stringify([1, 8, 4, 5, 3, 6, 7, 2]), "Size 8 is [1, 8, 4, 5, 3, 6, 7, 2]");
assert(t8[0] === 1 && t8[7] === 2, "Size 8: Seed 1 at slot 0, Seed 2 at slot 7");

const t16 = buildSeedTemplate(16);
assert(
  JSON.stringify(t16) === JSON.stringify([1, 16, 8, 9, 4, 13, 5, 12, 3, 14, 6, 11, 7, 10, 15, 2]),
  "Size 16 matches outer-to-inner mirrored complementary template"
);
assert(t16[0] === 1 && t16[15] === 2, "Size 16: Seed 1 at slot 0, Seed 2 at slot 15");

[4, 8, 16, 32, 64].forEach((sz) => {
  const t = buildSeedTemplate(sz);
  assert(t[0] === 1, `Size ${sz}: Seed 1 is at index 0`);
  assert(t[sz - 1] === 2, `Size ${sz}: Seed 2 is at index ${sz - 1} (outer bottom extreme)`);
});
console.log("");

// Test 6: Round 1 match mapping and visual position of Seed 2
console.log("Test 6: Visual Rendering and Round 1 Match Mapping");
// 8-draw:
const r1Matches8 = [];
for (let i = 0; i < 4; i++) {
  r1Matches8.push({
    matchNumber: i + 1,
    player1: t8[i * 2],
    player2: t8[i * 2 + 1],
  });
}
assert(r1Matches8[0].player1 === 1, "8-draw Match 1 (Top of Top Half): player1 is Seed 1");
assert(r1Matches8[3].player2 === 2, "8-draw Match 4 (Bottom of Bottom Half): player2 is Seed 2 (at very bottom line)");
assert(r1Matches8[0].player2 === 8, "8-draw Match 1 player2 is Seed 8");
assert(r1Matches8[1].player1 === 4 && r1Matches8[1].player2 === 5, "8-draw Match 2 is Seeds 4 vs 5");
assert(r1Matches8[2].player1 === 3 && r1Matches8[2].player2 === 6, "8-draw Match 3 is Seeds 3 vs 6");
assert(r1Matches8[3].player1 === 7, "8-draw Match 4 player1 is Seed 7");

// 16-draw:
const r1Matches16 = [];
for (let i = 0; i < 8; i++) {
  r1Matches16.push({
    matchNumber: i + 1,
    player1: t16[i * 2],
    player2: t16[i * 2 + 1],
  });
}
assert(r1Matches16[0].player1 === 1, "16-draw Match 1 (Top): player1 is Seed 1");
assert(r1Matches16[7].player2 === 2, "16-draw Match 8 (Bottom): player2 is Seed 2 (at very bottom line)");
console.log("");

// Test 7: ManualBracketEditor Auto-fill Seeding Logic
console.log("Test 7: ManualBracketEditor auto-fill assigns seeds to template slots");
function testManualAutoFill(playerCount, numSeeds) {
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
  const template = buildSeedTemplate(bracketSize);
  const players = makePlayers(playerCount, numSeeds);

  // Initialize empty positions
  const positions = Array.from({ length: bracketSize }, (_, i) => ({ position: i, player: null }));
  const unassigned = [...players];

  // 1. Assign seeded players to template slots
  const remainingAfterSeeds = [];
  unassigned.forEach((player) => {
    const seedNum = player.seed;
    if (seedNum && seedNum >= 1 && seedNum <= bracketSize) {
      const targetSlot = template.findIndex((s) => s === seedNum);
      if (targetSlot >= 0 && positions[targetSlot].player === null) {
        positions[targetSlot] = { position: targetSlot, player };
        return;
      }
    }
    remainingAfterSeeds.push(player);
  });

  // 2. Assign remaining players
  let remIdx = 0;
  for (let i = 0; i < positions.length && remIdx < remainingAfterSeeds.length; i++) {
    if (positions[i].player === null) {
      positions[i] = { position: i, player: remainingAfterSeeds[remIdx++] };
    }
  }

  return { positions, template, bracketSize };
}

const manualResult8 = testManualAutoFill(8, 4);
assert(manualResult8.positions[0].player.seed === 1, "Manual AutoFill 8-draw: Slot 0 has Seed 1");
assert(manualResult8.positions[7].player.seed === 2, "Manual AutoFill 8-draw: Slot 7 has Seed 2 (NOT Slot 1)");
assert(manualResult8.positions[2].player.seed === 4, "Manual AutoFill 8-draw: Slot 2 has Seed 4");
assert(manualResult8.positions[4].player.seed === 3, "Manual AutoFill 8-draw: Slot 4 has Seed 3");

const manualResult16 = testManualAutoFill(16, 8);
assert(manualResult16.positions[0].player.seed === 1, "Manual AutoFill 16-draw: Slot 0 has Seed 1");
assert(manualResult16.positions[15].player.seed === 2, "Manual AutoFill 16-draw: Slot 15 has Seed 2 (NOT Slot 1)");
console.log("");

// Summary
console.log("---");
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
console.log("\nAll tests passed!\n");
