import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { GameState, Project } from '@/types/game';
import { formatMoneyCompact } from '@/utils/money';
import { getReleaseDirectorName, getReleaseSource, getReleaseStudioName, getReleaseTopCastNames } from '@/utils/leagueReleases';

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
  if (!project) return null;

  const studioName = getReleaseStudioName({ gameState, release: project }) || '';
  const showBudget = !project.id.startsWith('league-') || studioName === gameState.studio.name;

  const source = getReleaseSource({ gameState, project });
  const director = getReleaseDirectorName({ gameState, project });
  const cast = getReleaseTopCastNames({ gameState, project, limit: 4 });
  const peopleBits = [
    source,
    director ? `Dir. ${director}` : null,
    cast.length ? `Cast: ${cast.join(', ')}` : null,
  ].filter(Boolean);

  const logline = project.script?.logline?.trim();

  const budget = showBudget ? Number(project.budget?.total ?? 0) : null;
  const boxOffice = Number(project.metrics?.boxOfficeTotal ?? 0);
  const weekly = Number(project.metrics?.lastWeeklyRevenue ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project.title}</DialogTitle>
          <DialogDescription>
            {(studioName || 'Studio')}
            {` • Week ${project.releaseWeek ?? '—'}, ${project.releaseYear ?? '—'}`}
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
              <div className="text-lg font-semibold">{Math.round(Number(project.metrics?.criticsScore ?? 0))}/100</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Audience</div>
              <div className="text-lg font-semibold">{Math.round(Number(project.metrics?.audienceScore ?? 0))}/100</div>
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
              <div className="text-lg font-semibold">{project.metrics?.inTheaters ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
