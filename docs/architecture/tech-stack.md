# Coach360 — Tech Stack & Architecture Documentation

> A SaaS-first, delivery-focused technology recommendation for the Coach360 basketball coaching and player development platform.
>
> **Documentation index:** [`../README.md`](../README.md)  
> **Development practices:** [`best-practices.md`](./best-practices.md)  
> **Content & CMS:** [`content-model.md`](./content-model.md)  
> **AI & RAG:** [`ai-integration.md`](./ai-integration.md)  
> **Product flows:** [`../product/flows.md`](../product/flows.md)

---

## Table of Contents

1. [Single-stack decision](#single-stack-decision)
2. [Executive Summary](#executive-summary)
3. [Application Stack](#application-stack)
4. [Backend & SaaS Services](#backend--saas-services)
5. [Content Management (Headless CMS)](#content-management-headless-cms)
6. [AI & Chat](#ai--chat)
7. [Architecture Diagram (Conceptual)](#architecture-diagram-conceptual)
8. [Cost & Scaling Notes](#cost--scaling-notes)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Production-readiness gaps](#production-readiness-gaps)

---

## Single-stack decision

**June 2026:** Coach360 uses **one application stack for prototype and production** — not two separate stacks with a later migration.

| | Stack |
|---|---|
| **Prototype (today)** | Vite + React — `src/App.jsx` UI mock (hardcoded data) |
| **Production (planned)** | Vite + React + Capacitor — thin shell + `src/features/` with real backends |

**Rationale:** Delivery time is the critical factor. Maintaining or migrating to a second client stack (e.g. React Native / Expo plus a separate admin framework) is not justified. The mock in `src/App.jsx` is the **visual reference**; each story **refactors a slice first** (see [`../prototype/README.md`](../prototype/README.md#story-implementation-workflow)), then wires Supabase and native builds — rather than rewriting on a different framework.

Backend services (Supabase, Sanity, Stripe, etc.) remain managed SaaS integrations called from this single client. There is **no migration to a separate production client stack**.

---

## Executive Summary

Coach360 is a **TypeScript/JavaScript-centric** product optimized for AI-assisted development and fast solo delivery. The client is one Vite + React + Capacitor codebase; infrastructure-heavy concerns use managed services.

**Key decisions:**

| Area | Choice |
|------|--------|
| **Client app** | Vite + React 19 + Capacitor (`src/App.jsx` → modular `src/` over time) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| **Content** | Sanity.io (headless CMS) |
| **AI** | Mistral AI + Vercel AI SDK |
| **Payments** | Stripe Billing |
| **Native distribution** | Capacitor → Xcode / Android Studio (see [gaps](#production-readiness-gaps)) |

---

## Application Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **UI framework** | React 19 | Functional components, hooks |
| **Build tool** | Vite 8 | Dev server, production bundles |
| **Native shell** | Capacitor 8 | iOS and Android from same web codebase |
| **Entry** | `src/main.jsx` | App bootstrap |
| **App shell** | `src/App.jsx` → thin shell | Mobile-first UI mock today; **slice-first refactor** per story into `src/features/` |
| **Styling** | Tailwind 4 (`src/index.css`) | DM Sans / Oswald via `@theme` coach-* tokens |
| **Lint** | ESLint 9 (flat config) | `npm run lint` |
| **Package manager** | npm | Lockfile at repo root |

### Admin (Flow 7)

Platform admin (Users, Subscriptions, Content, Monitor) ships as a **separate web app** at `apps/admin` (React 19 + TypeScript + Vite), deployed to a static host (e.g. Vercel). The Capacitor mobile app in `apps/mobile` does **not** bundle admin code. Sanity Studio remains the content **authoring** UI; admin handles **operations** (approve, publish, pricing). See [`content-model.md`](./content-model.md) and [`frontend-architecture.md`](./frontend-architecture.md).

> **Not in scope:** Next.js or a separate React Native admin app.

### Monorepo layout

| Package | Role |
|---|---|
| `apps/mobile` | Vite + React + Capacitor — coaches, players, teams |
| `apps/admin` | Vite + React 19 + TS — Flow 7 admin (web only) |
| `packages/domain` | Branded types, Zod schemas, pure business rules |
| `packages/api` | Repository ports + Supabase/REST adapters |
| `packages/ui` | Shared design primitives |

### Vibe coding considerations

| Factor | Why it matters |
|--------|----------------|
| **TypeScript/JavaScript** | Largest AI training corpus; strong Cursor support |
| **Single codebase** | One mental model for mobile + admin web surfaces |
| **Managed backends** | Supabase, Sanity, Stripe reduce custom infra |
| **Declarative schemas** | Sanity + Supabase types enable type-safe client code |

**Dev environment:** Cursor, ESLint, `npm run dev` / `npm run build`.

---

## Backend & SaaS Services

| Layer | Primary choice | SaaS? | Role |
|-------|----------------|-------|------|
| **Database** | PostgreSQL (Supabase) | ✅ | Users, teams, sessions, purchases, drip progress |
| **Auth** | Supabase Auth | ✅ | Email, magic link, OAuth; RLS for multi-tenant isolation |
| **API / realtime** | Supabase REST + Realtime | ✅ | Chat (MVP), presence, live updates |
| **File storage** | Supabase Storage | ✅ | Images, documents; large video via Mux |
| **Server logic** | Supabase Edge Functions | ✅ | Webhooks (Stripe, Sanity, Mux), privileged operations |
| **Payments** | Stripe Billing | ✅ | Subscriptions, trials, paywalls |
| **Email** | Resend or Loops | ✅ | Transactional + marketing |
| **Analytics** | PostHog or Mixpanel | ✅ | Product funnels |
| **Error monitoring** | Sentry | ✅ | Crashes, performance |

### Supabase

- Row Level Security (RLS) for coach / player / team isolation
- Generated TypeScript types for the Vite client
- Service role **only** in Edge Functions — never in the Capacitor app bundle

### Stripe

- Source of truth for billing; Supabase holds a read-model cache synced via webhooks
- Checkout and Customer Portal triggered from the app; webhooks handled server-side

---

## Content Management (Headless CMS)

### Sanity.io

| Aspect | Benefit |
|--------|---------|
| **Schema-driven** | Drills, strategies, training packages |
| **GROQ queries** | Flexible catalog reads from the Vite client |
| **CDN delivery** | Fast global content |
| **Webhooks** | Publish → Supabase sync + cache invalidation + RAG re-index |

**Content types:** `Drill`, `Strategy`, `TrainingProgram`, `CoachContent` — see [`content-model.md`](./content-model.md).

**Integration:** Sanity Studio for authoring; admin views in the Vite app for publish/approve/pricing; mobile app reads via Sanity CDN + Supabase for purchase state.

---

## AI & Chat

| Concern | Choice |
|---------|--------|
| **LLM** | Mistral AI |
| **Client SDK** | Vercel AI SDK (server-side in Edge Functions) |
| **RAG** | Supabase pgvector + Mistral embeddings |
| **Chat (scale)** | Stream Chat or Sendbird (optional; Supabase Realtime for MVP) |

See [`ai-integration.md`](./ai-integration.md) for phased MVP approach.

---

## Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COACH360 PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────┐     ┌────────────────────────┐ │
│  │   Vite + React + Capacitor           │     │   Sanity Studio         │ │
│  │   • Mobile (iOS / Android)           │     │   Training content      │ │
│  │   • Admin web views (Flow 7)         │     │   authoring             │ │
│  │   src/App.jsx → src/features/*       │     └───────────┬────────────┘ │
│  └──────────────────┬───────────────────┘                 │               │
│                     │ anon key + Bearer token              │ publish      │
│                     ▼                                      ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      SUPABASE (Backend)                              │ │
│  │  PostgreSQL · Auth · Realtime · Storage · Edge Functions · pgvector │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                     │                                                    │
│         ┌───────────┼───────────┬─────────────┐                           │
│         ▼           ▼           ▼             ▼                           │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                      │
│    │ Stripe  │ │ Mistral │ │  Mux    │ │ Resend  │                      │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cost & Scaling Notes

| Service | Free tier / MVP | Scale considerations |
|---------|-----------------|----------------------|
| **Supabase** | 500MB DB, 1GB storage | Pro ~$25/mo |
| **Sanity** | 3 users, 10GB assets | Growth ~$99/mo |
| **Stripe** | 2.9% + 30¢ per transaction | Per transaction |
| **Mistral** | Pay per token | Monitor usage per feature |
| **Capacitor builds** | Local Xcode / Android Studio | CI macOS runner for iOS (see gaps) |
| **Resend** | 3K emails/mo | $20/mo for 50K |

**Rough MVP monthly:** ~$100–200 depending on usage.

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1–4)

- [ ] Supabase project: schema (users, profiles, teams, subscriptions)
- [ ] Supabase Auth in Vite app
- [ ] Sanity project: content types (Drill, Strategy)
- [ ] Capacitor iOS/Android sync from existing `src/`
- [ ] Stripe products, prices, webhook → Edge Function

### Phase 2: Core app (Weeks 5–8)

- [ ] Auth + profile creation (coach / player / team) in Vite app
- [ ] Content fetch from Sanity
- [ ] Basic paywall (Stripe → Supabase subscription status)

### Phase 3: Communication & AI (Weeks 9–12)

- [ ] Real-time chat (Supabase Realtime or Stream)
- [ ] Mistral + Vercel AI SDK via Edge Functions
- [ ] Planning / scheduling (Supabase + UI)

### Phase 4: Content & dripping (Weeks 13–16)

- [ ] Content sharing flow
- [ ] Drip logic (tier + schedule)
- [ ] Video upload/playback (Mux + Supabase metadata)

### Phase 5: Polish (Weeks 17+)

- [ ] Trial flow
- [ ] Admin views (Flow 7 pillars)
- [ ] Analytics, error monitoring
- [ ] App store submission (Capacitor native builds)

---

## Production-readiness gaps

The following guidance **does not yet exist** in this repo and must be written for the Vite + Capacitor stack. Prior docs assumed Expo/EAS and Next.js/Vercel; those paths are abandoned.

| Topic | Status | Notes |
|-------|--------|-------|
| **Capacitor native release** | ⚠️ Not documented | App Store / Play Store signing, `cap sync`, versioning, splash/icons |
| **CI/CD for Capacitor** | ✅ Documented | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — lint, tests, Android release; [`environment-promotion.md`](../delivery/environment-promotion.md) |
| **Admin web deployment** | ✅ Documented | [`admin-deploy.md`](./admin-deploy.md) — Vercel static deploy for `apps/admin` |
| **Mobile web deployment** | ✅ Documented | [`mobile-deploy.md`](./mobile-deploy.md) — Vercel static deploy for `apps/mobile` (browser testing) |
| **Supabase client in Capacitor** | ⚠️ Partial | Session persistence (`@capacitor/preferences` or secure storage pattern) — see [`best-practices.md`](./best-practices.md) |
| **Webhook / Edge Function layout** | ⚠️ Not documented | Where Stripe/Sanity/Mux handlers live relative to monorepo |
| **Code splitting / `src/features/`** | ⚠️ Not documented | Migration plan from single-file `App.jsx` |
| **OTA updates** | ⚠️ Not documented | No Expo OTA; options: store releases or Capacitor live-update plugins (evaluate later) |

Track implementation of these gaps via EPIC-1 stories in [`../index.html`](../index.html).

---

## Summary

| Decision | Recommendation |
|----------|----------------|
| **Client** | Single stack: Vite + React + Capacitor |
| **Backend** | Supabase + Stripe + Sanity |
| **AI** | Mistral + Vercel AI SDK + pgvector |
| **Approach** | Harden prototype → production; no client stack migration |
| **Practices** | [`best-practices.md`](./best-practices.md) |

---

*Document version: 2.0 · Single-stack strategy · June 2026*
