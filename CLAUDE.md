# Coach360

Vite + React 19 + Capacitor monorepo. `apps/mobile` (mobile app), `apps/admin` (admin), `packages/ui` (shared UI). No Expo/Next.js/React Native migration.

Architecture: `docs/architecture/tech-stack.md`, `docs/architecture/best-practices.md`, `docs/architecture/frontend-architecture.md`.

## Development tracker

`docs/index.html` — embedded JSON in `<script id="tracker-data">` is the single source of truth for EPIC/STORY tickets. **Before editing this file**, read `.cursor/rules/tracker-json.mdc` for the immutable-fields list, status vocabulary, and `verify` block schema.

Use the `/implement-story` and `/audit-tracker` skills for tracker-driven work rather than editing tickets free-hand.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): imperative subject`.

Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`. Scope: area (`tracker`, `auth`, `ui`) or story ID (`story-2.1`).

- Imperative mood, lowercase, no trailing period, ~72 char max
- Reference the story ID when the change implements a tracker ticket
- Never commit unless explicitly asked; never skip hooks unless explicitly requested; never commit secrets

## React / frontend work

Before touching `apps/mobile/src/**/*.{js,jsx}` or `apps/admin/src/**/*.{ts,tsx}`, read `.cursor/rules/react-conventions.mdc` — covers the mandatory "extract-then-wire" story workflow, lint rules, Capacitor scaffold notes, and test naming (`test_STORY_X_Y_AC1_*`).

Before building or touching UI, read `.cursor/rules/ui-design-system.mdc` — design tokens, primitives (`PageHeader`, `Card`, `Btn`, etc.), and what not to hardcode. Full catalog: `docs/design/ui-reference.md`.

## Skills

- `/implement-story STORY-X.Y` — plan then implement a tracker story, plan requires approval first
- `/compose-tests` — add manual click-through cases to `docs/mobile-app-test-pack.md` for completed stories; run after implement-story, before create-pr
- `/audit-tracker` — re-verify ticket statuses from test evidence
- `/create-pr` — open a PR following team conventions
