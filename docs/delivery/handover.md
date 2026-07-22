# Coach360 — Engineering handover

> **Audience:** Incoming engineers / operators taking over the monorepo  
> **Last updated:** July 2026  
> **Related:** [environment-promotion.md](./environment-promotion.md) · [admin-deploy.md](../architecture/admin-deploy.md) · [mobile-deploy.md](../architecture/mobile-deploy.md) · [.env.example](../../.env.example)

This document captures **third-party accounts**, **manual dashboard setup that is not in git**, and **known deploy pitfalls**. Product/architecture detail lives in the linked docs — do not duplicate it here.

**Never commit secrets.** Values live in local `.env` (gitignored), Vercel project env, and Supabase Edge Function secrets.

---

## Quick map

| Surface | Path / URL pattern | Host |
|---------|-------------------|------|
| Mobile app (Capacitor + web) | `apps/mobile` | Vercel (browser) + native stores |
| Admin web | `apps/admin` | Vercel — e.g. `https://coach360-admin-blond.vercel.app` |
| Embedded Sanity Studio | `/admin/studio` on the admin origin | Same Vercel admin deploy |
| Standalone Studio (local) | `npm run dev:studio` | `apps/studio` |
| Tracker / docs | `docs/` | GitHub Pages (`docs/index.html`) |
| Backend | `supabase/` | Local Docker or hosted Supabase |

---

## Third-party logins required

Grant the new owner **owner or admin** access on each account below (or transfer the org). Passwords/API keys are **not** stored in the repo — use the team password manager / invite emails.

| Service | Why we need it | Dashboard | Notes |
|---------|----------------|-----------|--------|
| **GitHub** | Source, CI, Pages | [github.com](https://github.com) | Repo: `ismaellunas/optim8-coach360` (confirm org transfer if needed) |
| **Supabase** | Auth, Postgres, RLS, Edge Functions, Storage | [supabase.com/dashboard](https://supabase.com/dashboard) | Local: `supabase start`. Cloud project ref in team notes / Vercel `VITE_SUPABASE_URL` |
| **Vercel** | Admin + mobile static deploys | [vercel.com](https://vercel.com) | **Two projects** — one Root Directory `apps/admin`, one `apps/mobile` |
| **Sanity** | CMS schemas + Studio login | [sanity.io/manage](https://www.sanity.io/manage) | Project ID `wv7uz07u`, dataset `production` (also defaults in code) |
| **Stripe** | Subscriptions, Checkout, webhooks | [dashboard.stripe.com](https://dashboard.stripe.com) | Test mode prices wired via `STRIPE_PRICE_*` env |
| **Mux** | Direct video uploads (coach library) | [dashboard.mux.com](https://dashboard.mux.com) | Token ID/secret → Edge Function `create-mux-upload` only |
| **Apple Developer** | iOS / TestFlight (when shipping native) | [developer.apple.com](https://developer.apple.com) | Bundle ID `com.coach360.app` — see [native-release.md](../architecture/native-release.md) |
| **Google Play Console** | Android store / internal track | [play.google.com/console](https://play.google.com/console) | Same package — see native-release |
| **Mistral** *(planned)* | AI / RAG | [console.mistral.ai](https://console.mistral.ai) | Not required until AI stories land |
| **Resend / email** *(planned)* | Transactional email | — | Optional; listed in tech stack |

### Sanity login (Studio)

Studio uses **Sanity’s own auth** (Google / GitHub / email via Sanity), not Supabase admin login.

1. Invite the person under Sanity project **Members** for `wv7uz07u`.
2. They open admin → Content → **Open Sanity Studio** (`/admin/studio`), or local Studio.
3. After OAuth, Sanity returns to the Studio URL with `#sid=…` (cookieless session). That URL **must** serve the SPA `index.html` (see [SPA rewrite pitfall](#pitfall-admin-spa-routes-404-on-vercel)).

### Supabase Auth (app + admin)

- Mobile and admin use **Supabase Auth** (email/password today).
- Admin users also need `profiles.role = 'admin'` — seed with `npm run seed:admin` against the target project.
- In Supabase → Authentication → URL Configuration, add every deployed origin (Vercel production + previews you care about) to **Redirect URLs** / **Site URL**.

---

## Manual setup already done (not fully reproducible from git alone)

These steps were performed in dashboards / CLI. Re-do them only when creating a **new** environment.

### 1. Supabase (cloud)

- [x] Hosted project created (URL/keys in password manager + Vercel env; local defaults use Docker).
- [x] Migrations applied via `supabase db push` / `supabase link`.
- [x] Admin profile seeded for at least one operator (`npm run seed:admin`).
- [ ] Confirm Auth redirect URLs include current Vercel admin + mobile origins after every new hostname.

### 2. Sanity CMS (STORY-9.1)

- [x] Sanity project created: **`wv7uz07u`**, dataset **`production`**.
- [x] Schemas live in `apps/studio` (drill, video, strategy, module, lesson, trainingPackage) and are embedded in admin at `/admin/studio`.
- [x] Local/env vars set: `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET`, `VITE_SANITY_STUDIO_URL`.
- [x] **CORS origins** (Sanity → Project → API → CORS origins): add every Studio host that loads the client, e.g.:
  - `http://localhost:5174`
  - `https://coach360-admin-blond.vercel.app` (and any custom `admin.*` domain)
  - Allow credentials if prompted for authenticated Studio
- [x] **Project members** invited for anyone who authors content in Studio.

### 3. Vercel — admin app

- [x] Vercel project linked to this GitHub repo.
- [x] **Root Directory:** `apps/admin` (required so `apps/admin/vercel.json` applies).
- [x] Install / build / output (also in `vercel.json`):
  - Install: `cd ../.. && npm ci`
  - Build: `cd ../.. && npm run build:admin`
  - Output: `dist`
- [x] Production env (enable for **Build**, not Runtime-only):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET` (recommended)
  - `VITE_SANITY_STUDIO_URL` (e.g. `https://<admin-host>/admin/studio`)
- [x] SPA rewrite present in repo: `rewrites` → `/index.html` (see pitfall below if deep links 404).

### 4. Vercel — mobile web (if used)

- [ ] Separate Vercel project, Root Directory `apps/mobile`, same monorepo install/build pattern — see [mobile-deploy.md](../architecture/mobile-deploy.md).
- [ ] Same Supabase `VITE_*` build env; Auth redirect URLs updated.

### 5. Stripe (billing)

- [x] Stripe account + test products/prices for Basic / Advanced / Pro.
- [x] Price IDs mapped to Edge Function env: `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ADVANCED`, `STRIPE_PRICE_PRO`.
- [x] `STRIPE_SECRET_KEY` (sk_test_… / sk_live_…) and webhook secret for `stripe-webhook` function.
- [ ] Production: switch to live keys, recreate webhook endpoint pointing at hosted Edge Function URL.

### 6. Mux (coach video upload — STORY-9.2)

- [x] Mux account + API token created.
- [x] Secrets for Edge Function `create-mux-upload`: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` (Supabase secrets / `.env` for `functions serve` — **never** in Vite client env).
- [ ] Confirm function deployed on cloud: `supabase functions deploy create-mux-upload`.

### 7. GitHub / CI

- [x] CI workflow: `.github/workflows/ci.yml` (lint, typecheck, story tests, Android assemble).
- [x] Docs published via GitHub Pages from `/docs` on `main`.
- [ ] After org transfer: update Pages, branch protection, and any remaining secrets.

### 8. Native (not fully production-shipped)

- Bundle ID / package: `com.coach360.app`.
- Release keystore and Apple certs live **outside** git — see [native-release.md](../architecture/native-release.md).

---

## Local developer bootstrap

```bash
cp .env.example .env          # fill from password manager / team
npm ci
supabase start                # Docker
supabase status -o env        # copy anon/service keys into .env if needed
npm run seed:admin            # optional local admin user
npm run dev:mobile            # :5173
npm run dev:admin             # :5174 — Studio at /admin/studio
# optional: npm run functions:serve
```

Full promotion flow: [environment-promotion.md](./environment-promotion.md).

---

## Env var cheat sheet (where they live)

| Variable | Client (Vite) | Edge Functions | Notes |
|----------|---------------|----------------|-------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | ✅ | — | Bare project URL only (no `/rest/v1`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | Server only |
| `VITE_SANITY_*` / `SANITY_STUDIO_*` | ✅ (VITE_) | — | Project `wv7uz07u` |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_*` / `STRIPE_WEBHOOK_SECRET` | ❌ | ✅ | Never put `whsec_` in `STRIPE_SECRET_KEY` |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | ❌ | ✅ | Mux Direct Upload |

Canonical template: [`.env.example`](../../.env.example).

---

## Pitfall: admin SPA routes 404 on Vercel

**Symptom:** `https://<admin>.vercel.app/` works, but `/admin`, `/admin/login`, `/admin/studio` show Vercel `404: NOT_FOUND` (often right after Sanity login `#sid=…`).

**Cause:** Static `index.html` is deployed, but **SPA rewrites from `apps/admin/vercel.json` are not applied** (wrong Root Directory, or project created without that config). Sanity OAuth does a full navigation back to `/admin/studio`, so the rewrite is mandatory.

**Fix:**

1. Vercel → Project → Settings → General → **Root Directory** = `apps/admin`.
2. Confirm Framework is Vite/Other and output is `dist`.
3. Redeploy; verify `/admin/studio` returns `200` with HTML (not `x-vercel-error: NOT_FOUND`).
4. Confirm response headers include those from `vercel.json` (e.g. `X-Frame-Options`) as a signal the file is active.

---

## Day-one checklist for the incoming owner

1. Get invites: GitHub, Supabase, Vercel, Sanity, Stripe, Mux (+ Apple/Play if shipping native).
2. Confirm access to the password manager vault for `.env` / Vercel / Supabase secrets.
3. Clone repo, run local bootstrap, open admin Studio and mobile login.
4. In Vercel admin project, verify Root Directory + SPA rewrite (hit `/admin/studio` cold).
5. In Sanity, confirm you are a project member and CORS lists the admin origin.
6. Read [tech-stack.md](../architecture/tech-stack.md) and the tracker at `docs/index.html`.

---

## Doc ownership

| Topic | Canonical doc |
|-------|----------------|
| Journeys / tiers | `docs/product/flows.md` |
| Stack & SaaS roles | `docs/architecture/tech-stack.md` |
| Admin deploy | `docs/architecture/admin-deploy.md` |
| Mobile web deploy | `docs/architecture/mobile-deploy.md` |
| Env promotion | `docs/delivery/environment-promotion.md` |
| This handover | `docs/delivery/handover.md` |

When you change a **dashboard-only** setting (CORS origin, new Vercel hostname, new Stripe price), update the checklist in this file the same day.

---

*Handover version: 1.0 · July 2026*
