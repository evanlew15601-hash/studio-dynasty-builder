// NOTE: This component used to mutate `gameState` opportunistically via a useEffect.
// That violates the "strict single button" progression contract (TEW-style).
//
// Financial recomputation now belongs inside the weekly tick (Advance Week) so it is
// deterministic and not dependent on which UI panels happen to be mounted.
//
// We keep this file as a no-op placeholder to avoid breaking imports in older branches.
import React from 'react';
import { Project } from '@/types/game';
import { calculateAccurateFinancials as calculateAccurateFinancialsUtil } from '@/utils/financialAccuracy';

interface EnhancedFinancialAccuracyProps {}

export const calculateAccurateFinancials = calculateAccurateFinancialsUtil;

export const applyEnhancedFinancialAccuracy = (projects: Project[]) => {
  let updatedCount = 0;

  const updatedProjects = projects.map(project => {
    const boxOfficeTotal = project.metrics?.boxOfficeTotal;
    if (project.status !== 'released' || typeof boxOfficeTotal !== 'number') return project;

    const updatedFinancials = calculateAccurateFinancials(project);
    const currentFinancials = project.metrics?.financials;

    if (currentFinancials && JSON.stringify(currentFinancials) === JSON.stringify(updatedFinancials)) {
      return project;
    }

    updatedCount += 1;

    return {
      ...project,
      metrics: {
        ...(project.metrics || {}),
        financials: updatedFinancials
      }
    };
  });

  return {
    projects: updatedProjects,
    updatedCount
  };
};

// Deprecated: financial recalculation is now handled as part of the Advance Week tick.
export const EnhancedFinancialAccuracy: React.FC<EnhancedFinancialAccuracyProps> = () => {
  return null;
};