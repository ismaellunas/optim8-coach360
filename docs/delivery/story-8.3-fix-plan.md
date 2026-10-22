# STORY-8.3 fix plan — Player-to-player knowledge sharing

> **Status today:** DONE (tracker), confirmed — not actually implicated by QA3-05. No code change; `docs/product/stakeholder-questions.md` backfilled.
> **QA evidence:** docs/Coach_Feedback.docx (coach + player account sections)
> **Related:** docs/index.html (tracker), docs/bug-investigations.md, [story-8.1-fix-plan.md](./story-8.1-fix-plan.md)

## What QA reported

QA3-05's three source quotes are:
- Player: "Can only chat with team. Should be able to initiate chat directly with coaches."
- Coach: "Unable to chat with players, only team works. Plus sign refers to roster players – have one setup but cannot initiate chat. Not visible."

None of these mention achievements, tips, or peer-to-peer sharing — the feature this story actually covers.

## Acceptance criteria at risk

**None, as far as I can confirm from the code.** This story's scope (player shares achievement/tip to team chat; coach sees aggregated engagement) is a different feature from direct player-coach messaging (that's STORY-8.1/8.2). I don't think QA3-05 actually contradicts any of STORY-8.3's four ACs — see Root cause below.

## Root cause (confirmed in code)

`packages/domain/src/chat/peer-share.ts:14-15` documents the scope decision this story shipped against:
```
 * - OQ-18.2: team-scoped only (no DM/p2p peer shares)
 * - OQ-18.3: coaches see aggregated engagement metrics at Pro (○ at Advanced)
```
and line 50 is explicit about the boundary with STORY-8.1:
```
 * DM and p2p remain for normal chat (STORY-8.1/8.2), not Flow 18 shares.
```
`PeerShareSheet.jsx` (the UI for this story) has no DM/coach-messaging code path at all — it only posts formatted achievement/tip messages to the team channel. `STORY-8.3`'s AC-4 ("Sharing scope limited per OQ-18.2 (team vs DM)") is actually the *opposite* of what QA3-05 is asking for — AC-4 passing means team-only sharing is working as designed, not broken.

Separately, `docs/product/stakeholder-questions.md:242-244` shows OQ-18.1/18.2/18.3 with **blank resolution columns** — the "team-only interim" decision lives only in code comments/audit_notes, not in the stakeholder doc. That's a pre-existing documentation gap, unrelated to this QA pass.

## Fix plan

No code changes. STORY-8.3 confirmed not implicated by QA3-05 — unlink/restore to DONE at the tracker level (already DONE; status was never actually flipped — see below). Backfilled `docs/product/stakeholder-questions.md` OQ-18.1/18.2/18.3 with the interim code-level defaults.

## Verification plan

No new tests needed — no code changed. Confirmed `docs/product/stakeholder-questions.md` now documents the interim defaults for OQ-18.1/18.2/18.3 (OQ-18.4, content moderation, remains genuinely unanswered — not touched, since nothing in this story's code resolves it).

## Resolved decisions

- **QA3-05 link validity:** not correctly linked — no connection found between the complaint (direct player-coach messaging) and this story's scope (team-channel peer sharing). Tracker `status` was never actually flipped off DONE for this ticket (no BUG-QA3-05 entry exists in `docs/index.html`'s `bugs` array), so no tracker change was needed.
- **Stakeholder questions backfill:** done — OQ-18.1/18.2/18.3 now show the interim code-level answers in `docs/product/stakeholder-questions.md`, clearly labeled "Engineering (interim), not formally ratified" rather than presented as a real product sign-off.

## Open questions

None outstanding for this story.
