import React from 'react';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { useLoadingState } from '@/contexts/LoadingContext';

export const GlobalLoadingOverlay: React.FC = () => {
  const loading = useLoadingState();
  return <LoadingOverlay loading={loading} />;
};
