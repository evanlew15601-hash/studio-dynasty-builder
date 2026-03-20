import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { buildAwardShowCeremonyForModal } from '@/utils/awardsCeremony';
import type { Project } from '@/types/game';
import { IndividualAwardShowModal, type AwardShowCeremony } from './IndividualAwardShowModal';

export const AwardsSeasonAnalyticsPanel: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    if (!gameState) return map;

    for (const p of gameState.projects || []) map.set(p.id, p);
    for (const r of gameState.allReleases || []) {
      if ((r as any)?.script) map.set((r as any).id, r as any);
    }

    return map;
  }, [gameState]);

  const talentById = useMemo(() => {
    const map = new Map<string, string>();
    if (!gameState) return map;
    for (const t of gameState.talent || []) map.set(t.id, t.name);
    return map;
  }, [gameState]);

  const [watchingCeremony, setWatchingCeremony] = useState<AwardShowCeremony | null>(null);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading awards season...</div>;
  }

  const season = gameState.awardsSeason;
  if (!season || season.year !== gameState.currentYear) {
    return (
      <Card className="card-premium">
        <CardHeader>
          <CardTitle>Awards Season</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Awards processing is handled by the deterministic awards engine. No season state is available for the current year yet.
        </CardContent>
      </Card>
    );
  }

  const schedule = getAwardShowsForYear(gameState.currentYear);
  const nominationsEntries = Object.entries(season.seasonNominations || {}).filter(([, v]) => v?.year === gameState.currentYear);

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle>Awards Season {gameState.currentYear}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Processed ceremonies:</span>{' '}
            <span className="font-medium">{(season.processedCeremonies || []).length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Nominations published:</span>{' '}
            <span className="font-medium">{nominationsEntries.length}</span>
          </div>
        </CardContent>
      </Card>

      {nominationsEntries.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No nominations recorded yet.</div>
      ) : (
        nominationsEntries
          .slice()
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, record]) => {
            const lastDash = key.lastIndexOf('-');
            const showId = lastDash > 0 ? key.slice(0, lastDash) : key;
            const show = schedule.find((s) => s.id === showId) ?? schedule.find((s) => s.name === showId);

            const ceremony = season.ceremonyHistory?.[show?.id || showId];

            return (
              <Card key={key} className="card-premium">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {show?.name || showId}
                      {show && (
                        <Badge variant="secondary">
                          W{show.ceremonyWeek}
                        </Badge>
                      )}
                    </div>

                    {ceremony && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const built = buildAwardShowCeremonyForModal(gameState, ceremony.showId, ceremony.year);
                          if (built) setWatchingCeremony(built);
                        }}
                      >
                        Watch
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ceremony && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-sm font-medium">Winners</div>
                      <div className="space-y-1">
                        {Object.entries(ceremony.winners || {}).map(([category, w]) => {
                          const project = projectById.get(w.projectId);
                          const talentName = w.talentId ? talentById.get(w.talentId) : undefined;
                          return (
                            <div key={category} className="flex items-center justify-between text-sm">
                              <div className="truncate pr-4">
                                <span className="font-medium">{category}:</span>{' '}
                                {project?.title || w.projectId}
                                {talentName ? <span className="text-muted-foreground"> • {talentName}</span> : null}
                              </div>
                              <div className="text-muted-foreground tabular-nums">
                                {Math.round(w.score)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Object.entries(record.categories || {}).map(([category, nominees]) => {
                    const top = (nominees || []).slice(0, 5);

                    return (
                      <div key={category}>
                        <div className="text-sm font-medium mb-2">{category}</div>
                        <div className="space-y-1">
                          {top.map((n) => {
                            const project = projectById.get(n.projectId);
                            return (
                              <div key={n.projectId} className="flex items-center justify-between text-sm">
                                <div className="truncate pr-4">
                                  {project?.title || n.projectId}
                                </div>
                                <div className="text-muted-foreground tabular-nums">
                                  {Math.round(n.score)}
                                </div>
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

      {watchingCeremony && (
        <IndividualAwardShowModal
          isOpen={true}
          onClose={() => setWatchingCeremony(null)}
          onSkip={() => setWatchingCeremony(null)}
          ceremony={watchingCeremony}
        />
      )}
    </div>
  );
};
