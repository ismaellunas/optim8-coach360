# Coach360 — Frontend architecture

> **Status:** Canonical structure for `apps/admin` and shared `packages/`  
> **Stack:** React 19 + Vite + TypeScript (admin); Vite + React (mobile)  
> **Related:** [`tech-stack.md`](./tech-stack.md) · [`best-practices.md`](./best-practices.md) · [`admin-deploy.md`](./admin-deploy.md)

---

## Monorepo map

```
coach360/
├── apps/
│   ├── mobile/          # Capacitor client (coaches, players, teams)
│   └── admin/           # Web-only admin (Flow 7)
├── packages/
│   ├── domain/          # Pure business types, Zod schemas, rules
│   ├── api/             # Ports, adapters (Supabase | REST), DI
│   └── ui/              # Shared design primitives
└── supabase/            # Migrations, Edge Functions
```

Mobile and admin are **separate deployables**. Admin code is never bundled into the Capacitor app.

---

## Admin app layers (Feature-Sliced Design)

Layers import **downward only**:

```
app → pages → widgets → features → entities → shared → packages/*
```

| Layer | Responsibility | May import |
|---|---|---|
| `app/` | Bootstrap, router, providers, DI wiring | all lower layers |
| `pages/` | Route-level composition (thin) | widgets, features, entities |
| `widgets/` | Composite UI blocks (shell, dashboard) | features, entities |
| `features/` | User actions / workflows (sign-in) | entities, domain rules |
| `entities/` | Entity queries and presentational entity UI | `packages/api` ports via hooks |
| `shared/` | Admin-local config/helpers | `packages/*` |

**Forbidden:** `@supabase/supabase-js` in `pages/`, `widgets/`, or `features/*/ui/`.

---

## Packages

### `@coach360/domain`

- Branded types (`UserId`, `Email`) to prevent identifier mix-ups
- Zod schemas (`userSchema`, `appRoleSchema`)
- Pure rules (`canAccessAdmin`, `assertAdminAccess`)
- **No React, no HTTP, no Supabase**

### `@coach360/api`

- **Ports** — `AuthRepository`, `UserRepository`, etc. (interfaces)
- **Adapters** — `adapters/supabase/*` (current), `adapters/rest/*` (future)
- **DI** — `createRepositories({ adapter: 'supabase' | 'rest' })`
- UI depends on ports via `useRepositories()`, never on adapters directly

### `@coach360/ui`

- Design primitives (`Card`, `Badge`, `Button`, `PageHeader`)
- Coach `coach-*` tokens via Tailwind in consuming apps

---

## Data flow

```
UI component
  → feature hook / entity query (TanStack Query)
    → repository port (interface)
      → adapter (Supabase or REST)
        → backend (RLS or REST API)
```

Domain rules run **before and after** adapter calls where needed (e.g. `canAccessAdmin` on session load).

---

## REST migration path

1. Implement `adapters/rest/*` against your REST API
2. Set `VITE_API_ADAPTER=rest` and `VITE_REST_API_BASE_URL`
3. UI, features, and pages remain unchanged

Privileged mutations (suspend user, billing override) should eventually live in **Edge Functions** or REST controllers — not in client adapters.

---

## TypeScript policy

| Area | Language |
|---|---|
| `apps/admin` | TypeScript (strict) |
| `packages/*` | TypeScript (strict) |
| `apps/mobile` | JavaScript (migrate incrementally) |

Root `tsconfig.base.json` enforces `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

---

## Testing

| Layer | Test type |
|---|---|
| `packages/domain` | Unit tests on rules and schemas |
| `packages/api` | Adapter unit tests with mocked fetch / Supabase |
| `apps/admin` | Structure tests + route/guard smoke tests |
| `supabase/migrations` | Integration tests via `supabase db reset` |

Test names: `test_STORY_X_Y_ACn_*` traceable to tracker acceptance criteria.

---

## References

- [Feature-Sliced Design — layers](https://feature-sliced.design/docs/reference/layers)
- [FSD + Clean Architecture](https://feature-sliced.design/blog/frontend-clean-architecture)
- [Repository pattern](https://blog.beezwax.net/the-repository-and-unit-of-work-design-patterns/)
