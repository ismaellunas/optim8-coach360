# STORY-11.2 fix plan — Metadata-based package recommendations (Phase 1)

> **Status today:** DONE (tracker) — implemented and tested. `audit_notes` corrected.
> **QA evidence:** docs/Coach_Feedback.docx (player account section: "Suggested objectives slow to load")
> **Related:** docs/index.html (tracker), docs/delivery/story-11.1-fix-plan.md (client-side half of the same symptom)

## What QA reported

- Player (player/pro account), Objectives screen: "Suggested objectives slow to load."
- (Adjacent, not formally filed as a QA3 bug, so not fixed here but worth noting: coach-account feedback also says Store "significant delay for suggestions" — same recommendation pipeline, different screen. See Open Questions.)

## Acceptance criteria at risk

- **AC-4** "Suggestions surface on marketplace and objectives screens" — not contradicted on correctness (suggestions do surface, per `ObjectivesScreen.jsx:294-299` and `StoreScreen.jsx`), but the **audit_notes' characterization of this story's current behavior is stale** (see Root cause) and the surfacing is slow enough that QA flagged it.
- No AC in STORY-11.2 explicitly promises a latency bound, so there's no AC this directly fails — but the `audit_notes` claim "No RAG/LLM (11.3/11.4)" is factually wrong for the code as it stands today, which matters for anyone trusting that note.

## Root cause (confirmed in code)

1. **The recommend-packages Edge Function makes two sequential external Mistral API calls per request, by default.** `supabase/functions/recommend-packages/index.ts:184`: `const queryEmbedding = queryText ? await embedTextWithMistral(queryText) : null;` — then `index.ts:239-240`: `const llmResult = aiConfig.llmRerankEnabled ? await rerankPackagesWithMistral(providerPayload) : ...`. These run one after another, not in parallel.
2. **`llmRerankEnabled` defaults to `true`.** `supabase/functions/recommend-packages/handler.ts:97-107` (`DEFAULT_AI_RECOMMENDATION_CONFIG`). So out of the box, every recommendation request pays for two LLM round-trips.
3. **This contradicts the story's own audit trail.** STORY-11.2's `audit_notes` says "Phase-1 metadata recommendations: domain rank + recommend-packages Edge Function (Pro/ai gate); Store + Objectives suggestion strips. ... No RAG/LLM (11.3/11.4)." — explicitly asserting this story shipped *without* RAG/LLM, deferring that to STORY-11.3/11.4. But file timestamps show `recommend-packages/handler.ts` and `index.ts` were last modified **2026-08-03**, and `mistral.ts` (which the LLM calls import, `index.ts:21`) **2026-07-26** — both *after* STORY-11.2 (2026-07-24), STORY-11.3 (2026-07-24), and STORY-11.4 (2026-07-25) were all already marked DONE. In other words: the Mistral embedding/rerank wiring was added to this Edge Function in a later pass, and none of the three stories' `audit_notes` were updated to reflect it. The "No RAG/LLM" note is simply out of date, not wrong at the time it was written.
4. **The admin toggle already exists.** `apps/admin/src/pages/monitor/AiConfigSection.tsx:87-89` lets an admin flip `llmRerankEnabled` off (STORY-12.4's "Admin configures AI recommendation parameters" AC) — so there is already a lever to remove the LLM latency without a code change, if the product decision is "don't need LLM rerank for Phase 1."
5. Client-side compounding (not this story's code, but worth citing for completeness): `ObjectivesScreen.jsx:147,164` awaits `listOwned()` then `listRecommendations()` serially — covered in the STORY-11.1 plan.

## Fix plan

1. **LLM rerank default (resolved — option 2, off for Phase 1; implemented):** `DEFAULT_AI_RECOMMENDATION_CONFIG.llmRerankEnabled` changed to `false` in `handler.ts`, leaving the existing admin toggle (`AiConfigSection.tsx`) as an opt-in enhancement. **New finding, corrects the Root cause section above:** this does *not* eliminate both Mistral round-trips. `index.ts` calls `embedTextWithMistral(queryText)` unconditionally for STORY-11.4's RAG retrieval — that call isn't gated by `llmRerankEnabled` at all, only `rerankPackagesWithMistral` is. So the default path now makes **one** external Mistral call instead of two, not zero. Still a real, meaningful latency win (roughly halves it), just not full elimination — flagging so nobody is surprised suggestions aren't instant. Gating/removing the RAG embedding call too would be a STORY-11.4-scoped change, not attempted here.
2. **Store/marketplace delay (resolved: fold in; no separate code needed):** `StoreScreen.jsx` consumes the same `recommend-packages` pipeline, so item 1 above addresses both the Objectives-screen and Store-screen latency complaints together.
3. **`audit_notes` correction (resolved, implemented):** STORY-11.2's `audit_notes` updated to stop asserting "No RAG/LLM" and state the current reality instead. STORY-11.3/11.4's own `audit_notes` don't carry this stale claim (checked) — only STORY-11.2's did, so only that one needed correcting.

## Verification plan

- `npm run test:story-11.2`: 5/5 passing, including a new executable test importing `DEFAULT_AI_RECOMMENDATION_CONFIG` directly from `handler.ts` (precedented by `tests/recommendations/story-11.4.test.js`, which already imports real named exports from this same file — stronger than the source-string-match convention used elsewhere in this test file) asserting `llmRerankEnabled === false`, plus a regex check that the conditional gate in `index.ts` is unchanged. `test_STORY_11_2_AC3_top_3_with_match_score` remains a pre-existing, unrelated failure (its regex expects a literal `3`/`LLM_CANDIDATE_POOL` arg but the actual call uses `aiConfig.candidatePool` since a RAG-pipeline refactor — out of this fix's scope, left untouched).
- Full suite (`npx vitest run`): 243/253 non-skipped passing, same 7 pre-existing unrelated failures as before this change.
- `eslint` on changed test file: 0 errors.
- Manual re-test (not done — no live device/account in this session): time the Objectives screen and Store screen "suggestions" load before/after, on a comparable network to the Fold7 test.

## Resolved decisions

- **LLM rerank default:** off for Phase 1 (`llmRerankEnabled = false`). See Fix plan item 1.
- **Source story attribution:** not pursued — correct the `audit_notes` regardless of which story technically introduced the Mistral wiring; no git history exists to attribute it precisely, and it isn't needed to fix the bug. See Fix plan item 3.
- **Store/marketplace delay:** same root cause, folded into this fix. See Fix plan item 2.

## Open questions — new, discovered during implementation

- **Should the RAG embedding call (`embedTextWithMistral` for STORY-11.4's retrieval) also be made skippable, to fully eliminate external-call latency rather than halve it?** Turning off `llmRerankEnabled` only removes the rerank call; the RAG embedding call is unconditional today. This is STORY-11.4-scoped (its own retrieval pipeline), not decided or built here — flagging rather than expanding this fix's scope to cover it.
