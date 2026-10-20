# STORY-8.1 fix plan — Chat SDK integration and channel model

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-05
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

1. Add a player-facing "message coach" entry point, parallel to the existing coach flow:
   - Extend the header "+" / empty-state CTA to render for players too (replace the `canComposeDm` coach/team_manager-only check with a role-aware branch), or add a distinct "Message coach" action if the UX should differ from the coach's "pick a player" picker (see Open Questions on multi-coach handling).
   - Build a `loadRosterCoaches`-equivalent (mirroring `loadRosterPlayers`) that queries the player's team(s) for coach members instead of player members.
   - Wire the picker's selection to `openDmWithPlayer`-equivalent logic (reuse `ensureDmChannel`, swapping which side is "self" vs "peer" per the existing `coachId`/`playerId` resolution pattern already in `handleSend`/`openDmWithPlayer`).
2. Leave the backend/domain layer (`ensureDmChannel`, `canSendTextOnChannelType`, RLS in `20260722123000_fix_chat_channel_rls.sql`) untouched — confirmed role-agnostic already.
3. Re-verify the coach-side "not visible" complaint against a real roster fixture before changing anything: if it reproduces with a genuinely `active` player, that's a second, separate bug in `loadRosterPlayers`'s filter; if it reproduces only with an invited-not-joined player, it's already-documented expected behavior and no code change is needed (maybe just clearer empty-state copy explaining why a roster entry isn't listed).

## Verification plan

- Existing tests to re-run: `npm test -- --reporter=json -t STORY_8_1` (expect AC2 to need a rewrite, not just a re-run).
- New test cases needed:
  - Render `ChatScreen` as a `player` role and assert a compose entry point is present and functional (not a source-string regex).
  - Render as `coach`/`team_manager` and assert existing behavior is unchanged.
  - A case with an invited-but-not-`active` roster player, asserting the picker correctly omits them (locks in current documented behavior rather than letting it silently regress further).
- Manual re-test: Fold7 device, player/pro account — initiate a chat with a coach from a clean conversation list; coach/pro account — confirm the specific "have one setup" player's roster `status` and `profileId` state in Supabase before and after they complete signup.

## Open questions — need confirmation before implementing

- **Multi-coach/team membership:** can a player belong to more than one team (and therefore have more than one coach)? If so, what should "message coach" do — show a picker (like the coach's player picker), default to a single "primary" coach, or something else? I did not trace the full team-membership model to confirm whether multi-team players are in scope for MVP.
- **Tier gating intent:** today *all* chat (including team channel) is gated behind `canAccess(user, 'chat')` (Advanced+ per the existing paywall). Is a player messaging their own coach meant to be gated the same way, or should it be available at a lower tier since it's a core coaching relationship rather than an upsell feature? The feedback doesn't state what tier the player test account was on.
- **Entry point placement:** should "message coach" live only in the Chat tab (symmetric with the coach's flow), or should there also be a shortcut elsewhere (e.g. from the player's Progress or Profile screen), mirroring how the coach's flow has a secondary entry from `CoachProgressReviewScreen`?
- **The coach-side "not visible" complaint specifically:** was the roster player in question actually `active` with a linked profile at test time? If yes, that's a distinct, unconfirmed bug in `loadRosterPlayers` I have not been able to reproduce from code reading alone — needs a live repro against the actual test account/roster row before I'd trust either explanation.
- **AC-2 wording:** should the acceptance criterion be rewritten to explicitly state *who* can initiate each channel type (team/DM/P2P), so a future test can actually assert on it instead of only checking that the capability exists somewhere in source?
