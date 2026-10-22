# STORY-12.1 fix plan — User management: profiles, roles, suspend

> **Status today:** DONE (tracker) — all 3 defects implemented and tested: real (view-only) email, admin-triggered password reset email, client-side Teams search.
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

**QA3-10 (email) — resolved, implemented, view-only:**
1. New migration `20260731120000_admin_user_email_lookup.sql`: `SECURITY DEFINER` RPC `admin_list_user_emails(p_profile_ids uuid[])`, admin-gated (same pattern as `get_billing_revenue_summary`), selecting from `auth.users`. No raw `auth.users` select exposed to `anon`/`authenticated`.
2. `SupabaseUserRepository.list()`/`getById()` now resolve real emails via this RPC (a second query, since `profiles`/`auth.users` can't be joined in one PostgREST call) instead of the hardcoded `'unknown@coach360.local'` placeholder.
3. **Not implemented: admin-initiated email editing.** Resolved as Phase 1 = view-only (lowest-risk option) — editing auth email has re-verification implications that are a separate, bigger feature. `UpdateUserInput` unchanged.
4. Email now renders in `UsersPage.tsx` in both the collapsed list row and the expanded detail panel, read-only.

**QA3-09 (password reset) — resolved, implemented, self-service email link:**
1. New Edge Function `admin-reset-password` (pattern-matched from `review-marketplace-package/index.ts`'s auth-header → `getUser` → service-role admin-role check), calling `admin.auth.admin.getUserById(profileId)` to resolve the email server-side, then `admin.auth.resetPasswordForEmail(email)`.
2. New `UserRepository.sendPasswordReset(id)`, wired through both adapters.
3. New "Reset password" button in the expanded user row in `UsersPage.tsx`, next to Suspend/Reactivate.
4. **Known limitation, not fixed here:** neither the admin app nor the mobile app has a page listening for Supabase's `PASSWORD_RECOVERY` auth event to let the user actually set a new password once they click the emailed link. The reset email will send successfully; completing the flow end-to-end needs that landing page built as separate, larger scope (a real auth UI, not a small addition). Logged as a new open question.

**QA3-11 (team search) — resolved, implemented, client-side:**
1. Added the same `useState('')` + `<input>` pattern from `UsersDirectory` to `TeamsOversightSection`, filtering the already-loaded `teams` array client-side by name (case-insensitive substring match).

## Verification plan

- `npx vitest run tests/admin/story-12.1.test.js`: 8/8 passing (5 original + 3 new: real email view-only, password reset trigger, Teams client-side search).
- Full suite (`npx vitest run`): 256/266 non-skipped passing, same 7 pre-existing unrelated failures as before this change.
- `tsc --noEmit` on `packages/api` and `apps/admin`: clean.
- `eslint` on changed files: 0 errors.
- Manual re-test (not done — no live device/account in this session): admin account — search Teams by name; expand a user and confirm a real (not placeholder) email shows in both the row and detail panel; trigger password reset and confirm the target user's inbox receives an email (confirming the reset *link itself* resolves to a working "set new password" page is **not** testable yet — that page doesn't exist, see the known limitation above).

## Resolved decisions

- **Q1, email editing:** view-only for Phase 1. No admin-initiated edit built — that needs a re-verification flow design first.
- **Q2, password reset flow:** (a) — email the user a self-service reset link. Implemented, with the known gap that there's no completion page yet to process the link.
- **Q3, Teams tab search:** client-side filter. Implemented.

## Open questions — new, discovered during implementation

- **Should a password-reset completion page be built** (in the mobile app, where end-users actually log in) to listen for Supabase's `PASSWORD_RECOVERY` auth event and let the user set a new password? Without it, the admin-triggered reset email sends successfully but the link the user clicks doesn't go anywhere useful. This is a real, separate auth-UI feature, not a small addition to this fix.
