import React, { useMemo } from 'react';
import type { EventChoice, EventConsequence, GameEvent } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function isChoiceAvailable(choice: EventChoice, budget: number, reputation: number): { ok: boolean; reason?: string } {
  const reqs = choice.requirements || [];
  for (const req of reqs) {
    if (req.type === 'budget' && budget < req.threshold) {
      return { ok: false, reason: req.description };
    }
    if (req.type === 'reputation' && reputation < req.threshold) {
      return { ok: false, reason: req.description };
    }
  }

  return { ok: true };
}

function consequenceTone(c: EventConsequence): 'default' | 'destructive' | 'secondary' {
  if (c.type === 'budget' && c.impact < 0) return 'destructive';
  if (c.type === 'reputation' && c.impact < 0) return 'destructive';
  if (c.impact > 0) return 'secondary';
  return 'default';
}

export const GameEventModal: React.FC<{
  onChoice?: (event: GameEvent, choiceId: string | number | undefined) => void;
}> = ({ onChoice }) => {
  const game = useGameStore((s) => s.game);
  const resolve = useGameStore((s) => s.resolveGameEvent);

  const event = game?.eventQueue?.[0];

  const budget = game?.studio.budget ?? 0;
  const reputation = game?.studio.reputation ?? 0;

  const choices = useMemo(() => event?.choices || [], [event?.id]);

  if (!game || !event) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>

          {choices.length > 0 && (
            <div className="space-y-3">
              {choices.map((choice, idx) => {
                const availability = isChoiceAvailable(choice, budget, reputation);
                return (
                  <div key={choice.id || idx} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{choice.text}</div>
                      <Button
                        size="sm"
                        disabled={!availability.ok}
                        onClick={() => {
                          const choiceId = choice.id ?? idx;
                          onChoice?.(event, choiceId);
                          resolve(event.id, choiceId);
                        }}
                      >
                        Choose
                      </Button>
                    </div>

                    {!availability.ok && availability.reason && (
                      <div className="mt-2 text-xs text-muted-foreground">{availability.reason}</div>
                    )}

                    {(choice.consequences || []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {choice.consequences.map((c, cIdx) => (
                          <Badge key={cIdx} variant={consequenceTone(c)} className="text-xs">
                            {c.description}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {choices.length === 0 && (
            <DialogFooter>
              <Button onClick={() => resolve(event.id)}>Continue</Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
