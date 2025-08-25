import React, { useEffect } from 'react';
import { GameState, Project } from '@/types/game';

interface EnhancedFinancialAccuracyProps {
  gameState: GameState;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
}

export const EnhancedFinancialAccuracy: React.FC<EnhancedFinancialAccuracyProps> = ({
  gameState,
  onProjectUpdate
}) => {
  
  useEffect(() => {
    // Recalculate financial metrics for all projects
    gameState.projects.forEach(project => {
      if (project.status === 'released' && project.metrics?.boxOfficeTotal) {
        const updatedFinancials = calculateAccurateFinancials(project);
        if (JSON.stringify(project.metrics.financials) !== JSON.stringify(updatedFinancials)) {
          onProjectUpdate(project.id, {
            metrics: {
              ...project.metrics,
              financials: updatedFinancials
            }
          });
        }
      }
    });
  }, [gameState.projects, onProjectUpdate]);

  const calculateAccurateFinancials = (project: Project) => {
    const boxOfficeTotal = project.metrics?.boxOfficeTotal || 0;
    const productionBudget = project.budget.total;
    
    // Marketing costs (typically 50% of production budget for major releases)
    const marketingBudget = (project as any).marketingBudget || (productionBudget * 0.5);
    
    // Distribution costs (10% of box office)
    const distributionCosts = boxOfficeTotal * 0.1;
    
    // Theater share (theaters typically take 50% of box office)
    const theaterShare = boxOfficeTotal * 0.5;
    
    // Studio's net revenue (what the studio actually gets)
    const studioRevenue = boxOfficeTotal - theaterShare - distributionCosts;
    
    // Total costs to studio
    const totalCosts = productionBudget + marketingBudget;
    
    // Net profit/loss
    const netProfit = studioRevenue - totalCosts;
    
    // ROI calculation
    const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;
    
    // Profit margin
    const profitMargin = studioRevenue > 0 ? (netProfit / studioRevenue) * 100 : 0;
    
    // Additional revenue streams (home video, streaming, merchandise - estimate 25% of box office)
    const additionalRevenue = boxOfficeTotal * 0.25;
    const totalRevenue = studioRevenue + additionalRevenue;
    const finalNetProfit = totalRevenue - totalCosts;
    const finalROI = totalCosts > 0 ? (finalNetProfit / totalCosts) * 100 : 0;
    
    // Status determination
    let currentStatus: 'loss' | 'breakeven' | 'profit';
    if (finalNetProfit > 0) {
      currentStatus = 'profit';
    } else if (finalNetProfit > -productionBudget * 0.2) {
      currentStatus = 'breakeven';
    } else {
      currentStatus = 'loss';
    }

    return {
      totalRevenue,
      totalCosts,
      netProfit: finalNetProfit,
      roi: finalROI,
      profitMargin: totalRevenue > 0 ? (finalNetProfit / totalRevenue) * 100 : 0,
      currentStatus,
      costBreakdown: {
        development: 0,
        preProduction: productionBudget * 0.1,
        production: productionBudget * 0.7,
        postProduction: productionBudget * 0.2,
        marketing: marketingBudget,
        distribution: distributionCosts,
        talent: productionBudget * 0.4,
        overhead: productionBudget * 0.05,
        contingency: productionBudget * 0.05,
        total: totalCosts
      },
      revenueBreakdown: {
        boxOffice: boxOfficeTotal,
        international: boxOfficeTotal * 0.6,
        streaming: additionalRevenue * 0.6,
        licensing: additionalRevenue * 0.2,
        merchandise: additionalRevenue * 0.1,
        awards: 0,
        total: totalRevenue
      },
      weeklyProfitHistory: [], // Will be populated over time
      breakdown: {
        boxOfficeTotal,
        theaterShare,
        studioRevenue,
        distributionCosts,
        productionBudget,
        marketingBudget,
        additionalRevenue
      }
    };
  };

  return null; // This is a background service component
};