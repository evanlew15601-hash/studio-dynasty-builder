import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project } from '@/types/game';
import type { SeasonData, EpisodeData } from '@/types/streamingTypes';
import { BoxOfficeSystem } from './BoxOfficeSystem';
import { TVRatingsSystem } from './TVRatingsSystem';
import { Clock, FastForward, DollarSign, Star, Settings2, Film, Tv, MonitorPlay } from 'lucide-react';
import { useGameStore } from '@/game/store';

interface DebugControlPanelProps {
  onAdvanceWeeks: (weeks: number) => void;
  onAdvanceToDate: (week: number, year: number) => void;
}

export const DebugControlPanel: React.FC<DebugControlPanelProps> = ({
  onAdvanceWeeks,
  onAdvanceToDate,
}) => {
  const gameState = useGameStore((s) => s.game);
  const setGameState = useGameStore((s) => s.setGameState);
  const replaceProject = useGameStore((s) => s.replaceProject);

  const time = gameState
    ? {
        currentWeek: gameState.currentWeek,
        currentYear: gameState.currentYear,
        currentQuarter: gameState.currentQuarter,
      }
    : { currentWeek: 1, currentYear: 0, currentQuarter: 1 };

  const studioBudget = gameState?.studio.budget ?? 0;
  const studioDebt = gameState?.studio.debt ?? 0;
  const studioReputation = gameState?.studio.reputation ?? 0;
  const projects = gameState?.projects ?? [];
  const [weeksInput, setWeeksInput] = useState(4);
  const [targetWeek, setTargetWeek] = useState(time.currentWeek);
  const [targetYear, setTargetYear] = useState(time.currentYear);
  const [budgetMillions, setBudgetMillions] = useState(
    Math.round(studioBudget / 1_000_000)
  );
  const [debtMillions, setDebtMillions] = useState(
    Math.round((studioDebt || 0) / 1_000_000)
  );
  const [reputation, setReputation] = useState(
    Math.round(studioReputation)
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || null;
  const isTVProject =
    !!selectedProject &&
    (selectedProject.type === 'series' || selectedProject.type === 'limited-series');
  const isFilmProject =
    !!selectedProject &&
    !(selectedProject.type === 'series' || selectedProject.type === 'limited-series');

  useEffect(() => {
    setTargetWeek(time.currentWeek);
    setTargetYear(time.currentYear);
  }, [time.currentWeek, time.currentYear]);

  useEffect(() => {
    setBudgetMillions(Math.round(studioBudget / 1_000_000));
  }, [studioBudget]);

  useEffect(() => {
    setDebtMillions(Math.round((studioDebt || 0) / 1_000_000));
  }, [studioDebt]);

  useEffect(() => {
    setReputation(Math.round(studioReputation));
  }, [studioReputation]);

  const handleAdvanceClick = (weeks: number) => {
    if (!Number.isFinite(weeks) || weeks <= 0) return;
    onAdvanceWeeks(Math.floor(weeks));
  };

  const handleAdvanceToTarget = () => {
    onAdvanceToDate(targetWeek, targetYear);
  };

  const handleBudgetApply = () => {
    const value = Number.isFinite(budgetMillions) ? budgetMillions : 0;
    const budget = Math.max(0, value * 1_000_000);

    setGameState((prev) => ({
      ...prev,
      studio: { ...prev.studio, budget },
    }));
  };

  const handleDebtApply = () => {
    const value = Number.isFinite(debtMillions) ? debtMillions : 0;
    const debt = Math.max(0, value * 1_000_000);

    setGameState((prev) => ({
      ...prev,
      studio: { ...prev.studio, debt },
    }));
  };

  const handleReputationApply = () => {
    const value = Number.isFinite(reputation) ? reputation : 0;
    const next = Math.max(0, Math.min(100, value));

    setGameState((prev) => ({
      ...prev,
      studio: { ...prev.studio, reputation: next },
    }));
  };

  const createSeasonWithEpisodes = (
    baseProject: Project,
    episodesToRelease: number
  ): Project => {
    const releaseWeek = time.currentWeek;
    const releaseYear = time.currentYear;

    // Initialize streaming metrics for the show
    const airingBase = TVRatingsSystem.initializeAiring(
      { ...baseProject },
      releaseWeek,
      releaseYear
    );

    const baseViews =
      airingBase.metrics?.streaming?.viewsFirstWeek || 1_000_000;

    const episodeCount = baseProject.script?.estimatedRuntime
      ? Math.ceil(baseProject.script.estimatedRuntime / 45)
      : 10;

    const runtime = baseProject.script?.estimatedRuntime || 45;
    const episodes: EpisodeData[] = Array.from(
      { length: episodeCount },
      (_, i): EpisodeData => ({
        episodeNumber: i + 1,
        seasonNumber: 1,
        title: `Episode ${i + 1}`,
        runtime,
        viewers: 0,
        completionRate: 0,
        averageWatchTime: 0,
        replayViews: 0,
        criticsScore: undefined,
        audienceScore: undefined,
        socialMentions: 0,
        productionCost: (baseProject.budget.total || 0) / episodeCount,
        weeklyViews: [],
        cumulativeViews: 0,
        viewerRetention: 100,
        airDate: undefined,
      })
    );

    // Populate released episodes with basic performance
    let totalViewers = 0;
    let totalCompletion = 0;

    for (let i = 0; i < episodeCount; i++) {
      const episode = episodes[i];
      if (!episode) continue;

      if (i < episodesToRelease) {
        const episodeMultiplier =
          i === 0 ? 1.0 : Math.max(0.6, 1 - i * 0.05);
        const viewers = Math.floor(baseViews * episodeMultiplier);
        const completionRate = Math.max(60, 85 - i * 2);
        const averageWatchTime = Math.floor(
          episode.runtime * (completionRate / 100)
        );
        const replayViews = Math.floor(viewers * 0.15);

        episode.viewers = viewers;
        episode.completionRate = completionRate;
        episode.averageWatchTime = averageWatchTime;
        episode.replayViews = replayViews;
        episode.cumulativeViews = viewers + replayViews;
        episode.airDate = { week: releaseWeek, year: releaseYear };
        episode.weeklyViews = [viewers];
        episode.viewerRetention =
          i === 0 ? 100 : Math.max(70, 100 - i * 3);
        episode.criticsScore = Math.floor(Math.random() * 30) + 60;
        episode.audienceScore = Math.floor(Math.random() * 30) + 65;
        episode.socialMentions = Math.floor(viewers / 10_000);

        totalViewers += viewers;
        totalCompletion += completionRate;
      } else {
        // Not yet aired
        episode.viewers = 0;
        episode.completionRate = 0;
        episode.averageWatchTime = 0;
        episode.replayViews = 0;
        episode.cumulativeViews = 0;
        episode.weeklyViews = [];
        episode.viewerRetention = 0;
      }
    }

    const averageViewers =
      episodesToRelease > 0 ? Math.floor(totalViewers / episodesToRelease) : 0;
    const seasonCompletionRate =
      episodesToRelease > 0
        ? Math.floor(totalCompletion / episodesToRelease)
        : 0;

    const season: SeasonData = {
      seasonNumber: 1,
      totalEpisodes: episodeCount,
      episodesAired: episodesToRelease,
      releaseFormat:
        episodesToRelease >= episodeCount
          ? 'binge'
          : episodesToRelease > 1
          ? 'batch'
          : 'weekly',
      averageViewers,
      seasonCompletionRate,
      seasonDropoffRate:
        seasonCompletionRate > 0 ? 100 - seasonCompletionRate : 0,
      totalBudget: baseProject.budget.total || 0,
      spentBudget: baseProject.budget.total || 0,
      productionStatus: 'complete',
      premiereDate:
        episodesToRelease > 0
          ? { week: releaseWeek, year: releaseYear }
          : undefined,
      finaleDate:
        episodesToRelease >= episodeCount
          ? { week: releaseWeek, year: releaseYear }
          : undefined,
      episodes,
    };

    return {
      ...airingBase,
      currentPhase: 'release',
      status: 'released',
      phaseDuration: 0,
      seasons: [season],
      currentSeason: 1,
      totalOrderedSeasons: 1,
      releaseFormat: season.releaseFormat,
    };
  };

  const handleSkipToTheatrical = () => {
    if (!selectedProject || !isFilmProject) return;

    const releaseWeek = time.currentWeek;
    const releaseYear = time.currentYear;

    let updated = BoxOfficeSystem.initializeRelease(
      { ...selectedProject },
      releaseWeek,
      releaseYear
    );

    updated = {
      ...updated,
      currentPhase: 'release',
      phaseDuration: 0,
      readyForRelease: true,
    } as Project;

    replaceProject(updated);
  };

  const handleSkipToTvDebut = () => {
    if (!selectedProject || !isTVProject) return;

    const updated = createSeasonWithEpisodes(selectedProject, 1);
    replaceProject(updated);
  };

  const handleSkipToStreamingDebut = () => {
    if (!selectedProject || !isTVProject) return;

    const episodeCount = selectedProject.script?.estimatedRuntime
      ? Math.ceil(selectedProject.script.estimatedRuntime / 45)
      : 10;
    const updated = createSeasonWithEpisodes(selectedProject, episodeCount);
    replaceProject(updated);
  };

  return (
    <Card className="card-premium border border-dashed border-primary/30 bg-background/80">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings2 size={16} className="text-primary" />
          Developer Debug Tools
          <Badge
            variant="outline"
            className="ml-2 text-[10px] uppercase tracking-wide"
          >
            Time &amp; State
          </Badge>
        </CardTitle>
        <div className="text-[11px] text-muted-foreground">
          Y{time.currentYear} • W{time.currentWeek} • Q{time.currentQuarter}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Time Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FastForward size={14} />
              Fast-forward weeks
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={260}
                value={weeksInput}
                onChange={(e) => setWeeksInput(Number(e.target.value) || 0)}
                className="h-8 w-20 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => handleAdvanceClick(weeksInput)}
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
                    onClick={() => handleAdvanceClick(w)}
                  >
                    +{w}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock size={14} />
              Jump to specific week
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={52}
                value={targetWeek}
                onChange={(e) => setTargetWeek(Number(e.target.value) || 1)}
                className="h-8 w-20 text-xs"
              />
              <Input
                type="number"
                value={targetYear}
                onChange={(e) =>
                  setTargetYear(Number(e.target.value) || time.currentYear)
                }
                className="h-8 w-24 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleAdvanceToTarget}
              >
                Advance to date
              </Button>
            </div>
          </div>
        </div>

        {/* Studio State Tweaks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign size={14} />
              Budget (M)
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={budgetMillions}
                onChange={(e) => setBudgetMillions(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleBudgetApply}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign size={14} />
              Debt (M)
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={debtMillions}
                onChange={(e) => setDebtMillions(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleDebtApply}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Star size={14} />
              Reputation
            </div>
            <div className="flex items-center gap-2">
              <Slider
                value={[reputation]}
                min={0}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(values) => setReputation(values[0] ?? 0)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={reputation}
                onChange={(e) => setReputation(Number(e.target.value) || 0)}
                className="h-8 w-16 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleReputationApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Project Debug Shortcuts */}
        {projects.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Film size={14} />
              Project debut shortcuts
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} •{' '}
                        {p.type === 'series' || p.type === 'limited-series'
                          ? 'TV'
                          : 'Film'}{' '}
                        • {p.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={!isFilmProject}
                  onClick={handleSkipToTheatrical}
                >
                  <Film size={12} className="mr-1" />
                  Skip to theatrical debut
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={!isTVProject}
                  onClick={handleSkipToTvDebut}
                >
                  <Tv size={12} className="mr-1" />
                  Skip to TV debut (weekly)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={!isTVProject}
                  onClick={handleSkipToStreamingDebut}
                >
                  <MonitorPlay size={12} className="mr-1" />
                  Skip to streaming debut (season)
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};