import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLoading } from '@/hooks/useLoading';
import type { LoadingOperation, LoadingState } from '@/hooks/useLoading';

type LoadingActions = {
  startOperation: (id: string, name: string, estimatedTime?: number) => void;
  updateOperation: (id: string, progress: number, details?: string) => void;
  completeOperation: (id: string) => void;
  clearAllOperations: () => void;
  getActiveOperations: () => LoadingOperation[];
};

const LoadingStateContext = createContext<LoadingState | undefined>(undefined);
const LoadingActionsContext = createContext<LoadingActions | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loadingHook = useLoading();

  const actions = useMemo<LoadingActions>(
    () => ({
      startOperation: loadingHook.startOperation,
      updateOperation: loadingHook.updateOperation,
      completeOperation: loadingHook.completeOperation,
      clearAllOperations: loadingHook.clearAllOperations,
      getActiveOperations: loadingHook.getActiveOperations,
    }),
    [
      loadingHook.startOperation,
      loadingHook.updateOperation,
      loadingHook.completeOperation,
      loadingHook.clearAllOperations,
      loadingHook.getActiveOperations,
    ]
  );

  return (
    <LoadingStateContext.Provider value={loadingHook.loading}>
      <LoadingActionsContext.Provider value={actions}>{children}</LoadingActionsContext.Provider>
    </LoadingStateContext.Provider>
  );
};

export const useLoadingState = () => {
  const state = useContext(LoadingStateContext);
  if (state === undefined) {
    throw new Error('useLoadingState must be used within a LoadingProvider');
  }
  return state;
};

export const useLoadingActions = () => {
  const actions = useContext(LoadingActionsContext);
  if (actions === undefined) {
    throw new Error('useLoadingActions must be used within a LoadingProvider');
  }
  return actions;
};

/**
 * Backwards-compatible hook for existing call sites.
 * Prefer useLoadingState/useLoadingActions to avoid rerenders on progress updates.
 */
export const useLoadingContext = () => {
  const loading = useLoadingState();
  const actions = useLoadingActions();
  return { loading, ...actions };
};