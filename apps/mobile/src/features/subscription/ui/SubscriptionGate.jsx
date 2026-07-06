import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { needsSubscriptionGate } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { SubscriptionContext } from '../model/subscription-context.jsx';
import { SubscriptionChoiceScreen } from './SubscriptionChoiceScreen.jsx';

export function SubscriptionGate({ children }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [redirectToSubscription, setRedirectToSubscription] = useState(false);

  const userId = session?.user.id;

  const loadSubscription = useCallback(
    async function () {
      if (!userId) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextSubscription = await repos.subscriptions.getByProfileId(userId);
        setSubscription(nextSubscription);
      } catch (cause) {
        setSubscription(null);
        setError(cause instanceof Error ? cause.message : 'subscription_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [repos.subscriptions, userId],
  );

  useEffect(function () {
    loadSubscription();
  }, [loadSubscription]);

  const contextValue = useMemo(
    function () {
      return {
        subscription,
        redirectToSubscription,
        clearRedirectToSubscription: function () {
          setRedirectToSubscription(false);
        },
        refreshSubscription: loadSubscription,
      };
    },
    [loadSubscription, redirectToSubscription, subscription],
  );

  async function handleActivateTrial() {
    if (!userId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nextSubscription = await repos.subscriptions.activateTrial(userId);
      setSubscription(nextSubscription);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'trial_activation_failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeferToBasic() {
    if (!userId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nextSubscription = await repos.subscriptions.deferToBasic(userId);
      setSubscription(nextSubscription);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'defer_to_basic_failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChoosePaidTier(tierId) {
    if (!userId) {
      return;
    }
    if (tierId === 'basic') {
      await handleDeferToBasic();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nextSubscription = await repos.subscriptions.deferToBasic(userId);
      setSubscription(nextSubscription);
      setRedirectToSubscription(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'subscription_choice_failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-coach-t2">
        Loading subscription…
      </div>
    );
  }

  if (error && needsSubscriptionGate(subscription)) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="mb-4 font-body text-sm text-coach-red">{error}</p>
        <button
          type="button"
          onClick={loadSubscription}
          className="cursor-pointer rounded-xl border-none bg-coach-orange-glow px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-coach-orange"
        >
          Retry
        </button>
      </div>
    );
  }

  if (needsSubscriptionGate(subscription)) {
    return (
      <SubscriptionChoiceScreen
        submitting={submitting}
        error={error}
        onActivateTrial={handleActivateTrial}
        onDeferToBasic={handleDeferToBasic}
        onChoosePaidTier={handleChoosePaidTier}
      />
    );
  }

  return (
    <SubscriptionContext.Provider value={contextValue}>{children}</SubscriptionContext.Provider>
  );
}
