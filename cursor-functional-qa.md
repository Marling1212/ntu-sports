# Functional QA Report — Audit Test 01
**Event ID:** `4bb4863e-e7a8-4aa9-9e8e-68bf36a351d9`  
**Tested:** 2026-03-16 | **Last verified:** 2026-03-16 10:42

---

## Bug Status (as of latest test run)

| # | Bug | Severity | Status |
|---|---|---|---|
| 1 | **Bracket winner doesn't advance to next round** | 🔴 Critical | ❌ Open |
| 2 | **Negative scores silently clamped to 0 (no error shown)** | 🟡 Medium | ⚠️ Partial — user gets no feedback |
| 3 | Bracket Editor nav link → 404 | 🟡 Medium | ✅ Fixed |
| 4 | Public page 404 for hidden event | 🟡 Medium | ✅ Fixed (nav now shows "Preview public page (X Hidden)") |

---

### BUG 2 — Winner does NOT advance to next bracket round
**Severity:** 🔴 Critical  
**Evidence:** After Alice Chen beat Bob Lin 6-4 in R1-1, the Semifinals rows (R2-1, R2-2) still show `TBD vs TBD`. The bracket does not propagate the winner.

**Expected:** After a match is marked complete with a winner, the winner's name should fill the appropriate slot in the next round.  

**Fix location:** Check the match update handler — when `winner_id` is set, it must also update the `team1_id` or `team2_id` on the corresponding next-round match.

**Likely broken query in:** `lib/supabase/` or the match update API route.

```ts
// After saving a match result, run a propagation step:
async function propagateWinner(matchId: string, winnerId: string) {
  // Find the next-round match that references this match's slot
  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id, team1_source_match_id, team2_source_match_id')
    .or(`team1_source_match_id.eq.${matchId},team2_source_match_id.eq.${matchId}`)
    .single();

  if (!nextMatch) return;

  const isTeam1 = nextMatch.team1_source_match_id === matchId;
  await supabase.from('matches').update(
    isTeam1 ? { team1_id: winnerId } : { team2_id: winnerId }
  ).eq('id', nextMatch.id);
}
```

> **Note:** This requires a `team1_source_match_id` / `team2_source_match_id` column linking consecutive bracket rounds. If this column doesn't exist, the bracket schema needs a migration to add it.

---

### BUG 3 — Public event page is 404
**Severity:** 🟡 Medium  
**Evidence:** Navigating to the public-facing bracket/event page returned `404 – This page could not be found.`

**Possible causes:**
- Event is set to `HIDDEN` — check if hidden events are fully excluded from public routes
- Public route slug doesn't exist: check `app/[sport]/[eventId]/` file structure
- Event has no sport/division set correctly → cannot resolve sport-based route

**Fix location:** Check `app/` routing. If the event's sport-based route is `app/tennis/[eventId]/page.tsx`, verify the event has `sport = "tennis"` set in the database.

---

### BUG 4 — "Bracket Editor" nav link goes to 404
**Severity:** 🟡 Medium  
**Evidence:** The "Bracket Editor" tab in the top nav sends the user to `/admin/[id]/brackets` which 404s.

**Fix location:** Check `app/admin/[eventId]/brackets/page.tsx` exists. The nav likely points to `/brackets` but the file is named differently (possibly `/bracket` singular, or the component exists elsewhere).

```bash
# Check if the route file exists:
ls app/admin/[eventId]/
# If missing, create app/admin/[eventId]/brackets/page.tsx
# Or fix the nav link to point to the correct route.
```

---

## ⚠️ Observations (Non-Critical)

| Item | Notes |
|---|---|
| **Blank score** | Saving with blank scores doesn't crash, but produces `—` in the match list. No user-facing error shown. |
| **Large score (999)** | Accepted without warning. Consider adding a practical max (e.g., `max={999}` is fine, but validate that winner is selected). |
| **Announcement draft popup** | Obstructs the match list UI after every save. Consider a less aggressive notification pattern (e.g., toast only, draft accessible via sidebar). |
| **Winner dropdown required** | Without selecting a winner, save reverts to no-op. The UI does not clearly indicate this requirement. |
| **Enter key submission** | The Add Player form doesn't submit on Enter — requires mouse click. Minor UX issue. |

---

## Priority Fix Order

1. **[CRITICAL]** Bracket winner propagation — users can't run a real tournament without this
2. **[HIGH]** Negative score validation — misleading data in DB and announcements
3. **[MEDIUM]** Fix Bracket Editor 404 route
4. **[MEDIUM]** Investigate public event page 404

---

## Recording

Full browser session recording: stored in artifacts directory as `e2e_qa_full_flow_*.webp`
