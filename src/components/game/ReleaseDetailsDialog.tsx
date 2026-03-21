import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { GameState, Project } from '@/types/game';
import { formatMoneyCompact } from '@/utils/money';
import { getReleaseDirectorName, getReleaseSource, getReleaseStudioName, getReleaseTopCastNames } from '@/utils/leagueReleases';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/store';
import { useToast } from '@/hooks/use-toast';

interface ReleaseDetailsDialogProps {
  gameState: GameState;
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReleaseDetailsDialog: React.FC<ReleaseDetailsDialogProps> = ({
  gameState,
  project,
  open,
  onOpenChange,
}) => {
  const updateProject = useGameStore((s) => s.updateProject);
  const { toast } = useToast();

  const resolvedProject = useMemo(() => {
    if (!project) return null;

    // Prefer the canonical copy from gameState.projects when available (player-owned projects).
    const local = (gameState.projects || []).find((p) => p.id === project.id);
    if (local) return local;

    // Otherwise fall back to the current allReleases entry.
    const fromAllReleases = (gameState.allReleases || []).find((r: any) => r && 'script' in r && r.id === project.id);
    return (fromAllReleases as Project | undefined) ?? project;
  }, [gameState.allReleases, gameState.projects, project]);

  if (!resolvedProject) return null;

  const studioName = getReleaseStudioName({ gameState, release: resolvedProject }) || '';
  const showBudget = !resolvedProject.id.startsWith('league-') || studioName === gameState.studio.name;

  const source = getReleaseSource({ gameState, project: resolvedProject });
  const director = getReleaseDirectorName({ gameState, project: resolvedProject });
  const cast = getReleaseTopCastNames({ gameState, project: resolvedProject, limit: 4 });
  const peopleBits = [
    source,
    director ? `Dir. ${director}` : null,
    cast.length ? `Cast: ${cast.join(', ')}` : null,
  ].filter(Boolean);

  const logline = resolvedProject.script?.logline?.trim();

  const budget = showBudget ? Number(resolvedProject.budget?.total ?? 0) : null;
  const boxOffice = Number(resolvedProject.metrics?.boxOfficeTotal ?? 0);
  const weekly = Number(resolvedProject.metrics?.lastWeeklyRevenue ?? 0);

  const isOnlineLeagueMode = gameState.mode === 'online';

  const isPlayerProject = (gameState.projects || []).some((p) => p.id === resolvedProject.id);
  const canAdjustRelease =
    !isOnlineLeagueMode &&
    isPlayerProject &&
    resolvedProject.status === 'released' &&
    resolvedProject.metrics?.inTheaters === true &&
    resolvedProject.metrics?.theatricalRunLocked !== true;

  const canExpandFestivalRun =
    canAdjustRelease &&
    resolvedProject.releaseStrategy?.type === 'festival' &&
    (resolvedProject.metrics?.weeksSinceRelease ?? 0) >= 1;

  const expandFestivalRun = () => {
    if (!canExpandFestivalRun) return;

    const next = {
      ...(resolvedProject.releaseStrategy as any),
      type: 'platform' as const,
      theatersCount: 150,
    };

    const currentAbs = (gameState.currentYear * 52) + gameState.currentWeek;

    updateProject(resolvedProject.id, {
      releaseStrategy: next as any,
      metrics: {
        ...(resolvedProject.metrics || {}),
        festivalPremiered: true,
        expandedFromFestivalAbs: currentAbs,
      },
    });

    toast({
      title: 'Release expanded',
      description: `Expanded "${resolvedProject.title}" into a platform rollout.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{resolvedProject.title}</DialogTitle>
          <DialogDescription>
            {(studioName || 'Studio')}
            {` • Week ${resolvedProject.releaseWeek ?? '—'}, ${resolvedProject.releaseYear ?? '—'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {peopleBits.length > 0 && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              {peopleBits.join(' • ')}
            </div>
          )}

          {logline && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">{logline}</div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Critics</div>
              <div className="text-lg font-semibold">{Math.round(Number(resolvedProject.metrics?.criticsScore ?? 0))}/100</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Audience</div>
              <div className="text-lg font-semibold">{Math.round(Number(resolvedProject.metrics?.audienceScore ?? 0))}/100</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Total box office</div>
              <div className="text-lg font-semibold">{formatMoneyCompact(boxOffice)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Budget</div>
              <div className="text-lg font-semibold">{budget !== null ? formatMoneyCompact(budget) : 'Hidden'}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Last week</div>
              <div className="text-lg font-semibold">{formatMoneyCompact(weekly)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">In theaters</div>
              <div className="text-lg font-semibold">{resolvedProject.metrics?.inTheaters ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {canExpandFestivalRun && (
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium">Festival momentum</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Strong buzz? Expand into a platform rollout to chase broader box office.
              </div>
              <div className="mt-3">
                <Button type="button" onClick={expandFestivalRun}>
                  Expand release
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
