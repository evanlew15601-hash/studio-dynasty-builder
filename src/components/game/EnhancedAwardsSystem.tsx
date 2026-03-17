
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { AwardCategoryDefinition } from '@/data/AwardsSchedule';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import type { Project, StudioAward, TalentAward } from '@/types/game';
import { findRelevantTalentForAwardCategory } from '@/utils/awardsTalent';
import { Trophy, Star, Calendar, Award, Crown } from 'lucide-react';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';

interface EnhancedAwardsSystemProps {
  onNavigatePhase?: (phase: 'media' | 'distribution') => void;
}

type CombinedAward =
  | ({ kind: 'studio' } & StudioAward)
  | ({ kind: 'talent'; talentId: string; talentName: string } & TalentAward);

export const EnhancedAwardsSystem: React.FC<EnhancedAwardsSystemProps> = ({
  onNavigatePhase
}) => {
  const gameState = useGameStore((s) => s.game);
  const setPhase = useUiStore((s) => s.setPhase);
  const navigatePhase = onNavigatePhase ?? ((phase: 'media' | 'distribution') => setPhase(phase));
  const [viewMode, setViewMode] = useState<'upcoming' | 'nominees' | 'history'>('upcoming');

  const projectById = useMemo(() => {
    if (!gameState) return new Map<string, Project>();

    const aiProjects = (gameState.allReleases || []).filter((r): r is Project => !!r && typeof r === 'object' && 'script' in r);
    const all = [...(gameState.projects || []), ...aiProjects];

    return new Map(all.map((p) => [p.id, p] as const));
  }, [gameState]);

  const combinedAwards = useMemo(() => {
    if (!gameState) return [] as CombinedAward[];

    const studioAwards = (gameState.studio.awards || []).map((a) => ({ ...a, kind: 'studio' as const }));

    const talentAwards: CombinedAward[] = [];
    for (const t of gameState.talent || []) {
      for (const a of t.awards || []) {
        talentAwards.push({ ...a, kind: 'talent', talentId: t.id, talentName: t.name } as any);
      }
    }

    return [...studioAwards, ...talentAwards]
      .slice()
      .sort((a, b) => {
        if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
        return String(b.ceremony || '').localeCompare(String(a.ceremony || ''));
      });
  }, [gameState]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading awards season...</div>;
  }

  const shows = getAwardShowsForYear(gameState.currentYear);
  const season = gameState.awardsSeason && gameState.awardsSeason.year === gameState.currentYear
    ? gameState.awardsSeason
    : null;

  const getProjectTitle = (projectId: string) => projectById.get(projectId)?.title || 'Unknown Project';

  const nominationKeyForShow = (showId: string) => `${showId}-${gameState.currentYear}`;

  const isTalentCategory = (category: AwardCategoryDefinition): boolean => {
    if (category.awardKind === 'talent') return true;
    const cl = category.name.toLowerCase();
    return cl.includes('actor') || cl.includes('actress') || cl.includes('director') || cl.includes('directing');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Awards Season
          </h2>
          <p className="text-muted-foreground">Industry recognition and prestige</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setViewMode('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={viewMode === 'nominees' ? 'default' : 'outline'}
            onClick={() => setViewMode('nominees')}
          >
            Nominees
          </Button>
          <Button
            variant={viewMode === 'history' ? 'default' : 'outline'}
            onClick={() => setViewMode('history')}
          >
            History
          </Button>
        </div>
      </div>

      {viewMode === 'upcoming' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Awards Calendar {gameState.currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-1">
              <div className="flex justify-between text-sm mb-2">
                <span>Year Progress</span>
                <span>Week {gameState.currentWeek} / 52</span>
              </div>
              <Progress value={(gameState.currentWeek / 52) * 100} />
            </div>

            {shows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No award shows scheduled.</div>
            ) : (
              <div className="space-y-2">
                {shows.map((s) => {
                  const key = nominationKeyForShow(s.id);
                  const hasNoms = !!season?.seasonNominations?.[key];
                  const isDone = !!season?.processedCeremonies?.includes(key);

                  const status = isDone
                    ? 'completed'
                    : gameState.currentWeek >= s.ceremonyWeek
                      ? 'in progress'
                      : gameState.currentWeek >= s.nominationWeek
                        ? 'nominations announced'
                        : 'upcoming';

                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Nominations: W{s.nominationWeek} • Ceremony: W{s.ceremonyWeek}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasNoms && <Badge variant="outline">Nominees ready</Badge>}
                        <Badge variant={isDone ? 'default' : 'secondary'}>{status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!season && (
              <div className="text-sm text-muted-foreground">
                Awards season data will appear after the headless awards engine initializes (typically at week 1).
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'nominees' && (
        <div className="space-y-4">
          {!season ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No nominations recorded for this year yet.</p>
              </CardContent>
            </Card>
          ) : (
            shows.map((show) => {
              const key = nominationKeyForShow(show.id);
              const nominations = season.seasonNominations?.[key]?.categories;

              if (!nominations) return null;

              return (
                <Card key={show.id} className="card-premium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {show.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {show.categories.map((category) => {
                      const entries = nominations[category.name] || [];
                      if (entries.length === 0) return null;

                      return (
                        <div key={category.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <div className="font-medium">{category.name}</div>
                          </div>

                          <div className="space-y-2">
                            {entries.map((n) => {
                              const project = projectById.get(n.projectId);
                              const talent = n.talentId
                                ? gameState.talent.find(t => t.id === n.talentId)
                                : (project && isTalentCategory(category)
                                    ? findRelevantTalentForAwardCategory(gameState, project, category.name, category)
                                    : undefined);

                              return (
                                <div key={`${category.id}:${n.projectId}`} className="flex items-center justify-between p-2 border rounded">
                                  <div className="min-w-0">
                                    <div className="truncate">{getProjectTitle(n.projectId)}</div>
                                    {talent && (
                                      <div className="text-xs text-muted-foreground truncate">
                                        {talent.name}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline">{Math.round(n.score)}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {viewMode === 'history' && (
        <div className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Recent Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {combinedAwards.length === 0 ? (
                <div className="text-sm text-muted-foreground">No awards recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {combinedAwards.slice(0, 20).map((a) => {
                    const projectLabel = a.projectId ? getProjectTitle(a.projectId) : 'Unknown Project';
                    const recipient = a.kind === 'talent' ? a.talentName : projectLabel;
                    const subtitle = a.kind === 'talent' ? projectLabel : undefined;

                    return (
                      <div key={a.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.ceremony} • {a.category} • Y{a.year}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {recipient}{subtitle ? ` — ${subtitle}` : ''}
                          </div>
                        </div>
                        <Crown className="h-4 w-4 text-yellow-500" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Use Awards Momentum Strategically
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground md:max-w-md">
            Convert awards momentum into sustained audience engagement and long-tail earnings via media and post-theatrical releases.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigatePhase('media')}>
              Open Media Dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigatePhase('distribution')}>
              Post-Theatrical & Distribution
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
