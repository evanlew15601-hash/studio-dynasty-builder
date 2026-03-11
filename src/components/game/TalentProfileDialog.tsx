import React, { useMemo } from 'react';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';

const formatMoney = (amount: number) => `$${(amount / 1_000_000).toFixed(1)}M`;

export const TalentProfileDialog: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const talentProfileId = useUiStore((s) => s.talentProfileId);
  const closeTalentProfile = useUiStore((s) => s.closeTalentProfile);

  const talent = useMemo(() => {
    if (!gameState || !talentProfileId) return null;
    return gameState.talent.find(t => t.id === talentProfileId) || null;
  }, [gameState, talentProfileId]);

  const relationships = useMemo(() => {
    if (!gameState || !talent || !talent.relationships) return [] as Array<{ id: string; name: string; type: string; note?: string }>;

    return Object.entries(talent.relationships)
      .map(([otherId, type]) => {
        const other = gameState.talent.find(t => t.id === otherId);
        return {
          id: otherId,
          name: other?.name || otherId,
          type,
          note: talent.relationshipNotes?.[otherId],
        };
      })
      .slice(0, 12);
  }, [gameState, talent]);

  const filmography = useMemo(() => {
    if (!gameState || !talent) return [];

    const existing = talent.filmography || [];
    if (existing.length > 0) return existing;

    const allProjects = [
      ...gameState.projects,
      ...gameState.allReleases.filter((r): r is any => 'script' in (r as any)),
    ];

    return TalentFilmographyManager.deriveFilmographyForTalent(allProjects as any, talent.id, gameState.currentYear);
  }, [gameState, talent]);

  return (
    <Dialog
      open={!!talentProfileId}
      onOpenChange={(open) => {
        if (!open) closeTalentProfile();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{talent ? talent.name : 'Talent Profile'}</DialogTitle>
        </DialogHeader>

        {!gameState || !talent ? (
          <div className="text-sm text-muted-foreground">Talent not found.</div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{talent.type}</Badge>
                <Badge variant="secondary">Rep: {Math.round(talent.reputation || 0)}/100</Badge>
                {typeof talent.fame === 'number' && (
                  <Badge variant="secondary">Fame: {Math.round(talent.fame)}/100</Badge>
                )}
                <Badge variant="outline">Age: {talent.age}</Badge>
                <Badge variant="outline">Exp: {talent.experience}y</Badge>
                <Badge variant="outline" className="capitalize">{talent.contractStatus}</Badge>
                <Badge variant="secondary">Value: {formatMoney(talent.marketValue || 0)}</Badge>
              </div>

              {(talent.archetype || talent.biography) && (
                <div className="space-y-1">
                  {talent.archetype && (
                    <p className="text-sm font-medium">{talent.archetype}</p>
                  )}
                  {talent.biography && (
                    <p className="text-sm text-muted-foreground">{talent.biography}</p>
                  )}
                </div>
              )}

              {((talent.narratives || []).length > 0 || (talent.movementTags || []).length > 0) && (
                <div className="space-y-2">
                  {(talent.narratives || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(talent.narratives || []).slice(0, 10).map((n, i) => (
                        <Badge key={i} variant="outline">{n}</Badge>
                      ))}
                    </div>
                  )}
                  {(talent.movementTags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(talent.movementTags || []).slice(0, 10).map((t, i) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(talent.traits || []).length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Traits</div>
                  <div className="flex flex-wrap gap-2">
                    {(talent.traits || []).slice(0, 12).map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(talent.genres || []).length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Genres</div>
                  <div className="flex flex-wrap gap-2">
                    {(talent.genres || []).slice(0, 12).map((g) => (
                      <Badge key={g} variant="secondary" className="capitalize">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(talent.awards || []).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Awards</div>
                    <div className="space-y-2">
                      {(talent.awards || [])
                        .slice()
                        .sort((a: any, b: any) => (b.year || 0) - (a.year || 0))
                        .slice(0, 8)
                        .map((a: any, i: number) => (
                          <div key={a.id || i} className="rounded border p-2 text-sm">
                            <div className="font-medium">
                              {(a.year ? `${a.year} ` : '') + (a.ceremony || 'Award')} — {a.category || 'Award'}
                            </div>
                            {(a.projectTitle || a.projectId) && (
                              <div className="text-muted-foreground">{a.projectTitle || a.projectId}</div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {filmography.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Filmography</div>
                    <div className="space-y-2">
                      {filmography
                        .slice(0, 12)
                        .map((f) => (
                          <div key={f.projectId} className="rounded border p-2 text-sm">
                            <div className="font-medium">{f.year ? `${f.year} — ` : ''}{f.title}</div>
                            <div className="text-muted-foreground">
                              {f.role}
                              {typeof f.boxOffice === 'number' ? ` • ${Math.round(f.boxOffice / 1_000_000)}M` : ''}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {relationships.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Relationships</div>
                    <div className="space-y-2">
                      {relationships.map((r) => (
                        <div key={r.id} className="rounded border p-2 text-sm">
                          <div className="font-medium">{r.name} — {r.type}</div>
                          {r.note && <div className="text-muted-foreground">{r.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
