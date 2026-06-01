import React from 'react';
import { Badge } from '@/components/ui/badge';

interface FestivalLaurelProps {
  festivalName?: string;
  outcome?: string;
  score?: number;
}

export const FestivalLaurel: React.FC<FestivalLaurelProps> = ({ festivalName, outcome, score }) => {
  if (!festivalName || !outcome) return null;

  const label = `${festivalName} • ${String(outcome).replace(/-/g, ' ')}`;

  return (
    <Badge variant="secondary" className="capitalize">
      {label}{score ? ` (${score})` : ''}
    </Badge>
  );
};

export default FestivalLaurel;
