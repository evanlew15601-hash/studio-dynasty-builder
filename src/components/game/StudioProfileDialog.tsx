import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { GameState, Project } from '@/types/game';
import { formatMoneyCompact } from '@/utils/money';
import { getReleaseDirectorName, getReleaseSource, getReleaseTopCastNames } from '@/utils/leagueReleases';

interface StudioProfileStats {
  releasedCount: number;
  avgCritics: number | null;
  avgAudience: number | null;
  totalBoxOffice: number;
}

interface StudioProfileDialogProps {
  gameState: GameState;
  studioName: string | null;
  reputation?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releases: Project[];
  stats: StudioProfileStats;
  onSelectRelease: (project: Project) => void;
}

export const StudioProfileDialog: React.FC<StudioProfileDialogProps> = ({
  gameState,
  studioName,
  reputation,
  open,
  onOpenChange,
  releases,
  stats,
  onSelectRelease,
}) => {
  if (!studioName) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{studioName}</DialogTitle>
          <DialogDescription>League public profile (releases + reputation).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Reputation</div>
              <div className="text-lg font-semibold">{typeof reputation === 'number' ? Math.round(reputation) : '—'}/100</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Released</div>
              <div className="text-lg font-semibold">{stats.releasedCount}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Box office</div>
              <div className="text-lg font-semibold">{formatMoneyCompact(stats.totalBoxOffice)}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Avg critics</div>
              <div className="text-lg font-semibold">{stats.avgCritics !== null ? Math.round(stats.avgCritics) : '—'}/100</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Avg audience</div>
              <div className="text-lg font-semibold">{stats.avgAudience !== null ? Math.round(stats.avgAudience) : '—'}/100</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Recent releases</div>
            <div className="space-y-2">
              {releases.slice(0, 10).map((p) => {
                const source = getReleaseSource({ gameState, project: p });
                const director = getReleaseDirectorName({ gameState, project: p });
                const cast = getReleaseTopCastNames({ gameState, project: p, limit: 3 });
                const bits = [
                  source,
                  director ? `Dir. ${director}` : null,
                  cast.length ? `Cast: ${cast.join(', ')}` : null,
                ].filter(Boolean);

                return (
                  <div
                    key={p.id}
                    className="cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent/5"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRelease(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRelease(p);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Week {p.releaseWeek ?? '—'}, {p.releaseYear ?? '—'}
                        </div>
                        {bits.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {bits.join(' • ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>C {Math.round(Number(p.metrics?.criticsScore ?? 0))}</div>
                        <div>A {Math.round(Number(p.metrics?.audienceScore ?? 0))}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {releases.length === 0 && (
                <div className="text-sm text-muted-foreground">No releases yet.</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
