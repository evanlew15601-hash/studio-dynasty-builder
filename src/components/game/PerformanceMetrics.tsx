import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users } from 'lucide-react';
import { Project } from '@/types/game';
import { useGameStore } from '@/game/store';

export const PerformanceMetrics: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading performance metrics...</div>;
  }
  const calculateMetrics = () => {
    const releasedProjects = gameState.projects.filter(p => p.status === 'released');
    const totalRevenue = releasedProjects.reduce((sum, p) => sum + (p.metrics?.boxOfficeTotal || 0), 0);
    const totalBudget = releasedProjects.reduce((sum, p) => 
      sum + (typeof p.budget === 'number' ? p.budget : p.budget.total), 0);
    const roi = totalBudget > 0 ? ((totalRevenue - totalBudget) / totalBudget) * 100 : 0;
    
    const hits = releasedProjects.filter(p => 
      (p.metrics?.boxOfficeTotal || 0) >= (typeof p.budget === 'number' ? p.budget : p.budget.total) * 2.5
    ).length;
    const flops = releasedProjects.filter(p => 
      (p.metrics?.boxOfficeTotal || 0) < (typeof p.budget === 'number' ? p.budget : p.budget.total) * 0.8
    ).length;
    const hitRate = releasedProjects.length > 0 ? (hits / releasedProjects.length) * 100 : 0;
    
    const averageQuality = releasedProjects.length > 0 
      ? releasedProjects.reduce((sum, p) => sum + (p.script?.quality || 0), 0) / releasedProjects.length 
      : 0;
    
    const currentStreak = calculateCurrentStreak(releasedProjects);
    
    return {
      totalRevenue,
      totalBudget,
      roi,
      hits,
      flops,
      hitRate,
      averageQuality,
      currentStreak,
      projectsCompleted: releasedProjects.length
    };
  };

  const calculateCurrentStreak = (projects: Project[]): { type: 'hit' | 'flop' | 'none', count: number } => {
    if (projects.length === 0) return { type: 'none', count: 0 };
    
    const recent = [...projects].reverse(); // Most recent first
    let streakType: 'hit' | 'flop' | 'none' = 'none';
    let count = 0;
    
    for (const project of recent) {
      const revenue = project.metrics?.boxOfficeTotal || 0;
      const budget = typeof project.budget === 'number' ? project.budget : project.budget.total;
      const isHit = revenue >= budget * 2.5;
      const isFlop = revenue < budget * 0.8;
      
      if (count === 0) {
        if (isHit) streakType = 'hit';
        else if (isFlop) streakType = 'flop';
        else break;
        count = 1;
      } else {
        if ((streakType === 'hit' && isHit) || (streakType === 'flop' && isFlop)) {
          count++;
        } else {
          break;
        }
      }
    }
    
    return { type: streakType, count };
  };

  const metrics = calculateMetrics();
  const { studio } = gameState;

  const getStreakDisplay = () => {
    if (metrics.currentStreak.count === 0) return null;
    
    const isHitStreak = metrics.currentStreak.type === 'hit';
    return (
      <div className={`flex items-center space-x-1 ${isHitStreak ? 'text-green-600' : 'text-red-600'}`}>
        {isHitStreak ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        <span className="font-medium">
          {metrics.currentStreak.count} {metrics.currentStreak.type}{metrics.currentStreak.count > 1 ? 's' : ''} in a row
        </span>
      </div>
    );
  };

  const getRoiColor = (roi: number) => {
    if (roi >= 50) return 'text-green-600';
    if (roi >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2" size={20} />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Studio Health */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Studio Reputation</span>
              <Badge variant={studio.reputation >= 70 ? 'default' : studio.reputation >= 40 ? 'secondary' : 'destructive'}>
                {Math.round(studio.reputation)}/100
              </Badge>
            </div>
            <Progress value={studio.reputation} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Budget</span>
              <Badge variant={studio.budget >= 10000000 ? 'default' : studio.budget >= 1000000 ? 'secondary' : 'destructive'}>
                ${(studio.budget / 1000000).toFixed(1)}M
              </Badge>
            </div>
            <Progress value={Math.min(100, (studio.budget / 50000000) * 100)} className="h-2" />
          </div>
        </div>

        {/* Financial Performance */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-1">
              <DollarSign size={16} className="text-green-600" />
            </div>
            <div className="text-lg font-bold">
              ${(metrics.totalRevenue / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp size={16} className={getRoiColor(metrics.roi)} />
            </div>
            <div className={`text-lg font-bold ${getRoiColor(metrics.roi)}`}>
              {metrics.roi > 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">ROI</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-1">
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="text-lg font-bold">
              {metrics.hitRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Hit Rate</div>
          </div>
        </div>

        {/* Project Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Projects Completed</span>
              <span className="font-medium">{metrics.projectsCompleted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Hits ({metrics.hits})</span>
              <span className="text-red-600">Flops ({metrics.flops})</span>
            </div>
            <Progress 
              value={metrics.projectsCompleted > 0 ? (metrics.hits / metrics.projectsCompleted) * 100 : 0} 
              className="h-2" 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Avg. Quality</span>
              <Badge variant={metrics.averageQuality >= 80 ? 'default' : metrics.averageQuality >= 60 ? 'secondary' : 'outline'}>
                {metrics.averageQuality.toFixed(1)}/100
              </Badge>
            </div>
            <Progress value={metrics.averageQuality} className="h-2" />
          </div>
        </div>

        {/* Current Streak */}
        {getStreakDisplay() && (
          <div className="p-3 rounded-lg border bg-gradient-to-r from-background to-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Streak</span>
              {getStreakDisplay()}
            </div>
          </div>
        )}

        {/* Time Stats */}
        <div className="flex items-center justify-between text-sm border-t pt-3">
          <div className="flex items-center space-x-1">
            <Calendar size={14} />
            <span>Year {gameState.currentYear}, Week {gameState.currentWeek}</span>
          </div>
          <div className="text-muted-foreground">
            Q{gameState.currentQuarter}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};