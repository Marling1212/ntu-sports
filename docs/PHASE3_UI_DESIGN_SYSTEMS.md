# Phase 3: UI/UX Design Systems — Comparison Guide

## How to Compare

Open **`/design-compare`** to choose a variant, then view it at **full width** (no squeezing):

- **`/design-compare`** — Index with links to all 9 variants.
- **A** `/design-compare/modern` — Modern & Minimal
- **B** `/design-compare/varsity` — High Energy / Varsity
- **C** `/design-compare/dashboard` — Dashboard / Utility
- **D** `/design-compare/editorial` — Editorial / Magazine
- **E** `/design-compare/mobile` — Mobile-first / App-like
- **F** `/design-compare/neobrutalist` — Neobrutalist / Bold
- **G** `/design-compare/glass` — Glassmorphism / Soft
- **H** `/design-compare/split` — Split / Asymmetric
- **I** `/design-compare/dark` — Dark / Arena

## The Nine Design Systems

### Version A — Modern & Minimal

- **Look:** Clean lines, lots of whitespace, Apple-esque.
- **Focus:** Typography and high-contrast data (dark gray on white, subtle borders).
- **Use case:** Professional, calm, content-first.

**Tokens:** Light shadows, `rounded-lg`, gray-50/100 backgrounds, gray-900 for headings and primary actions.

---

### Version B — High Energy / Varsity

- **Look:** Bold university colors (NTU green, amber/orange), heavy shadows, gradients.
- **Focus:** Card-based layouts, badge-style typography (NBA/ESPN feel).
- **Use case:** Spirit, events, fan-facing pages.

**Tokens:** `rounded-2xl`, `shadow-xl`, gradient tab and table headers, pill badges, amber accents.

---

### Version C — Dashboard / Utility

- **Look:** Information-dense, highly tabular, compact.
- **Focus:** Desktop administration, quick scanning, data entry.
- **Use case:** Admin and power users.

**Tokens:** Tighter padding, `rounded` (small radius), bordered tables, small text, gray-700 header bar.

### Version D — Editorial / Magazine

- **Look:** Big serif/bold headlines, border-bottom hero, feature-first blocks.
- **Use case:** Official, storytelling, “this is the place for NTU sports.”

### Version E — Mobile-first / App-like

- **Look:** Large tap targets, rounded-2xl cards, list-of-cards layout, min-height for touch.
- **Use case:** Students on phones, quick “my next match” check.

### Version F — Neobrutalist / Bold

- **Look:** Hard shadows (no blur), thick black borders, yellow/black contrast, uppercase.
- **Use case:** Memorable, youth-oriented, bold.

### Version G — Glassmorphism / Soft

- **Look:** Frosted panels (backdrop-blur), soft borders, light gradients.
- **Use case:** Modern, premium, calm.

### Version H — Split / Asymmetric

- **Look:** Fixed sidebar + main content, clear “browse vs. focus.”
- **Use case:** Desktop power users, quick navigation.

### Version I — Dark / Arena

- **Look:** Dark background (gray-900), NTU green and amber accents, “game day” feel.
- **Use case:** Evening use, arena/scoreboard vibe.

---

## Where the Code Lives

| Item | Location |
|------|----------|
| Theme class maps (Season Play) | `components/design-variants/designThemes.ts` |
| Landing variants (A/B/C) | `components/design-variants/LandingVariants.tsx` |
| Season Play + variant prop | `components/SeasonPlayDisplay.tsx` — optional `designVariant` prop |
| Comparison page | `app/design-compare/page.tsx` |

## Applying a Chosen Design

1. **Landing:** Use `LandingVariants` with the chosen `variant` on the home page, or copy the Tailwind from that variant into `app/page.tsx`.
2. **Season Play:** Pass `designVariant="modern"` (or `"varsity"` / `"dashboard"`) to `SeasonPlayDisplay` where it’s used (e.g. event page).
3. **Global:** To make one variant the default, set `designVariant` from layout/context or replace current classes in `SeasonPlayDisplay` and the landing page with the chosen theme’s classes from `designThemes.ts`.
