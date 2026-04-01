import React, { useMemo } from 'react';
import type { GameState, Project } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NextAction = {
  id: string;
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  title: string;
  phase?: string;
  projectId?: string;
};

function projectSuggestedPhase(project: Project): string {
  const status = (project.status || '').toString();
  const phase = (project.currentPhase || '').toString();

  if (status === 'development' || phase === 'development') return 'scripts';
  if (status === 'pre-production' || phase === 'pre-production') return 'casting';
  if (status === 'production' || status === 'filming' || phase === 'production') return 'production';
  if (status === 'post-production' || phase === 'post-production') return 'production';
  if (status === 'marketing' || status === 'scheduled-for-release' || phase === 'marketing') return 'marketing';
  if (status === 'distribution' || phase === 'distribution') return 'distribution';

  return 'dashboard';
}

function pickFocusProject(gameState: GameState): Project | null {
  const projects = gameState.projects || [];

  const active = projects.filter((p) => {
    const st = (p.status || '').toString();
    return st !== 'released' && st !== 'archived';
  });

  if (active.length === 0) return null;

  const priority = (p: Project) => {
    const st = (p.status || '').toString();
    const ph = (p.currentPhase || '').toString();

    if (st === 'development' || ph === 'development') return 1;
    if (st === 'pre-production' || ph === 'pre-production') return 2;
    if (st === 'production' || st === 'filming' || ph === 'production') return 3;
    if (st === 'post-production' || ph === 'post-production') return 4;
    if (st === 'marketing' || st === 'scheduled-for-release' || ph === 'marketing') return 5;
    if (st === 'distribution' || ph === 'distribution') return 6;

    return 99;
  };

  return active
    .slice()
    .sort((a, b) => priority(a) - priority(b))[0];
}

export const NextActionsBar: React.FC<{
  gameState: GameState;
  onNavigate: (phase: string, projectId?: string) => void;
  onOpenInbox?: () => void;
}> = ({ gameState, onNavigate, onOpenInbox }) => {
  const actions = useMemo(() => {
    const next: NextAction[] = [];

    const pendingEvents = gameState.eventQueue?.length ?? 0;
    if (pendingEvents > 0) {
      next.push({
        id: 'eventQueue',
        badge: `Inbox: ${pendingEvents}`,
        badgeVariant: 'destructive',
        title: pendingEvents === 1 ? 'Decision pending — resolve the open event' : `${pendingEvents} decisions pending — resolve the open event`,
        phase: 'dashboard',
      });
    }

    const focus = pickFocusProject(gameState);

    if (!focus) {
      next.push({
        id: 'firstProject',
        badge: 'Next',
        badgeVariant: 'secondary',
        title: 'Start your next project: develop a script',
        phase: 'scripts',
      });

      if ((gameState.studio.debt || 0) > 0) {
        next.push({
          id: 'debt',
          badge: 'Finance',
          badgeVariant: 'outline',
          title: 'You have outstanding debt — review your finances',
          phase: 'finance',
        });
      }

      return next.slice(0, 3);
    }

    const suggested = projectSuggestedPhase(focus);

    next.push({
      id: 'focusProject',
      badge: 'Next',
      badgeVariant: 'secondary',
      title: `${focus.title}: continue ${suggested === 'scripts' ? 'development' : suggested}`,
      phase: suggested,
      projectId: focus.id,
    });

    if ((gameState.studio.debt || 0) > 0 && (gameState.studio.budget || 0) < 5_000_000) {
      next.push({
        id: 'cashflow',
        badge: 'Finance',
        badgeVariant: 'outline',
        title: 'Low cash with debt — consider financing or cost cuts',
        phase: 'finance',
      });
    }

    return next.slice(0, 3);
  }, [gameState]);

  const pendingEvents = gameState.eventQueue?.length ?? 0;

  return (
    <div className="border-b border-border/30 bg-background/70 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground">NEXT</div>
            {actions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-border/50 bg-card/50 px-2.5 py-1"
              >
                <Badge variant={a.badgeVariant} className="text-[10px] px-2 py-0.5">
                  {a.badge}
                </Badge>
                <div className="text-xs text-foreground/90">{a.title}</div>
                {a.phase && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => onNavigate(a.phase!, a.projectId)}
                  >
                    Go
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Inbox: <span className="studio-mono">{pendingEvents}</span>
            {onOpenInbox && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={onOpenInbox}
              >
                Open
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
