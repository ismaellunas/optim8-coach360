# Coach360 — Application Documentation

> **Stack:** Vite + React + Capacitor — **single stack for prototype and production**  
> **Canonical architecture:** [`../architecture/tech-stack.md`](../architecture/tech-stack.md)  
> **Documentation index:** [`../README.md`](../README.md)
>
> **Version:** v1.0.0 MVP  
> **Target:** Mobile-first, max-width 430px (smartphone UI); admin views as web build from same repo

---

## Single-stack note

The UI in `src/App.jsx` is **not throwaway**. Coach360 abandoned a two-stack plan (separate Expo/Next.js production clients) to prioritize delivery speed. This codebase hardens into production — real auth, APIs, and native builds — without a framework migration.

See [`../architecture/tech-stack.md`](../architecture/tech-stack.md#single-stack-decision) for rationale.

---

## Mock application (current state)

`src/App.jsx` is a **UI mock**, not the production app:

| Aspect | Mock (`src/App.jsx` today) | Production (per story) |
|--------|---------------------------|------------------------|
| Data | Hardcoded constants, `useState` | Supabase + SaaS APIs |
| Structure | Single monolithic file (~1k lines) | Thin shell + `src/features/` + `src/ui/` |
| Capacitor | **Not wired** (intentional) | Native shell when STORY-1.2+ requires it |
| Styling | Tailwind (`src/index.css` tokens) | Same tokens, extracted components |

`ios/`, `android/`, and `capacitor.config.json` are **platform scaffolding** for later native work — they are not exercised by the mock.

---

## Story implementation workflow

**Rule: refactoring a slice is always the first action.**

When implementing any tracker story, do **not** start by bolting APIs onto `App.jsx`. Follow this order:

1. **Refactor a slice** — extract the screens, primitives, and mock data for that story into `src/features/<domain>/` and shared `src/ui/` (or `src/lib/` for hooks/clients). Leave `App.jsx` as a thin shell that imports the extracted module.
2. **Wire real data** — replace mock constants with Supabase (or other SaaS) calls inside the extracted feature module.
3. **Verify** — run story acceptance tests and update the tracker.

A “slice” is the smallest vertical cut that matches the story scope (e.g. roster list + player profile for a roster story, auth screens for STORY-2.x).

See also [`../architecture/best-practices.md`](../architecture/best-practices.md#story-implementation-workflow).

---

## Overview

Coach360 is a **basketball coaching platform** designed as a mobile app (Capacitor on iOS/Android, web for admin). It targets coaches, players, team admins, and club admins. The app provides a unified interface for roster management, session scheduling, player development tracking, content distribution, and team communication — all with an AI insights layer.

---

## Features

| Module | Description |
|--------|-------------|
| **Login** | Welcome → role selection (Coach / Player / Team Manager) → profile (name, email) → plan (Trial / Basic / Advanced / Pro) |
| **Onboarding** | Role-specific 4-step walkthrough after first login |
| **Home** | Dashboard with stat grid, AI insights (Pro), upcoming sessions, objectives, create-content CTA |
| **Roster** | Teams / players segmented tabs, invite flow, create team |
| **Schedule** | Week day selector, session cards, create session (Advanced+) |
| **Store** | Training packages with filters, drip progress, purchase flow |
| **Chat** | Thread list + DM view (Advanced+); locked state for lower tiers |
| **Progress** | Player drill stats and coach feedback (player role) |
| **Profile** | Avatar, subscription management, sign out |
| **Admin** | Dashboard tiles for users, revenue, content, analytics |

---

## Navigation

Tab bar is **role-dependent** (5 tabs for coach/player/team; 4 for admin). Active tab shows an orange top indicator.

**Coach / Team Manager:**
```
Home | Roster | Schedule | Chat | Store
```

**Player:**
```
Home | Progress | Schedule | Chat | Store
```

**Admin:**
```
Dashboard | Users | Content | Analytics
```

Screen routing uses `useState("screen")` — no router library yet. Profile, subscription, objectives, create-content, and admin detail screens push via `go(screen)`.

---

## App States

```
Login (screen = "login")
    └── welcome → role → name/email → tier
        └── onLogin → Onboarding (if isNew) or Home

Onboarding
    └── 4 role-specific steps → Home

Main app (screen = "home" | "teams" | …)
    └── PaywallModal when tryA() hits tier gate
```

---

## Component Architecture

**Today:** all UI lives in the monolithic mock at `src/App.jsx`.

**Target** (built incrementally — one slice per story):

```
src/
├── main.jsx
├── App.jsx              # thin shell: providers, nav, tab bar (imports features)
├── index.css            # Tailwind theme tokens (coach-*)
├── ui/                  # shared primitives extracted from App.jsx
├── features/            # tab screens + domain logic (auth, roster, schedule, …)
├── lib/                 # supabase client, API helpers
└── types/               # generated + shared domain types
```

**See [`../design/ui-reference.md`](../design/ui-reference.md) for the token and primitive catalog** (source: `src/App.jsx` until extracted).

### Primitives / Shared Components

| Component | Purpose |
|-----------|---------|
| `Btn` | Primary (orange) or secondary (orange glow) button |
| `Badge` | Small colored label (tier, tag, status) |
| `Card` | Card container with optional `onClick` |
| `Field` | Labeled form input |
| `PageHeader` | Screen title, subtitle, back, settings, trial badge |
| `TrialBanner` | Trial countdown CTA |
| `PaywallModal` | Tier-gated feature overlay |
| `DashedBtn` | Dashed-border "+ Add …" action |
| `PackageThumb` | Store package image with gradient overlay |
| `Icon*` | Individual SVG icon functions (`IconHome`, `IconBack`, …) |

### Screen Components

| Component | Screen / tab |
|-----------|--------------|
| `LoginScreen` | Pre-auth flow |
| `OnboardingScreen` | Post-signup walkthrough |
| `HomeScreen` | `home` |
| `RosterScreen` | `teams` |
| `ScheduleScreen` | `schedule` |
| `ChatScreen` | `chat` |
| `StoreScreen` | `marketplace` |
| `ProgressScreen` | `progress` (player) |
| `ProfileScreen` | `profile` |
| `SubscriptionScreen` | `subscription` |
| `CreateContentScreen` | `create-content` |
| `ObjectivesScreen` | `objectives` |
| `AdminDetailScreen` | `admin-*` |

---

## Data Models

### User (session state)

```js
{ role, name, email, tier, trialDays, isNew }
// role: "coach" | "player" | "team" | "admin"
// tier: "trial" | "basic" | "advanced" | "pro"
```

### Store packages (inline in `StoreScreen`)

```js
{ id, t, l, r, rv, p, tag, own, c, dr, pr }
// tag: "shooting" | "defense" | "conditioning"
// own: purchased; pr: drip progress %
```

### Schedule sessions (inline in `ScheduleScreen`)

```js
{ ti, t, tm }  // time, title, team — keyed by day index
```

### Chat (inline in `ChatScreen`)

```js
// Threads: { id, n, ty, m, ti, u }
// Messages: { f: "me" | "other", t, ti }
```

### Roster (inline in `RosterScreen`)

```js
// Teams: { n, p, r, c }
// Players: { n, tm, pos, g }
```

---

## Design System

Tailwind v4 with `coach-*` theme tokens in `src/index.css`. See [`../design/ui-reference.md`](../design/ui-reference.md) for the full catalog.

### Color tokens (summary)

| Tailwind class | Usage |
|----------------|-------|
| `coach-bg`, `coach-surface`, `coach-card` | Background layers |
| `coach-border` | Borders / dividers |
| `coach-orange` (+ glow, light) | Brand / primary actions |
| `coach-green`, `coach-blue`, `coach-purple`, `coach-yellow`, `coach-red` | Semantic accents |
| `coach-t1`, `coach-t2`, `coach-t3` | Text hierarchy |

`COLORS` in `App.jsx` mirrors these for dynamic inline styles. Helpers: `tcx()`, `bgcx()`, `bdcx()`.

### Typography

- **Display (`font-display`):** Oswald — headings, buttons, stats
- **Body (`font-body`):** DM Sans — labels, body, inputs
- **Mono (`font-mono`):** JetBrains Mono — percentages, numeric stats

---

## AI Features

- **Home AI Insight panel** — rotating tips based on team objectives and player data
- **Player Objectives tab** — AI-matched marketplace recommendations with rationale
- **Content Marketplace** — items tagged with `ai: 1` and a `why` explanation string
- **More → AI Coach** — menu entry for a future behavior-based suggestions screen

---

## Subscription Plans

| Plan | Price | Key Features |
|------|-------|--------------|
| Trial | Free (14 days) | Full Pro access during trial |
| Basic | $9/mo | Profile, purchase content, track progress |
| Advanced | $29/mo | + Coach tools, chat, distribute, schedule |
| Pro | $49/mo | + AI insights, objectives, full MVP |

Tier gating uses `FEATURE_REQS` + `canAccess()` — see `App.jsx`.

---

## Images

Base64 JPEG constants for store package thumbnails:

| Constant | Usage |
|----------|-------|
| `IMG_SHOOTING` | Shooting package thumb |
| `IMG_DEFENSE` | Defense package thumb |
| `IMG_CONDITIONING` | Conditioning package thumb |

---

## Current constraints / MVP notes

- Data is **static mock** until Supabase stories land (no API calls yet)
- No routing library — navigation via `useState` (`screen`, `onboarding`, `paywall`)
- Styling via **Tailwind** (`src/index.css` `@theme` tokens); dynamic progress/accent colors use inline `style` with `COLORS`
- **Single-file mock** (~1.2k lines) — each story must **refactor its slice first**, then wire backends (see [Story implementation workflow](#story-implementation-workflow))
- Capacitor runtime hooks are **not** in the mock; native scaffold exists for later stories
- Chat does not persist — messages are static mock data
- Player profile deep-dive (6-tab) not yet in mock — roster shows list only

**Production gaps** (native release, CI, admin web deploy): see [`../architecture/tech-stack.md`](../architecture/tech-stack.md#production-readiness-gaps).
