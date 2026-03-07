import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress: number; // 0-100
  currentOperation: string;
  operationId?: string;
  operationDetails?: string;
  estimatedTime?: number; // in seconds
}

export interface LoadingOperation {
  id: string;
  name: string;
  progress: number;
  details?: string;
  startTime: number;
}

export const useLoading = () => {
  const [globalLoading, setGlobalLoading] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    currentOperation: '',
    operationId: undefined,
  });
  
  const operationsRef = useRef<Map<string, LoadingOperation>>(new Map());

  const startOperation = useCallback((id: string, name: string, estimatedTime?: number) => {
    const operation: LoadingOperation = {
      id,
      name,
      progress: 0,
      startTime: Date.now(),
    };
    
    operationsRef.current.set(id, operation);
    
    setGlobalLoading(prev => ({
      isLoading: true,
      progress: prev.progress,
      currentOperation: name,
      operationId: id,
      operationDetails: undefined,
      estimatedTime,
    }));
  }, []);

  const updateOperation = useCallback((id: string, progress: number, details?: string) => {
    const operation = operationsRef.current.get(id);
    if (!operation) return;

    operation.progress = Math.max(0, Math.min(100, progress));
    operation.details = details;

    // Calculate overall progress
    const operations = Array.from(operationsRef.current.values());
    const totalProgress = operations.reduce((sum, op) => sum + op.progress, 0);
    const avgProgress = operations.length > 0 ? totalProgress / operations.length : 0;

    setGlobalLoading(prev => ({
      ...prev,
      progress: avgProgress,
      operationDetails: details,
    }));
  }, []);

  const completeOperation = useCallback((id: string) => {
    operationsRef.current.delete(id);
    
    const remainingOperations = Array.from(operationsRef.current.values());
    
    if (remainingOperations.length === 0) {
      setGlobalLoading({
        isLoading: false,
        progress: 100,
        currentOperation: '',
        operationId: undefined,
      });
    } else {
      const totalProgress = remainingOperations.reduce((sum, op) => sum + op.progress, 0);
      const avgProgress = totalProgress / remainingOperations.length;
      const currentOp = remainingOperations[remainingOperations.length - 1];
      
      setGlobalLoading(prev => ({
        ...prev,
        progress: avgProgress,
        currentOperation: currentOp.name,
        operationId: currentOp.id,
        operationDetails: currentOp.details,
      }));
    }
  }, []);

  const getActiveOperations = useCallback(() => {
    return Array.from(operationsRef.current.values());
  }, []);

  const clearAllOperations = useCallback(() => {
    operationsRef.current.clear();
    setGlobalLoading({
      isLoading: false,
      progress: 0,
      currentOperation: '',
      operationId: undefined,
    });
  }, []);

  return {
    loading: globalLoading,
    startOperation,
    updateOperation,
    completeOperation,
    getActiveOperations,
    clearAllOperations,
  };
};