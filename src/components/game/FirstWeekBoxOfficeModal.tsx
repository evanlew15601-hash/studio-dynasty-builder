import React from 'react';
import { Project } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Globe, MapPin, Sparkles } from 'lucide-react';

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

  // This modal fires on debut (weeksSinceRelease === 0). "Opening" is lastWeeklyRevenue
  // captured by BoxOfficeSystem.initializeRelease().
  const openingWorldwide = project.metrics.lastWeeklyRevenue ?? project.metrics.boxOfficeTotal ?? 0;

  const domesticShare = (() => {
    const g = project.script?.genre;
    if (g === 'action' || g === 'superhero' || g === 'sci-fi' || g === 'fantasy') return 0.45;
    if (g === 'horror' || g === 'thriller' || g === 'crime') return 0.55;
    if (g === 'family' || g === 'animation') return 0.50;
    if (g === 'comedy') return 0.55;
    return 0.60;
  })();

  const openingDomestic = Math.max(0, Math.round(openingWorldwide * domesticShare));
  const openingInternational = Math.max(0, openingWorldwide - openingDomestic);

  const budget = project.budget.total;
  const breakEvenPoint = budget * 2.5;

  const openingToBudget = budget > 0 ? openingWorldwide / budget : 0;
  const openingToBreakEven = breakEvenPoint > 0 ? openingWorldwide / breakEvenPoint : 0;

  const formatMoney = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    return (n / 1_000_000).toFixed(1) + 'M';
  };

  const getPerformance = () => {
    if (openingToBudget >= 3) return { level: 'Blockbuster', color: 'text-green-600', icon: TrendingUp, headline: 'TRADES: "Unprecedented" (meaning everyone updated their email signature)' };
    if (openingToBudget >= 2) return { level: 'Strong Opening', color: 'text-blue-600', icon: TrendingUp, headline: 'A winning debut. Finance is smiling in public.' };
    if (openingToBudget >= 1.5) return { level: 'Solid Start', color: 'text-yellow-600', icon: TrendingUp, headline: 'Respectable numbers and a dangerous amount of confidence.' };
    if (openingToBudget >= 1) return { level: 'Modest Opening', color: 'text-orange-600', icon: TrendingDown, headline: 'Not a crisis. Just a meeting. With a spreadsheet.' };
    return { level: 'Soft Debut', color: 'text-red-600', icon: TrendingDown, headline: 'The posters looked expensive. The receipts looked... educational.' };
  };

  const performance = getPerformance();
  const PerformanceIcon = performance.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Box Office Debut
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">{project.title}</h2>
            <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="outline">Opening Week</Badge>
              <Badge variant="secondary">{project.script?.genre || 'feature'}</Badge>
              <Badge variant="outline">{(project.metrics.theaterCount || 0).toLocaleString()} theaters</Badge>
            </div>
          </div>

          <Card className="border-2 bg-gradient-to-br from-yellow-500/10 via-card to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <PerformanceIcon className={`h-8 w-8 ${performance.color}`} />
                <span className={`text-2xl font-bold ${performance.color}`}>{performance.level}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>{performance.headline}</span>
              </div>
              <div className="mt-4 text-center">
                <div className="text-xs text-muted-foreground">Opening vs budget</div>
                <div className="text-lg font-semibold">{openingToBudget.toFixed(1)}x</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-500">Domestic debut</span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(openingDomestic)}</div>
                <div className="text-xs text-muted-foreground">{Math.round(domesticShare * 100)}% of worldwide</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-600">International debut</span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(openingInternational)}</div>
                <div className="text-xs text-muted-foreground">Outside domestic markets</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">Worldwide debut</span>
                </div>
                <div className="text-2xl font-bold">{formatMoney(openingWorldwide)}</div>
                <div className="text-xs text-muted-foreground">Opening-week gross</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Production budget</span>
                <span className="font-mono">{formatMoney(budget)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Break-even target (rule of thumb)</span>
                <span className="font-mono">{formatMoney(breakEvenPoint)}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Opening vs break-even</span>
                  <span className="font-mono">{Math.round(openingToBreakEven * 100)}%</span>
                </div>
                <Progress value={Math.max(0, Math.min(100, openingToBreakEven * 100))} />
                <div className="text-xs text-muted-foreground">
                  Translation: the movie is either sprinting toward profit, or jogging toward a sequel pitch deck.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Critics</div>
                <div className="text-2xl font-bold">{project.metrics.criticsScore || 50}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Audience</div>
                <div className="text-2xl font-bold">{project.metrics.audienceScore || 50}%</div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={onClose} className="w-full">
            Back to the studio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};