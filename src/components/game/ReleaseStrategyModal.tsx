import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';
import type { Project, ReleaseStrategy } from '@/types/game';
import { ReleaseSystem } from './ReleaseSystem';
import { CalendarManager } from './CalendarManager';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/game/store';
import { getStreamingProviders } from '@/data/ProviderDealsDatabase';
import { getModBundle } from '@/utils/moddingStore';
import { FinancialEngine } from './FinancialEngine';

interface ReleaseStrategyModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseStrategyModal: React.FC<ReleaseStrategyModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  const gameState = useGameStore((s) => s.game);
  const updateProject = useGameStore((s) => s.updateProject);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<{ week: number; year: number } | null>(null);
  const [selectedReleaseType, setSelectedReleaseType] = useState<ReleaseStrategy['type']>('wide');
  const [selectedStreamingProviderId, setSelectedStreamingProviderId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (!project) {
      setSelectedDate(null);
      setSelectedReleaseType('wide');
      setSelectedStreamingProviderId('');
      return;
    }

    if (project.scheduledReleaseWeek && project.scheduledReleaseYear) {
      setSelectedDate({ week: project.scheduledReleaseWeek, year: project.scheduledReleaseYear });
    } else {
      setSelectedDate(null);
    }

    if (project.type !== 'series' && project.type !== 'limited-series') {
      setSelectedReleaseType(project.releaseStrategy?.type || 'wide');
    }

    setSelectedStreamingProviderId(project.streamingPremiereDeal?.providerId || '');
  }, [isOpen, project?.id, project?.scheduledReleaseWeek, project?.scheduledReleaseYear, project?.releaseStrategy?.type, project?.streamingPremiereDeal?.providerId, project?.type]);

  const mods = useMemo(() => getModBundle(), []);
  const streamingProviders = useMemo(() => getStreamingProviders(mods), [mods]);

  const releaseTypeOptions = useMemo(
    () =>
      [
        { type: 'wide' as const, label: 'Wide', description: 'Big opening with thousands of screens.' },
        { type: 'limited' as const, label: 'Limited', description: 'Selective rollout for buzz and word-of-mouth.' },
        { type: 'platform' as const, label: 'Platform', description: 'Start small, expand if reviews land.' },
        { type: 'festival' as const, label: 'Festival', description: 'Premiere on the circuit, prestige-first.' },
        { type: 'streaming' as const, label: 'Direct-to-Streaming', description: 'Premiere on a platform from day one.' },
      ],
    []
  );

  if (!project || !gameState) return null;

  const currentTime = {
    currentWeek: gameState.currentWeek,
    currentYear: gameState.currentYear,
    currentQuarter: Math.ceil(gameState.currentWeek / 13)
  };

  // Get optimal windows - different messaging for TV vs films
  const isTV = project.type === 'series' || project.type === 'limited-series';
  const isStreamingFilm = !isTV && selectedReleaseType === 'streaming';
  const validation = ReleaseSystem.validateFilmForRelease(project);

  const signedStreamingDeal = project.streamingPremiereDeal;
  const streamingDealMissing = isStreamingFilm && !signedStreamingDeal;

  const computeStreamingPremiereDeal = (provider: (typeof streamingProviders)[number]) => {
    const quality = project.script?.quality ?? 60;
    const qualityMultiplier = quality / 60;
    const genre = project.script?.genre || '';

    const preferenceMultiplier = provider.requirements.preferredGenres?.includes(genre as any)
      ? 1.08
      : 0.95;

    const blockbusterMultiplier = ['action', 'sci-fi', 'fantasy', 'superhero'].includes(genre) ? 1.12 : 1.0;

    const licenseFeeMultiplier = 8;

    const upfrontPayment = Math.floor(
      provider.averageRate *
        licenseFeeMultiplier *
        qualityMultiplier *
        preferenceMultiplier *
        blockbusterMultiplier *
        provider.bonusMultiplier
    );

    const marketingSupport = Math.floor(upfrontPayment * 0.15);

    const expectedViewersBase = provider.marketShare * provider.expectations.viewersPerShare;
    const expectedViewers = Math.floor(expectedViewersBase * 0.8 * qualityMultiplier * preferenceMultiplier);

    return { upfrontPayment, marketingSupport, expectedViewers };
  };

  const signStreamingPremiereDeal = (providerId: string) => {
    const provider = streamingProviders.find(p => p.id === providerId);
    if (!provider) return;

    const terms = computeStreamingPremiereDeal(provider);

    updateProject(project.id, {
      streamingPremiereDeal: {
        providerId: provider.id,
        signedWeek: gameState.currentWeek,
        signedYear: gameState.currentYear,
        upfrontPayment: terms.upfrontPayment,
        marketingSupport: terms.marketingSupport
      },
      distributionStrategy: project.distributionStrategy
        ? {
            ...project.distributionStrategy,
            primary: {
              platform: provider.name,
              type: 'streaming',
              revenue: {
                type: 'subscription-share',
                studioShare: 75,
                minimumGuarantee: terms.upfrontPayment
              }
            }
          }
        : {
            primary: {
              platform: provider.name,
              type: 'streaming',
              revenue: {
                type: 'subscription-share',
                studioShare: 75,
                minimumGuarantee: terms.upfrontPayment
              }
            },
            international: [],
            windows: [],
            marketingBudget: 0
          }
    });

    updateBudget(terms.upfrontPayment);

    FinancialEngine.recordTransaction(
      'revenue',
      'streaming',
      terms.upfrontPayment,
      gameState.currentWeek,
      gameState.currentYear,
      `Streaming premiere deal upfront - ${provider.name} - ${project.title}`,
      project.id
    );

    setSelectedStreamingProviderId(provider.id);

    toast({
      title: 'Streaming Deal Signed',
      description: `${provider.name} paid ${(terms.upfrontPayment / 1000000).toFixed(1)}M upfront for the premiere.`
    });
  };

  const buildReleaseStrategy = (week: number, year: number): ReleaseStrategy => {
    const approxDate = new Date(year, 0, 1 + Math.max(0, week - 1) * 7);

    const theatersCount = (() => {
      switch (selectedReleaseType) {
        case 'wide':
          return 3200;
        case 'limited':
          return 600;
        case 'platform':
          return 150;
        case 'festival':
          return 80;
        case 'streaming':
        default:
          return 0;
      }
    })();

    return {
      type: selectedReleaseType,
      theatersCount,
      streamingProviderId:
        selectedReleaseType === 'streaming' ? (project.streamingPremiereDeal?.providerId || undefined) : undefined,
      premiereDate: approxDate,
      rolloutPlan: [],
      specialEvents: [],
      pressStrategy: {
        reviewScreenings: selectedReleaseType === 'festival' ? 6 : 2,
        pressJunkets: selectedReleaseType === 'wide' ? 4 : 2,
        interviews: selectedReleaseType === 'streaming' ? 2 : 3,
        expectedCriticalReception: project.metrics?.criticsScore ?? project.script?.quality ?? 60,
      },
    };
  };

  const marketingLeadWeeks = project.marketingCampaign
    ? Math.max(1, project.marketingCampaign.weeksRemaining)
    : 4;

  const baseWindows = [
    { week: 20, year: gameState.currentYear, season: isTV ? 'Summer TV Season' : 'Summer Blockbuster', multiplier: 1.3 },
    { week: 47, year: gameState.currentYear, season: isTV ? 'Fall TV Season' : 'Holiday Season', multiplier: 1.2 },
    { week: 8, year: gameState.currentYear + 1, season: isTV ? 'Winter Premieres' : 'Early Year', multiplier: 0.9 },
    { week: 35, year: gameState.currentYear, season: isTV ? 'Fall Premieres' : 'Back to School', multiplier: 1.1 }
  ];

  const getCalendarValidation = (week: number, year: number) =>
    CalendarManager.validateRelease(project.id, week, year, currentTime, gameState.projects);

  const earliestAvailable = (() => {
    const currentAbs = (gameState.currentYear * 52) + gameState.currentWeek;
    for (let delta = 1; delta <= 104; delta++) {
      const abs = currentAbs + delta;
      const year = Math.floor((abs - 1) / 52);
      const week = ((abs - 1) % 52) + 1;
      const v = getCalendarValidation(week, year);
      if (v.canRelease) {
        return {
          week,
          year,
          season: 'Earliest Available',
          multiplier: 1.0,
          awardEligibility: v.awardEligibility,
        };
      }
    }
    return null;
  })();

  const optimalWindows = [
    ...(earliestAvailable ? [earliestAvailable] : []),
    ...baseWindows
      .map(w => {
        const v = getCalendarValidation(w.week, w.year);
        return { ...w, awardEligibility: v.awardEligibility, canRelease: v.canRelease };
      })
      .filter(w => w.canRelease)
  ].filter((w, idx, arr) => arr.findIndex(o => o.week === w.week && o.year === w.year) === idx);

  const selectedCalendarValidation = selectedDate
    ? getCalendarValidation(selectedDate.week, selectedDate.year)
    : null;

  const handleClearSchedule = () => {
    CalendarManager.clearFilmEvents(project.id);

    const clearingDuringMarketing = project.currentPhase === 'marketing';

    updateProject(project.id, {
      scheduledReleaseWeek: undefined,
      scheduledReleaseYear: undefined,
      releaseStrategy: undefined,
      status: (clearingDuringMarketing ? 'marketing' : 'ready-for-release') as any,
      readyForRelease: !clearingDuringMarketing,
      ...(clearingDuringMarketing
        ? {}
        : {
            currentPhase: 'release',
            phaseDuration: 0,
          }),
    });

    toast({
      title: "Release Schedule Cleared",
      description: `Cleared planned ${isTV ? 'air date' : 'release date'} for ${project.title}.`,
    });

    onClose();
  };

  const handleScheduleRelease = () => {
    if (!selectedDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a release date first.",
        variant: "destructive"
      });
      return;
    }

    if (streamingDealMissing) {
      toast({
        title: 'Streaming Deal Required',
        description: 'Direct-to-streaming premieres require signing a streaming premiere deal first.',
        variant: 'destructive'
      });
      return;
    }

    // Debug: capture state before attempting release
    console.log('RELEASE_MODAL: scheduling', {
      projectId: project.id,
      type: project.type,
      phase: project.currentPhase,
      status: project.status,
      selectedDate,
      validation
    });

    const result = ReleaseSystem.scheduleRelease(
      project,
      selectedDate.week,
      selectedDate.year,
      currentTime,
      gameState.projects
    );

    console.log('RELEASE_MODAL: schedule result', result);

    if (result.success) {
      const schedulingDuringMarketing =
        project.currentPhase === 'marketing' &&
        !!project.marketingCampaign &&
        project.marketingCampaign.weeksRemaining > 0;

      updateProject(project.id, {
        releaseStrategy: isTV ? project.releaseStrategy : buildReleaseStrategy(result.releaseWeek, result.releaseYear),
        scheduledReleaseWeek: result.releaseWeek,
        scheduledReleaseYear: result.releaseYear,
        status: 'scheduled-for-release',
        readyForRelease: false,
        ...(!isTV && selectedReleaseType !== 'streaming' ? { streamingPremiereDeal: undefined } : {}),
        ...(schedulingDuringMarketing
          ? {}
          : {
              currentPhase: 'release',
              phaseDuration: -1,
            }),
      });

      toast({
        title: "Release Scheduled!",
        description: result.message,
      });

      onClose();
    } else {
      console.error('RELEASE_MODAL: scheduling failed', result);
      toast({
        title: "Release Failed",
        description: result.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {project.type === 'series' || project.type === 'limited-series' ? 'Air Date Strategy' : 'Release Strategy'} - {project.title}
          </DialogTitle>
          <DialogDescription>
            {project.marketingCampaign
              ? project.marketingCampaign.weeksRemaining > 0
                ? `Marketing campaign has ${project.marketingCampaign.weeksRemaining} weeks remaining. Release must be at least ${marketingLeadWeeks} weeks away.`
                : 'Marketing campaign is complete. You can release as soon as next week.'
              : (isTV ? 'TV premieres require at least 4 weeks of lead time for marketing.' : 'Films require at least 4 weeks of lead time for marketing.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{project.type === 'series' || project.type === 'limited-series' ? 'Series Readiness' : 'Film Readiness'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marketing Buzz</p>
                  <p className="font-semibold">
                    {project.marketingData?.currentBuzz || 0}/{isTV ? 250 : 150}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={project.status === 'completed' ? 'default' : 'outline'}>
                    {project.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Release Type (Films) */}
          {!isTV && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Release Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {releaseTypeOptions.map((opt) => (
                    <Button
                      key={opt.type}
                      type="button"
                      variant={selectedReleaseType === opt.type ? 'default' : 'outline'}
                      className="h-auto py-3 justify-start"
                      onClick={() => setSelectedReleaseType(opt.type)}
                    >
                      <div className="text-left">
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Streaming premiere deal (Direct-to-Streaming films) */}
          {!isTV && selectedReleaseType === 'streaming' && (
            <Card className={streamingDealMissing ? 'border-destructive/20' : undefined}>
              <CardHeader>
                <CardTitle className="text-lg">Streaming Premiere Deal</CardTitle>
              </CardHeader>
              <CardContent>
                {signedStreamingDeal ? (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">
                          {streamingProviders.find(p => p.id === signedStreamingDeal.providerId)?.name ?? signedStreamingDeal.providerId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Signed Y{signedStreamingDeal.signedYear}W{signedStreamingDeal.signedWeek} • Upfront ${(signedStreamingDeal.upfrontPayment / 1000000).toFixed(1)}M
                        </div>
                      </div>
                      <Badge variant="secondary">Signed</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This deal determines your premiere platform. You can schedule the release once a date is selected.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Direct-to-streaming releases require signing a premiere deal first.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {streamingProviders.map((provider) => {
                        const terms = computeStreamingPremiereDeal(provider);
                        const issues: string[] = [];

                        const quality = project.script?.quality ?? 60;
                        if (quality < provider.requirements.minQuality) {
                          issues.push(`Requires quality ${provider.requirements.minQuality}+`);
                        }

                        const minBudget = provider.requirements.minBudget;
                        if (typeof minBudget === 'number' && project.budget.total < minBudget) {
                          issues.push(`Requires budget ${(minBudget / 1000000).toFixed(0)}M+`);
                        }

                        const selected = selectedStreamingProviderId === provider.id;

                        return (
                          <Card
                            key={provider.id}
                            className={`transition-all ${selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'}`}
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded ${provider.color}`} />
                                <div className="font-semibold">{provider.name}</div>
                                <Badge variant="outline" className="ml-auto">
                                  {provider.marketShare}% share
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-muted-foreground">Upfront</div>
                                  <div className="font-medium">${(terms.upfrontPayment / 1000000).toFixed(1)}M</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Expected viewers</div>
                                  <div className="font-medium">{(terms.expectedViewers / 1000000).toFixed(1)}M</div>
                                </div>
                              </div>

                              {issues.length > 0 && (
                                <div className="text-xs text-muted-foreground">{issues.join(' • ')}</div>
                              )}

                              <Button
                                type="button"
                                className="w-full"
                                size="sm"
                                variant={selected ? 'default' : 'outline'}
                                disabled={issues.length > 0}
                                onClick={() => signStreamingPremiereDeal(provider.id)}
                              >
                                Sign deal
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Readiness Issues */}
          {!validation.canRelease && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg">Readiness Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {validation.errors.map((e, idx) => (
                    <li key={idx} className="text-sm text-destructive">{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Optimal Release Windows */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommended Release Windows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimalWindows.map((window, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedDate?.week === window.week && selectedDate?.year === window.year
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedDate({ week: window.week, year: window.year })}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{window.season}</h4>
                          <p className="text-sm text-muted-foreground">
                            Year {window.year}, Week {window.week}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {window.multiplier}x {isTV || isStreamingFilm ? 'Viewership' : 'Box Office'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {((window.year * 52 + window.week) - (gameState.currentYear * 52 + gameState.currentWeek))} weeks away
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marketing Summary */}
          {project.marketingData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Marketing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="font-semibold flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${(project.marketingData.totalSpent / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Buzz</p>
                    <p className="font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {project.marketingData.currentBuzz}/{isTV ? 250 : 150}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {project.status === 'scheduled-for-release' && project.scheduledReleaseWeek && project.scheduledReleaseYear && (
                <Button variant="destructive" onClick={handleClearSchedule}>
                  Clear Schedule
                </Button>
              )}
            </div>
            <Button 
              onClick={handleScheduleRelease}
              disabled={!selectedDate || !validation.canRelease || !selectedCalendarValidation?.canRelease || streamingDealMissing}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {project.type === 'series' || project.type === 'limited-series' ? 'Schedule Air Date' : 'Schedule Release'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};