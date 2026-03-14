# NTU Sports Admin Dashboard — Competitive Roadmap
> **Product Audit Date:** 2026-03-13 | **Auditor:** Lead PM / Antigravity AI  
> **Baseline:** Next.js 15 / Supabase / Tailwind CSS | 42 migrations, 39 admin components

---

## 1. Current Admin Capabilities (What You Have)

### Event Management
| Capability | Status | Notes |
|---|---|---|
| Create / Edit / Delete events | ✅ Full | Triple-confirm delete with event-name + "DELETE" phrase |
| Multi-sport divisions per event | ✅ Full | `event_divisions` table, scoring config per division |
| Event visibility toggle (draft/live) | ✅ Full | `is_visible` flag, toggle in settings |
| Tournament format selection | ✅ Full | `single_elimination`, `double_elimination`, `season_play`, `group_stage` |
| Sponsor management (Gold/Silver/Bronze) | ✅ Full | Per-event + global site sponsors |
| Tournament rules editor | ✅ Full | Ordered, WYSIWYG-style rule editor |
| Schedule description editor | ✅ Full | Day-by-day schedule notes |
| Push notification announcements | ✅ Full | Draft/publish workflow + pinned announcements |

### Roster & Player Management
| Capability | Status | Notes |
|---|---|---|
| Individual player registration | ✅ Full | Bulk CSV import available |
| Team registration (squad mode) | ✅ Full | `team_members` with jersey numbers |
| Custom player fields | ✅ Full | `player_custom_fields` migration |
| Player seeding | ✅ Full | Manual + auto-seed drag-and-drop |
| Department / affiliation tracking | ✅ Full | `players.department` field |
| Player email / match reminders | ✅ Full | `add_player_email_and_match_reminder` migration |

### Match Operations
| Capability | Status | Notes |
|---|---|---|
| Score entry | ✅ Full | Per-match, rich `MatchDetailContent` component |
| Match status lifecycle | ✅ Partial | `upcoming → live → completed`, `delayed`, `bye` — **no `forfeit`** |
| Per-player stat tracking | ✅ Full | 8 sports, ~50 stat types (goals, assists, cards, etc.) |
| Match history / audit trail | ✅ Basic | `MatchHistory` component, no timestamp diff log |
| Manual bracket editing | ✅ Full | `ManualBracketEditor` with slot drag-drop |
| Bracket import (CSV) | ✅ Full | `ImportBracket` component |
| Season play import (CSV) | ✅ Full | `ImportSeasonPlay` + `ImportSeasonGroups` |

### Scheduling
| Capability | Status | Notes |
|---|---|---|
| Court / venue management | ✅ Full | `event_courts` table with named courts + surfaces |
| Time-slot grid editor | ✅ Full | `ScheduleGridEditor` + `SchedulingManager` |
| Team availability / blackouts | ✅ Full | `team_blackouts` with per-player windows |
| Auto-schedule generation | ✅ Full | Conflict-aware algo in `GenerateSeasonPlay.tsx` |
| Scheduling templates | ✅ Full | `scheduling_templates` table (migration 013) |

### Advanced Configuration
| Capability | Status | Notes |
|---|---|---|
| Tiebreaker rules (configurable JSONB) | ✅ Full | Points → H2H → GD → GF → FairPlay → Admin/Alpha |
| Scoring terminology per division | ✅ Full | `scoreName`, `hideLeaguePoints`, `hideDraws` |
| Playoff qualifier cutoffs | ✅ Full | `add_event_playoff_qualifiers` migration |
| Bracket seed editing | ✅ Full | `BracketSeedingManager` with drag-drop |
| Third-place match toggle | ✅ Full | `add_third_place_match` migration |

### Access Control
| Capability | Status | Notes |
|---|---|---|
| Multi-admin per event | ✅ Full | `organizers` table: `owner / organizer / editor` roles |
| RLS enforced on all data | ✅ Full | All tables secured; `organizers` RLS intentionally disabled for admin compat |
| Admin login / signup | ✅ Full | Supabase Auth |

---

## 2. Competitive Feature Matrix

| Feature Area | NTU Sports (Current) | IMLeagues | VLR.gg | Soccer/Tennis League Tools |
|---|---|---|---|---|
| **Event creation & config** | ✅ Full | ✅ Full | ❌ Esports-only | ✅ Full |
| **Multi-division / multi-sport** | ✅ | ✅ | ❌ | ⚠️ Limited |
| **Bracket generation** | ✅ CSV import + manual | ✅ Auto + GUI | ✅ Auto | ✅ Auto |
| **Seeding / BYE handling** | ✅ Manual drag-drop | ✅ Full auto-seed | ✅ Rating-based | ✅ |
| **Season / league play** | ✅ Group + season | ✅ Full | ❌ | ✅ Full |
| **Tiebreaker config** | ✅ JSONB rules | ✅ GUI | ⚠️ Head-to-head only | ✅ Full GUI |
| **Score entry** | ✅ Admin-only entry | ✅ Admin + captain | ✅ Admin | ✅ Admin + reporter |
| **Score dispute / protest** | ❌ **Missing** | ✅ Built-in workflow | ✅ Ticket system | ✅ |
| **Forfeit / walkover handling** | ❌ **Missing** | ✅ 1-click forfeit | ✅ W/L tagging | ✅ |
| **Weather delay / postponement** | ⚠️ `delayed` status only | ✅ Reschedule modal | ❌ | ✅ Reschedule + notify |
| **Captain self-service portal** | ❌ **Missing** | ✅ Roster updates | ❌ | ⚠️ Limited |
| **Roster change requests** | ❌ **Missing** | ✅ Approval workflow | ❌ | ✅ Form-based |
| **Bulk notifications (SMS/email)** | ⚠️ Push only | ✅ Email + SMS | ✅ Discord bot | ✅ Email |
| **Admin audit log** | ❌ **Missing** | ✅ Full log | ✅ Match edit history | ✅ |
| **Match report PDF export** | ❌ **Missing** | ✅ | ✅ | ✅ |
| **Player stats tracking** | ✅ Per-match, 8 sports | ✅ | ✅ Advanced | ✅ Basic |
| **Standings / leaderboard** | ✅ Public-facing | ✅ | ✅ Live | ✅ |
| **Check-in / attendance** | ❌ **Missing** | ✅ QR check-in | ❌ | ⚠️ Manual |
| **Sponsor management** | ✅ Tiered | ❌ | ❌ | ⚠️ |
| **Bilingual UI (zh-TW + EN)** | ✅ Full i18n | ❌ EN only | ❌ EN only | ❌ EN only |

---

## 3. Real-World Gap Analysis

### Scenario A: Team Captain Updates Roster
**Today:** Admin must do it manually through the Players page. There is no captain login, no roster change request form, and no email-based approval workflow.  
**Gap:** Zero self-service for team captains. Any last-minute roster swap requires direct admin involvement.

### Scenario B: Weather Delay / Postponement
**Today:** Admin can set a match status to `delayed`, but there is no reschedule UI — they must manually edit the court/slot assignment and send a push notification separately.  
**Gap:** No atomic "postpone & reschedule" action. Delay handling is split across three areas (match detail, scheduling manager, announcements), creating friction and risk of inconsistency.

### Scenario C: Inputting a Forfeit
**Today:** No `forfeit` status exists in the `matches_status_check` constraint (`upcoming | live | completed | bye | delayed`). An admin must mark it `completed`, manually assign a winner, and enter a score of `0-0` or `W/L`. There is no forfeit flag, no reason field, and no automatic record of the forfeiting team.  
**Gap:** Forfeits are invisible in historical data — standings math, player profiles, and audit trails treat them identically to real match results.

### Scenario D: Seeding Tie-Breaker (Human Decision)
**Today:** The `tiebreaker_config` JSONB supports `admin_decide` as the final tiebreaker criterion, but there is **no UI surface** for the admin to actually make that call — it requires a direct database edit.  
**Gap:** The most powerful part of the tiebreaker system (human override) has no admin UI implementation.

---

## 4. Prioritized Feature Roadmap (Top 3 High-Impact Builds)

---

### 🥇 Priority 1 — Forfeit & Match Event Flags

**Impact:** Fixes a correctness gap in all historical data; unblocks proper standings calculation.  
**Complexity:** Medium (DB + UI)

#### Why it matters
Every forfeited match currently looks identical to a played match in the DB. Standings math, player win-rates, and future stat exports are all silently wrong.

#### Database Changes Required

```sql
-- 043_add_forfeit_and_match_events.sql

-- Extend match status to include forfeit and walkover
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('upcoming','live','completed','delayed','bye','forfeit','walkover'));

-- Add forfeit metadata
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS forfeit_team_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forfeit_reason  TEXT,
  ADD COLUMN IF NOT EXISTS event_note      TEXT;  -- general admin note (e.g., weather, protest)

COMMENT ON COLUMN matches.forfeit_team_id IS 'Team/player that forfeited; NULL for non-forfeit matches';
COMMENT ON COLUMN matches.forfeit_reason  IS 'Admin-entered reason for forfeit or walkover';
COMMENT ON COLUMN matches.event_note      IS 'Free-text admin note for any match event (delay, dispute, etc.)';
```

#### Next.js / UI Changes

- **`app/admin/[eventId]/matches/[matchId]/page.tsx`** — Add a "Match Outcome" section with radio: `Normal Result | Forfeit | Walkover`. When Forfeit is selected, show a team picker (`forfeit_team_id`) and optional reason field.
- **`components/admin/MatchDetailContent.tsx`** — Wire `forfeit_team_id` / `forfeit_reason` to the save mutation; auto-assign `winner_id` to the non-forfeiting team.
- **`components/admin/MatchesTable.tsx`** — Add a forfeit badge column; filter sidebar should include "Forfeits only".
- **`lib/i18n/translations.ts`** — Add `admin.match.forfeit`, `admin.match.walkover`, `admin.match.forfeitReason` keys.

---

### 🥈 Priority 2 — Captain Self-Service Portal (Option A: Token-Based)

**Impact:** Eliminates the #1 admin time-sink (roster updates) and scales the platform to leagues with 50+ teams.  
**Complexity:** Medium-High (new public route + approval workflow; **no new auth system required**)

#### Approach: Token-Based, No Captain Account Needed

Each team gets a **secret shareable link** (like a Google Form). The captain clicks it, sees their roster, and submits change requests. No signup, no password. Admin retains full control via an approval queue — a leaked token can only *request* a change, never directly modify data.

> **Why not require a captain login?**  
> Requiring registration creates friction that casual university players won't tolerate. The approval queue is the security layer, not the login. This can be upgraded to full auth in V2.

#### How the Token Works

The token is stored in the existing `players.custom_fields` JSONB column (migration `028`) — no new column needed on `players`:

```json
// players.custom_fields for a team record
{
  "captain_token": "a8f3d2c1...",
  "captain_name": "陳志明"
}
```

The captain's URL:
```
https://ntu-sports.com/captain/a8f3d2c1...
```

The Next.js server component resolves the team by querying:
```sql
SELECT * FROM players WHERE custom_fields->>'captain_token' = $1
```
Token lookup happens **server-side only** — the raw DB query is never exposed to the browser.

#### End-to-End User Flow

```
Admin clicks "Generate Captain Link" on PlayersTable (per team row)
         ↓
Token generated (crypto.randomUUID), stored in players.custom_fields → link copied
         ↓
Admin shares link with captain (Line, WhatsApp, email)
         ↓
Captain opens /captain/[token] — sees:
  • Team name + event name
  • Current roster (name, jersey number, captain flag)
  • "Request Add Member" button
  • "Request Edit / Remove" button per existing member
         ↓
Captain submits form → roster_change_requests row inserted (status = 'pending')
         ↓
Admin sees badge on Players page nav: "Pending Requests (2)"
         ↓
Admin opens /admin/[eventId]/players/requests:
  • Each request shows: action, member data, who requested, when
  • One-click Approve (writes to team_members) or Reject (with optional note)
         ↓
Approved → team_members updated immediately
Rejected → captain sees rejection note on their next portal visit
```

#### Database Changes Required

```sql
-- 044_add_captain_portal.sql

-- Mark which team_members are captains (informational, shown on public team page)
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT FALSE;

-- Roster change request queue
CREATE TABLE IF NOT EXISTS roster_change_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE, -- the TEAM record
  action       TEXT NOT NULL CHECK (action IN ('add', 'remove', 'update')),
  -- For 'add'/'update': {name, jersey_number}
  -- For 'update'/'remove': also includes {member_id}
  member_data  JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT,           -- captain's self-reported name (unverified, informational)
  admin_note   TEXT,           -- shown to captain on rejection
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX ON roster_change_requests(event_id, status);
CREATE INDEX ON roster_change_requests(player_id);

-- RLS: only organizers can read/update requests (INSERT is done via server action)
ALTER TABLE roster_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage roster change requests"
  ON roster_change_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = roster_change_requests.event_id
        AND o.user_id = auth.uid()
    )
  );
```

> **RLS note on INSERT:** The captain page is public (no Supabase session). Inserts must go through a **Next.js Server Action** using the `service_role` client, which bypasses RLS safely. Never use `service_role` on the client side.

#### Files to Create / Modify

| File | Action | What it does |
|---|---|---|
| `app/captain/[token]/page.tsx` | **New** | Public server component — resolves token → renders roster + request form |
| `app/captain/[token]/layout.tsx` | **New** | Minimal layout, no admin navbar, no auth guard |
| `app/captain/[token]/actions.ts` | **New** | Server Action: validate token, insert `roster_change_requests` using `service_role` |
| `app/admin/[eventId]/players/requests/page.tsx` | **New** | Admin review queue: list pending requests, Approve/Reject buttons |
| `components/admin/PlayersTable.tsx` | **Modify** | Add "Copy Captain Link" button + "Generate Token" logic per team row |
| `components/admin/PlayersPageNav.tsx` | **Modify** | Add "Requests" tab with pending count badge |
| `supabase/migrations/044_captain_portal.sql` | **New** | DB changes above |
| `lib/i18n/translations.ts` | **Modify** | Add `captain.*` and `admin.players.changeRequests.*` namespaces |

#### What's Deferred to V2

- Email notification to admin when a new request is submitted (needs Resend/SendGrid)
- Token expiry (`captain_token_expires_at` in `custom_fields`)
- Captain viewing the full status history of their past requests
- Time-window lock (e.g., freeze roster changes 24h before match)

---

### 🥉 Priority 3 — Admin Audit Log

**Impact:** Builds trust with event organizers; enables dispute resolution and score-correction accountability.  
**Complexity:** Medium (DB trigger + read-only UI)

#### Why it matters
When a score gets changed after a match, there is currently no way to see who changed it, when, and from what value. This makes protest resolution impossible and erodes organizer confidence.

#### Database Changes Required

```sql
-- 045_add_admin_audit_log.sql

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID REFERENCES events(id) ON DELETE SET NULL,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,          -- 'match.score_updated', 'player.deleted', etc.
  entity_type  TEXT NOT NULL,          -- 'match', 'player', 'team_member', 'event'
  entity_id    UUID,
  before_data  JSONB,                  -- snapshot before change
  after_data   JSONB,                  -- snapshot after change
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON admin_audit_log(event_id, created_at DESC);
CREATE INDEX ON admin_audit_log(entity_type, entity_id);

-- RLS: organizers can read their own event's log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers can view audit log for their events"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = admin_audit_log.event_id
        AND o.user_id = auth.uid()
    )
  );
```

#### Next.js / UI Changes

- **`app/admin/[eventId]/settings/audit/page.tsx`** — New settings sub-section showing a timeline of all admin actions for the event. Filter by entity type, date range, or organizer.
- **`components/admin/MatchDetailContent.tsx`** — On every `UPDATE` to matches, append a row to `admin_audit_log` with `before_data` (old score, status) and `after_data` (new values).
- **`components/admin/SettingsPageNav.tsx`** — Add "Audit Log" nav item.
- **`lib/i18n/translations.ts`** — Add `admin.audit.*` key namespace.

---

## 5. Quick Wins (Backlog)

| Item | Effort | Impact |
|---|---|---|
| Postpone + reschedule atomic action | S | M — removes multi-step delay workflow |
| `admin_decide` tiebreaker UI | S | M — completes existing DB feature |
| Standings CSV/PDF export | M | M — frequently requested by coaches |
| Match report printable view | M | M — paper trail for disputes |
| Email digest (match day summary) | M | H — reduces last-minute WhatsApp admin messages |
| QR check-in for match day | L | H — eliminates manual attendance marking |

---

*This roadmap was generated by an AI product audit. Always validate schema migrations against your staging environment before applying to production.*
