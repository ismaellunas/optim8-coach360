# Coach360 — UI Design Reference

> **Living source:** `src/App.jsx` (mock; primitives migrate to `src/ui/` per story)  
> **Agent rule:** `.cursor/rules/ui-design-system.mdc`  
> **Application context:** [`../prototype/README.md`](../prototype/README.md) — **slice-first workflow**

The mock in `src/App.jsx` is the **canonical UI reference** for Coach360. New production screens must reuse its tokens, primitives, and patterns — extracted into `src/features/` + `src/ui/` before wiring real data.

---

## Layout

| Constraint | Value |
|------------|-------|
| Max width | `430px` (centered) |
| Horizontal padding | `20px` |
| Bottom padding (tab screens) | `110px` (clears tab bar) |
| Card border radius | `18px` |
| Button border radius | `16px` |
| Avatar border radius | `14px` |
| Touch target minimum | `44px` height |

---

## Color palette (`C`)

```javascript
const C = {
  bg: "#0C0C10",   // app background
  sf: "#16161C",   // surfaces (nav, headers)
  cd: "#1C1C24",   // cards
  el: "#22222C",   // elevated / progress track
  ink: "#F2F2F5",  // primary text
  sub: "#9494A8",  // secondary text
  dim: "#5C5C72",  // muted / inactive
  ln: "#2A2A36",   // borders
  br: "#F07A3A",   // brand orange
  br2: "#FF9D5C",  // brand gradient end
  brG: "rgba(240,122,58,.25)",  // brand glow
  brS: "rgba(240,122,58,.10)",  // brand subtle bg
  gn: "#3AE8B0",   // success
  gnS: "rgba(58,232,176,.10)",
  gT: "#2BC895",   // positive trend text
  bl: "#6EA8FF",   // info
  blS: "rgba(110,168,255,.10)",
  vi: "#A88BFF",   // AI
  viS: "rgba(168,139,255,.10)",
  am: "#FFD04A",   // warning / drip
  amS: "rgba(255,208,74,.10)",
  ro: "#FF6060",   // error / injury
  roS: "rgba(255,96,96,.10)",
};
```

### Semantic color maps

```javascript
const tC = { practice: C.br, film: C.bl, individual: C.vi, game: C.am, fitness: C.gn };
const sC = { done: C.gn, wip: C.am, todo: C.dim };
const skC = { Shooting: C.br, Passing: C.bl, Defense: C.gn, Speed: C.am, "Basketball IQ": C.vi };
```

---

## Typography

| Token | Font | Weights loaded | Use |
|-------|------|----------------|-----|
| `ff` | DM Sans | 400–700 | Body, labels, inputs, tab labels |
| `fd` | Nunito | 600–900 | Headings, stats, ratings, buttons |

Loaded in `src/main.jsx` via `@fontsource/dm-sans` and `@fontsource/nunito`.

---

Import shared UI from `src/ui/index.js`:

```javascript
import { C, Btn, Cd, Hero, I } from '../ui/index.js';
```

## Primitives

Defined under `src/ui/`:

| Path | Component |
|------|-----------|
| `ui/tokens.js` | `C`, `ff`, `fd`, `tC`, `sC`, `sL`, `skC` |
| `ui/atoms/` | `Icon` (`I`), `Button` (`Btn`), `Pill` |
| `ui/molecules/` | `Card` (`Cd`), `Avatar` (`Av`), `SectionHeader` (`SH`), `ProgressBar` (`PB`), `RingGauge` (`Rg`), `Sparkline` (`Sp`), `BackButton` (`Bk`) |
| `ui/organisms/` | `Hero`, `Strip`, `ScreenLayout` |

---

## Global styles (in `App` component)

Injected via `<style>` tag in `App`:

- `@keyframes fu` — fade-up on screen enter
- `body { background: C.bg }`
- `input::placeholder { color: C.dim }`
- Tab bar safe area: `env(safe-area-inset-bottom)`

---

## Screen patterns (reference implementations)

| Screen | Component | Patterns to copy |
|--------|-----------|------------------|
| Dashboard | `Home` | `Hero` + AI insight card + stat grid + `Strip` + `SH` + horizontal scroll cards |
| List + detail | `Roster` / `Prof` | Search in `Cd`, filter chips, list rows, profile tabs |
| Calendar | `SchedTab` | Day selector row, session cards with left color border |
| Library / shop | `ContTab` | Segmented control, drip banner, marketplace cards |
| Messaging | `ChatTab` | Thread list, full-screen chat, bubble styles |
| Settings hub | `MoreTab` | Profile card + menu rows |
| Onboarding | `Onboard` | Step progress, role cards, form inputs, plan cards |

When implementing a new story with UI, **find the closest existing screen** and match its structure.

---

## Fonts and assets

- Fonts: `src/index.css` `@theme` (`--font-display`, `--font-body`)
- Placeholder images: inline in `App.jsx` until extracted to `src/assets/`

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

*Catalog version: 1.0 · June 2026*
