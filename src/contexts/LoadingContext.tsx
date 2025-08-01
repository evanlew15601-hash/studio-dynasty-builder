import React, { createContext, useContext, ReactNode } from 'react';
import { useLoading, LoadingState } from '@/hooks/useLoading';

interface LoadingContextType {
  loading: LoadingState;
  startOperation: (id: string, name: string, estimatedTime?: number) => void;
  updateOperation: (id: string, progress: number, details?: string) => void;
  completeOperation: (id: string) => void;
  clearAllOperations: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loadingHook = useLoading();

  return (
    <LoadingContext.Provider value={loadingHook}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};