# BYE / Seed sync – what the code does and why Seed 6 might not advance

## What we're trying to do

1. **Slot = (seed, group)**  
   A playoff match has two “slots”: slot1 = (slot1_seed, slot1_group), slot2 = (slot2_seed, slot2_group).  
   Example: “Seed 3 Group 1 vs Seed 6 Group 1” → slot1=(3,1), slot2=(6,1).

2. **Resolve slot → player_id**  
   We need to turn each (seed, group) into a real `player_id`:
   - **locked**: from lock detection (only when that (seed, group) is mathematically locked).
   - **standings**: from current group standings — 1st in group = seed 1, 2nd = seed 2, … 6th = seed 6.

3. **BYE match**  
   One side is 輪空: only one of slot1/slot2 is set; the other is null.  
   We set `winner_id` = the only resolved player, `status = 'bye'`, then **push that winner** into the next round (fill the next match’s `player1_id` or `player2_id`).

4. **Next round**  
   Either:
   - The next match already has both slots (e.g. slot1=(3,1), slot2=(6,1)) → we fill both from `resolveSlot`, so no “push” needed; or  
   - One side is “TBD” (no slot) → we fill it from the “push BYE winners” step.

So for “Seed 6 still doesn’t advance”, the failure is always: **we never get a `player_id` for (6, 1)**. So either:
- we never set `player1_id`/`player2_id` for the BYE match that has Seed 6, or  
- we don’t push that winner into the next match, or  
- the next match already has slot2=(6,1) but `resolveSlot(6,1)` returns null.

So the core question is: **why does `resolveSlot(6, 1)` return null?**

---

## Full code (syncLockedPlayoffSeeds) – with comments

```ts
// 1) Only round-0 (regular season) matches and their group_number are used for standings.
const regularForLock = dbMatches
  .filter((m: any) => m.round === 0)
  .map((m: any) => ({
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    winner_id: m.winner_id,
    score1: m.score1,
    score2: m.score2,
    status: m.status,
    round: m.round,
    group_number: m.group_number,
  }));

// 2) locked = only (seed, group) that are mathematically locked. Seed 6 is rarely locked.
const locked = computeLockedSeeds(regularForLock, playersForStandings, ...);

// 3) How many seeds we need from standings (e.g. 6 if bracket has "Seed 6 Group 1").
let maxSeedNeeded = qualifiersPerGroup;
for (const m of playoffMatches) {
  if (m.slot1_seed != null && m.slot1_seed > maxSeedNeeded) maxSeedNeeded = m.slot1_seed;
  if (m.slot2_seed != null && m.slot2_seed > maxSeedNeeded) maxSeedNeeded = m.slot2_seed;
}

// 4) standingsByGroup = per-group standings. Key = group number, value = array of rows (1st, 2nd, ...).
//    We map: row index 0 → seed 1, index 1 → seed 2, ... index 5 → seed 6.
const standingsResult = computeStandings(regularForLock, playersForStandings, ...);
if (standingsResult && !Array.isArray(standingsResult) && typeof standingsResult === "object") {
  for (const [g, rows] of Object.entries(standingsByGroup)) {
    const groupNum = parseInt(g, 10);
    if (!Array.isArray(rows)) continue;
    rows.forEach((row, idx) => {
      if (row?.player?.id && idx < maxSeedNeeded)
        seedGroupToPlayer.set(`${idx + 1},${groupNum}`, row.player.id);  // "1,1", "2,1", ..., "6,1"
    });
  }
}

// 5) Resolve: locked first, then standings.
const resolveSlot = (seed, group) =>
  locked.get(`${seed},${group}`) ?? seedGroupToPlayer.get(`${seed},${group}`) ?? null;

// 6) Fill every playoff match slot from resolveSlot (overwrite so edits get correct player).
for (const m of playoffMatches) {
  if (m.slot1_seed != null && m.slot1_group != null) {
    const id = resolveSlot(m.slot1_seed, m.slot1_group);
    if (id) updates.player1_id = id;
  }
  if (m.slot2_seed != null && m.slot2_group != null) {
    const id = resolveSlot(m.slot2_seed, m.slot2_group);
    if (id) updates.player2_id = id;
  }
  // BYE: one side has no slot → set winner_id and status = 'bye'
  const isByeMatch = !hasSlot1 || !hasSlot2;
  if (isByeMatch && weHaveAPlayer) {
    updates.winner_id = thatPlayerId;
    updates.status = "bye";
  }
  // persist updates
}

// 7) Push BYE winners into next round (fill next match's player1_id or player2_id).
for (const m of byRound) {
  if (!m.winner_id) continue;
  if (hasSlot1 && hasSlot2) continue;  // normal match, skip
  nextMatch = find next match (round+1, match_number = ceil(m.match_number/2));
  if (m.match_number % 2 === 1) nextUpdates.player1_id = winnerId;
  else                         nextUpdates.player2_id = winnerId;
  // only if that slot is still empty: !nextMatch.player1_id / !nextMatch.player2_id
}
```

So Seed 6 can only advance if **`resolveSlot(6, 1)` is not null**. That means either:
- `locked.get("6,1")` is set, or  
- `seedGroupToPlayer.get("6,1")` is set.

`seedGroupToPlayer.get("6,1")` is set only when:
- `computeStandings` returns a **per-group object** (not an array),
- there is a **group 1** in that object,
- the **array for group 1 has at least 6 rows** (index 0..5),
- and we run the loop with `idx < maxSeedNeeded` and `maxSeedNeeded >= 6`.

---

## Why `resolveSlot(6, 1)` might still be null (the real problems)

1. **Group 1 has fewer than 6 teams**  
   `computeStandings` only has one row per team **in that group**. If Group 1 has 4 teams, we get 4 rows → we only set "1,1" … "4,1". There is no 6th place in the group, so we never set "6,1".  
   So if your bracket says “Seed 6 Group 1” but the group actually has only 4 teams, the code can never resolve (6, 1). Either the bracket template is wrong, or “Seed 6” means something else (e.g. 6th seed overall across groups).

2. **Round-0 matches have no `group_number`**  
   If all round-0 matches have `group_number = null`, then `computeStandings` gets `groupNumbers = []` and returns a **single array** (not per-group). We then skip building `seedGroupToPlayer` (we only handle non-array objects). So no "6,1" is ever set.

3. **`computeStandings` throws**  
   We wrap it in try/catch and on error we leave `seedGroupToPlayer` empty. Then only `locked` is used, and Seed 6 is usually not locked.

4. **Next round already has slot2 = (6,1) but we don’t overwrite**  
   We do overwrite: we always set `player2_id = resolveSlot(6,1)` when slot2=(6,1). So if `resolveSlot(6,1)` is null, `player2_id` stays empty. So again the root cause is `resolveSlot(6,1) === null`.

5. **Push step doesn’t run because next slot is “already filled”**  
   We only push when `!nextMatch.player1_id` or `!nextMatch.player2_id`. If the next match already has slot2=(6,1) and we *did* set `player2_id` from standings, we don’t need the push. If we *didn’t* (because resolveSlot(6,1) is null), then the push would fill it only if the next match has **no** slot2 (TBD). So if the next match is “Seed 3 vs TBD”, we’d fill TBD from the BYE winner. So for “Seed 6 vs 輪空” we must set that match’s `player1_id` or `player2_id` to the Seed 6 player (so winner_id gets set), then the push fills the next match’s empty side. So again everything depends on resolving (6, 1).

---

## What to check on your side

1. **How many teams are in Group 1?**  
   If it’s 4, then “Seed 6 Group 1” has no meaning in the current standings logic (there is no 6th place). We’d need a different rule (e.g. “6th seed overall” from multiple groups).

2. **Do round-0 matches have `group_number` set?**  
   In the DB, do regular-season matches have `group_number = 1` (or 2, …)? If they’re all null, standings won’t be per-group and we won’t build "6,1".

3. **What is `playoff_qualifiers_per_group`?**  
   We use it as the minimum for `maxSeedNeeded` and also when building the map (`idx < maxSeedNeeded`). If the bracket has Seed 6, we now increase `maxSeedNeeded` to 6, so that part should be fine.

If you can confirm: (A) number of teams in Group 1, and (B) whether round-0 rows have `group_number` set, we can pin down the exact fix (e.g. “6th seed overall” or ensure group_number is set).
