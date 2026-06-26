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

## Overview

Coach360 is a **basketball coaching platform** designed as a mobile app (Capacitor on iOS/Android, web for admin). It targets coaches, players, team admins, and club admins. The app provides a unified interface for roster management, session scheduling, player development tracking, content distribution, and team communication — all with an AI insights layer.

---

## Features

| Module         | Description |
|----------------|-------------|
| **Onboarding** | Role selection (Coach / Player / Team Admin / Club Admin), profile setup, and plan selection (Basic / Advanced / Pro) |
| **Home**       | Dashboard with AI insights, team stats summary, goal ring charts, today's schedule, and top performers |
| **Roster**     | Full player list with search and position filters; tapping a player opens a detailed profile |
| **Player Profile** | 6-tab deep-dive per player: Overview, Objectives, Stats, Games, Content, Notes |
| **Schedule**   | Weekly calendar view of training sessions, film reviews, individual work, scrimmages, and conditioning |
| **Content**    | My Library (uploaded videos, drills, articles with drip scheduling) + Marketplace for purchasing training packages |
| **Chat**       | Conversation list view + inline DM thread with real-time-style message input |
| **More**       | Settings, Analytics, AI Coach, subscription, film room, club management — all accessible from a menu |

---

## Navigation

The app uses a **tab bar** with 6 tabs at the bottom:

```
Home | Roster | Schedule | Content | Chat | More
```

An orange indicator pill appears above the active tab icon. Chat has a persistent badge dot.

---

## App States

```
Onboarding (scr = "ob")
    └── Step 0: Welcome / splash
    └── Step 1: Role selection (4 roles)
    └── Step 2: Profile setup (name, team, age)
    └── Step 3: Plan selection (Basic / Advanced / Pro)
        └── "Start Coaching" → Main App (scr = "app")
```

---

## Component Architecture

All components live under `src/ui/` (design system) and `src/features/` (tab screens). **See [`../design/ui-reference.md`](../design/ui-reference.md) for the token and primitive catalog.**

```
src/
├── app/           # App shell, TabBar, GlobalStyles
├── ui/            # atoms → molecules → organisms
├── features/      # Home, Roster, Schedule, Content, Chat, More, Onboarding
├── data/mocks/    # prototype mock data (replaced by APIs in stories)
└── assets/images/ # placeholder photos
```

### Primitives / Shared Components

| Component | Purpose |
|-----------|---------|
| `Hero`    | Full-bleed image banner with gradient overlay and slot for children |
| `Strip`   | Narrower image banner used as section dividers with optional label |
| `Pill`    | Small colored label badge (e.g. position, status) |
| `Av`      | Avatar — either gradient initials or photo |
| `IA`      | Inner image avatar (used by `Av`) |
| `Cd`      | Card container with dark background, rounded corners, optional tap handler |
| `Btn`     | Button — primary (orange gradient) or secondary (outlined) |
| `SH`      | Section header with title and optional "View All" action |
| `PB`      | Progress bar (label, percentage, color) |
| `Rg`      | Ring/donut gauge chart (SVG-based) |
| `Sp`      | Sparkline chart (SVG polyline with gradient fill) |
| `Bk`      | Back button with left arrow icon |
| `I`       | SVG icon component — renders from a 30+ icon path dictionary |

### Screen Components

| Component | Tab |
|-----------|-----|
| `Onboard` | Pre-login flow |
| `Home`    | Tab 0 |
| `Roster` + `Prof` | Tab 1 |
| `SchedTab` | Tab 2 |
| `ContTab` | Tab 3 |
| `ChatTab` | Tab 4 |
| `MoreTab` | Tab 5 |

---

## Player Profile Tabs

Each player profile (`Prof`) consists of 6 tabs:

| Tab         | Content |
|-------------|---------|
| `overview`  | Bio, injury status, rating trend sparkline, skill breakdown bars, player milestone updates |
| `objectives`| Goal rings + AI-suggested content from marketplace |
| `stats`     | Season averages grid (PPG, APG, RPG, etc.) + scoring trend sparkline |
| `games`     | Game log cards per opponent with PTS / AST / REB breakdown |
| `content`   | Assigned drills, videos, articles with status (Done / In Progress / Not Started) |
| `notes`     | Coach notes with date, add note button |

---

## Data Models

### Player (`PL[]`)

```js
{
  id, nm, pos, num, rt, av, tr, st, img,
  ht, wt, age, yr, ag, bio,
  sk: { Shooting, Passing, Defense, Speed, "Basketball IQ" },
  ss: { PPG, APG, RPG, SPG, "FG%", "3P%", "FT%" },
  wk: [...],           // weekly rating array (sparkline)
  log: [{ vs, d, p, a, r, w }],       // game log
  goals: [{ t, p, c }],               // objectives
  asgn: [{ t, ty, s }],               // assigned content
  notes: [{ d, x }],                  // coach notes
  prog: [{ d, x, ty }],               // player updates/milestones
  injury?: { type, since, ret, note } // optional
}
```

### Session (`sch[]`)

```js
{ id, ti, tm, dt, ty, n, dur, ct }
// ty: "practice" | "film" | "individual" | "game" | "fitness"
```

### Content Library (`cLb[]`)

```js
{ id, ti, ty, dur, vw, lk, tg, dp }
// ty: "video" | "drill" | "article"
// lk: locked (drip scheduling)
// dp: unlock date
```

### Marketplace (`mkt[]`)

```js
{ id, ti, by, pr, rt, rv, n, em, ai, why }
// ai: AI-recommended flag
```

### Chat (`chL[]`, `dms[]`)

```js
// Conversation list
{ id, nm, ty, last, tm, ur, av, img }
// ty: "team" | "dm"

// Messages
{ id, t, tm, me }
// me: 1 = sent by coach, 0 = received
```

---

## Design System

### Color Palette (`C`)

| Token | Value | Usage |
|-------|-------|-------|
| `bg`  | `#0C0C10` | App background |
| `sf`  | `#16161C` | Surface (nav bars) |
| `cd`  | `#1C1C24` | Card background |
| `el`  | `#22222C` | Elevated elements |
| `ink` | `#F2F2F5` | Primary text |
| `sub` | `#9494A8` | Secondary text |
| `dim` | `#5C5C72` | Muted / inactive |
| `ln`  | `#2A2A36` | Borders / dividers |
| `br`  | `#F07A3A` | Primary brand (orange) |
| `br2` | `#FF9D5C` | Brand gradient end |
| `gn`  | `#3AE8B0` | Success / green |
| `bl`  | `#6EA8FF` | Info / blue |
| `vi`  | `#A88BFF` | AI / violet |
| `am`  | `#FFD04A` | Warning / amber |
| `ro`  | `#FF6060` | Error / red |

### Typography

- **UI font (`ff`):** `DM Sans` — used for body text, labels, inputs
- **Display font (`fd`):** `Nunito` — used for headings, numbers, player stats

### Animations

- Fade-up on screen mount: `@keyframes fu { opacity 0→1, translateY 8px→0 }`

---

## AI Features

- **Home AI Insight panel** — rotating tips based on team objectives and player data
- **Player Objectives tab** — AI-matched marketplace recommendations with rationale
- **Content Marketplace** — items tagged with `ai: 1` and a `why` explanation string
- **More → AI Coach** — menu entry for a future behavior-based suggestions screen

---

## Subscription Plans

| Plan     | Price        | Key Features |
|----------|--------------|--------------| 
| Basic    | Free         | Profile, purchase content, track progress |
| Advanced | $9.99/mo     | + Coaching, communication, scheduling |
| Pro      | $19.99/mo    | + AI insights, drip scheduling, objectives, club management |

---

## Images

The file embeds base64-encoded JPEG images inline as constants:

| Constant | Usage |
|----------|-------|
| `PI`     | Player profile images |
| `CI`     | Coach avatar (Coach Mike) |
| `BC`     | Background — court image (warm) |
| `BP`     | Background — court image (cool) |
| `BD`     | Background — dark detail shot |

---

## Current constraints / MVP notes

- Data is **static mock** until Supabase stories land (no API calls yet)
- No routing library — navigation via `useState` (`scr`, `tab`, `sel`)
- No external component libraries — hand-built inline styles
- Single-file architecture — refactor into `src/features/` per story scope
- Chat does not persist — messages reset on unmount
- Several "More" menu items are stubs

**Production gaps** (native release, CI, admin web deploy): see [`../architecture/tech-stack.md`](../architecture/tech-stack.md#production-readiness-gaps).
