# Coach360 — UI Design Reference

> **Living source:** `src/App.jsx` (mock; primitives migrate to `src/ui/` per story)  
> **Agent rule:** `.cursor/rules/ui-design-system.mdc`  
> **Application context:** [`../prototype/README.md`](../prototype/README.md) — **slice-first workflow**

The mock in `src/App.jsx` is the **canonical UI reference** for Coach360. New production screens must reuse its tokens, primitives, and patterns — extracted into `src/features/` + `src/ui/` before wiring real data.

---

## Layout

| Constraint | Value |
|------------|-------|
| Max width | `max-w-[430px]` (centered, `mx-auto`) |
| Horizontal padding | `px-5` (20px) |
| Bottom padding (tab screens) | `h-[100px]` spacer (clears tab bar) |
| Card border radius | `rounded-[14px]` |
| Button border radius | `rounded-xl` |
| Input border radius | `rounded-[10px]` – `rounded-xl` |
| Touch target minimum | `h-12` / `min-h-11` for icon buttons |

---

## Color palette

### Tailwind theme (`src/index.css` `@theme`)

```css
--color-coach-bg: #0b0e14;
--color-coach-surface: #141821;
--color-coach-card: #1a1f2b;
--color-coach-border: #2a3040;
--color-coach-orange: #ff6b2c;
--color-coach-orange-light: #ff8f5e;
--color-coach-orange-glow: rgba(255, 107, 44, 0.15);
--color-coach-green: #34d399;
--color-coach-blue: #60a5fa;
--color-coach-purple: #a78bfa;
--color-coach-red: #f87171;
--color-coach-yellow: #fbbf24;
--color-coach-t1: #f1f3f7;
--color-coach-t2: #8b93a7;
--color-coach-t3: #5a6278;
```

Use as Tailwind utilities: `bg-coach-card`, `text-coach-t1`, `border-coach-border`, etc.

### `COLORS` object (`App.jsx`)

Mirrors the theme for inline `style` when Tailwind cannot express a dynamic value (progress width, per-item accent color):

```javascript
const COLORS = {
  bg: "#0B0E14",
  surface: "#141821",
  card: "#1A1F2B",
  border: "#2A3040",
  orange: "#FF6B2C",
  orangeGlow: "rgba(255,107,44,0.15)",
  orangeLight: "#FF8F5E",
  green: "#34D399",
  blue: "#60A5FA",
  purple: "#A78BFA",
  red: "#F87171",
  yellow: "#FBBF24",
  t1: "#F1F3F7",
  t2: "#8B93A7",
  t3: "#5A6278",
};
```

### Color helpers

```javascript
const CV = { /* maps COLORS hex → semantic name */ };
const tcx = (c) => /* text-coach-* */;
const bgcx = (c) => /* bg-coach-*/20 */;
const bdcx = (c) => /* border-coach-* */;
```

Pass `COLORS.orange`, `COLORS.blue`, etc. to `Badge`, progress bars, and accent borders.

---

## Typography

| Token | Font | CSS variable / class | Use |
|-------|------|----------------------|-----|
| Display | Oswald | `font-display` | Headings, buttons, stats, uppercase labels |
| Body | DM Sans | `font-body` | Body text, inputs, tab labels |
| Mono | JetBrains Mono | `font-mono` | Percentages, numeric stats |

Defined in `src/index.css` `@theme`. Oswald + JetBrains Mono load via Google Fonts `<link>` in `App.jsx`; DM Sans also loads via `@fontsource/dm-sans` in `main.jsx`.

---

## Primitives (in `App.jsx`)

| Component | Props / notes |
|-----------|---------------|
| `Btn` | `primary`, `small`, `full`, `disabled`, `onClick` |
| `Badge` | `color` — accepts `COLORS.*` hex |
| `Card` | `onClick`, `className` — base card shell |
| `Field` | `label`, `placeholder` |
| `PageHeader` | `title`, `subtitle`, `user`, `onBack`, `onSettings` |
| `TrialBanner` | `user`, `onUpgrade` |
| `PaywallModal` | `feature`, `user`, `onClose`, `onUpgrade` |
| `DashedBtn` | `onClick` — dashed "+ Add" pattern |
| `PackageThumb` | `tag`, `color`, `size` (`full` \| `small`) |

### Icons

Individual SVG functions (not a dictionary): `IconHome`, `IconUsers`, `IconCal`, `IconChat`, `IconStore`, `IconChev`, `IconBack`, `IconLock`, `IconCheck`, `IconSpark`, `IconTarget`, `IconSend`, `IconChart`, `IconTrophy`, `IconSettings`, `IconStar`, `IconPlus`.

---

## Access control (tier gating)

```javascript
const FEATURE_REQS = {
  chat: { coach: "advanced", player: "advanced" },
  createSession: { coach: "advanced" },
  objectives: { coach: "pro", player: "pro" },
  ai: { coach: "pro", player: "pro" },
  // …
};
```

- `canAccess(user, feature)` — tier + role check
- `tryA(feature, action)` — runs action or opens `PaywallModal`
- Tiers: `trial` → `basic` → `advanced` → `pro`

---

## Global styles (`src/index.css`)

- Tailwind v4 `@import "tailwindcss"` + `@theme` coach tokens
- `body { margin: 0; overscroll-behavior: none }`
- `input::placeholder { color: var(--color-coach-t3) }`
- Scrollbars hidden (`::-webkit-scrollbar { width: 0 }`)

---

## Screen patterns (reference implementations)

| Screen | Component | Patterns to copy |
|--------|-----------|------------------|
| Login / onboarding | `LoginScreen`, `OnboardingScreen` | Multi-step flow, role cards, tier selection |
| Home | `HomeScreen` | `PageHeader`, stat grid, AI card, upcoming list, objectives |
| Roster | `RosterScreen` | Segmented teams/players tabs, invite flow, `DashedBtn` |
| Schedule | `ScheduleScreen` | Day selector row, session cards with left accent |
| Store | `StoreScreen` | Filter chips, `PackageThumb`, owned/locked states |
| Chat | `ChatScreen` | Thread list, bubble styles, tier lock screen |
| Progress | `ProgressScreen` | Stat cards, coach feedback |
| Profile / billing | `ProfileScreen`, `SubscriptionScreen` | Avatar gradient, tier cards |
| Content creation | `CreateContentScreen` | Type picker, `Field`, upload placeholder |
| Objectives | `ObjectivesScreen` | Progress bars with color thresholds |
| Admin | `AdminDetailScreen` | Role-specific dashboard tiles |

When implementing a new story with UI, **find the closest existing screen** and match its structure.

---

## Fonts and assets

- Theme fonts: `src/index.css` (`--font-display`, `--font-body`, `--font-mono`)
- Package thumbnails: base64 JPEG constants (`IMG_SHOOTING`, `IMG_DEFENSE`, `IMG_CONDITIONING`) in `App.jsx`

---

## Extraction (per story)

**Refactoring a slice is always the first action.** See [`../prototype/README.md#story-implementation-workflow`](../prototype/README.md#story-implementation-workflow).

```
src/App.jsx       → thin shell (shrinks over time)
src/ui/           # shared primitives extracted from App.jsx
src/features/     # domain screens + hooks (mock data → Supabase per story)
src/lib/          # supabase client, API helpers
```

Extract by **moving** code from `App.jsx`, not redesigning.

---

*Catalog version: 2.0 · June 2026*
