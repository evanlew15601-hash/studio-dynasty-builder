import { create } from 'zustand';

export interface UiStoreState {
  phase: string;
  setPhase: (phase: string) => void;

  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  phase: 'dashboard',
  setPhase: (phase) => set({ phase }),

  selectedProjectId: null,
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
}));
