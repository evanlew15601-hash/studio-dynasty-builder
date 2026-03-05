import { Project, ProjectFinancials, CostBreakdown, RevenueBreakdown, WeeklyProfitData } from '@/types/game';

/**
 * Calculate comprehensive financial metrics for a project
 */
export const calculateProjectFinancials = (project: Project): ProjectFinancials => {
  const costBreakdown = calculateCostBreakdown(project);
  const revenueBreakdown = calculateRevenueBreakdown(project);
  
  const totalCosts = costBreakdown.total;
  const totalRevenue = revenueBreakdown.total;
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;
  
  let currentStatus: 'loss' | 'breakeven' | 'profit' = 'loss';
  if (netProfit > 0) currentStatus = 'profit';
  else if (Math.abs(netProfit) < totalCosts * 0.05) currentStatus = 'breakeven'; // Within 5% is breakeven
  
  // Calculate weekly profit history (simplified - in real implementation this would track actual weekly data)
  const weeklyProfitHistory: WeeklyProfitData[] = [];
  
  // Find payback week (when cumulative profit became positive)
  let paybackWeek: number | undefined;
  for (let i = 0; i < weeklyProfitHistory.length; i++) {
    if (weeklyProfitHistory[i].cumulativeProfit > 0) {
      paybackWeek = weeklyProfitHistory[i].week;
      break;
    }
  }
  
  return {
    totalCosts,
    totalRevenue,
    netProfit,
    profitMargin,
    roi,
    costBreakdown,
    revenueBreakdown,
    weeklyProfitHistory,
    paybackWeek,
    currentStatus
  };
};

/**
 * Calculate detailed cost breakdown for a project
 */
export const calculateCostBreakdown = (project: Project): CostBreakdown => {
  const budget = project.budget;
  
  // Development costs (typically 10% of total budget)
  const development = budget.total * 0.1;
  
  // Pre-production costs (typically 10% of total budget)
  const preProduction = budget.total * 0.1;
  
  // Production costs (typically 70% of total budget)
  const production = budget.total * 0.7;
  
  // Post-production costs (typically 10% of total budget)
  const postProduction = budget.total * 0.1;
  
  // Marketing costs (from distribution strategy)
  const marketing = project.distributionStrategy?.marketingBudget || budget.total * 0.5;
  
  // Distribution costs (typically 5% of total budget)
  const distribution = budget.total * 0.05;
  
  // Talent costs (calculate from contracted talent)
  const talent = project.contractedTalent?.reduce((sum, contract) => {
    return sum + (contract.weeklyPay * contract.contractWeeks);
  }, 0) || 0;
  
  // Overhead costs (weekly operational costs during production)
  const productionWeeks = 12; // Typical production phase length
  const weeklyOverhead = 25000; // Base operational cost
  const overhead = weeklyOverhead * productionWeeks;
  
  // Contingency (typically 10% of production costs)
  const contingency = production * 0.1;
  
  const total = development + preProduction + production + postProduction + 
                marketing + distribution + talent + overhead + contingency;
  
  return {
    development,
    preProduction,
    production,
    postProduction,
    marketing,
    distribution,
    talent,
    overhead,
    contingency,
    total
  };
};

/**
 * Calculate detailed revenue breakdown for a project
 */
export const calculateRevenueBreakdown = (project: Project): RevenueBreakdown => {
  // Box office revenue (domestic + international)
  const boxOffice = project.metrics?.boxOfficeTotal || 0;
  
  // International sales (separate from box office)
  const international = project.metrics?.internationalSales || 0;
  
  // Streaming revenue (calculated from views and platform deals)
  const streaming = calculateStreamingRevenue(project);
  
  // Licensing revenue (TV, cable, international licensing)
  const licensing = calculateLicensingRevenue(project);
  
  // Merchandise revenue (for blockbuster films)
  const merchandise = calculateMerchandiseRevenue(project);
  
  // Awards bump (prestige films get licensing/sale bumps from awards)
  const awards = calculateAwardsRevenue(project);
  
  const total = boxOffice + international + streaming + licensing + merchandise + awards;
  
  return {
    boxOffice,
    international,
    streaming,
    licensing,
    merchandise,
    awards,
    total
  };
};

/**
 * Calculate streaming revenue based on views and platform deals
 */
const calculateStreamingRevenue = (project: Project): number => {
  const streamingViews = project.metrics?.streamingViews || 0;
  // Rough calculation: $2 per 1000 views for streaming platforms
  return streamingViews * 0.002;
};

/**
 * Calculate licensing revenue from TV, cable, international
 */
const calculateLicensingRevenue = (project: Project): number => {
  const boxOffice = project.metrics?.boxOfficeTotal || 0;
  const budget = project.budget.total;
  
  // Licensing typically generates 20-40% of theatrical revenue for successful films
  if (boxOffice > budget) {
    return boxOffice * 0.3; // 30% for successful films
  } else if (boxOffice > budget * 0.5) {
    return boxOffice * 0.15; // 15% for moderate performers
  }
  return boxOffice * 0.05; // 5% for poor performers
};

/**
 * Calculate merchandise revenue (mainly for blockbusters)
 */
const calculateMerchandiseRevenue = (project: Project): number => {
  const boxOffice = project.metrics?.boxOfficeTotal || 0;
  const budget = project.budget.total;
  
  // Only blockbusters and family films generate significant merchandise
  if (project.script.genre === 'action' || project.script.genre === 'family') {
    if (boxOffice > budget * 2) {
      return boxOffice * 0.1; // 10% for major blockbusters
    } else if (boxOffice > budget) {
      return boxOffice * 0.03; // 3% for moderate hits
    }
  }
  return 0;
};

/**
 * Calculate additional revenue from awards and critical acclaim
 */
const calculateAwardsRevenue = (project: Project): number => {
  const awards = project.metrics?.awards || [];
  const boxOffice = project.metrics?.boxOfficeTotal || 0;
  
  // Awards create additional licensing and sale opportunities
  let awardsMultiplier = 0;
  awards.forEach(award => {
    if (award.includes('Crown')) {
      awardsMultiplier += 0.15; // 15% bump for top-tier awards
    } else if (award.includes('Crystal Ring') || award.includes('Performers Guild')) {
      awardsMultiplier += 0.08; // 8% bump for major awards
    } else {
      awardsMultiplier += 0.03; // 3% bump for other awards
    }
  });
  
  return boxOffice * Math.min(awardsMultiplier, 0.4); // Cap at 40% bump
};

/**
 * Update project financial metrics - call this weekly during game progression
 */
export const updateProjectFinancials = (project: Project): Project => {
  const financials = calculateProjectFinancials(project);
  
  return {
    ...project,
    metrics: {
      ...project.metrics,
      financials
    }
  };
};

/**
 * Get financial summary for all projects
 */
export const getStudioFinancialSummary = (projects: Project[]) => {
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let profitableCount = 0;
  let lossCount = 0;
  
  projects.forEach(project => {
    if (project.metrics?.financials) {
      totalRevenue += project.metrics.financials.totalRevenue;
      totalCosts += project.metrics.financials.totalCosts;
      totalProfit += project.metrics.financials.netProfit;
      
      if (project.metrics.financials.netProfit > 0) {
        profitableCount++;
      } else if (project.metrics.financials.netProfit < 0) {
        lossCount++;
      }
    }
  });
  
  const successRate = projects.length > 0 ? (profitableCount / projects.length) * 100 : 0;
  const overallROI = totalCosts > 0 ? (totalProfit / totalCosts) * 100 : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    profitableCount,
    lossCount,
    successRate,
    overallROI,
    profitMargin,
    totalProjects: projects.length
  };
};