import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';

interface TopActorsPanelProps {}

export const TopActorsPanel: React.FC<TopActorsPanelProps> = () => {
  const gameState = useGameStore((s) => s.game);
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);

  const actors = useMemo(() => {
    if (!gameState) return [];

    return [...gameState.talent]
      .filter(t => t.type === 'actor')
      .sort((a, b) => (b.fame ?? Math.round(b.reputation)) - (a.fame ?? Math.round(a.reputation)))
      .slice(0, 50);
  }, [gameState]);

  const filmographyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!gameState) return counts;

    const allProjects = [
      ...gameState.projects,
      ...gameState.allReleases.filter((r): r is any => 'script' in (r as any)),
    ];

    for (const p of allProjects) {
      if (!p || p.status !== 'released') continue;

      const credited = new Set<string>();

      const roles = p.script?.characters || [];
      for (const r of roles) {
        if (r.assignedTalentId) credited.add(r.assignedTalentId);
      }

      for (const c of (p.cast || [])) {
        if (c.talentId) credited.add(c.talentId);
      }

      for (const c of (p.crew || [])) {
        if (c.talentId) credited.add(c.talentId);
      }

      for (const id of credited) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }

    return counts;
  }, [gameState]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading top actors...</div>;
  }

  const getFilmographyCount = (actorId: string) => filmographyCounts.get(actorId) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 50 Actors by Fame</CardTitle>
        </CardHeader>
        <CardContent>
          {actors.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No actors available.</div>
          ) : (
            <div className="space-y-2">
              {actors.map((a, idx) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded border bg-card hover:bg-accent transition-colors text-left"
                  onClick={() => openTalentProfile(a.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-10 justify-center">#{idx + 1}</Badge>
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                        <span>Age {a.age}</span>
                        <span>Rep {Math.round(a.reputation)}</span>
                        <span>Films {getFilmographyCount(a.id)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Fame {a.fame ?? Math.round(a.reputation)}</Badge>
                    {(a.genres || []).slice(0,2).map(g => (
                      <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
