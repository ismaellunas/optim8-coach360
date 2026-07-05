# Coach360 — Admin web deployment

> **App:** `apps/admin`  
> **Stack:** Vite static build on Vercel (or any static host)  
> **Related:** [`frontend-architecture.md`](./frontend-architecture.md)

---

## Build

```bash
npm install
npm run build:admin
```

Output: `apps/admin/dist/`

Local preview:

```bash
npm run dev:admin    # http://localhost:5174
```

---

## Vercel setup

1. Create a Vercel project pointing at this repository
2. Set **Root Directory** to `apps/admin`
3. **Install command:** `cd ../.. && npm ci` (installs the full npm workspace from repo root)
4. **Build command:** `cd ../.. && npm run build:admin` (runs `build` in `@coach360/admin` via workspace)
5. **Output directory:** `dist`

These commands are also declared in `apps/admin/vercel.json` so CI (`vercel build`) and the dashboard stay aligned.

Do **not** set the build command to `npm run build:admin` with root directory `apps/admin` — that script exists only at the repo root.

**CI note:** GitHub Actions builds on the runner, not on Vercel's servers. The deploy workflow pulls Production env via `vercel pull`, copies it to the repo root, then **exports `VITE_*` into the shell** before `vercel build` (Vite reads `process.env` at config load time).

Ensure each `VITE_*` variable is enabled for **Build** in Vercel (not Runtime only). If `vercel pull` still omits them, add GitHub repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as a fallback.

Recommended hostname: `admin.coach360.com` (staging: `admin-staging.coach360.com`)

---

## Environment variables (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key (RLS enforced) |
| `VITE_API_ADAPTER` | No | `supabase` (default) or `rest` |
| `VITE_SANITY_STUDIO_URL` | Yes | External Sanity Studio URL for Content pillar |
| `VITE_ADMIN_STAGING_URL` | No | Canonical staging URL for smoke tests |
| `VITE_REST_API_BASE_URL` | When `rest` | Future REST API base URL |

Copy from [`.env.example`](../../.env.example). Never set `SUPABASE_SERVICE_ROLE_KEY` on the admin static deploy.

`VITE_SUPABASE_URL` must be the **bare project URL** only:

```
https://<project-ref>.supabase.co
```

Do **not** include `/rest/v1`, `/auth/v1`, or a trailing path. A wrong value bakes into the static bundle and login fails with `Invalid path specified in request URL` (PostgREST `PGRST125`).

In Supabase Dashboard → **Authentication** → **URL Configuration**, set **Site URL** to your admin origin (e.g. `https://admin.coach360.com`) with no hash or path suffix.

---

## Troubleshooting login

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid path specified in request URL` | `VITE_SUPABASE_URL` includes `/rest/v1` or points at the Vercel app URL | Set bare `https://<ref>.supabase.co` in Vercel Production env, redeploy |
| `Missing VITE_SUPABASE_* at build time` | Vars not exported before `vercel build` in CI | Enable **Build** on Vercel env vars; or add GitHub secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `admin_access_denied:*` | User exists but `profiles.role` is not `admin` | Run `npm run seed:admin` against the target project |
| `Invalid login credentials` | Wrong email/password | Reset credentials in Supabase Auth |

---

## Security

- Admin auth is enforced by **Supabase RLS** + `canAccessAdmin` domain rule
- `profiles` trigger blocks non-admin role/suspension self-escalation (migration `20260630100000`)
- Response headers configured in `apps/admin/vercel.json`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

Optional: add a staging gate (HTTP basic or Vercel password protection) on preview deployments only.

---

## Promotion checklist

1. `supabase db push` — migrations applied to target project
2. Admin user provisioned in `profiles` with `role = 'admin'`
3. `npm run test:story-1.3` passes
4. `npm run build:admin` succeeds in CI
5. Deploy preview → verify login, four nav pillars, Sanity Studio link
6. Promote to production domain
