# Parallel Work Plan

> Generated 2026-07-15 from tracker state (EPICs 1–4 DONE; 34 stories remaining —
> STORY-5.1 completed while this plan was being written, unlocking 5.3 and 7.4).
> Goal: identify stories that can run concurrently without double work or waiting on prerequisites.

Stories flagged as immediately startable carry `"parallel_ready": true` in the tracker data
(`docs/index.html` → `<script id="tracker-data">`) and render a **PARALLEL READY** badge on the board.

## Foundation already available

EPICs 1–4 are DONE, so every remaining story can rely on:

- Supabase project, core schema, RLS, CI/CD (EPIC-1)
- Auth, onboarding, role profiles (EPIC-2)
- Team setup and roster management (EPIC-3)
- Stripe subscriptions, trials, paywall (EPIC-4)

## Lanes that can start now, in parallel

These touch different parts of the stack; separate owners can run them concurrently.

| Lane | Stories | Why it's unblocked |
|---|---|---|
| RBAC follow-ups | STORY-5.3, 7.4 | STORY-5.1 (RBAC middleware) is DONE; only 5.2 still waits on OQ-6.5 |
| Content foundation | STORY-9.1 (then 9.3) | Sanity schemas need only `content-model.md`; video pipeline is infra-only |
| Push infrastructure | STORY-14.1 | Standalone FCM/APNs service; 6.3, 8.1, 10.2 all cite DEP-07 |
| Admin dashboard | STORY-12.1, 12.2, 12.5 | Admin shell exists (STORY-1.3 DONE); reads data from done epics only |
| Objectives | STORY-11.1 | Plain CRUD UI; no OQ blocks, no dependency on other TODO stories |
| Steel-thread start | STORY-13.1 | Auth/team-invite foundation is DONE — but see double-work risk #1 |

**Parallel-ready set:** STORY-5.3, 7.4, 9.1, 11.1, 12.1, 12.2, 12.5, 13.1, 14.1
(plus 5.1, already DONE).

## Prerequisite chains — sequence within a chain, don't parallelize

- **Scheduling → player flow (critical path):** 6.1 → 6.2 → 6.3 → 7.1 → 7.2 → 7.3.
  Starts at a BLOCKED story (OQ-3.1/3.2), so this is the chain to unblock first.
- **Chat:** 8.1 (SDK choice) → 8.2 → 8.3. 7.3 and 13.3 also depend on 8.1's SDK decision — make it once, early.
- **Marketplace:** 9.1 → 10.1 → 10.2 → 10.3. 10.4 additionally needs admin dashboard basics (12.x).
- **AI:** 11.1 → 11.2 (needs 9.1 package metadata) → 11.3 / 11.4. 11.4 also needs 9.5, which needs 9.1.
- **RBAC:** 5.1 (DONE) → 5.2 and 5.3. 7.4 (tier-scoped player dashboard) is now unblocked since 5.1's tier gating exists.

## Blocked on stakeholder answers — do not start

All six open questions are "sent, pending response". Affected stories per the OQ block lists:
**5.2, 6.1, 6.2, 7.1, 7.2, 8.1, 9.2, 11.3, 11.4.**

- Priority chase: **OQ-3.1 / OQ-3.2** — they block 6.1 and therefore the whole scheduling → player chain.
- De-risk option for 8.1: build the chat SDK integration behind a flag; leave tier gating to 5.x (its block, OQ-2.3, concerns tier access only).

## Double-work risks

1. **EPIC-13 steel-thread duplicates EPICs 6/7/8.** 13.2 ≈ thin 6.1 + 7.1; 13.3 ≈ thin 8.1.
   If the demo is still needed, build it as the *first iteration* of those stories (same tables,
   same components) — otherwise merge or cancel EPIC-13.
2. **5.3 (admin-configurable gating) overlaps EPIC-12.** It's an admin dashboard feature; the 12.x
   owner should build it with the same admin UI patterns.
3. **Notifications:** 6.3 and 10.2 both need push delivery. Do 14.1 first so neither builds an
   ad-hoc notification path.

## Tracker inconsistencies found during the scan

- OQ-2.1 lists STORY-4.3 as blocked, but 4.3 is DONE.
- OQ-2.2 blocks "STORY-5.4", which does not exist (EPIC-5 has 5.1–5.3).
- Only 5.2 and 6.1 carry `BLOCKED` status, but the OQ block lists implicate seven more stories
  (6.2, 7.1, 7.2, 8.1, 9.2, 11.3, 11.4) that still show `TODO`.

## Suggested immediate allocation

Start **5.3/7.4, 9.1, 14.1, 12.1/12.2/12.5, 11.1** in parallel (five lanes of unblocked work) while
pressing the client on OQ-3.1/3.2 to unblock the critical scheduling chain.
