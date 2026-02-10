# Phase 2: Competitive Feature Gap Analysis

## Current Platform Capabilities (NTU Sports)

- **Season mode:** Group-based regular season, standings (points, GD, head-to-head, fair play), playoffs with configurable qualifiers
- **Tournament brackets:** Single elimination, bracket generation (auto/manual/import), 3rd place match, bracket lock
- **Venue/scheduling:** Event courts, time slots, blackouts, scheduling templates, auto-schedule API
- **Admin:** Event CRUD, players/teams, match editing, score entry, match stats (e.g. goals, cards), announcements, CSV/Excel import
- **Public:** Draw/schedule/standings views, match detail, team detail, announcements, i18n (zh-TW/en)
- **Integrations:** Email reminders (Resend), push subscriptions table (for future use)

---

## Comparison vs. Standard Sports Platforms

| Feature area        | IMLeagues / TourneyMachine / ESPN Fantasy | NTU Sports | Gap |
|---------------------|-------------------------------------------|------------|-----|
| Live score entry    | Real-time updates; conflict resolution if two admins edit same match | Polling/refresh; no conflict handling | **Live score conflict resolution** |
| Scheduling          | Drag-and-drop schedule builder, conflict warnings | Form-based + auto-schedule; no drag-and-drop | **Drag-and-drop scheduling** |
| Roster/eligibility  | Roster verification, eligibility windows, role-based (captain vs player) | Player list + team members; no formal verification flow | **Roster verification / eligibility flow** |
| Notifications       | In-app + push + email; “game starting in 15 min” | Email reminders (cron); push table exists but not used | **Real-time push / in-app notifications** |
| Mobile experience   | Responsive + often native app or PWA | Responsive web only | **PWA / app-like experience** (optional) |
| Live audience       | Live bracket/scores without refresh | Page refresh to see updates | **Live updates for spectators (Realtime)** |

---

## 3–5 Critical Quality-of-Life Gaps

1. **Live score conflict resolution**  
   When two admins edit the same match, last write wins with no warning. No “this match was updated by someone else” or merge strategy.

2. **Drag-and-drop scheduling**  
   Scheduling is form/slot based. No visual drag match-to-slot or drag-to-reschedule, which power users expect on platforms like TourneyMachine.

3. **Roster verification flow**  
   No structured flow for captains/coaches to confirm rosters before a match or for admins to mark “verified” vs “pending.”

4. **Real-time updates for spectators**  
   Bracket, schedule, and standings only update on refresh. No live updates when scores or schedule change.

5. **In-app / push notifications**  
   Only email reminders exist. No browser push or in-app “Your match in 15 min” or “Score updated for Match X.”

---

## Highest-Impact Feature: Real-Time Updates for Spectators

**Why this first:**  
Improves experience for everyone (players, coaches, fans) without changing admin workflows. Enables “live” feel (scores, schedule, standings) and sets the base for future live features (e.g. conflict resolution, live score entry).

**Scope:**  
When an admin (or system) updates a match (score, status, time) or an announcement is created, all users viewing that event’s draw/schedule/standings see the update without refreshing.

---

## Technical Implementation Plan: Supabase Realtime

### 1. Supabase Realtime (recommended)

- **Tables to subscribe to:**  
  - `matches` (filter by `event_id` for the current event)  
  - Optionally `announcements` (by `event_id`) for live announcement toasts.
- **Events to listen for:**  
  - `POSTGRES_CHANGES` on `matches` (and optionally `announcements`) with `event_id` filter.
- **Enable Realtime:**  
  - In Supabase Dashboard: Database → Replication → enable replication for `matches` (and `announcements` if used).
- **Client usage:**  
  - In the event draw/schedule/standings pages (or a shared layout for that event), create a Supabase Realtime channel filtered by `event_id`, subscribe to `matches` (and optionally `announcements`). On payload, update local state (e.g. replace the updated match in a `matches` array or refetch a small payload). Keep subscriptions scoped to the current event and cleanup on unmount.

### 2. Edge Function (alternative or complement)

- Use an Edge Function only if you need to:
  - Notify external systems,
  - Fan out to push (e.g. Web Push) or other channels,
  - Or apply business rules before “broadcasting” an update.
- For “spectators see updates without refresh,” Realtime alone is enough; Edge Functions are optional for push/email fan-out later.

### 3. Implementation steps (Realtime-first)

1. **Backend**  
   - Enable Realtime for `matches` (and optionally `announcements`) in Supabase.  
   - Ensure RLS allows read access to the rows that are broadcast (same as current SELECT policies).

2. **Client hook**  
   - Create e.g. `useEventMatchesRealtime(eventId, initialMatches)`:  
     - Subscribe to `postgres_changes` for `matches` where `event_id = eventId`.  
     - On INSERT/UPDATE/DELETE, merge the change into local state (or refetch matches for that event) and return updated list.  
   - Unsubscribe on unmount or when `eventId` changes.

3. **UI integration**  
   - Use this hook on the event draw page, schedule page, and anywhere else that shows the event’s matches/standings.  
   - Derive standings from the updated matches (existing logic).  
   - Optional: small “Updated just now” indicator when a Realtime update is applied.

4. **Optional: announcements**  
   - Subscribe to `announcements` for the same `event_id` and show a toast or banner when a new row is inserted.

5. **Testing**  
   - Open event page in two browsers (one as admin, one as spectator). Update score in admin; confirm spectator view updates without refresh.

This gives you a clear path to real-time spectator updates using Supabase Realtime, with optional Edge Functions for push/notifications later.
