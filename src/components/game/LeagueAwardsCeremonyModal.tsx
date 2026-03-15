import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrophyIcon } from '@/components/ui/icons';
import { X } from 'lucide-react';
import type { LeagueAwardsCategory, LeagueAwardsCeremony, LeagueAwardsNominee } from '@/utils/leagueAwards';

function getWinner(category: LeagueAwardsCategory): LeagueAwardsNominee | undefined {
  return (category.nominees || []).find((n) => n.userId === category.winnerUserId) || category.nominees?.[0];
}

interface LeagueAwardsCeremonyModalProps {
  isOpen: boolean;
  onClose: () => void;
  ceremony: LeagueAwardsCeremony;
  onSkip: () => void;
}

export const LeagueAwardsCeremonyModal: React.FC<LeagueAwardsCeremonyModalProps> = ({
  isOpen,
  onClose,
  ceremony,
  onSkip,
}) => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isRevealingWinner, setIsRevealingWinner] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const categories = ceremony.categories || [];

  const currentCategory = categories[currentCategoryIndex];
  const currentWinner = useMemo(() => (currentCategory ? getWinner(currentCategory) : undefined), [currentCategory]);

  const nextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setIsRevealingWinner(false);
    } else {
      setShowResults(true);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600">
                <TrophyIcon className="w-6 h-6 text-white" />
              </div>
              {ceremony.ceremonyName} {ceremony.year}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Skip Ceremony
            </Button>
          </div>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Category {Math.min(categories.length, currentCategoryIndex + 1)} of {categories.length}
              </div>
              <Progress
                value={categories.length ? ((currentCategoryIndex + 1) / categories.length) * 100 : 0}
                className="mt-2"
              />
            </div>

            {currentCategory && (
              <>
                <Card className="border-2 border-gradient-golden">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">{currentCategory.name}</CardTitle>
                  </CardHeader>
                </Card>

                {!isRevealingWinner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">The Nominees Are:</h3>
                    <div className="grid gap-3">
                      {(currentCategory.nominees || []).map((nominee) => (
                        <Card key={nominee.userId} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{nominee.studioName}</div>
                              <div className="text-sm text-muted-foreground">
                                Rep {Math.round(nominee.reputation)} • Releases {nominee.releasedTitles}
                              </div>
                            </div>
                            <Badge variant="outline">League Studio</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="text-center">
                      <Button onClick={() => setIsRevealingWinner(true)} size="lg">
                        Reveal Winner
                      </Button>
                    </div>
                  </div>
                )}

                {isRevealingWinner && currentWinner && (
                  <div className="space-y-6">
                    <Card className="border-4 border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                      <CardContent className="p-8 text-center">
                        <TrophyIcon className="w-16 h-16 mx-auto text-yellow-600 animate-bounce mb-4" />
                        <div className="text-3xl font-bold text-yellow-600 mb-2">WINNER!</div>
                        <div className="text-2xl font-semibold mb-2">{currentWinner.studioName}</div>
                        <div className="text-lg text-muted-foreground">
                          Rep {Math.round(currentWinner.reputation)} • Releases {currentWinner.releasedTitles}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="text-center">
                      <Button onClick={nextCategory} size="lg">
                        {currentCategoryIndex < categories.length - 1 ? 'Next Category' : 'View Results'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{ceremony.ceremonyName} {ceremony.year}</h3>
              <div className="text-muted-foreground">Final Results Summary</div>
            </div>

            <div className="grid gap-4">
              {categories.map((category) => {
                const winner = getWinner(category);
                if (!winner) return null;
                return (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{category.name}</span>
                        <Badge variant="secondary">Winner</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-semibold">{winner.studioName}</div>
                      <div className="text-sm text-muted-foreground">
                        Rep {Math.round(winner.reputation)} • Releases {winner.releasedTitles}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center">
              <Button onClick={onClose} size="lg">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
