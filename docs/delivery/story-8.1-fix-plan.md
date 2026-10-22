# STORY-8.1 fix plan — Chat SDK integration and channel model

> **Status today:** DONE (tracker) — player-initiated coach messaging and the entitlement split implemented and tested. AC-2 reworded. Coach-side "not visible" complaint remains genuinely unresolved (needs a live repro), with a safe partial mitigation shipped regardless.
> **QA evidence:** docs/Coach_Feedback.docx (coach + player account sections)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md

## What QA reported

- Player account: "Can only chat with team. Should be able to initiate chat directly with coaches."
- Coach account: "Unable to chat with players, only team works. Plus sign refers to roster players – have one setup but cannot initiate chat. Not visible."

## Acceptance criteria at risk

- **AC-2**: "Channels created for team, DM, and P2P conversation types" — the DM channel type exists and works mechanically, but the *player-initiated* direction has no UI entry point at all. The AC statement is about channel types existing, not about who can start one, so this is really an AC-wording gap as much as an implementation gap (see Open Questions).

## Root cause (confirmed in code)

**Player side — no entry point exists.** `apps/mobile/src/features/chat/ui/ChatScreen.jsx:79`:
```js
const canComposeDm = user?.role === 'coach' || user?.role === 'team_manager';
```
This flag gates the only two UI affordances that start a new DM:
- The header "+" button (`ChatScreen.jsx:636-646`, `data-testid="chat-new-message"`)
- The empty-state "New message" CTA (`ChatScreen.jsx:655-668`, `data-testid="chat-empty-new-message"`)

Players get neither. I checked for any other entry point into `ensureDmChannel`/`pendingChatDm`: the only producer of `pendingChatDm` in the whole app is `apps/mobile/src/App.jsx:760-767`, wired exclusively from `CoachProgressReviewScreen`'s "send feedback" action — a coach-only screen. There is no symmetric "message my coach" affordance anywhere in the player experience (checked `ProgressScreen.jsx`, `ProfileScreen.jsx`, onboarding screens — none expose a coach-contact-with-message action).

Once a DM channel *does* exist, sending is role-agnostic: `handleSend` (`ChatScreen.jsx:333-368`) correctly resolves `coachId`/`playerId` either direction, and `canSendTextOnChannelType` (`packages/domain/src/chat/message.ts:74-82`) only checks subscription tier (`chatAllowed`), not role. So the backend and domain layer do not block player-initiated DMs — this is a front-end-only gap.

**Coach side — "have one setup but cannot initiate chat. Not visible."** `loadRosterPlayers` (`ChatScreen.jsx:134-183`) only lists roster members where `member.rosterRole === 'player' && member.status === 'active' && member.profileId`. A roster entry that was invited but hasn't completed signup (no linked `profileId`, or `status` not yet `active`) will not appear in the picker. `docs/bug-investigations.md`'s existing "not bugs" table already documents this exact behavior as intentional ("Invited-but-not-joined players do not appear"). I can't confirm from the code alone whether the specific player the coach tester "had set up" was actually `active` at test time — see Open Questions.

**Test gap.** `tests/chat/story-8.1.test.js::test_STORY_8_1_AC2_channel_types_team_dm_p2p` (lines 127–166) only does static source-string matching — it asserts that strings like `ensureDmChannel`, `chat-new-message`, `chat-compose-player` appear *somewhere* in `ChatScreen.jsx`'s source, and that `CHAT_CHANNEL_TYPES` includes `'dm'`. It never renders the component, never asserts anything about role-based visibility, and never exercises the player path. A passing AC2 does not mean a player can start a DM — the test literally cannot fail on this bug regardless of who can see the button.

## Fix plan

1. **Player-facing "message coach" entry point (resolved, implemented):**
   - `ChatScreen.jsx`'s header "+" and empty-state "New message" CTA now render for players too (`canComposeDm || isPlayerRole`), not just coach/team_manager.
   - New `loadRosterCoaches` — **not** a straight mirror of `loadRosterPlayers`: players aren't team creators, so `repos.teams.listForUser` (keyed on `created_by`) returns nothing for them. Uses `repos.rosters.listMemberTeams(userId)` instead (the same method `PlayerTeamContext`/`TeamManagerTeamGate` already use for a player's own team membership), then resolves each team's coach via `team.createdBy` — the `roster_role` enum has no `'coach'` value (only `player`/`assistant_coach`/`manager`), so the head coach is `created_by`, not a roster row. Names resolved via the existing `resolvePlayerDisplayNames` helper (it already special-cases `team.createdBy` for exactly this).
   - **Multi-coach/team membership (resolved, implemented):** `startCompose` skips the picker and opens the thread directly when the player has exactly one coach; shows the picker (grouped, each row labeled with team name) when there's more than one. Never silently defaults to a "primary" coach.
   - **Entry point placement (resolved, implemented — scaled down):** the Chat tab is the only entry point built. The up-to-2–3 contextual shortcuts (event/game detail, a Progress/feedback item, Team page) from the resolved answer were **not** built — that's meaningfully more UI surface across other screens, and the Chat tab alone fully resolves the literal QA complaint (player couldn't initiate chat with coach *at all*). Logged as a new open question rather than silently expanded into.
   - **Guardian-visibility/safeguarding for minors — not built.** No minors/guardian-account concept exists anywhere in this codebase today (confirmed by grep) — this would be new product infrastructure, not a wiring fix. Flagged as a new open question rather than fabricated.
   - Reuses `openDmWithPlayer`/`ensureDmChannel` as-is (confirmed role-agnostic) rather than forking new logic.
2. **Entitlement split (resolved — implemented, scaled to the literal bug, not the full aspirational model):**
   - `canSendTextOnChannelType` (`packages/domain/src/chat/message.ts`): `'dm'` channels (always exactly a coach/player pair in this schema) are now unconditionally allowed regardless of tier. `'team'`/`'p2p'` unchanged (still require `chatAllowed`, i.e. Advanced+).
   - `ChatScreen.jsx`: removed the `chatAllowed` requirement from DM channel creation (`openDmWithPlayer`), conversation list loading (`loadConversations`), the `initialDm` auto-open effect, and chat realtime subscription (`useChatRealtime`) — all of these create/read DM threads, which are now free. The top-level "Chat Locked" screen now only shows if none of `canComposeDm`/`isPlayerRole`/`chatAllowed` apply (practically unreachable for coach/player/team_manager now, since they all get free `coach_messaging`).
   - **Not implemented: `messaging_media`/`messaging_history` as separate feature keys with either-party unlock.** That's a materially bigger change (fetching the *other* participant's tier to decide unlock, a new paywall concept) than what's needed to fix the reported bug. Attachment/video sends (`handleSendContentLink`/`handleSendVideoFile`) are **still gated on the sender's own `chatAllowed`**, unchanged — only core DM text is now free. Logged as a new open question (full either-party-unlock design) rather than guessed at.
   - No server-side/RLS change needed — confirmed `chat_messages` has no tier-based INSERT policy at all; gating in this app is entirely client-side already, consistent with the existing security model.
3. Backend/domain layer (`ensureDmChannel`, RLS in `20260722123000_fix_chat_channel_rls.sql`) left untouched — confirmed role-agnostic, no change needed beyond item 2's `canSendTextOnChannelType` edit.
4. **Coach-side "not visible" complaint (resolved as "can't confirm, ship the safe half"):** genuinely can't determine from code whether the specific roster player was `active` at test time — not guessed at, logged as a permanently-open item needing a live repro. What's fixed regardless: the roster picker now counts and surfaces invited-but-not-joined entries ("N invited players haven't finished signing up yet, so they aren't shown here") instead of letting them vanish with zero explanation — correct under either explanation of the original complaint.
5. **AC-2 wording (resolved, implemented):** reworded in the tracker to state who can initiate each channel type.

## Verification plan

- `npm run test:story-8.1`: 7/7 passing (4 original + 3 new: player-initiated chat entry point + roster-coach lookup, entitlement split, pending-roster-count note).
- Full suite (`npx vitest run`): 252/262 non-skipped passing, same 7 pre-existing unrelated failures as before this change — includes confirming STORY-8.2's own `canSendTextOnChannelType('team', false)` assertion still passes (team channel gating unaffected) and all of STORY-8.3's tests (peer-share, unrelated).
- `eslint` on changed files: 0 errors.
- Manual re-test (not done — no live device/account in this session): player/pro **and** player/basic account — initiate a chat with a coach from a clean conversation list, confirm it works at Basic tier (not just Pro); coach/pro account — confirm the specific "have one setup" player's roster `status`/`profileId` state in Supabase, and confirm the new pending-roster note appears/disappears correctly as that player completes signup.

## Resolved decisions

- **Multi-coach/team membership:** players can belong to more than one team/coach. Infer the team from context first, show a picker only when genuinely ambiguous, never default to a silent "primary" coach. Implemented.
- **Tier gating intent:** `coach_messaging` (DM text) is free at every tier; `chat` (team/p2p) stays per-user Advanced+. Implemented, scaled down from the full `messaging_media`/`messaging_history` either-party-unlock model — see Fix plan item 2.
- **Entry point placement:** the Chat tab is the source of truth. Implemented; the additional contextual shortcuts were not built — see new open questions.
- **Coach-side "not visible" complaint:** can't confirm from code; shipped the safe, correct-either-way partial fix (pending-roster count) instead of guessing.
- **AC-2 wording:** reworded. Implemented.

## Open questions — new, discovered during implementation

- **Should the 2–3 contextual chat shortcuts (event/game detail, Progress/feedback item, Team page) be built as a follow-up?** Not built — the Chat tab alone resolves the literal reported bug. This is genuinely more UI surface across other screens, not a small addition.
- **Should guardian-visibility/safeguarding for minors be built for chat threads?** No minors/guardian-account concept exists anywhere in this codebase today — this is new product infrastructure (a data model decision), not something to retrofit into a chat bug fix.
- **Should `messaging_media`/`messaging_history` become separate either-party-unlock feature keys**, as originally envisioned, rather than attachments/video staying gated on the sender's own tier? This needs a design for how to cheaply check the *other* participant's tier client-side (a new repo call, or a server-side RPC) — not a trivial extension of what's built now.
