// Utility functions for loading operations

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const withLoading = async <T>(
  operation: () => Promise<T>,
  loadingManager: {
    startOperation: (id: string, name: string, estimatedTime?: number) => void;
    updateOperation: (id: string, progress: number, details?: string) => void;
    completeOperation: (id: string) => void;
  },
  operationId: string,
  operationName: string,
  estimatedTime?: number
): Promise<T> => {
  try {
    loadingManager.startOperation(operationId, operationName, estimatedTime);
    const result = await operation();
    loadingManager.completeOperation(operationId);
    return result;
  } catch (error) {
    loadingManager.completeOperation(operationId);
    throw error;
  }
};

export const simulateProgress = async (
  loadingManager: {
    updateOperation: (id: string, progress: number, details?: string) => void;
  },
  operationId: string,
  steps: Array<{ progress: number; details?: string; duration?: number }>
): Promise<void> => {
  for (const step of steps) {
    loadingManager.updateOperation(operationId, step.progress, step.details);
    if (step.duration) {
      await delay(step.duration);
    }
  }
};

// Pre-defined loading operations
export const LOADING_OPERATIONS = {
  GAME_INIT: {
    id: 'game-init',
    name: 'Initializing Game',
    estimatedTime: 3,
  },
  TALENT_GENERATION: {
    id: 'talent-gen',
    name: 'Generating Talent Pool',
    estimatedTime: 2,
  },
  MEDIA_INIT: {
    id: 'media-init',
    name: 'Setting up Media System',
    estimatedTime: 1,
  },
  WEEKLY_PROCESSING: {
    id: 'weekly-process',
    name: 'Processing Weekly Updates',
    estimatedTime: 2,
  },
  AI_STUDIOS: {
    id: 'ai-studios',
    name: 'Updating AI Studios',
    estimatedTime: 1,
  },
  FINANCIAL_CALC: {
    id: 'financial-calc',
    name: 'Calculating Finances',
    estimatedTime: 1,
  },
  PROJECT_PROCESSING: {
    id: 'project-process',
    name: 'Processing Projects',
    estimatedTime: 1,
  },
} as const;