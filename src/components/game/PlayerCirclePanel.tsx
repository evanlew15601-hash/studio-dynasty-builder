import React, { useMemo } from 'react';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { computePlayerCircle } from '@/utils/playerCircle';

export const PlayerCirclePanel: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);

  const circle = useMemo(() => {
    if (!gameState) return null;
    return computePlayerCircle(gameState, { limit: 8 });
  }, [gameState]);

  if (!gameState || !circle) {
    return <div className="p-6 text-sm text-muted-foreground">Loading your circle…</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle>Inner Circle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Depth lives here: collaborators, rivals, managers, critics, and the studios that keep colliding with your slate.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Collaborators</CardTitle>
          </CardHeader>
          <CardContent>
            {circle.collaborators.length === 0 ? (
              <div className="text-sm text-muted-foreground">Hire talent to build your collaborator list.</div>
            ) : (
              <div className="space-y-2">
                {circle.collaborators.map((c) => (
                  <div key={c.talent.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                    <div>
                      <div className="text-sm font-medium">
                        <button type="button" className="hover:underline" onClick={() => openTalentProfile(c.talent.id)}>
                          {c.talent.name}
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.talent.type} • Rep {Math.round(c.talent.reputation ?? 0)}
                      </div>
                    </div>
                    <Badge variant={c.loyalty >= 70 ? 'default' : c.loyalty >= 55 ? 'secondary' : 'outline'}>
                      Loyalty {Math.round(c.loyalty)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Rivals</CardTitle>
          </CardHeader>
          <CardContent>
            {circle.rivals.length === 0 ? (
              <div className="text-sm text-muted-foreground">No major rivalries detected (yet).</div>
            ) : (
              <div className="space-y-2">
                {circle.rivals.map((r) => (
                  <div key={r.talent.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                    <div>
                      <div className="text-sm font-medium">
                        <button type="button" className="hover:underline" onClick={() => openTalentProfile(r.talent.id)}>
                          {r.talent.name}
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.talent.type} • Rep {Math.round(r.talent.reputation ?? 0)}
                      </div>
                    </div>
                    <Badge variant="destructive">Rivalries {r.relationshipCount}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            {circle.managers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No agents in your orbit.</div>
            ) : (
              <div className="space-y-2">
                {circle.managers.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.agency} • Power {m.powerLevel}/10 • Clients {m.clientList?.length ?? 0}
                      </div>
                    </div>
                    <Badge variant="outline">{Math.round((m.commission ?? 0) > 1 ? (m.commission ?? 0) : (m.commission ?? 0) * 100)}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg">Critics & outlets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {circle.critics.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.type.replace('_', ' ')} • Cred {c.credibility} • Reach {c.reach}
                    </div>
                  </div>
                  <Badge variant={c.bias > 10 ? 'secondary' : c.bias < -10 ? 'destructive' : 'outline'}>
                    Bias {c.bias > 0 ? `+${c.bias}` : c.bias}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-lg">Studios</CardTitle>
        </CardHeader>
        <CardContent>
          {(circle.studios || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No competitors in this mode.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {circle.studios.slice(0, 10).map((s) => (
                <div key={s.studio.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                  <div>
                    <div className="text-sm font-medium">{s.studio.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Rep {Math.round(s.studio.reputation ?? 0)} • {s.studio.specialties?.join(', ') || '—'}
                    </div>
                  </div>
                  <Badge variant="outline">Rivalry {Math.round(s.rivalry)}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            Everything else (newcomers, pipelines, veterans) supports these collisions quietly.
          </div>

          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to top
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
