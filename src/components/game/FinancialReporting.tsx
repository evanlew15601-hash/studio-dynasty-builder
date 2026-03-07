import React from 'react';
import type { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/game/store';
import {
  BudgetIcon,
  TrendingIcon,
  BarChartIcon,
  DollarIcon,
  MarketIcon
} from '@/components/ui/icons';
import { formatMoneyCompact } from '@/utils/money';

interface FinancialReportingProps {
  gameState?: GameState;
}

export const FinancialReporting: React.FC<FinancialReportingProps> = ({ gameState: propGameState }) => {
  const storeGameState = useGameStore((s) => s.game);
  const gameState = propGameState ?? storeGameState;

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading financial reporting...</div>;
  }

  const calculateStudioFinancials = () => {
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalProfit = 0;
    let profitableProjects = 0;
    let lossProjects = 0;

    gameState.projects.forEach(project => {
      const fin = project.metrics?.financials;
      if (!fin) return;

      totalRevenue += fin.totalRevenue;
      totalCosts += fin.totalCosts;
      totalProfit += fin.netProfit;

      if (fin.netProfit > 0) profitableProjects++;
      else if (fin.netProfit < 0) lossProjects++;
    });

    const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const overallROI = totalCosts > 0 ? (totalProfit / totalCosts) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      profitableProjects,
      lossProjects,
      overallProfitMargin,
      overallROI,
      totalProjects: gameState.projects.length
    };
  };

  const studioFinancials = calculateStudioFinancials();

  const projectsByPerformance = gameState.projects
    .filter(p => p.metrics?.financials)
    .sort((a, b) => (b.metrics?.financials?.netProfit || 0) - (a.metrics?.financials?.netProfit || 0));

  const topPerformers = projectsByPerformance.slice(0, 3);
  const worstPerformers = projectsByPerformance.slice(-3).reverse();

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <div className="p-2 rounded-lg bg-gradient-golden mr-3">
              <BarChartIcon className="text-primary-foreground" size={20} />
            </div>
            Studio Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-2xl font-bold text-primary">{formatMoneyCompact(studioFinancials.totalRevenue)}</div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10">
              <div className="text-sm text-muted-foreground">Total Costs</div>
              <div className="text-2xl font-bold text-accent">{formatMoneyCompact(studioFinancials.totalCosts)}</div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/10">
              <div className="text-sm text-muted-foreground">Net Profit</div>
              <div className={`text-2xl font-bold ${studioFinancials.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoneyCompact(studioFinancials.totalProfit)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <div className="text-sm text-muted-foreground">ROI</div>
              <div className={`text-2xl font-bold ${studioFinancials.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {studioFinancials.overallROI.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{studioFinancials.profitableProjects}</div>
              <div className="text-sm text-muted-foreground">Profitable Projects</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{studioFinancials.lossProjects}</div>
              <div className="text-sm text-muted-foreground">Loss Projects</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {studioFinancials.totalProjects > 0
                  ? ((studioFinancials.profitableProjects / studioFinancials.totalProjects) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-green-600">
              <TrendingIcon className="mr-2" size={20} />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPerformers.length > 0 ? topPerformers.map(project => (
              <ProjectFinancialCard key={project.id} project={project} />
            )) : (
              <div className="text-center text-muted-foreground py-4">No profitable projects yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-red-600">
              <TrendingIcon className="mr-2 transform rotate-180" size={20} />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {worstPerformers.length > 0 ? worstPerformers.map(project => (
              <ProjectFinancialCard key={project.id} project={project} />
            )) : (
              <div className="text-center text-muted-foreground py-4">No loss projects</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <MarketIcon className="mr-2" size={20} />
            All Projects Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gameState.projects.map(project => (
              <ProjectFinancialRow key={project.id} project={project} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProjectFinancialCard: React.FC<{ project: Project }> = ({ project }) => {
  const financials = project.metrics?.financials;
  if (!financials) return null;

  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card/50">
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium">{project.title}</div>
        <Badge variant={financials.netProfit >= 0 ? "default" : "destructive"}>
          {financials.currentStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Revenue:</span>{' '}
          <span className="font-semibold">{formatMoneyCompact(financials.totalRevenue)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Costs:</span>{' '}
          <span className="font-semibold">{formatMoneyCompact(financials.totalCosts)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Profit:</span>{' '}
          <span className={`font-semibold ${financials.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoneyCompact(financials.netProfit)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">ROI:</span>{' '}
          <span className={`font-semibold ${financials.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {financials.roi.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const ProjectFinancialRow: React.FC<{ project: Project }> = ({ project }) => {
  const financials = project.metrics?.financials;

  if (!financials) {
    return (
      <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
        <div className="font-medium">{project.title}</div>
        <Badge variant="outline">No Financial Data</Badge>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-3 rounded-lg border border-border/50">
      <div className="flex-1">
        <div className="font-medium mb-1">{project.title}</div>
        <Progress value={Math.max(0, Math.min(100, financials.profitMargin + 50))} className="h-2" />
      </div>

      <div className="flex items-center space-x-4 text-sm">
        <div className="text-right">
          <div className="text-muted-foreground">Revenue</div>
          <div className="font-semibold">{formatMoneyCompact(financials.totalRevenue)}</div>
        </div>

        <div className="text-right">
          <div className="text-muted-foreground">Profit</div>
          <div className={`font-semibold ${financials.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoneyCompact(financials.netProfit)}
          </div>
        </div>

        <Badge variant={financials.netProfit >= 0 ? "default" : "destructive"}>
          {financials.roi.toFixed(1)}% ROI
        </Badge>
      </div>
    </div>
  );
};