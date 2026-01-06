import React, { useEffect, useMemo, useState } from 'react';
import { GameState, Project } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PerformanceMetrics } from './PerformanceMetrics';
import { SystemIntegration } from './SystemIntegration';
import { MediaEngine } from './MediaEngine';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bug,
  Database,
  Film,
  RadioTower,
  Users,
} from 'lucide-react';

interface GlobalDebugPanelProps {
  gameState: GameState;
  achievementsSummary?: {
    unlocked: number;
    total: number;
  };
  onAdvanceWeek: () => void;
  onAdvanceWeeks: (weeks: number) => void;
  onAdvanceToDate: (week: number, year: number) => void;
  onApplyStatePatch: (updater: (prev: GameState) => GameState) => void;
  onNavigatePhase?: (phase: string) => void;
}

const computeProjectStats = (projects: Project[]) => {
  const total = projects.length;
  const released = projects.filter((p) => p.status === 'released').length;
  const inProduction = projects.filter((p) => p.currentPhase === 'production').length;
  const inDevelopment = projects.filter((p) => p.currentPhase === 'development').length;
  const inMarketing = projects.filter((p) => p.currentPhase === 'marketing').length;

  return {
    total,
    released,
    inProduction,
    inDevelopment,
    inMarketing,
  };
};

export const GlobalDebugPanel: React.FC<GlobalDebugPanelProps> = ({
  gameState,
  achievementsSummary,
  onAdvanceWeek,
  onAdvanceWeeks,
  onAdvanceToDate,
  onApplyStatePatch,
  onNavigatePhase,
}) => {
  const [weeksInput, setWeeksInput] = useState(4);
  const [targetWeek, setTargetWeek] = useState(gameState.currentWeek);
  const [targetYear, setTargetYear] = useState(gameState.currentYear);

  useEffect(() => {
    setTargetWeek(gameState.currentWeek);
    setTargetYear(gameState.currentYear);
  }, [gameState.currentWeek, gameState.currentYear]);

  const projectStats = useMemo(
    () => computeProjectStats(gameState.projects || []),
    [gameState.projects]
  );

  const talentTotal = gameState.talent?.length || 0;
  const busyTalent = gameState.talent?.filter(
    (t) => t.contractStatus && t.contractStatus !== 'available'
  ).length || 0;

  const integration = useMemo(
    () => SystemIntegration.validateGameState(gameState),
    [gameState]
  );

  const mediaStats = useMemo(() => {
    try {
      return MediaEngine.getMediaStats();
    } catch {
      return {
        totalItems: 0,
        queuedEvents: 0,
        entitiesTracked: 0,
        recentActivity: 0,
      };
    }
  }, [gameState.currentWeek, gameState.currentYear]);

  const recentMedia = useMemo(() => {
    try {
      return MediaEngine.getRecentMedia(5);
    } catch {
      return [];
    }
  }, [gameState.currentWeek, gameState.currentYear]);

  const handleFixCommonIssues = () => {
    onApplyStatePatch((prev) => SystemIntegration.fixCommonIssues(prev));
  };

  const handleAdvanceMany = () => {
    const value = Math.floor(weeksInput);
    if (!Number.isFinite(value) || value <= 0) return;
    onAdvanceWeeks(value);
  };

  const handleAdvanceToTarget = () => {
    onAdvanceToDate(targetWeek, targetYear);
  };

  const currentErrors = integration.errors.length;
  const currentWarnings = integration.warnings.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="mr-2 hidden md:inline-flex"
        >
          <Bug className="mr-2 h-4 w-4" />
          Debug HUD
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col space-y-3 sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Developer Debug Panel</SheetTitle>
          <SheetDescription>
            Inspect and manipulate the simulation across all major systems.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">
            Week {gameState.currentWeek}, Year {gameState.currentYear} (Q
            {gameState.currentQuarter})
          </Badge>
          <Badge variant="outline">
            Budget {(gameState.studio.budget / 1_000_000).toFixed(1)}M
          </Badge>
          {gameState.studio.debt && gameState.studio.debt > 0 && (
            <Badge variant="destructive">
              Debt {(gameState.studio.debt / 1_000_000).toFixed(1)}M
            </Badge>
          )}
          <Badge variant="outline">
            Reputation {Math.round(gameState.studio.reputation)}/100
          </Badge>
          <Badge variant="outline">
            Projects {projectStats.total}
          </Badge>
          <Badge variant="outline">
            Talent {talentTotal} ({busyTalent} busy)
          </Badge>
          {achievementsSummary && (
            <Badge variant="outline">
              Achievements {achievementsSummary.unlocked}/
              {achievementsSummary.total}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="media">Media &amp; Market</TabsTrigger>
          </TabsList>

          <ScrollArea className="mt-3 flex-1">
            <div className="space-y-4 pb-6">
              <TabsContent value="overview" className="space-y-4">
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4" />
                      Simulation Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Advance weeks
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={260}
                            value={weeksInput}
                            onChange={(e) =>
                              setWeeksInput(Number(e.target.value) || 0)
                            }
                            className="h-8 w-20 rounded-md border bg-background px-2 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={handleAdvanceMany}
                          >
                            Run
                          </Button>
                          <div className="flex flex-wrap gap-1">
                            {[1, 4, 13, 26, 52].map((w) => (
                              <Button
                                key={w}
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-[11px]"
                                onClick={() => onAdvanceWeeks(w)}
                              >
                                +{w}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Advance to specific week
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={52}
                            value={targetWeek}
                            onChange={(e) =>
                              setTargetWeek(Number(e.target.value) || 1)
                            }
                            className="h-8 w-20 rounded-md border bg-background px-2 text-xs"
                          />
                          <input
                            type="number"
                            value={targetYear}
                            onChange={(e) =>
                              setTargetYear(
                                Number(e.target.value) || gameState.currentYear
                              )
                            }
                            className="h-8 w-24 rounded-md border bg-background px-2 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={handleAdvanceToTarget}
                          >
                            Advance
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={onAdvanceWeek}
                      >
                        Advance 1 week
                      </Button>
                      {onNavigatePhase && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => onNavigatePhase('dashboard')}
                          >
                            Go to Dashboard
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => onNavigatePhase('finance')}
                          >
                            Go to Finance
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      Studio &amp; Project Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Active projects
                      </div>
                      <div className="font-semibold">
                        {projectStats.total}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {projectStats.inDevelopment} in development,{' '}
                        {projectStats.inProduction} in production
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Released
                      </div>
                      <div className="font-semibold">
                        {projectStats.released}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {projectStats.inMarketing} in marketing
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Talent
                      </div>
                      <div className="font-semibold">{talentTotal}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {busyTalent} currently busy
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <PerformanceMetrics gameState={gameState} />
              </TabsContent>

              <TabsContent value="systems" className="space-y-4">
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <Badge
                        variant={currentErrors === 0 ? 'outline' : 'destructive'}
                      >
                        Errors: {currentErrors}
                      </Badge>
                      <Badge
                        variant={
                          currentWarnings === 0 ? 'outline' : 'secondary'
                        }
                      >
                        Warnings: {currentWarnings}
                      </Badge>
                      <Badge variant="outline">
                        Checks: {integration.healthChecks.length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={handleFixCommonIssues}
                      >
                        Auto-fix common issues
                      </Button>
                    </div>

                    {integration.errors.length > 0 && (
                      <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
                        <div className="flex items-center gap-1 font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Errors
                        </div>
                        {integration.errors.slice(0, 5).map((err, idx) => (
                          <div key={idx} className="text-destructive">
                            • {err}
                          </div>
                        ))}
                      </div>
                    )}

                    {integration.warnings.length > 0 && (
                      <div className="space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-2 text-xs">
                        <div className="flex items-center gap-1 font-medium text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          Warnings
                        </div>
                        {integration.warnings.slice(0, 5).map((warn, idx) => (
                          <div key={idx}>• {warn}</div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1 text-xs">
                      <div className="font-medium text-muted-foreground">
                        Recent checks
                      </div>
                      <div className="space-y-1">
                        {integration.healthChecks
                          .slice(-5)
                          .reverse()
                          .map((check, idx) => (
                            <div
                              key={`${check.system}-${idx}`}
                              className="flex items-start justify-between gap-2 rounded-md border bg-background/60 px-2 py-1.5"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">
                                  {check.system}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {check.message}
                                </span>
                              </div>
                              <span
                                className={`mt-0.5 inline-flex h-5 items-center rounded-full px-2 text-[10px] uppercase tracking-wide ${
                                  check.status === 'healthy'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : check.status === 'warning'
                                    ? 'bg-yellow-500/10 text-yellow-700'
                                    : 'bg-destructive/10 text-destructive'
                                }`}
                              >
                                {check.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <RadioTower className="h-4 w-4" />
                      Media System
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                      <div>
                        <div className="text-muted-foreground">
                          Total stories
                        </div>
                        <div className="font-semibold">
                          {mediaStats.totalItems || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Queued events
                        </div>
                        <div className="font-semibold">
                          {mediaStats.queuedEvents || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Tracked entities
                        </div>
                        <div className="font-semibold">
                          {mediaStats.entitiesTracked || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Recent activity
                        </div>
                        <div className="font-semibold">
                          {mediaStats.recentActivity || 0}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-medium text-muted-foreground">
                        Recent headlines
                      </div>
                      {recentMedia.length === 0 && (
                        <div className="text-muted-foreground">
                          No media items yet. Once the simulation runs, stories
                          will appear here.
                        </div>
                      )}
                      {recentMedia.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-2 rounded-md border bg-background/60 px-2 py-1.5"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {item.headline}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {item.source.name} • Week {item.publishDate.week},{' '}
                              {item.publishDate.year}
                            </span>
                          </div>
                          <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] uppercase tracking-wide">
                            {item.sentiment}
                          </span>
                        </div>
                      ))}
                    </div>

                    {onNavigatePhase && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => onNavigatePhase('media')}
                        >
                          <Film className="mr-1 h-3 w-3" />
                          Open Media Relations
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => onNavigatePhase('competition')}
                        >
                          <Users className="mr-1 h-3 w-3" />
                          AI Competition
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => onNavigatePhase('topfilms')}
                        >
                          <BarChart3 className="mr-1 h-3 w-3" />
                          Top Films
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};