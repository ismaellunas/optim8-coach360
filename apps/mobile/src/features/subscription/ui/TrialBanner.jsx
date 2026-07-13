import { Badge, Button as Btn } from '@/shared/ui/primitives.jsx';

/**
 * Active-trial countdown banner (Flow 9 / STORY-4.2).
 * @param {{ user: { tier?: string, trialDays?: number }, onUpgrade: () => void }} props
 */
export function TrialBanner({ user, onUpgrade }) {
  if (!user || user.tier !== 'trial') {
    return null;
  }

  const days = typeof user.trialDays === 'number' ? user.trialDays : 0;

  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-coach-yellow/20 bg-coach-yellow/10 p-3">
      <div>
        <div className="font-body text-[13px] font-semibold text-coach-yellow">
          Free Trial - {days} days left
        </div>
        <div className="font-body text-[11px] text-coach-t3">Full Pro access</div>
        <div className="mt-1">
          <Badge tone="yellow">Trial active</Badge>
        </div>
      </div>
      <Btn small onClick={onUpgrade}>
        Subscribe
      </Btn>
    </div>
  );
}
