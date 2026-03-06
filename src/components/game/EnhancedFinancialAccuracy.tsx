// NOTE: This component used to mutate `gameState` opportunistically via a useEffect.
// That violates the "strict single button" progression contract (TEW-style).
//
// Financial recomputation now belongs inside the weekly tick (Advance Week) so it is
// deterministic and not dependent on which UI panels happen to be mounted.
//
// We keep this file as a no-op placeholder to avoid breaking imports in older branches.
import type { FC } from 'react';
import type { Project } from '@/types/game';
import { applyEnhancedFinancialAccuracy, calculateAccurateFinancials } from '@/utils/enhancedFinancialAccuracy';

interface EnhancedFinancialAccuracyProps {}

export { applyEnhancedFinancialAccuracy, calculateAccurateFinancials };

// Deprecated: financial recalculation is now handled as part of the Advance Week tick.
export const EnhancedFinancialAccuracy: FC<EnhancedFinancialAccuracyProps> = () => {
  return null;
};