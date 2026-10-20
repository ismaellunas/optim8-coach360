# STORY-12.1 fix plan — User management: profiles, roles, suspend

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-09, BUG-QA3-10, BUG-QA3-11
> **QA evidence:** docs/Coach_Feedback.docx (admin account section, MacBook M1 Pro / Chrome, `coach360-admin-blond.vercel.app`)
> **Related:** docs/index.html (tracker), apps/admin/src/pages/users/UsersPage.tsx, apps/admin/src/pages/users/TeamsOversightSection.tsx

This story bundles three distinct defects found in the same admin pass. Each has its own root cause.

## What QA reported

- "Users: Reset password"
- "Cannot see or edit user details, e.g. email"
- "Team -> search by name"

## Acceptance criteria at risk

- **AC-2** "Admin edits profile fields and changes user role" — partially true. Display name and role are editable; email is not even displayed, let alone editable. The AC statement is generic enough that "profile fields" was scoped down to just `displayName`/`role` during implementation, with no explicit decision recorded that email was excluded.
- **AC-1** "Admin views searchable list of all user profiles" — true for the Users tab (search-by-name works), but the sibling **Teams tab** inside the same page has no search at all, and nothing in AC-1 or its test covers that tab.
- No AC in this story mentions password reset at all — it isn't a gap in an AC, it's a capability nobody wrote an AC for.

## Root cause (confirmed in code)

### QA3-10 — cannot view or edit user email

- `packages/api/src/adapters/supabase/supabase-user-repository.ts`: `list()` (lines 11-19) and `getById()` (lines 41-49) query `profiles` with `select('id, role, display_name, is_suspended')` — **no email column is selected**, because **none exists**: `profiles` has no `email` column in any migration (confirmed via `grep` across `supabase/migrations/*.sql`).
- Both methods then call `mapProfileToUser(row, 'unknown@coach360.local')` — every user in the admin Users list is mapped to the **same hardcoded placeholder email**, regardless of their real address.
- `apps/admin/src/pages/users/UsersPage.tsx` never renders `user.email` anywhere (list card shows `displayName ?? user.email`, which is why nobody noticed — it falls back to the placeholder string only when `displayName` is null, so most rows just show the display name and the broken email is invisible).
- The real email lives in Supabase's `auth.users` table, not `profiles`. The codebase already has a precedent for resolving email → profile server-side: `public.lookup_profile_id_by_email(p_email)` (`supabase/migrations/20260708120000_team_invites.sql:69`) goes the other direction (email → id) via a `SECURITY DEFINER` function. Nothing goes id/list → email today.

### QA3-09 — no password reset

- Confirmed absent end-to-end: no `resetPasswordForEmail`, no `supabase.auth.admin.generateLink`, no `inviteUserByEmail`, no password-reset button or mutation anywhere in `apps/admin` or `packages/api` (full-repo grep for `password` only turns up sign-in forms). This isn't a wiring bug — it was never built.
- Mobile has the same gap (tracked separately as `BUG-QA2-06`), but the mechanism here is different: admin needs to reset *someone else's* password, which requires either a Supabase Admin API call (`auth.admin.generateLink({ type: 'recovery' })`, needs service-role key — cannot run in the browser) or an Edge Function wrapping that call.

### QA3-11 — no team search-by-name

- `apps/admin/src/pages/users/TeamsOversightSection.tsx:196-206`: `useAllTeamsQuery()` fetches every team with no params, and the component renders the full array with zero filter UI — no `<input>`, no client-side `.filter()`. Contrast with `UsersDirectory` (`UsersPage.tsx:81-96`), which has a `search` state + input wired to `useUserListQuery(search)`. The Teams tab simply never got the equivalent treatment.

## Fix plan

**QA3-10 (email):**
1. Add `supabase/migrations/<ts>_admin_user_email.sql`: a `SECURITY DEFINER` RPC `admin_list_user_emails(p_profile_ids uuid[])` (or a single `admin_get_user_email(p_profile_id uuid)`) that checks `profiles.role = 'admin'` for `auth.uid()` (same guard pattern as `get_billing_revenue_summary`), then selects `id, email` from `auth.users` for the given ids. Do not expose a raw `auth.users` select to the anon/authenticated role.
2. Extend `UserRepository.list()`/`getById()` return type to include a real `email`, sourced via the new RPC (likely a second query joined client-side, since `profiles` and `auth.users` can't be joined in one PostgREST call without a view).
3. Add `email?: string` to `UpdateUserInput` only if product wants admin-initiated email changes — see Open Questions; email changes have auth implications (re-verification) that profile edits don't.
4. Render email in `UsersPage.tsx` — read-only display at minimum, in both the list row and the expanded detail panel; make it an editable input only if Q1 below says yes.

**QA3-09 (password reset):**
1. New Supabase Edge Function (pattern-match existing ones in `supabase/functions/`, e.g. `create-mux-upload`), admin-only, calling `supabase.auth.admin.generateLink({ type: 'recovery', email })` or `resetPasswordForEmail` server-side with the service-role key.
2. New `UserRepository` method, e.g. `sendPasswordReset(id: string): Promise<void>`.
3. New "Reset password" button in the expanded user row in `UsersPage.tsx`, next to Suspend/Reactivate.

**QA3-11 (team search):**
1. Add the same `useState('')` + `<input>` pattern from `UsersDirectory` to `TeamsOversightSection`.
2. Either filter client-side (`teams.filter(t => t.name includes search)`, simplest, fine at current team counts) or add a `search` param to `useAllTeamsQuery`/the underlying team-repository `list` call to match the Users tab's server-side pattern. Pick one — don't mix patterns between the two tabs without a reason.

## Verification plan

- Existing tests to re-run: `npx vitest run tests/admin/story-12.1.test.js` (will still pass after these changes since it only regex-matches source — see note below).
- **New test cases needed, and they must not repeat the current test's weakness:** `tests/admin/story-12.1.test.js` currently only does source-string/regex matching (e.g. `expect(usersPage).toMatch(/Display name for/)`) — it never renders the component or calls a live backend, so it could not have caught any of these three gaps. New tests should at minimum render `UsersPage`/`TeamsOversightSection` with React Testing Library against a mocked repository and assert the email value, reset-password button, and team search input are actually present and interactive — not just that certain strings exist in the file.
- Manual re-test: admin account on the same MacBook/Chrome setup — search Teams by name, expand a user and confirm a real (not placeholder) email shows, trigger password reset and confirm the target user receives/can use a reset link.

## Open questions — need confirmation before implementing

- **Q1:** Should admins be able to *edit* a user's email (not just view it)? Editing auth email has knock-on effects (re-verification, possibly breaking the user's existing session/login) that are a product decision, not an engineering default. Not resolvable from code or the feedback doc — the feedback only says "cannot see **or edit**," which could mean either "give me a view" or "give me a view and an edit."
- **Q2:** For password reset, should it (a) email the user a reset link (self-service completion), or (b) let the admin set/see a temporary password directly? These have very different security postures and the feedback doc doesn't say which the tester expected.
- **Q3:** Is the Teams tab's search meant to be server-side (paginated, like Users) or client-side (filter what's already loaded)? Depends on expected team counts at scale, which isn't specified anywhere I can find in `docs/product/`.
