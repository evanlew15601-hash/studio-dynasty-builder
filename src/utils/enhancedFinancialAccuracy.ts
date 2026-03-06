import type { Project } from '@/types/game';
import { calculateAccurateFinancials } from '@/utils/financialAccuracy';

export { calculateAccurateFinancials };

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
