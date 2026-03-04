import React from 'react';
import { Project } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Globe, MapPin } from 'lucide-react';

interface FirstWeekBoxOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const FirstWeekBoxOfficeModal: React.FC<FirstWeekBoxOfficeModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  if (!project || !project.metrics) return null;

  const domesticRevenue = (project.metrics.boxOfficeTotal || 0) * 0.6; // 60% domestic typical
  const worldwideRevenue = project.metrics.boxOfficeTotal || 0;
  const budget = project.budget.total;
  const breakEvenPoint = budget * 2.5; // Typical break-even multiplier
  const profitability = worldwideRevenue / budget;
  
  const getPerformanceLevel = () => {
    if (profitability >= 3) return { level: 'Blockbuster', color: 'text-green-600', icon: TrendingUp };
    if (profitability >= 2) return { level: 'Strong Opening', color: 'text-blue-600', icon: TrendingUp };
    if (profitability >= 1.5) return { level: 'Solid Start', color: 'text-yellow-600', icon: TrendingUp };
    if (profitability >= 1) return { level: 'Modest Opening', color: 'text-orange-600', icon: TrendingDown };
    return { level: 'Disappointing', color: 'text-red-600', icon: TrendingDown };
  };

  const performance = getPerformanceLevel();
  const PerformanceIcon = performance.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            First Week Box Office Results
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Film Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold">{project.title}</h2>
            <Badge variant="outline" className="mt-2">
              Week {project.metrics.weeksSinceRelease || 1} of Theatrical Run
            </Badge>
          </div>

          {/* Performance Summary */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <PerformanceIcon className={`h-8 w-8 ${performance.color}`} />
                <span className={`text-2xl font-bold ${performance.color}`}>
                  {performance.level}
                </span>
              </div>
              <div className="text-center text-muted-foreground">
                {profitability.toFixed(1)}x budget returned in first week
              </div>
            </CardContent>
          </Card>

          {/* Box Office Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-500">Domestic</span>
                </div>
                <div className="text-2xl font-bold">
                  ${(domesticRevenue / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-muted-foreground">
                  {(project.metrics.theaterCount || 0).toLocaleString()} theaters
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-500">Worldwide</span>
                </div>
                <div className="text-2xl font-bold">
                  ${(worldwideRevenue / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-muted-foreground">
                  Total gross revenue
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Comparison */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Production Budget:</span>
                  <span className="font-mono">${(budget / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span>Break-even Point:</span>
                  <span className="font-mono">${(breakEvenPoint / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>First Week Revenue:</span>
                  <span className={`font-mono ${worldwideRevenue >= breakEvenPoint ? 'text-green-600' : 'text-orange-600'}`}>
                    ${(worldwideRevenue / 1000000).toFixed(1)}M
                  </span>
                </div>
                {worldwideRevenue >= breakEvenPoint && (
                  <div className="text-sm text-green-600 text-center">
                    Already profitable in the first week.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Critical Reception */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Critics Score</div>
              <div className="text-xl font-bold">{project.metrics.criticsScore || 50}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Audience Score</div>
              <div className="text-xl font-bold">{project.metrics.audienceScore || 50}%</div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};