import { createContext, useContext } from 'react';

export const OnboardingNavigationContext = createContext(null);

export function useOnboardingNavigation() {
  const value = useContext(OnboardingNavigationContext);
  if (!value) {
    return {
      redirectToSchedule: false,
      clearRedirectToSchedule: function () {},
    };
  }
  return value;
}
