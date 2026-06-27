# Coach360 — Development Best Practices Manual

> **Status:** Engineering reference  
> **Canonical stack:** [`tech-stack.md`](./tech-stack.md) — read that first for architecture decisions  
> **Scope:** Vite + React + Capacitor client patterns and backend integration rules  
> **Out of scope:** Deployment platform runbooks (see [production gaps](./tech-stack.md#production-readiness-gaps))  
> **Related:** [`content-model.md`](./content-model.md) · [`ai-integration.md`](./ai-integration.md)

---

## Table of Contents

1. [Principles](#principles)
2. [Vite + React + Capacitor](#vite--react--capacitor)
3. [Project structure](#project-structure)
4. [Supabase from the client](#supabase-from-the-client)
5. [Integration patterns](#integration-patterns)
6. [Cross-cutting rules](#cross-cutting-rules)
7. [Coach360 integration map](#coach360-integration-map)
8. [Documentation gaps](#documentation-gaps)
9. [References](#references)

---

## Principles

| Principle | Why it matters for Coach360 |
|-----------|----------------------------|
| **Single client codebase** | Mobile and admin web share Vite + React; no parallel Expo/Next.js apps |
| **Slice first, then wire** | Every story starts by refactoring its UI slice out of `src/App.jsx` — never bolt APIs onto the monolith |
| **Harden, don't rewrite** | Evolve incrementally; the mock shrinks as `src/features/` grows |
| **Single source of truth per domain** | Stripe owns billing; Sanity owns catalog; Supabase mirrors transactional state |
| **Enforce access server-side** | Tier gates and team isolation via RLS and Edge Functions — not UI-only |
| **Never expose privileged keys** | `service_role`, Stripe secret, Mux token, Mistral API key stay in Edge Functions only |
| **Idempotent webhooks** | Stripe, Sanity, Mux retries must not corrupt state |
| **Start simple** | Implement the minimum each story's acceptance criteria require |

---

## Vite + React + Capacitor

### Current conventions (source of truth for day-to-day coding)

These match the live codebase and [`.cursor/rules/react-conventions.mdc`](../../.cursor/rules/react-conventions.mdc):

| Topic | Convention |
|-------|--------------|
| **Components** | Functional + hooks (`useState`, `useEffect`, `useRef`) |
| **Styles** | Tailwind (`src/index.css` `@theme` coach-* tokens); `App.jsx` is the visual reference until extracted |
| **Navigation** | `useState` screen/tab state today; introduce React Router only when a story requires it |
| **Native** | Capacitor scaffold (`ios/`, `android/`) exists; runtime hooks land in the thin shell when native stories require them — not in the mock |
| **Lint** | `npm run lint` must pass |
| **Tests** | Name `test_STORY_X_Y_AC1_*`; traceable to tracker acceptance criteria |

### Capacitor workflow

```bash
npm run build          # Vite production bundle → dist/
npx cap sync           # Copy web assets to ios/ and android/
npx cap open ios       # Xcode
npx cap open android   # Android Studio
```

- Run `cap sync` after dependency or web build changes.
- Native permissions (camera, storage) go in `ios/` / `android/` per Capacitor docs when stories need them.

### Environment variables (client)

| Variable | Safe in Vite client? | Notes |
|----------|----------------------|-------|
| `VITE_SUPABASE_URL` | ✅ | Public project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Safe with RLS enabled |
| `VITE_*` analytics keys | ✅ | If vendor allows client exposure |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Edge Functions only |
| `STRIPE_SECRET_KEY` | ❌ | Edge Functions only |
| `MISTRAL_API_KEY` | ❌ | Edge Functions only |

Use `import.meta.env.VITE_*` — never commit `.env` with secrets.

---

## Story implementation workflow

**Refactoring a slice is always the first action** when picking up a tracker story.

```
1. Refactor slice   →  extract screens + primitives from App.jsx into features/ui
2. Wire real data   →  Supabase / SaaS inside the extracted module
3. Verify           →  story tests + tracker audit
```

Do not add Supabase calls, auth, or Capacitor hooks directly into the monolithic mock. Shrink `App.jsx` to a thin shell that composes extracted features.

---

## Project structure

**Today:** monolithic mock at `src/App.jsx` (hardcoded data, local state).

**Target** (as stories land — one slice per story, no big-bang refactor):

```
src/
├── main.jsx
├── app/App.jsx            # thin shell: providers, nav, tab bar
├── ui/                    # shared primitives (atoms / molecules / organisms)
├── features/
│   ├── auth/
│   ├── roster/
│   ├── schedule/
│   ├── content/
│   ├── chat/
│   └── admin/             # Flow 7 — role-gated web views
├── lib/
│   ├── supabase.ts        # client factory
│   └── api/               # typed fetch helpers
└── types/                 # shared domain types
```

**Rules:**

- **Slice first** — extract before integrating backends (see [Story implementation workflow](#story-implementation-workflow)).
- Keep route/screen files thin; business logic in `features/`.
- Promote to `src/ui/` only when two or more features need the same primitive.
- Admin views live under `features/admin/` — same repo, web deployment, admin role gate.

---

## Supabase from the client

```typescript
// src/lib/supabase.ts — illustrative
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // web admin views
    },
  }
);
```

**Best practices:**

- RLS on every `public` table; never bypass from the client.
- Use generated types from `supabase gen types typescript`.
- Privileged writes (billing, webhooks) → Edge Functions with service role.
- On logout: `supabase.auth.signOut()` + disconnect third-party clients (Stream, etc.).

> **Gap:** Capacitor session persistence pattern (Preferences vs secure storage) — document when STORY-2.x auth lands.

---

## Integration patterns

### Auth: Supabase in Vite + Capacitor

```
┌─────────────────────┐
│  Vite + Capacitor   │
│  (mobile + admin)   │
└──────────┬──────────┘
           │ anon key + user JWT
           ▼
    ┌──────────────┐
    │   Supabase   │
    │     Auth     │
    └──────────────┘
```

| Surface | Auth pattern |
|---------|--------------|
| Mobile (Capacitor) | Supabase JS client; native OAuth via Capacitor plugins when needed |
| Admin (web build) | Same client; `detectSessionInUrl` for magic links |
| Edge Functions | Verify JWT or use service role for system tasks |

### Content: Sanity + Supabase

Per [`content-model.md`](./content-model.md):

| Concern | System |
|---------|--------|
| Authoring | Sanity Studio |
| Operations | Admin views in Vite app |
| Transactional | Supabase (+ Stripe) |

**On publish:** Sanity webhook → Edge Function → Supabase metadata upsert + optional RAG re-index. Client reads catalog via Sanity CDN; purchase state from Supabase.

### Billing: Stripe + Supabase

- Stripe is billing source of truth; Supabase `subscriptions` is read-model.
- Checkout via Edge Function or Stripe Checkout redirect from app.
- Webhooks: raw body → signature verify → idempotent `billing_events` ledger → upsert subscription.
- Tier gates in Edge Functions before returning protected content.

### AI: Mistral + Vercel AI SDK + pgvector

- All model calls from **Edge Functions** — never from `src/App.jsx`.
- Use Vercel AI SDK in Deno Edge Functions or a small serverless adapter.
- Tier-gate before any model call.
- See [`ai-integration.md`](./ai-integration.md).

### Chat: Stream / Sendbird / Supabase Realtime

| Requirement | Choice |
|-------------|--------|
| MVP team DMs | Supabase Realtime |
| Scale, moderation | Stream or Sendbird |

Stream tokens generated server-side; client uses web/React SDK in Vite app.

### Video: Mux + Supabase

- Direct upload URLs from Edge Function only.
- Store `mux_asset_id`, `playback_id` in Supabase.
- Playback in app via HLS URL (`<video>` or Capacitor-compatible player).
- Webhook → update Supabase on `video.asset.ready`.

---

## Cross-cutting rules

### Webhook checklist (Edge Functions)

- [ ] Verify cryptographic signature
- [ ] Read raw body before parsing
- [ ] Idempotent event ID ledger
- [ ] Return 200 quickly; defer heavy work
- [ ] Never log tokens or full PII

### Error handling

- Sentry in Vite client for crashes.
- Structured logs in Edge Functions with `userId`, `teamId`, event IDs.

### Local development

| Integration | Tool |
|-------------|------|
| Stripe webhooks | Stripe CLI → Edge Function URL |
| Sanity webhooks | ngrok / localtunnel → Edge Function |
| Supabase | Local CLI or staging project |

---

## Coach360 integration map

| User flow | Path |
|-----------|------|
| Sign up / login | Supabase Auth → `profiles` row |
| Subscribe | Stripe Checkout → webhook → `subscriptions` |
| Browse marketplace | Sanity GROQ + Supabase purchase state |
| AI suggestions | Edge Function → pgvector → Mistral |
| Coach uploads video | Edge Function → Mux upload → webhook → Supabase |
| Team chat | Realtime channel or Stream SDK in Vite app |
| Content publish | Sanity → webhook → Supabase + RAG |
| Admin operations | Role-gated `features/admin/*` views |

---

## Documentation gaps

Content below was **planned for Expo / Next.js** and is **not yet written** for Vite + Capacitor. See [`tech-stack.md` § Production-readiness gaps](./tech-stack.md#production-readiness-gaps).

| Former assumption | What we need instead |
|-------------------|----------------------|
| EAS builds & OTA | Capacitor native release + CI pipeline |
| Next.js Server Components / Route Handlers | Supabase Edge Functions + Vite admin routes |
| `EXPO_PUBLIC_*` / `@supabase/ssr` cookie auth | `VITE_*` + single Supabase JS client |
| Expo SecureStore | Capacitor Preferences or secure storage plugin |
| `stream-chat-expo` | Stream web/React SDK in Vite |
| `expo-video` | HTML5 video / Capacitor media plugin |

Do not implement patterns from archived Expo/Next.js guides unless a story explicitly requires researching an equivalent.

---

## References

| Topic | Source |
|-------|--------|
| Capacitor | [capacitorjs.com/docs](https://capacitorjs.com/docs) |
| Vite | [vite.dev/guide](https://vite.dev/guide/) |
| Supabase JS | [supabase.com/docs/reference/javascript](https://supabase.com/docs/reference/javascript) |
| Supabase RLS | [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Sanity client | [sanity.io/docs/js-client](https://www.sanity.io/docs/js-client) |
| Vercel AI SDK | [sdk.vercel.ai](https://sdk.vercel.ai) |
| Stripe webhooks | [docs.stripe.com/webhooks](https://docs.stripe.com/webhooks) |

---

*Document version: 2.0 · Single-stack (Vite + Capacitor) · June 2026*
