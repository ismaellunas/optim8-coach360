import { createContext, useContext } from 'react';

export const SubscriptionContext = createContext(null);

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) {
    throw new Error('useSubscription must be used within SubscriptionGate');
  }
  return value;
}
