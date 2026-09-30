import { createContext, useContext } from 'react';

export interface GlobalLoadingContextValue {
  show: (message?: string) => void;
  hide: () => void;
}

export const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

export function useGlobalLoading(): GlobalLoadingContextValue {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading, GlobalLoadingProvider icinde kullanilmalidir.');
  }
  return context;
}
