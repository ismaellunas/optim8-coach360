import { createContext, useContext, type ReactNode } from 'react';
import type { RepositoryBundle } from './create-repositories.js';

const RepositoryContext = createContext<RepositoryBundle | null>(null);

export type RepositoryProviderProps = {
  value: RepositoryBundle;
  children: ReactNode;
};

export function RepositoryProvider({ value, children }: RepositoryProviderProps) {
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): RepositoryBundle {
  const value = useContext(RepositoryContext);
  if (!value) {
    throw new Error('RepositoryProvider is missing');
  }
  return value;
}
