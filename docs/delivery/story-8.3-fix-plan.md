# STORY-8.3 fix plan — Player-to-player knowledge sharing

> **Status today:** DONE (tracker) — linked as reopened/contradicted by BUG-QA3-05
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

No fix proposed. I don't believe this story needs code changes based on the QA3-05 evidence — see Open Questions below before anything is actioned here.

## Verification plan

N/A pending the open question below. If confirmed out of scope, the only action is removing STORY-8.3 from BUG-QA3-05's `blocks` array in the tracker and reverting its status to DONE.

## Open questions — need confirmation before implementing

- **Was STORY-8.3 linked to QA3-05 correctly?** Based on the code and the actual feedback text, I don't see a connection — this looks like it may have been linked in error when the bug was drafted (plausibly because "chat" appears in both the complaint and this story's description). Is there a specific complaint about peer-sharing-as-DM, or coach visibility of peer shares, that I'm missing from a different part of the feedback doc or a conversation I don't have visibility into? If not, I'd recommend unlinking it and restoring STORY-8.3 to DONE rather than carrying a plan doc with no actual defect.
- **Unrelated but adjacent:** should OQ-18.1/18.2/18.3's resolutions be backfilled into `docs/product/stakeholder-questions.md` (currently blank) now that code has an interim answer, so the next person doesn't have to grep source comments to find it? Flagging since I noticed it, not acting on it.
