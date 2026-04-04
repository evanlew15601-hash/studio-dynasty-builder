import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TalentPortrait } from '@/components/ui/talent-portrait';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';

interface TopActorsPanelProps {}

export const TopActorsPanel: React.FC<TopActorsPanelProps> = () => {
  const gameState = useGameStore((s) => s.game);
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading top actors...</div>;
  }
  const actors = [...gameState.talent]
    .filter(t => t.type === 'actor')
    .sort((a, b) => (b.fame ?? Math.round(b.reputation)) - (a.fame ?? Math.round(a.reputation)))
    .slice(0, 50);

  const getFilmographyCount = (actorId: string) => {
    let count = 0;
    for (const p of gameState.projects) {
      const roles = p.script?.characters || [];
      if (roles.some(r => r.assignedTalentId === actorId)) count++;
    }
    const talent = gameState.talent.find(t => t.id === actorId);
    if (talent?.filmography) {
      count += talent.filmography.length;
    }
    return count;
  };

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
                    <TalentPortrait talent={a} size="sm" />
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
