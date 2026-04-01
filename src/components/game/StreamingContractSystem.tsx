import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { StreamingContract } from '@/types/streamingTypes';
import { PostTheatricalRelease, Project } from '@/types/game';
import { Monitor, Tv, Award } from 'lucide-react';
import { useGameStore } from '@/game/store';
import {
  getAllProviders,
  getCableProviders,
  getStreamingProviders,
  getProviderProfile,
  type DealKind,
  type ProviderDealProfile,
} from '@/data/ProviderDealsDatabase';
import { getModBundle } from '@/utils/moddingStore';
import { FinancialEngine } from './FinancialEngine';
import { stableInt } from '@/utils/stableRandom';
import { triggerDateFromWeekYear } from '@/utils/gameTime';

interface StreamingContractSystemProps {}

export const StreamingContractSystem: React.FC<StreamingContractSystemProps> = () => {
  const gameState = useGameStore((s) => s.game);
  const updateProject = useGameStore((s) => s.updateProject);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const { toast } = useToast();
  const [, setSelectedProject] = useState<Project | null>(null);
  const mods = useMemo(() => getModBundle(), []);

  if (!gameState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Streaming &amp; TV Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading deals...</p>
        </CardContent>
      </Card>
    );
  }

  const isTVProject = (project: Project) => project.type === 'series' || project.type === 'limited-series';
  const isFilmProject = (project: Project) => project.type === 'feature' || project.type === 'documentary';

  const streamingProviders = (() => {
    const base = getStreamingProviders(mods);

    if (gameState.dlc?.streamingWars === true) {
      const rivalIds = new Set(
        (gameState.platformMarket?.rivals ?? [])
          .filter((r) => r && r.status !== 'collapsed')
          .map((r) => r.id)
      );

      return base.filter((p) => rivalIds.has(p.id));
    }

    return base;
  })();

  // Get projects ready for contracts
  const getEligibleProjects = () => {
    return gameState.projects.filter(p => {
      if (!(isTVProject(p) || isFilmProject(p))) return false;
      if (p.status !== 'released') return false;

      // Allow re-selling after a contract window ends.
      const hasActiveContract = p.streamingContract?.status === 'active';
      if (hasActiveContract) return false;

      // Avoid allowing streaming/cable deals while a film is still in theaters.
      if (isFilmProject(p) && p.metrics?.inTheaters === true) return false;

      return true;
    });
  };

  // Get active contracts
  const getActiveContracts = () => {
    return gameState.projects.filter(p => 
      p.streamingContract && 
      p.streamingContract.status === 'active'
    );
  };

  const getPlatform = (dealKind: DealKind, platformId: string) => {
    return getProviderProfile(dealKind, platformId, mods);
  };

  const addWeeks = (startWeek: number, startYear: number, duration: number) => {
    const startAbs = startYear * 52 + startWeek;
    const endAbs = startAbs + duration;

    let endYear = Math.floor(endAbs / 52);
    let endWeek = endAbs % 52;

    if (endWeek === 0) {
      endWeek = 52;
      endYear -= 1;
    }

    return { endWeek, endYear };
  };

  const getDealIssues = (project: Project, provider: ProviderDealProfile) => {
    const issues: string[] = [];

    const quality = project.script?.quality ?? 60;
    if (quality < provider.requirements.minQuality) {
      issues.push(`Requires quality ${provider.requirements.minQuality}+`);
    }

    const minBudget = provider.requirements.minBudget;
    if (typeof minBudget === 'number' && project.budget?.total < minBudget) {
      issues.push(`Requires budget ${(minBudget / 1000000).toFixed(0)}M+`);
    }

    return issues;
  };

  const generateContract = (
    project: Project,
    platformId: string,
    dealKind: DealKind
  ): StreamingContract => {
    const platform = getPlatform(dealKind, platformId);

    if (!platform) {
      throw new Error(`Unknown platform: ${platformId}`);
    }

    const idSuffix = stableInt(
      `${gameState.universeSeed ?? gameState.studio.id ?? 'seed'}|contract|${dealKind}|${project.id}|${platformId}|${gameState.currentYear}:W${gameState.currentWeek}`,
      1,
      999999999
    );

    const quality = project.script?.quality ?? 60;
    const qualityMultiplier = quality / 60;
    const genre = project.script?.genre || '';

    const preferenceMultiplier = platform.requirements.preferredGenres?.includes(genre as any)
      ? 1.08
      : 0.95;

    const blockbusterMultiplier = ['action', 'sci-fi', 'fantasy', 'superhero'].includes(genre) ? 1.12 : 1.0;

    const duration = (() => {
      if (isTVProject(project)) return dealKind === 'cable' ? 26 : 52;
      return 26;
    })();

    const { endWeek, endYear } = addWeeks(gameState.currentWeek, gameState.currentYear, duration);

    const expectedViewersBase = platform.marketShare * platform.expectations.viewersPerShare;

    if (isTVProject(project)) {
      const episodeCount =
        project.episodeCount ||
        project.seasons?.[0]?.totalEpisodes ||
        (project.type === 'limited-series' ? 8 : 13);

      const rateMultiplier = dealKind === 'cable' ? 0.65 : 1.0;
      const episodeRate = Math.floor(
        platform.averageRate * qualityMultiplier * preferenceMultiplier * blockbusterMultiplier * rateMultiplier
      );

      const upfrontPayment = Math.floor(
        episodeRate *
          episodeCount *
          (dealKind === 'cable' ? 0.35 : 0.5) *
          platform.bonusMultiplier
      );

      const expectedViewers = Math.floor(
        expectedViewersBase * qualityMultiplier * preferenceMultiplier * (dealKind === 'cable' ? 0.8 : 1)
      );

      const expectedCompletionRate = platform.expectations.completionRate;
      const expectedSubscriberGrowth = Math.floor(expectedViewers * platform.expectations.subscriberGrowthRate);

      return {
        id: `contract:${dealKind}:${gameState.currentYear}:W${gameState.currentWeek}:${idSuffix}`,
        dealKind,
        platformId,
        persistentRights: false,
        platform: platformId as any,
        name: `${platform.name} - ${project.title}`,
        type: project.type as any,
        duration,
        startWeek: gameState.currentWeek,
        startYear: gameState.currentYear,
        endWeek,
        endYear,

        upfrontPayment,
        episodeRate,
        performanceBonus: [
          { viewershipThreshold: expectedViewers, bonusAmount: upfrontPayment * 0.2 },
          { viewershipThreshold: expectedViewers * 1.5, bonusAmount: upfrontPayment * 0.35 },
          { viewershipThreshold: expectedViewers * 2, bonusAmount: upfrontPayment * 0.5 }
        ],

        expectedViewers,
        expectedCompletionRate,
        expectedSubscriberGrowth,

        status: 'active',
        performanceScore: 0,
        renewalOptions:
          dealKind === 'streaming'
            ? {
                seasons: 2,
                priceIncrease: 15
              }
            : undefined,

        penaltyClause: {
          minViewers: Math.floor(expectedViewers * 0.6),
          penaltyAmount: upfrontPayment * 0.25
        },
        exclusivityClause: dealKind === 'streaming' ? platform.id !== 'streamhub' : true,
        marketingSupport: Math.floor(upfrontPayment * (dealKind === 'cable' ? 0.12 : 0.2)),

        baselineStreamingViews: typeof project.metrics?.streaming?.totalViews === 'number' ? project.metrics.streaming.totalViews : 0,
      };
    }

    // Films & documentaries: flat license fee
    const licenseFeeMultiplier = dealKind === 'cable' ? 2.5 : 8;
    const upfrontPayment = Math.floor(
      platform.averageRate *
        licenseFeeMultiplier *
        qualityMultiplier *
        preferenceMultiplier *
        blockbusterMultiplier *
        platform.bonusMultiplier
    );

    const contractType: StreamingContract['type'] = project.type === 'documentary' ? 'documentary' : 'film';

    const expectedViewers = Math.floor(expectedViewersBase * 0.8 * qualityMultiplier * preferenceMultiplier);
    const expectedCompletionRate = platform.expectations.completionRate;
    const expectedSubscriberGrowth = Math.floor(expectedViewers * platform.expectations.subscriberGrowthRate);

    return {
      id: `contract:${dealKind}:${gameState.currentYear}:W${gameState.currentWeek}:${idSuffix}`,
      dealKind,
      platformId,
      persistentRights: false,
      platform: platformId as any,
      name: `${platform.name} - ${project.title}`,
      type: contractType,
      duration,
      startWeek: gameState.currentWeek,
      startYear: gameState.currentYear,
      endWeek,
      endYear,

      upfrontPayment,
      performanceBonus: [
        { viewershipThreshold: expectedViewers, bonusAmount: upfrontPayment * 0.15 },
        { viewershipThreshold: expectedViewers * 1.5, bonusAmount: upfrontPayment * 0.25 },
        { viewershipThreshold: expectedViewers * 2, bonusAmount: upfrontPayment * 0.35 }
      ],

      expectedViewers,
      expectedCompletionRate,
      expectedSubscriberGrowth,

      status: 'active',
      performanceScore: 0,

      penaltyClause: {
        minViewers: Math.floor(expectedViewers * 0.6),
        penaltyAmount: upfrontPayment * 0.2
      },
      exclusivityClause: true,
      marketingSupport: Math.floor(upfrontPayment * 0.15),

      baselineStreamingViews: typeof project.metrics?.streaming?.totalViews === 'number' ? project.metrics.streaming.totalViews : 0,
    };
  };

  const signContract = (project: Project, platformId: string, dealKind: DealKind) => {
    const contract = generateContract(project, platformId, dealKind);
    const platform = getAllProviders(mods).find(p => p.id === platformId);

    const windowPlatform: PostTheatricalRelease['platform'] = dealKind === 'cable' ? 'tv-licensing' : 'streaming';
    const releaseDate = triggerDateFromWeekYear(gameState.currentYear, gameState.currentWeek);
    const releaseId = `release:contract:${project.id}:${platformId}:${gameState.currentYear}:W${gameState.currentWeek}:${dealKind}`;

    const existingReleases = Array.isArray(project.postTheatricalReleases) ? project.postTheatricalReleases : [];
    const hasWindow = existingReleases.some((r) => r && r.platform === windowPlatform && (r.providerId || r.platformId) === platformId && r.status !== 'ended');

    const newRelease: PostTheatricalRelease = {
      id: releaseId,
      projectId: project.id,
      platform: windowPlatform,
      providerId: platformId,
      releaseDate,
      releaseWeek: gameState.currentWeek,
      releaseYear: gameState.currentYear,
      delayWeeks: 0,
      revenue: 0,
      weeklyRevenue: 0,
      weeksActive: 0,
      status: 'planned',
      cost: 0,
      durationWeeks: contract.duration,
    };

    const postTheatricalReleases: PostTheatricalRelease[] = hasWindow
      ? existingReleases
      : [...existingReleases, newRelease];

    updateProject(project.id, {
      streamingContract: contract,
      postTheatricalEligible: true,
      postTheatricalReleases,
      marketingCampaign: {
        ...project.marketingCampaign,
        budgetSpent: (project.marketingCampaign?.budgetSpent || 0) + contract.marketingSupport,
        buzz: (project.marketingCampaign?.buzz || 0) + 25
      }
    });

    updateBudget(contract.upfrontPayment);

    const category = dealKind === 'cable' ? 'licensing' : 'streaming';

    FinancialEngine.recordTransaction(
      'revenue',
      category,
      contract.upfrontPayment,
      gameState.currentWeek,
      gameState.currentYear,
      `${dealKind === 'cable' ? 'Cable' : 'Streaming'} contract upfront - ${platform?.name ?? (contract.platformId || contract.platform)} - ${project.title}`,
      project.id
    );

    toast({
      title: 'Contract Signed!',
      description: `Signed with ${platform?.name ?? (contract.platformId || contract.platform)} for ${(contract.upfrontPayment / 1000000).toFixed(1)}M upfront + performance bonuses`,
    });

    setSelectedProject(null);
  };

  const evaluatePerformance = (project: Project) => {
    if (!project.streamingContract) return;

    const contract = project.streamingContract;
    const platform = getAllProviders(mods).find(p => p.id === (contract.platformId || contract.platform));

    const rawTotalViews = project.metrics?.streaming?.totalViews ?? project.metrics?.streamingViews;
    const totalViews = typeof rawTotalViews === 'number'
      ? Math.max(0, Math.floor(rawTotalViews - (contract.baselineStreamingViews ?? 0)))
      : (contract.observedTotalViews ?? 0);

    if (totalViews <= 0) return;

    const completionRate = project.metrics?.streaming
      ? project.metrics.streaming.completionRate
      : (contract.observedCompletionRate ?? 0);

    const subscriberGrowth = project.metrics?.streaming
      ? project.metrics.streaming.subscriberGrowth
      : (contract.observedSubscriberGrowth ?? 0);

    const expectedCompletionRate = contract.expectedCompletionRate <= 1
      ? contract.expectedCompletionRate * 100
      : contract.expectedCompletionRate;

    const scores: number[] = [];

    const viewershipScore = contract.expectedViewers > 0
      ? Math.min(100, (totalViews / contract.expectedViewers) * 100)
      : 0;
    scores.push(viewershipScore);

    const completionScore = expectedCompletionRate > 0
      ? Math.min(100, (completionRate / expectedCompletionRate) * 100)
      : 0;

    const subscriberScore = contract.expectedSubscriberGrowth > 0
      ? Math.min(100, (subscriberGrowth / contract.expectedSubscriberGrowth) * 100)
      : 100;

    scores.push(completionScore, subscriberScore);

    const performanceScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const updatedContract: StreamingContract = {
      ...contract,
      performanceScore: Math.floor(performanceScore),
      observedTotalViews: totalViews,
      observedCompletionRate: completionRate,
      observedSubscriberGrowth: subscriberGrowth,
      lastEvaluatedWeek: gameState.currentWeek,
      lastEvaluatedYear: gameState.currentYear,
    };

    updateProject(project.id, {
      streamingContract: updatedContract
    });

    toast({
      title: 'Performance updated',
      description: `${platform?.name ?? (contract.platformId || contract.platform)} now rates ${updatedContract.performanceScore}/100`,
    });
  };

  const eligibleProjects = getEligibleProjects();
  const activeContracts = getActiveContracts();

  return (
    <div className="space-y-6">
      {/* Available Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Streaming & Cable Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eligibleProjects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No eligible projects ready for streaming or cable deals. Release a TV show or film first.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleProjects.map(project => (
                <Card key={project.id} className="border perf-cv-auto">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{project.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {project.script?.genre} • {project.type}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Quality: {project.script?.quality || 60}
                      </Badge>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          View Contract Offers
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Contract Offers - {project.title}</DialogTitle>
                        </DialogHeader>
                        
                        <Tabs defaultValue="streaming" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="streaming" className="flex items-center gap-2">
                              <Monitor className="h-4 w-4" />
                              Streaming
                            </TabsTrigger>
                            <TabsTrigger
                              value="cable"
                              className="flex items-center gap-2"
                              disabled={!isTVProject(project)}
                            >
                              <Tv className="h-4 w-4" />
                              Cable
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="streaming" className="mt-4">
                            {streamingProviders.length === 0 ? (
                              <p className="text-muted-foreground text-center py-8">
                                No streaming platforms available.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                                {streamingProviders.map(provider => {
                                  const issues = getDealIssues(project, provider);
                                  const contract = generateContract(project, provider.id, 'streaming');
                                  const isEpisodic = typeof contract.episodeRate === 'number';

                                  return (
                                    <Card key={provider.id} className="border perf-cv-row">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className={`w-3 h-3 rounded ${provider.color}`} />
                                          <h4 className="font-medium">{provider.name}</h4>
                                          <Badge variant="secondary" className="ml-auto">
                                            {provider.marketShare}% share
                                          </Badge>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span>{isEpisodic ? 'Upfront Payment:' : 'License Fee:'}</span>
                                            <span className="font-medium">
                                              ${(contract.upfrontPayment / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          {isEpisodic && (
                                            <div className="flex justify-between">
                                              <span>Episode Rate:</span>
                                              <span className="font-medium">
                                                ${(contract.episodeRate! / 1000000).toFixed(1)}M
                                              </span>
                                            </div>
                                          )}
                                          <div className="flex justify-between">
                                            <span>Expected Viewers:</span>
                                            <span className="font-medium">
                                              {(contract.expectedViewers / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Marketing Support:</span>
                                            <span className="font-medium">
                                              ${(contract.marketingSupport / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          {contract.exclusivityClause && (
                                            <Badge variant="outline" className="w-full justify-center">
                                              Exclusive Contract
                                            </Badge>
                                          )}
                                        </div>

                                        {issues.length > 0 && (
                                          <div className="mt-2 text-xs text-muted-foreground">
                                            {issues.join(' • ')}
                                          </div>
                                        )}

                                        <Button
                                          onClick={() => signContract(project, provider.id, 'streaming')}
                                          className="w-full mt-3"
                                          size="sm"
                                          disabled={issues.length > 0}
                                        >
                                          Sign Contract
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="cable" className="mt-4">
                            {isTVProject(project) ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                                {getCableProviders(mods).map((provider) => {
                                  const issues = getDealIssues(project, provider);
                                  const contract = generateContract(project, provider.id, 'cable');

                                  return (
                                    <Card key={provider.id} className="border perf-cv-row">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className={`w-3 h-3 rounded ${provider.color}`} />
                                          <h4 className="font-medium">{provider.name}</h4>
                                          <Badge variant="secondary" className="ml-auto">
                                            {provider.marketShare}% share
                                          </Badge>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span>Upfront Payment:</span>
                                            <span className="font-medium">
                                              ${(contract.upfrontPayment / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Episode Rate:</span>
                                            <span className="font-medium">
                                              ${(contract.episodeRate! / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Expected Viewers:</span>
                                            <span className="font-medium">
                                              {(contract.expectedViewers / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Marketing Support:</span>
                                            <span className="font-medium">
                                              ${(contract.marketingSupport / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                          <Badge variant="outline" className="w-full justify-center">
                                            Cable Window
                                          </Badge>
                                        </div>

                                        {issues.length > 0 && (
                                          <div className="mt-2 text-xs text-muted-foreground">
                                            {issues.join(' • ')}
                                          </div>
                                        )}

                                        <Button
                                          onClick={() => signContract(project, provider.id, 'cable')}
                                          className="w-full mt-3"
                                          size="sm"
                                          disabled={issues.length > 0}
                                        >
                                          Sign Contract
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Cable contracts are available for episodic TV projects.
                              </p>
                            )}
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Contracts */}
      {activeContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Active Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeContracts.map(project => {
                const contract = project.streamingContract!;
                const platform = getAllProviders(mods).find(p => p.id === (contract.platformId || contract.platform));

                const totalViews = project.metrics?.streaming?.totalViews ?? project.metrics?.streamingViews ?? 0;
                const completionRate = project.metrics?.streaming?.completionRate;
                const subscriberGrowth = project.metrics?.streaming?.subscriberGrowth;

                const dealKindLabel = contract.dealKind === 'cable' ? 'Cable' : 'Streaming';

                return (
                  <Card key={project.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{project.title}</h4>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${platform?.color ?? 'bg-muted'}`} />
                            <span className="text-sm text-muted-foreground">
                              {platform?.name ?? (contract.platformId || contract.platform)} • {dealKindLabel}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            contract.performanceScore >= 80
                              ? 'default'
                              : contract.performanceScore >= 60
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          Performance: {contract.performanceScore}/100
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Viewers:</span>
                          <p className="font-medium">
                            {totalViews > 0 ? `${(totalViews / 1000000).toFixed(1)}M` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Target: {(contract.expectedViewers / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completion:</span>
                          <p className="font-medium">
                            {typeof completionRate === 'number' ? `${completionRate}%` : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Target: {contract.expectedCompletionRate}%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subscriber Growth:</span>
                          <p className="font-medium">
                            {typeof subscriberGrowth === 'number' ? `${(subscriberGrowth / 1000).toFixed(0)}K` : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Target: {(contract.expectedSubscriberGrowth / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Earned:</span>
                          <p className="font-medium">
                            ${(contract.upfrontPayment / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-xs text-muted-foreground">+ Bonuses</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button onClick={() => evaluatePerformance(project)} variant="outline" size="sm">
                          Evaluate Performance
                        </Button>
                        {contract.renewalOptions && contract.performanceScore >= 70 && (
                          <Badge variant="secondary">Renewal Available</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};