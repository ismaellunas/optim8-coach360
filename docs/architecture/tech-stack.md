# Coach360 — Tech Stack & Architecture Documentation

> A SaaS-first, vibe-coding-friendly technology recommendation for the Coach360 basketball coaching and player development platform.
>
> **Documentation index:** [`../README.md`](../README.md)  
> **Content & CMS:** [`content-model.md`](./content-model.md)  
> **AI & RAG:** [`ai-integration.md`](./ai-integration.md)  
> **Product flows:** [`../product/flows.md`](../product/flows.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Vibe Coding Considerations](#vibe-coding-considerations)
3. [Recommended Tech Stack Overview](#recommended-tech-stack-overview)
4. [Core Services Deep Dive](#core-services-deep-dive)
5. [Content Management (Headless CMS)](#content-management-headless-cms)
6. [AI & Chat](#ai--chat)
7. [Alternative Considerations](#alternative-considerations)
8. [Architecture Diagram (Conceptual)](#architecture-diagram-conceptual)
9. [Cost & Scaling Notes](#cost--scaling-notes)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document recommends a **SaaS-first, TypeScript/JavaScript-centric** stack optimized for AI-assisted development ("vibe coding"). Every major component has a managed/SaaS option to minimize DevOps, accelerate iteration, and let you focus on product logic rather than infrastructure.

**Key decisions:**
- **Mobile:** React Native (Expo) for cross-platform, strong AI-tooling support
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Content:** Sanity.io (headless CMS) — or your preferred alternative
- **AI/Chat:** Mistral AI (approved) with Vercel AI SDK for flexibility
- **Payments:** Stripe Billing (subscriptions)
- **Hosting:** Vercel (web/admin) + EAS (mobile builds)

---

## Vibe Coding Considerations

### What Makes a Stack "Vibe Coding Friendly"

| Factor | Why It Matters |
|--------|----------------|
| **TypeScript/JavaScript** | Largest ecosystem in AI training data; Cursor, v0, Bolt, etc. generate best code for JS/TS |
| **Conventional patterns** | Frameworks with clear conventions (Next.js, Supabase) produce predictable, AI-friendly code |
| **Documentation & community** | Well-documented APIs = better AI suggestions and fewer hallucinations |
| **Component libraries** | Shadcn/ui, Radix, MUI reduce boilerplate; AI can compose, not invent |
| **Declarative schemas** | Sanity, Prisma, Supabase schemas = AI can generate valid code consistently |
| **Managed services** | Less custom infra = fewer edge cases for AI to mis-handle |

### Recommended Dev Environment

- **IDE:** Cursor (or VS Code with Copilot)
- **AI Tools:** Cursor Composer, v0.dev for UI, Bolt for full-stack scaffolding
- **Package manager:** pnpm (faster, stricter)

---

## Recommended Tech Stack Overview

| Layer | Primary Choice | SaaS? | Vibe Coding Notes |
|-------|----------------|-------|-------------------|
| **Mobile App** | React Native (Expo) | EAS Cloud | Strong TS support, huge ecosystem |
| **Admin Dashboard** | Next.js 14 (App Router) | Vercel | Best AI support, server components |
| **Backend / API** | Supabase | ✅ Fully managed | SQL + Auth + Realtime + Storage |
| **Database** | PostgreSQL (Supabase) | ✅ | Excellent schema, RLS for multi-tenancy |
| **Content CMS** | Sanity.io | ✅ | Schema-driven, real-time, great DX |
| **AI / Chat** | Mistral AI + Vercel AI SDK | ✅ | Unified API, easy model switching |
| **Authentication** | Supabase Auth | ✅ | Built-in, social logins, magic links |
| **Payments** | Stripe Billing | ✅ | Subscriptions, trials, paywalls |
| **File Storage** | Supabase Storage | ✅ | Or Cloudflare R2 for cheaper egress |
| **Real-time Chat** | Supabase Realtime or Stream Chat | ✅ | Presence, channels, typing indicators |
| **Email** | Resend or Loops | ✅ | Transactional + marketing |
| **Analytics** | PostHog or Mixpanel | ✅ | Product analytics, funnels |
| **Error Monitoring** | Sentry | ✅ | Crash reporting, performance |

---

## Core Services Deep Dive

### 1. Mobile Application — React Native (Expo)

**Why React Native + Expo:**
- **Single codebase** for iOS and Android (and optional web)
- **Expo** = managed builds, OTA updates, no Xcode/Android Studio for MVP
- **TypeScript-first** = excellent AI code generation
- **EAS (Expo Application Services)** = cloud builds, submit to stores, OTA

**Alternatives considered:**
- **Flutter:** Strong, but Dart has less AI training data than TS
- **Native (Swift/Kotlin):** Best performance, but 2x codebase and slower iteration

---

### 2. Backend — Supabase

**What Supabase provides (all SaaS):**
- PostgreSQL database with REST + Realtime APIs
- Row Level Security (RLS) for multi-tenant (coach/player/team) isolation
- Auth (email, magic link, OAuth)
- Storage (videos, images, documents)
- Realtime (presence, chat channels)

**Vibe coding win:** Supabase has generated TypeScript types, so AI can generate type-safe queries and mutations.

---

### 3. Payments — Stripe Billing

**Handles:**
- Subscription tiers (Basic, Advanced, Pro)
- Trial periods
- Paywalls
- Webhooks for subscription lifecycle

**SaaS:** Fully managed. No payment server to run.

---

### 4. Admin Dashboard — Next.js on Vercel

**Purpose:** Manage users, content, subscriptions, analytics.

**Why Next.js:**
- App Router + Server Components = fast, SEO-friendly
- API routes for webhooks and server-side logic
- Vercel deploy = zero config, preview URLs per branch

---

## Content Management (Headless CMS)

### Your Choice: Headless CMS ✅

A headless CMS is ideal for Coach360 because:
- Training content (drills, strategies, videos) needs structure
- Coaches may create custom content; players consume it
- Dripping requires content scheduling and access control
- Rich media (video, images) needs a flexible schema

### Recommended: Sanity.io

| Aspect | Benefit |
|--------|---------|
| **Schema-driven** | Define content types (Drill, Strategy, Video); AI can generate schemas |
| **Real-time collaboration** | Multiple editors, live preview |
| **GROQ queries** | Flexible querying; similar to GraphQL |
| **CDN delivery** | Fast global content delivery |
| **Free tier** | Generous for MVP |
| **Integrations** | Webhooks, export, embed in Next.js |

**Content types you'll likely need:**
- `Drill` (name, description, video, difficulty, category)
- `Strategy` (play diagrams, notes)
- `TrainingProgram` (collection of drills, drip schedule)
- `CoachContent` (user-generated, linked to coach profile)

### Alternatives to Sanity

| CMS | Pros | Cons |
|-----|------|------|
| **Contentful** | Enterprise-grade, mature | Steeper learning curve, pricing |
| **Payload CMS** | Self-hostable, TypeScript | Less SaaS; you manage infra |
| **Strapi Cloud** | Open source, flexible | Heavier; more backend logic |
| **Hygraph** | GraphQL-native | Different paradigm if team prefers REST |

**Recommendation:** Sanity for best vibe coding DX and schema clarity. Contentful if you need enterprise support later.

**Admin dashboard integration:** Sanity Studio is the content **authoring** UI; the Next.js admin dashboard (Flow 7) handles **publish, approve, pricing, and drip governance**. See [`content-model.md`](./content-model.md) § Sanity vs admin dashboard.

---

## AI & Chat

### Your Choice: Mistral AI ✅

**Mistral AI is a strong choice:**
- Competitive pricing
- Good multilingual support
- Strong instruction-following
- API-compatible with OpenAI-style interface
- EU-friendly (if relevant for data residency)

### Recommended: Mistral + Vercel AI SDK

**Vercel AI SDK** provides:
- Unified API for Mistral, OpenAI, Anthropic, etc.
- Easy model switching (e.g., Mistral for chat, smaller model for embeddings)
- Streaming responses
- Framework adapters (React, Next.js)

**Use cases in Coach360:**
1. **Chat support** — Player/coach Q&A, training advice
2. **Personalization** — AI learns from behavior (future)
3. **Content summarization** — Summarize long videos or strategies
4. **Drill suggestions** — Recommend drills based on player progress

### Alternative AI Providers

| Provider | Best For | Notes |
|----------|----------|-------|
| **Mistral** | Cost/performance, EU | Your choice; recommended |
| **Anthropic Claude** | Long context, safety | Great for complex reasoning |
| **OpenAI GPT-4** | Broad capability | Higher cost, strong ecosystem |
| **Groq** | Ultra-low latency | For real-time chat feel |
| **Together AI** | Open models, self-hosted feel | Fine-tuning, custom models |

**Recommendation:** Start with Mistral. Use Vercel AI SDK so you can swap providers without rewriting chat logic.

For package recommendations, RAG architecture, and phased MVP approach, see [`ai-integration.md`](./ai-integration.md).

---

## Alternative Considerations

### If You Prefer Different Stack Pieces

| Instead of... | Consider... | When |
|---------------|-------------|------|
| Supabase | Firebase | You want more NoSQL / document style |
| Supabase | AWS Amplify | You're already in AWS ecosystem |
| Sanity | Contentful | Enterprise compliance needed |
| Stripe | Paddle / LemonSqueezy | You want handled tax/VAT |
| Supabase Realtime | Stream Chat / Sendbird | You need advanced chat (threads, reactions, moderation) |
| Mistral | Claude | You need very long context (e.g., full game footage analysis) |

---

## Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COACH360 PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │   Mobile     │     │   Admin      │     │   Headless CMS            │ │
│  │   (Expo)     │     │   (Next.js)  │     │   (Sanity)                │ │
│  │   iOS/Android│     │   Vercel     │     │   Training content        │ │
│  └──────┬───────┘     └──────┬───────┘     └─────────────┬──────────────┘ │
│         │                    │                           │               │
│         └────────────────────┼───────────────────────────┘               │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      SUPABASE (Backend)                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │ │
│  │  │ PostgreSQL│ │   Auth   │ │ Realtime │ │ Storage  │ │   Edge Fn  │ │ │
│  │  │  (Data)   │ │ (Users)  │ │ (Chat)   │ │ (Media)  │ │ (Webhooks) │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                 │
│  │   Stripe    │     │  Mistral AI │     │   Resend    │                 │
│  │  (Billing)  │     │  (Chat AI)  │     │  (Email)    │                 │
│  └─────────────┘     └─────────────┘     └─────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cost & Scaling Notes

| Service | Free Tier / MVP | Scale Considerations |
|---------|-----------------|----------------------|
| **Supabase** | Free tier: 500MB DB, 1GB storage | Pro ~$25/mo; scale DB as needed |
| **Sanity** | Free: 3 users, 10GB assets | Growth plan ~$99/mo |
| **Vercel** | Hobby free; Pro $20/mo | Per-seat; scale with traffic |
| **Stripe** | No base fee; 2.9% + 30¢ | Pay per transaction |
| **Mistral** | Pay per token | ~$0.001/1K tokens (varies) |
| **EAS** | Limited free builds | ~$29/mo for production |
| **Resend** | 3K emails/mo free | $20/mo for 50K |

**Rough MVP monthly:** $100–200 depending on usage. Growth adds Supabase Pro, Sanity Growth, more EAS builds.

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1–4)
- [ ] Supabase project: schema (users, profiles, teams, subscriptions)
- [ ] Supabase Auth: email + magic link
- [ ] Sanity project: content types (Drill, Strategy)
- [ ] Next.js admin shell (auth, basic dash)
- [ ] Stripe: products, prices, webhook for subscription status

### Phase 2: Mobile Core (Weeks 5–8)
- [ ] Expo app: auth, profile creation (coach/player/team)
- [ ] Supabase integration in app
- [ ] Content fetch from Sanity
- [ ] Basic paywall (Stripe → Supabase subscription status)

### Phase 3: Communication & AI (Weeks 9–12)
- [ ] Real-time chat (Supabase Realtime or Stream Chat)
- [ ] Mistral + Vercel AI SDK: chat interface
- [ ] Planning/scheduling (Supabase schema + UI)

### Phase 4: Content & Dripping (Weeks 13–16)
- [ ] Content sharing flow
- [ ] Drip logic (subscription tier + schedule)
- [ ] Video upload/playback (Supabase Storage or Mux)

### Phase 5: polish (Weeks 17+)
- [ ] Trial flow
- [ ] Admin features
- [ ] Analytics, error monitoring
- [ ] App store submission

---

## Summary

| Decision | Recommendation |
|----------|----------------|
| **Headless CMS** | Sanity.io (or Contentful) |
| **Chat AI** | Mistral AI + Vercel AI SDK |
| **Overall approach** | SaaS-first, TypeScript, managed services |
| **Vibe coding** | React Native, Next.js, Supabase, Sanity — all have strong AI-tooling support |

This stack minimizes infrastructure work, maximizes AI-assisted development productivity, and keeps the door open to swap providers (CMS, AI, payments) as your needs evolve.

---

## Prototype vs planned production

The UI prototype in `coach360_draft/` uses **React + Vite + Capacitor** with mock data ([`../prototype/README.md`](../prototype/README.md)). The **planned production stack** above uses **Expo**, **Supabase**, **Sanity**, and **Stripe**. Do not treat the prototype implementation as architecture truth.

---

*Document version: 1.0*  
*Last updated: February 2025 · Cross-linked June 2026*
