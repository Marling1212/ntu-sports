# Dual-Persona UX/UI Audit — NTU Sports Tournament Admin Dashboard

> **Audit Date:** 2026-03-14  
> **Audited Site:** https://ntu-sports.vercel.app  
> **Audited Flow:** Full "Host an Event" lifecycle — Login → Dashboard → Create Event → Manage Event (Matches, Players, Settings, Match Detail)  
> **Browser Recording:** See embedded recording in artifact.

---

## Persona Definitions

| Persona | Profile |
|---|---|
| **Persona A — The Rookie** | NTU freshman, first-time host of a 8-player badminton round-robin. No prior tournament software experience. |
| **Persona B — The Veteran** | NTU Sports Club director, 50+ events hosted. Wants to update 12 live scores during a match day as fast as possible. |

---

## 🔴 Beginner Roadblocks

### BR-1 · Create Event Form Has No Progressive Disclosure
**Severity:** High  
**Location:** `components/admin/CreateEventModal.tsx` (lines 119–424)  
**Observation:** The modal dumps all 10+ fields in a single scroll — Sport, Tournament Type, Registration Type, Multi-Sport toggle, Event Name, Start Date, Start Time (24hr), End Date, End Time (24hr), Venue, Description — before the user even understands what a "Tournament Type" is.

**Specific Friction:**
- A beginner sees "Single Elimination" and "Season Play" as their first decision, but has no idea what those mean organisationally.
- The multi-sport checkbox at line 191 appears before the event name at line 285. A beginner fills in Sport/Type/RegType before they even type the tournament name — cognitively backwards.
- The form has no step indicator, no "you can change this later" reassurance, and no cancel-without-penalty affordance beyond a small `×`.

**Fix — Multi-Step Wizard:**
```typescript
// In CreateEventModal.tsx — add step state
const [step, setStep] = useState<1 | 2 | 3>(1);

// Step 1: Identity (name + sport) — 2 fields
// Step 2: Format (tournament type + registration type) — 2 fields with explainer cards
// Step 3: Schedule & Venue (dates, times, venue, description)
```

Add a progress bar to the sticky header:
```tsx
// Replace line 123 header div with:
<div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-xl font-semibold text-ntu-green">
      {step === 1 ? "Event Identity" : step === 2 ? "Tournament Format" : "Schedule & Venue"}
    </h2>
    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
  </div>
  {/* Progress dots */}
  <div className="flex gap-2">
    {[1, 2, 3].map(s => (
      <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-ntu-green' : 'bg-gray-200'}`} />
    ))}
  </div>
  <p className="text-xs text-gray-400 mt-1">Step {step} of 3</p>
</div>
```

---

### BR-2 · "Tournament Type" Field Uses Technical Enum Values
**Severity:** High  
**Location:** `components/admin/CreateEventModal.tsx` lines 159–171  
**Observation:** The select shows raw enum-like strings: `single_elimination` maps to "Single Elimination (Knockout Bracket)" and `season_play` to "Season Play (Regular Season + Playoffs)". The small helper text below exists but is below the fold on smaller screens. A beginner doesn't know whether their 8-person badminton friendly needs "Season Play" or "Single Elimination."

**Fix — Illustrated Cards Instead of a `<select>`:**
```tsx
// Replace the <select> for tournamentType with card-buttons:
<div className="grid grid-cols-2 gap-3">
  {[
    {
      value: "single_elimination",
      icon: "🏆",
      title: "Knockout Bracket",
      subtitle: "Win or go home. Best for competitive events."
    },
    {
      value: "season_play",
      icon: "📅",
      title: "Season Play",
      subtitle: "Round-robin + playoffs. Best for leagues."
    }
  ].map(opt => (
    <button
      key={opt.value}
      type="button"
      onClick={() => setFormData({ ...formData, tournamentType: opt.value })}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        formData.tournamentType === opt.value
          ? 'border-ntu-green bg-ntu-green/5'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="text-2xl mb-1">{opt.icon}</div>
      <div className="font-medium text-gray-900 text-sm">{opt.title}</div>
      <div className="text-xs text-gray-500 mt-0.5">{opt.subtitle}</div>
    </button>
  ))}
</div>
```

---

### BR-3 · Date/Time Entry Is Split Into 4 Separate Text Fields
**Severity:** High  
**Location:** `components/admin/CreateEventModal.tsx` lines 299–375  
**Observation:** Two `type="date"` inputs plus two raw `type="text"` inputs using the pattern `[0-2][0-9]:[0-5][0-9]` require users to understand 24hr format. The hint text says "24小時制，例如：08:00 或 18:00" which is a Chinese instruction below an English label — confusing for a bilingual beginner.

**Fix — Use `<input type="datetime-local">` for both start and end:**
```tsx
// Replace the 4-field date+time grid (lines 299–375) with:
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Start Date & Time *
    </label>
    <input
      type="datetime-local"
      value={formData.startDate}
      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
      required
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      End Date & Time *
    </label>
    <input
      type="datetime-local"
      value={formData.endDate}
      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
      min={formData.startDate}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
      required
    />
  </div>
</div>
```
> The `min={formData.startDate}` prevents end-date-before-start-date without any extra validation code.

---

### BR-4 · "Event Name" Field Is Placed After Three Abstract Selects
**Severity:** Medium  
**Location:** `components/admin/CreateEventModal.tsx` lines 285–297  
**Observation:** The form starts with Sport → Tournament Type → Registration Type → Multi-Sport toggle, and only then shows Event Name. A beginner's mental model is: "I have an event, what's it called, what sport is it?" — name first, format decisions second.

**Fix — Reorder fields within the modal (or Step 1 of wizard):**
```
Step 1 order: Event Name → Sport → (optional multi-sport)
Step 2 order: Tournament Type → Registration Type
Step 3 order: Start datetime → End datetime → Venue → Description
```

---

### BR-5 · Mixed Language Labels Within Single Form
**Severity:** Medium  
**Location:** `components/admin/CreateEventModal.tsx` throughout  
**Observation:** Labels alternate between bilingual (`報名類型 (Registration Type) *`), Chinese-only (helper text `選擇此賽事的報名類型…`), English-only (`Sport *`, `Tournament Type *`, `Event Name *`, `Venue *`, `Description`). The form has no language switcher.

**Fix — Standardise all form labels through `t()` calls:**
```tsx
// All labels should use i18n keys, e.g.:
<label className="block text-sm font-medium text-gray-700 mb-2">
  {t('admin.createEvent.sport')} *
</label>
// Add corresponding keys in lib/i18n/translations.ts for every label in CreateEventModal
```
Add the following keys to `lib/i18n/translations.ts`:
```typescript
"admin.createEvent.sport": { zh: "運動項目", en: "Sport" },
"admin.createEvent.tournamentType": { zh: "賽制", en: "Tournament Format" },
"admin.createEvent.registrationType": { zh: "報名類型", en: "Registration Type" },
"admin.createEvent.eventName": { zh: "活動名稱", en: "Event Name" },
"admin.createEvent.startDateTime": { zh: "開始時間", en: "Start Date & Time" },
"admin.createEvent.endDateTime": { zh: "結束時間", en: "End Date & Time" },
"admin.createEvent.venue": { zh: "場地", en: "Venue" },
"admin.createEvent.description": { zh: "活動說明（可選）", en: "Description (Optional)" },
```

---

### BR-6 · No Onboarding / "What Happens Next" Guidance After Event Creation
**Severity:** Medium  
**Location:** `components/admin/DashboardContent.tsx` line 30, `components/admin/SettingsContent.tsx`  
**Observation:** After submission, `onEventCreated` routes directly to `/admin/${newId}/settings`. The settings page has no welcome banner or checklist showing: "✅ Event created → ⬜ Add players → ⬜ Generate bracket → ⬜ Publish." A first-timer lands on a dense Settings form with no orientation.

**Fix — Add a `SetupChecklist` banner to the Settings page:**
```tsx
// Add to top of SettingsContent.tsx return JSX (before the <div className="space-y-8">):
{/* Only show if event is new / has no players yet */}
{!initialIsVisible && (
  <div className="mb-6 rounded-xl border border-ntu-green/30 bg-ntu-green/5 p-5">
    <h3 className="font-semibold text-ntu-green mb-3 flex items-center gap-2">
      🚀 Getting Started Checklist
    </h3>
    <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
      <li className="text-ntu-green font-medium">✅ Event created</li>
      <li>Add players or teams → <a href={`/admin/${eventId}/players`} className="underline text-ntu-green">Players page</a></li>
      <li>Generate bracket or schedule → <a href={`/admin/${eventId}/players`} className="underline text-ntu-green">Players page → Generate</a></li>
      <li>Publish the event → Toggle <strong>Publicly Visible</strong> on this page</li>
    </ol>
  </div>
)}
```

---

### BR-7 · Side Navigation Is Icon-Only by Default — Invisible to a Beginner
**Severity:** Medium  
**Location:** `components/admin/AdminPageSideNav.tsx` lines 24–28  
**Observation:** The nav collapses to `w-12` (48px) by default. Navigation items are represented only by a 4px coloured bar (`h-5 w-1`) — not even an icon. Labels become visible only on hover (`group-hover:opacity-100`). On mobile this pattern is completely non-functional. A first-timer has no idea what each coloured bar means.

**Fix — Add semantic SVG icons to each nav link and expose them at 48px width:**
Add an `icon` field to `AdminPageSideNavLink`:
```tsx
// In AdminPageSideNav.tsx
export interface AdminPageSideNavLink {
  href: string;
  label: string;
  barColor: string;
  hoverBg: string;
  icon?: React.ReactNode;  // ADD THIS
  badge?: number;
}

// Change the nav item render to show icon at collapsed width:
<a href={href} className={`flex items-center rounded-r-lg py-2.5 pl-2 pr-2 text-sm font-medium text-gray-700 transition-colors ${hoverBg}`}>
  {/* Show icon at collapsed state, bar at expanded */}
  <span className="group-hover:hidden shrink-0 text-gray-500">{icon}</span>
  <span className={`hidden group-hover:block h-5 w-1 shrink-0 rounded-full ${barColor}`} />
  <span className="ml-2.5 min-w-0 shrink-0 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
    {label}
  </span>
</a>
```

---

### BR-8 · Global `confirm()` Dialogs Expose Technical Language
**Severity:** Low  
**Location:** `components/admin/PlayersTable.tsx` lines 464–469, `components/admin/SettingsContent.tsx` various  
**Observation:** The delete-all players action uses `window.confirm()` with raw Chinese + English mixed alerts. In `SettingsContent.tsx`, confirmation dialogs for registration type changes expose internal database field names like `initialRegistrationType` in the string template.

**Fix — Replace `confirm()` with an inline confirmation component:**
```tsx
// Create components/admin/ConfirmDialog.tsx
// A small inline banner that replaces window.confirm():
// <ConfirmDialog 
//   open={showDeleteConfirm}
//   title="刪除所有選手？"
//   description="This will also reset all matches. This cannot be undone."
//   confirmLabel="Delete All"
//   confirmClass="bg-red-600 text-white"
//   onConfirm={handleDeleteAll}
//   onCancel={() => setShowDeleteConfirm(false)}
// />
```

---

## 🟡 Veteran Frustrations

### VF-1 · Updating a Match Score Requires 3+ Clicks Per Match
**Severity:** High  
**Location:** `components/admin/MatchesTable.tsx` lines 275–293, 800+ (render section)  
**Observation:** To update a single match score, a veteran must: (1) find the match row, (2) click the edit pencil icon to open inline edit mode, (3) tab through score1 → score2 → winner_id → court → status → scheduled_time — all 6 fields inline. There is no keyboard shortcut to save (Enter) or jump to the next match. A 50-match day requires 150+ deliberate mouse-click sequences.

**Fix A — Enter key submits the inline edit:**
```tsx
// In MatchesTable.tsx, on the inline-edit score inputs, add onKeyDown:
<input
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSave(match.id);
    if (e.key === 'Escape') handleCancel();
  }}
  // ...
/>
```

**Fix B — "Quick Result" mode: score-only lightning row:**
Add a toggle `quickMode` state. When on, expand all rows to show two small score inputs and a winner dropdown in-place, no modal required:
```tsx
const [quickMode, setQuickMode] = useState(false);

// In the table header area:
<button
  onClick={() => setQuickMode(!quickMode)}
  className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
    quickMode ? 'bg-ntu-green text-white border-ntu-green' : 'border-gray-300 text-gray-700 hover:border-ntu-green'
  }`}
>
  ⚡ Quick Score Mode
</button>

// In the match row render (when quickMode is active):
// Show: [Player1] [score1 input] – [score2 input] [Player2] [winner select] [💾]
// Inline, no expanding edit form required
```

---

### VF-2 · Batch Operation Panel Has No "Batch Score" Option
**Severity:** High  
**Location:** `components/admin/MatchesTable.tsx` lines 170–174, 627–770  
**Observation:** The existing batch operation supports `"court"`, `"status"`, and there is a `"score"` string in the type union (`"score" | "court" | "status" | null`) — but no UI exposes batch score input. The veteran running a single-day tournament may want to set all unplayed Round 1 matches to "completed" with a single score format (e.g., all walkover wins 2-0).

**Fix — Add "Batch Score" to the batchOperation dropdown:**
```tsx
// In MatchesTable.tsx, add "score" to the batch operation select:
<option value="score">Score</option>

// Add the batch score form:
{batchOperation === "score" && (
  <div className="flex items-center gap-2 mt-3">
    <input
      type="text"
      placeholder="Score 1"
      value={batchForm.score1 ?? ""}
      onChange={(e) => setBatchForm({ ...batchForm, score1: e.target.value })}
      className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm"
    />
    <span>–</span>
    <input
      type="text"
      placeholder="Score 2"
      value={batchForm.score2 ?? ""}
      onChange={(e) => setBatchForm({ ...batchForm, score2: e.target.value })}
      className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm"
    />
    <span className="text-xs text-gray-500">Applied to all selected matches (no winner set)</span>
  </div>
)}
```

---

### VF-3 · Match Detail Page Requires Two Separate Saves (Match Info + Stats)
**Severity:** High  
**Location:** `components/admin/MatchDetailContent.tsx` — `handleSaveMatch` (line 309) and `handleSaveStats` (line 411) are two separate async handlers  
**Observation:** A veteran updating a completed soccer match must: fill score → select winner → click "Save Match" → then fill player-level goal stats → click "Save Stats" separately. These are two HTTP round-trips with two separate success toasts. On mobile or under time pressure, it's easy to forget the second save.

**Fix — Add a floating "Save All" combined action button:**
```tsx
// At the end of MatchDetailContent.tsx return JSX, add:
<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
  <button
    onClick={async () => {
      setSaving(true);
      await handleSaveMatch();
      await handleSaveStats();
      setSaving(false);
    }}
    disabled={saving}
    className="bg-ntu-green text-white px-5 py-3 rounded-full font-semibold shadow-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
  >
    {saving ? "Saving…" : "💾 Save All"}
  </button>
  <p className="text-xs text-gray-400 bg-white/80 rounded px-2 py-0.5 shadow">Saves match info + stats</p>
</div>
```

---

### VF-4 · No "Duplicate Event" or "Template" Feature on Dashboard
**Severity:** Medium  
**Location:** `components/admin/EventCard.tsx`, `components/admin/DashboardContent.tsx`  
**Observation:** A veteran who runs the same "NTU Weekly Badminton Open" every semester must re-enter the venue, description, and rules from scratch every time. There is no copy/template function.

**Fix — Add a "Duplicate" button to `EventCard.tsx`:**
```tsx
// In EventCard.tsx, add a Duplicate option (kebab menu or icon):
<button
  onClick={async () => {
    const { data: newEvent } = await supabase.from("events").insert({
      sport: event.sport,
      name: `${event.name} (Copy)`,
      venue: event.venue,
      description: event.description,
      tournament_type: event.tournament_type,
      registration_type: event.registration_type,
      owner_id: userId,
      is_visible: false,
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
    }).select().single();
    if (newEvent) router.push(`/admin/${newEvent.id}/settings`);
  }}
  className="text-xs text-gray-500 hover:text-ntu-green transition-colors"
  title="Duplicate event"
>
  📋 Duplicate
</button>
```

---

### VF-5 · Matches Table Sort/Filter Resets on Every Page Reload
**Severity:** Medium  
**Location:** `components/admin/MatchesTable.tsx` lines 164–168  
**Observation:** All filter state (`statusFilter`, `courtFilter`, `dateFilter`, `roundFilter`) resets when the page is refreshed. A veteran updating scores for "Round 2, Court A" matches throughout the day loses their filter context after each save (which currently triggers a `window.location.href = window.location.href` hard reload at lines 574–576).

**Fix A — Persist filters in URL params:**
```tsx
// Replace useState for filters with useSearchParams:
import { useRouter, useSearchParams } from 'next/navigation';
const searchParams = useSearchParams();
const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');

// On filter change, push to URL:
const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams);
  params.set(key, value);
  router.replace(`?${params.toString()}`, { scroll: false });
};
```

**Fix B — Replace hard reload with `router.refresh()` (soft refresh, preserves state):**
```tsx
// In handleSave (around lines 574–576), replace:
setTimeout(() => { window.location.href = window.location.href; }, 1500);
// With:
import { useRouter } from 'next/navigation';
router.refresh(); // Server component re-fetches, client state preserved
```

---

### VF-6 · Side Navigation Is Too Narrow and Requires Constant Hover
**Severity:** Medium  
**Location:** `components/admin/AdminPageSideNav.tsx` lines 24–28  
**Observation:** The side nav stays collapsed at `w-12` unless hovered. On a 27" monitor, a veteran working quickly across Matches → Players → Settings must repeatedly hover-expand just to parse navigation options. There is no "pin expanded" affordance.

**Fix — Add a toggle pin button:**
```tsx
// Add a pinned state to AdminPageSideNav:
const [pinned, setPinned] = useState(false);

// Change the nav wrapper className:
className={`group peer flex shrink-0 transition-[width] duration-300 ease-out ${
  pinned ? 'w-56' : 'w-12 hover:w-56'
}`}

// Add a pin button at the bottom of the nav:
<button
  onClick={() => setPinned(!pinned)}
  className="mt-auto px-3 py-2 text-xs text-gray-400 hover:text-ntu-green"
  title={pinned ? "Collapse" : "Pin open"}
>
  {pinned ? '◀' : '▶'}
</button>
```

---

### VF-7 · No Forfeit/Walkover Quick-Set from Matches Table
**Severity:** Medium  
**Location:** `components/admin/MatchesTable.tsx` — the inline edit form exposes a `status` dropdown but forfeit/walkover fields (`forfeit_team_id`, `forfeit_reason`) are only accessible in the full `/admin/{eventId}/matches/{matchId}` detail page  
**Observation:** The veteran must navigate to the individual match detail page to set a forfeit. In a 64-person bracket on tournament day, this costs 2–3 page loads per forfeit.

**Fix — Add forfeit quick-action to the inline edit row:**
```tsx
// In the MatchesTable inline edit form, when status === "forfeit" or "walkover":
{(editForm.status === "forfeit" || editForm.status === "walkover") && (
  <select
    value={editForm.forfeit_team_id ?? ""}
    onChange={(e) => setEditForm({ ...editForm, forfeit_team_id: e.target.value })}
    className="px-2 py-1 border border-amber-300 rounded text-sm bg-amber-50"
  >
    <option value="">Who forfeited?</option>
    {match.player1 && <option value={match.player1_id}>{match.player1.name}</option>}
    {match.player2 && <option value={match.player2_id}>{match.player2.name}</option>}
  </select>
)}
```

---

### VF-8 · Bracket Override Requires Navigating Away from Bracket View
**Severity:** Medium  
**Location:** `components/admin/GenerateBracket.tsx`, `components/admin/ManualBracketEditor.tsx`  
**Observation:** The bracket view (visual bracket tree) and the bracket editor are separate tools. A veteran watching the bracket on a second screen cannot inline-override a seeding mistake — they must navigate to the ManualBracketEditor, find the match slot, change it, and navigate back.

**Fix — Add an "Override" affordance to bracket match nodes:**
In `components/BracketSection.tsx` or `components/TournamentBracket.tsx`, add an admin-only edit icon on each match node:
```tsx
// In the bracket match node render (TournamentBracket.tsx):
{isAdmin && (
  <a
    href={`/admin/${eventId}/matches/${matchId}`}
    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-ntu-green"
    title="Edit this match"
  >
    ✏️
  </a>
)}
```

---

## Summary Table

| ID | Persona | Severity | File to Change | One-Line Fix |
|---|---|---|---|---|
| BR-1 | Beginner | 🔴 High | `CreateEventModal.tsx` | Multi-step wizard with `step` state |
| BR-2 | Beginner | 🔴 High | `CreateEventModal.tsx` | Replace tournamentType `<select>` with card-buttons |
| BR-3 | Beginner | 🔴 High | `CreateEventModal.tsx` | Replace 4 date+time inputs with 2 `datetime-local` inputs |
| BR-4 | Beginner | 🟡 Med | `CreateEventModal.tsx` | Move Event Name field to top of form |
| BR-5 | Beginner | 🟡 Med | `CreateEventModal.tsx` + `translations.ts` | Add i18n keys for all labels |
| BR-6 | Beginner | 🟡 Med | `SettingsContent.tsx` | Add setup checklist banner for new events |
| BR-7 | Beginner | 🟡 Med | `AdminPageSideNav.tsx` | Add SVG icons, show at collapsed width |
| BR-8 | Beginner | 🟢 Low | `PlayersTable.tsx`, `SettingsContent.tsx` | Replace `confirm()` with `<ConfirmDialog>` component |
| VF-1 | Veteran | 🔴 High | `MatchesTable.tsx` | Enter-to-save + Quick Score Mode toggle |
| VF-2 | Veteran | 🔴 High | `MatchesTable.tsx` | Add "Batch Score" to batch operation panel |
| VF-3 | Veteran | 🔴 High | `MatchDetailContent.tsx` | Floating "Save All" FAB combines both saves |
| VF-4 | Veteran | 🟡 Med | `EventCard.tsx`, `DashboardContent.tsx` | Add Duplicate Event button |
| VF-5 | Veteran | 🟡 Med | `MatchesTable.tsx` | Persist filters in URL params; use `router.refresh()` not hard reload |
| VF-6 | Veteran | 🟡 Med | `AdminPageSideNav.tsx` | Add pin-toggle button to keep nav expanded |
| VF-7 | Veteran | 🟡 Med | `MatchesTable.tsx` | Expose forfeit team picker in inline edit row |
| VF-8 | Veteran | 🟡 Med | `TournamentBracket.tsx` | Add admin ✏️ icon on bracket match nodes |

---

## Recommended Implementation Order

**Sprint 1 — Highest ROI (Beginner):**
1. BR-3 (datetime-local inputs) — 20 min, no new components
2. BR-4 (reorder form fields) — 10 min, just move JSX blocks
3. BR-2 (card-buttons for tournament type) — 45 min, replaces a `<select>`
4. BR-5 (i18n labels) — 30 min, add keys to translations.ts

**Sprint 2 — Highest ROI (Veteran):**
5. VF-1 (Enter-to-save + quick score mode) — 60 min
6. VF-3 (Save All FAB) — 20 min, one floating button
7. VF-5 (router.refresh() + URL params) — 30 min

**Sprint 3 — Polish:**
8. BR-1 (full wizard) — 2 hrs, significant refactor
9. BR-6 (setup checklist) — 30 min
10. BR-7 + VF-6 (sidenav icons + pin) — 45 min
11. VF-4 (duplicate event) — 45 min
12. VF-2 + VF-7 (batch score + forfeit inline) — 60 min combined
13. BR-8 + VF-8 (ConfirmDialog + bracket edit links) — 60 min
