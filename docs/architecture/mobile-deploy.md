# Coach360 — Mobile web deployment

> **App:** `apps/mobile`  
> **Stack:** Vite static build on Vercel (browser testing; same React UI as Capacitor)  
> **Related:** [`native-release.md`](./native-release.md) · [`admin-deploy.md`](./admin-deploy.md) · [`frontend-architecture.md`](./frontend-architecture.md)

Use this deploy to **test the mobile React app live in a browser** (production URL or PR previews). Native App Store / Play Store builds still use Capacitor — see [`native-release.md`](./native-release.md).

---

## Build

```bash
npm install
npm run build:mobile
```

Output: `apps/mobile/dist/`

Local preview:

```bash
npm run dev:mobile    # http://localhost:5173
```

Production bundle locally:

```bash
npm run build:mobile
npm run preview -w @coach360/mobile
```

---

## Vercel setup

Create a **separate** Vercel project from admin (do not reuse the `apps/admin` project).

1. Create a Vercel project pointing at this repository
2. Set **Root Directory** to `apps/mobile`
3. **Install command:** `cd ../.. && npm ci` (installs the full npm workspace from repo root)
4. **Build command:** `cd ../.. && npm run build:mobile` (runs `build` in `@coach360/mobile` via workspace)
5. **Output directory:** `dist`

These commands are also declared in `apps/mobile/vercel.json` so the Vercel dashboard and CLI stay aligned.

Do **not** set the build command to `npm run build:mobile` with root directory `apps/mobile` — that script exists only at the repo root.

### Deploy on merge to `main`

Connect the Vercel project to this GitHub repository (Vercel → Project → Settings → Git):

- **Production branch:** `main`
- **Root directory:** `apps/mobile`

Vercel builds on its own infrastructure when code is merged to `main`. Env vars from the Vercel dashboard are injected at build time — no GitHub Actions deploy workflow is required.

Ensure each `VITE_*` variable is enabled for **Build** in Vercel (not Runtime only).

Recommended hostname: `app.coach360.com` (staging: `app-staging.coach360.com`)

**Framework preset:** choose **Vite** or **Other** (not Android Gradle / iOS App — those are for native projects).

---

## Environment variables (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key (RLS enforced) |
| `VITE_API_ADAPTER` | No | `supabase` (default) or `rest` |
| `VITE_REST_API_BASE_URL` | When `rest` | Future REST API base URL |

Copy from [`.env.example`](../../.env.example). Never set `SUPABASE_SERVICE_ROLE_KEY` on the mobile static deploy.

`VITE_SUPABASE_URL` must be the **bare project URL** only:

```
https://<project-ref>.supabase.co
```

Do **not** include `/rest/v1`, `/auth/v1`, or a trailing path. A wrong value bakes into the static bundle and login fails with `Invalid path specified in request URL` (PostgREST `PGRST125`).

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- Set **Site URL** to your mobile web origin (e.g. `https://app.coach360.com`)
- Add the same origin (and Vercel preview URLs if needed) to **Redirect URLs**

---

## Browser vs native

| Capability | Vercel (browser) | Capacitor (device) |
|---|---|---|
| Auth, profile, subscription UI | Yes | Yes |
| Status bar / keyboard plugins | No-op | Native behavior |
| App Store / Play Store | N/A | [`native-release.md`](./native-release.md) |

Capacitor plugins are skipped when not on a native platform (`src/lib/capacitor.js`).

---

## Troubleshooting login

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid path specified in request URL` | `VITE_SUPABASE_URL` includes `/rest/v1` or points at the Vercel app URL | Set bare `https://<ref>.supabase.co` in Vercel Production env, redeploy |
| `Missing VITE_SUPABASE_* at build time` | Env vars missing or Runtime-only in Vercel | Enable **Build** on Production env vars in Vercel; redeploy |
| Auth redirect fails after login | Mobile origin not in Supabase redirect URLs | Add Vercel production + preview URLs in Supabase Auth settings |
| `Invalid login credentials` | Wrong email/password | Reset credentials in Supabase Auth |

---

## Security

- Coach/player auth is enforced by **Supabase RLS** and domain rules in `@coach360/domain`
- Response headers configured in `apps/mobile/vercel.json`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

Optional: add Vercel password protection on preview deployments for stakeholder demos.

---

## Promotion checklist

1. `supabase db push` — migrations applied to target project
2. `npm run build:mobile` succeeds locally or in CI
3. Deploy preview → verify sign-up, role select, profile setup on mobile viewport
4. Supabase Auth redirect URLs include production domain
5. Promote to production domain

**Rollback:** Redeploy a previous Vercel deployment from the Vercel dashboard (Instant Rollback).
