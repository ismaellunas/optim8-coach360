# Environment promotion runbook

> **Scope:** Dev → staging → production for Supabase, admin web, and Capacitor mobile  
> **Related:** [`admin-deploy.md`](../architecture/admin-deploy.md) · [`mobile-deploy.md`](../architecture/mobile-deploy.md) · [`native-release.md`](../architecture/native-release.md) · [`.env.example`](../../.env.example)

---

## Environments

| Environment | Supabase | Admin web | Mobile app |
|-------------|----------|-----------|------------|
| **Local dev** | `supabase start` (Docker) | `npm run dev:admin` | `npm run dev:mobile` + simulators |
| **Staging** | Dedicated Supabase project | Vercel preview or `admin-staging.coach360.com` | Vercel preview or `app-staging.coach360.com`; internal native tracks |
| **Production** | Production Supabase project | `admin.coach360.com` (Vercel) | `app.coach360.com` (Vercel web) + App Store / Play Store (native) |

Never commit credentials. Use Vercel env vars for admin and mobile web deploys; GitHub Actions runs CI only (lint, tests, Android build).

---

## Secrets management

### Vercel (admin app)

Set per environment (Production / Preview) in the Vercel dashboard — see [`admin-deploy.md`](../architecture/admin-deploy.md).

| Variable | Required |
|----------|----------|
| `VITE_SUPABASE_URL` | Yes |
| `VITE_SUPABASE_ANON_KEY` | Yes |
| `VITE_SANITY_STUDIO_URL` | Yes |

### Local / developer

Copy [`.env.example`](../../.env.example) to `.env` (gitignored). Never set `SUPABASE_SERVICE_ROLE_KEY` in client bundles.

### Android release signing

Store keystore path and passwords in a password manager or CI secrets — **never commit** `coach360-release.keystore`. See [`native-release.md`](../architecture/native-release.md#release-keystore).

---

## Promotion: Supabase

1. **Develop locally** — `supabase start`, apply migrations via `supabase db reset` or `supabase migration up`.
2. **Staging** — `supabase link --project-ref <staging-ref>`, then `supabase db push`. Smoke-test with staging anon key.
3. **Production** — `supabase link --project-ref <prod-ref>`, review migration diff, then `supabase db push` during a maintenance window if destructive.
4. **Verify** — Confirm RLS policies, admin profile exists (`role = 'admin'`), and `npm run db:verify` passes against local before pushing.

**Rollback:** Restore from Supabase point-in-time backup (Pro plan) or apply a forward-fix migration. Do not revert migrations by editing history.

---

## Promotion: Admin web

Automated on merge to `main` via **Vercel Git integration** — see [`admin-deploy.md`](../architecture/admin-deploy.md#deploy-on-merge-to-main).

### Manual promotion checklist

1. `supabase db push` applied to target Supabase project.
2. Admin user provisioned in `profiles` with `role = 'admin'`.
3. `npm run test:story-1.3` passes locally or in CI.
4. `npm run build:admin` succeeds.
5. Deploy preview → verify login, four nav pillars (Users, Subscriptions, Content, Monitor), Sanity Studio link.
6. Promote to production domain.

See also [`admin-deploy.md`](../architecture/admin-deploy.md#promotion-checklist).

**Rollback:** Redeploy a previous Vercel deployment from the Vercel dashboard (Instant Rollback).

---

## Promotion: Mobile web

Automated on merge to `main` via **Vercel Git integration** — see [`mobile-deploy.md`](../architecture/mobile-deploy.md#deploy-on-merge-to-main).

### Manual promotion checklist

1. `supabase db push` applied to target Supabase project.
2. `npm run build:mobile` succeeds.
3. Deploy preview → verify sign-up, role select, and profile flows on a mobile viewport.
4. Supabase Auth **Redirect URLs** include the Vercel production (and preview) origins.
5. Promote to production domain.

See also [`mobile-deploy.md`](../architecture/mobile-deploy.md#promotion-checklist).

**Rollback:** Redeploy a previous Vercel deployment from the Vercel dashboard (Instant Rollback).

---

## Promotion: Mobile native (Capacitor)

CI validates `assembleRelease` on every PR and `main` push (debug-signed APK for pipeline verification only). Store releases use a production keystore.

### Release checklist

1. Bump versions per [`native-release.md`](../architecture/native-release.md#versioning).
2. `npm run build:cap` (or `build:mobile` + `cap sync` on a Mac with Xcode for iOS).
3. **Android** — Generate signed `.aab` with release keystore; upload to Play Console (internal track first).
4. **iOS** — Archive in Xcode; upload to App Store Connect (TestFlight first).
5. Smoke-test on physical devices: auth, status bar, keyboard resize.

**Rollback:** Submit a previous store version or halt rollout in Play Console / App Store Connect. No OTA for Capacitor without a live-update plugin.

---

## CI/CD overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | PR + push to `main` | Lint, typecheck, story tests 1.2–1.4, Android `assembleRelease` |
| [`.github/workflows/supabase-deploy.yml`](../../.github/workflows/supabase-deploy.yml) | Push to `main` (paths under `supabase/**`) + manual dispatch | Incremental `db push` + `functions deploy`. No `db reset`. |
| Vercel Git integration (`apps/admin`) | Push to `main` | `build:admin` on Vercel → production deploy |
| Vercel Git integration (`apps/mobile`) | Push to `main` | `build:mobile` on Vercel → production deploy (browser) |
| GitHub Pages (`docs/`) | Push to `main` | Tracker + markdown docs (branch deploy, no Actions workflow) |

**Supabase deploy secrets** (repo → Settings → Secrets and variables → Actions):

| Secret | Source |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | Dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → database password |

**Note:** STORY-1.1 database tests (`db:verify`) require local Supabase Docker and are not run in default CI. Run manually before schema promotions.

---

## First-time setup

1. Create Supabase projects for staging and production.
2. Create Vercel projects for `apps/admin` and `apps/mobile`; connect GitHub repo with Production branch `main`.
3. Register `com.coach360.app` in Apple Developer and Google Play Console.
4. Generate Android release keystore; configure signing in `android/app/build.gradle` for local/store builds (not CI).

---

*Document version: 1.0 · STORY-1.4 · July 2026*
