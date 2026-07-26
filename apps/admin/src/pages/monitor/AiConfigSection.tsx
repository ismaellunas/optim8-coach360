import { useEffect, useState } from 'react';
import {
  DEFAULT_AI_RECOMMENDATION_CONFIG,
  RAG_TOP_K_MAX,
  RAG_TOP_K_MIN,
  type AiRecommendationConfig,
} from '@coach360/domain';
import { Button, Card } from '@coach360/ui';
import {
  useAiRecommendationConfigQuery,
  useSetAiRecommendationConfigMutation,
} from '@/entities/monitor/api/monitor-queries.js';

export function AiConfigSection() {
  const configQuery = useAiRecommendationConfigQuery();
  const saveConfig = useSetAiRecommendationConfigMutation();
  const [draft, setDraft] = useState<AiRecommendationConfig>(DEFAULT_AI_RECOMMENDATION_CONFIG);

  useEffect(() => {
    if (configQuery.data) {
      setDraft(configQuery.data);
    }
  }, [configQuery.data]);

  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-display text-lg font-semibold text-coach-t1">
        AI recommendation parameters
      </h2>
      <p className="font-body text-sm text-coach-t2">
        Configure RAG pool size, LLM candidate pool, and top-k results used by package
        recommendations.
      </p>
      <Card className="max-w-lg">
        {configQuery.isLoading ? (
          <p className="text-coach-t2">Loading AI config…</p>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="font-body text-xs text-coach-t3">LLM top K</span>
              <input
                type="number"
                min={1}
                max={20}
                aria-label="LLM top K"
                className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                value={draft.llmTopK}
                onChange={(event) =>
                  setDraft({ ...draft, llmTopK: Number(event.target.value) || 1 })
                }
              />
            </label>
            <label className="block">
              <span className="font-body text-xs text-coach-t3">Candidate pool</span>
              <input
                type="number"
                min={1}
                max={50}
                aria-label="Candidate pool"
                className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                value={draft.candidatePool}
                onChange={(event) =>
                  setDraft({ ...draft, candidatePool: Number(event.target.value) || 1 })
                }
              />
            </label>
            <label className="block">
              <span className="font-body text-xs text-coach-t3">
                RAG top K ({RAG_TOP_K_MIN}–{RAG_TOP_K_MAX})
              </span>
              <input
                type="number"
                min={RAG_TOP_K_MIN}
                max={RAG_TOP_K_MAX}
                aria-label="RAG top K"
                className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                value={draft.ragTopK}
                onChange={(event) =>
                  setDraft({ ...draft, ragTopK: Number(event.target.value) || RAG_TOP_K_MIN })
                }
              />
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-coach-t2">
              <input
                type="checkbox"
                aria-label="Enable LLM re-rank"
                checked={draft.llmRerankEnabled}
                onChange={(event) =>
                  setDraft({ ...draft, llmRerankEnabled: event.target.checked })
                }
              />
              Enable LLM re-rank
            </label>
            <Button
              variant="primary"
              disabled={saveConfig.isPending}
              onClick={() => saveConfig.mutate(draft)}
            >
              Save AI config
            </Button>
            {saveConfig.isError ? (
              <p className="font-body text-xs text-coach-red">
                {(saveConfig.error as Error).message}
              </p>
            ) : null}
            {saveConfig.isSuccess ? (
              <p className="font-body text-xs text-coach-green">AI recommendation config saved.</p>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
