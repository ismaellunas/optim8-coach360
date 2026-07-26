import { useEffect, useState } from 'react';
import {
  DEFAULT_ONBOARDING_CONFIG,
  type OnboardingConfig,
  type OnboardingRole,
  type OnboardingRoleConfig,
} from '@coach360/domain';
import { Card, Button } from '@coach360/ui';
import {
  useOnboardingConfigQuery,
  useSetOnboardingConfigMutation,
} from '@/entities/onboarding/api/onboarding-queries.js';

const ROLE_LABELS: Record<OnboardingRole, string> = {
  coach: 'Coach onboarding',
  player: 'Player onboarding',
};

function RoleConfigEditor({
  role,
  config,
  onChange,
}: {
  role: OnboardingRole;
  config: OnboardingRoleConfig;
  onChange: (next: OnboardingRoleConfig) => void;
}) {
  return (
    <Card>
      <p className="text-xs uppercase text-coach-t3">{role}</p>
      <p className="mt-1 font-display text-lg font-semibold text-coach-t1">{ROLE_LABELS[role]}</p>

      <div className="mt-4 space-y-3">
        <p className="font-display text-sm font-semibold text-coach-t2">Welcome message</p>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Welcome title</span>
          <input
            type="text"
            aria-label={`Welcome title for ${role}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={config.welcome.title}
            onChange={(event) =>
              onChange({ ...config, welcome: { ...config.welcome, title: event.target.value } })
            }
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Welcome body</span>
          <textarea
            aria-label={`Welcome body for ${role}`}
            rows={3}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={config.welcome.body}
            onChange={(event) =>
              onChange({ ...config, welcome: { ...config.welcome, body: event.target.value } })
            }
          />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        <p className="font-display text-sm font-semibold text-coach-t2">Wizard steps</p>
        {config.steps.map((step, index) => (
          <div key={step.id} className="rounded-[12px] border border-coach-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-xs uppercase text-coach-t3">{step.id}</p>
              <label className="flex items-center gap-2 font-body text-xs text-coach-t2">
                <input
                  type="checkbox"
                  aria-label={`Mandatory ${role} step ${step.id}`}
                  checked={step.mandatory}
                  onChange={(event) => {
                    const steps = [...config.steps];
                    steps[index] = { ...step, mandatory: event.target.checked };
                    onChange({ ...config, steps });
                  }}
                />
                Mandatory
              </label>
            </div>
            <label className="mt-2 block">
              <span className="font-body text-xs text-coach-t3">Step title</span>
              <input
                type="text"
                aria-label={`Title for ${role} step ${step.id}`}
                className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                value={step.title}
                onChange={(event) => {
                  const steps = [...config.steps];
                  steps[index] = { ...step, title: event.target.value };
                  onChange({ ...config, steps });
                }}
              />
            </label>
            <label className="mt-2 block">
              <span className="font-body text-xs text-coach-t3">Step description</span>
              <textarea
                aria-label={`Description for ${role} step ${step.id}`}
                rows={2}
                className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                value={step.description}
                onChange={(event) => {
                  const steps = [...config.steps];
                  steps[index] = { ...step, description: event.target.value };
                  onChange({ ...config, steps });
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OnboardingConfigSection() {
  const { data, isLoading, error } = useOnboardingConfigQuery();
  const setConfig = useSetOnboardingConfigMutation();
  const [draft, setDraft] = useState<OnboardingConfig>(DEFAULT_ONBOARDING_CONFIG);

  useEffect(() => {
    if (data) {
      setDraft(data);
    }
  }, [data]);

  if (isLoading) {
    return <p className="text-coach-t2">Loading onboarding configuration…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-coach-t1">Onboarding configuration</h2>
        <Button
          variant="primary"
          disabled={setConfig.isPending}
          onClick={() => setConfig.mutate(draft)}
        >
          Save onboarding config
        </Button>
      </div>
      {error ? <p className="text-coach-red">{(error as Error).message}</p> : null}
      {setConfig.isError ? (
        <p className="text-xs text-coach-red">{(setConfig.error as Error).message}</p>
      ) : null}
      {setConfig.isSuccess ? (
        <p className="text-xs text-coach-green">Onboarding configuration saved.</p>
      ) : null}
      <RoleConfigEditor
        role="coach"
        config={draft.coach}
        onChange={(next) => setDraft({ ...draft, coach: next })}
      />
      <RoleConfigEditor
        role="player"
        config={draft.player}
        onChange={(next) => setDraft({ ...draft, player: next })}
      />
    </div>
  );
}
