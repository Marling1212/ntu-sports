# Phase 3: UI/UX Design Systems — Comparison Guide

## How to Compare

Open **`/design-compare`** to choose a variant, then view it at **full width** (no squeezing):

- **`/design-compare`** — Index with links to each variant.
- **`/design-compare/modern`** — Version A (Modern & Minimal), full-width landing + season play.
- **`/design-compare/varsity`** — Version B (High Energy / Varsity), full width.
- **`/design-compare/dashboard`** — Version C (Dashboard / Utility), full width.

## The Three Design Systems

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
