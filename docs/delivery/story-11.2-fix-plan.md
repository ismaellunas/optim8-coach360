# STORY-11.2 fix plan — Metadata-based package recommendations (Phase 1)

> **Status today:** DONE (tracker) — reopened, contradicted by BUG-QA3-02
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

Pick one of these, per the Open Questions below — I'm not picking for you because it's a product tradeoff (recommendation quality vs. latency), not a code-correctness question:

1. **If LLM rerank should stay on by default:** parallelize what can be parallelized server-side (e.g. `embedTextWithMistral` and any independent metadata fetch can run via `Promise.all` if they don't depend on each other — needs a read of the full request flow between lines 100-240 of `index.ts` to confirm independence), and/or add a client-side loading skeleton so "slow" reads as "visibly working" rather than "broken." Also correct the STORY-11.2 and STORY-11.3/11.4 `audit_notes` to stop claiming "No RAG/LLM" since that's no longer true.
2. **If LLM rerank should default to off for Phase 1** (matching the original "metadata-based, Phase 1" framing in this story's title and audit_notes): change `DEFAULT_AI_RECOMMENDATION_CONFIG.llmRerankEnabled` to `false` in `handler.ts:100-107`, leaving the admin toggle as an opt-in enhancement. This would eliminate both Mistral round-trips for most users immediately, no other code changes needed.
3. Either way: update STORY-11.2's `audit_notes` to stop asserting "No RAG/LLM" and instead state the current (post-11.3/11.4-wiring) reality, so future audits don't repeat this staleness.

## Verification plan

- Existing tests to re-run: `npm run test:story-11.2`, plus STORY-11.3/11.4's test commands (need to look these up — not in my assigned scope, flagged below).
- New test cases needed: a timed assertion or at least a call-count assertion that `embedTextWithMistral`/`rerankPackagesWithMistral` are not invoked when `llmRerankEnabled` is false, and that recommendations still return (from the pure-metadata path) in that case.
- Manual re-test: time the Objectives screen "suggestions" load before/after, on a comparable network to the Fold7 test, with the toggle in each position.

## Open questions — need confirmation before implementing

- **Should LLM rerank be on or off by default for Phase 1 users?** This is the central product decision this plan is blocked on — everything else follows from it.
- **Was STORY-11.3 (Mistral integration) or STORY-11.4 (RAG pipeline) the actual source of this Edge Function change**, and should one of those be reopened instead of/in addition to STORY-11.2? I can see the file-timestamp evidence that the change happened after all three were marked DONE, but I can't attribute it to a specific story from the tracker data alone — that needs whoever made the change, or a commit history, and this repo currently has no git history to check (`git` reports this isn't a repository).
- **Is the Store/marketplace suggestion delay (coach feedback, not a filed QA3 bug) the same root cause?** `StoreScreen.jsx` is listed as a consumer of the same recommendation pipeline (STORY-11.2 files list), so it plausibly is, but no one has filed it as a bug and it's outside my assigned scope to confirm or fix here. Recommend deciding whether to fold it into this fix or file it separately.
