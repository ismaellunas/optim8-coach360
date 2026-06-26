# Coach360 — UI Design Reference

> **Living source:** `src/App.jsx` — this document catalogs what exists today.  
> **Agent rule:** `.cursor/rules/ui-design-system.mdc`  
> **Application context:** [`../prototype/README.md`](../prototype/README.md)

The dummy app in `src/App.jsx` is the **canonical UI** for Coach360. All new screens and components must reuse its tokens, primitives, and patterns.

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

## Primitives

Defined at top of `src/App.jsx` (before screen components).

| Name | Props (key) | Purpose |
|------|-------------|---------|
| `Hero` | `src`, `children`, `h` | Full-bleed header image + dark gradient |
| `Strip` | `src`, `label`, `icon`, `h`, `offset` | Narrow section banner |
| `Pill` | `t`, `c`, `b` | Small uppercase badge |
| `IA` | `src`, `sz` | Image avatar inner |
| `Av` | `ch`, `sz`, `g`, `img` | Avatar (initials gradient or photo) |
| `Cd` | `children`, `sx`, `tap` | Card; `tap` makes it clickable |
| `Btn` | `children`, `primary`, `full`, `sx` | Button |
| `SH` | `title`, `act`, `label` | Section header |
| `PB` | `l`, `v`, `c` | Progress bar with label |
| `Rg` | `v`, `sz`, `c` | SVG donut gauge |
| `Sp` | `d`, `c`, `h` | Sparkline |
| `Bk` | `onClick`, `l` | Back button |
| `I` | `n`, `s`, `c` | SVG icon (`home`, `users`, `cal`, `chat`, `play`, `brain`, …) |

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

- Fonts: `src/main.jsx` (`@fontsource/*`)
- Placeholder images: `PI`, `CI`, `BC`, `BP`, `BD` constants in `App.jsx`
- Do not use `src/index.css` theme variables for app UI (those are unused Vite defaults)

---

## Future extraction

When refactoring out of `App.jsx`, target structure:

```
src/ui/
  tokens.js      # export C, ff, fd, tC, sC, skC
  Hero.jsx
  Btn.jsx
  ...
```

Extract by **moving** code, not redesigning. Until then, import or duplicate-import from `App.jsx` only if a story requires split files — prefer keeping primitives in one module first.

---

*Catalog version: 1.0 · June 2026*
