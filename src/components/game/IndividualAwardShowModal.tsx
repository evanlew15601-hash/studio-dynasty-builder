
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrophyIcon, StarIcon, CalendarIcon } from '@/components/ui/icons';
import { X } from 'lucide-react';
import type { Project } from '@/types/game';
import type { AwardShowCeremony } from '@/types/awardsShow';
export type { AwardShowCeremony, AwardShowNomination } from '@/types/awardsShow';

interface IndividualAwardShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  ceremony: AwardShowCeremony;
  onSkip: () => void;
}

export const IndividualAwardShowModal: React.FC<IndividualAwardShowModalProps> = ({
  isOpen,
  onClose,
  ceremony,
  onSkip
}) => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isRevealingWinner, setIsRevealingWinner] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const categories = Object.keys(ceremony.nominations);
  const currentCategory = categories[currentCategoryIndex];
  const currentNominations = ceremony.nominations[currentCategory] || [];
  const currentWinner = ceremony.winners[currentCategory];

  const isPlayerProject = (project: Project & { studioId?: string }) => (project as any).studioId === 'player';
  const studioLabel = (project: Project & { studioId?: string }) =>
    isPlayerProject(project) ? 'Your Studio' : (project.studioName || 'AI Studio');

  const playerNominations = Object.values(ceremony.nominations)
    .flat()
    .filter(nom => isPlayerProject(nom.project));
  const playerWins = Object.values(ceremony.winners)
    .filter(winner => isPlayerProject(winner.project));

  const isTalentCategory = (category: string) => {
    const noms = ceremony.nominations[category] || [];
    const winner = ceremony.winners[category];
    return noms.some(n => !!n.talentName) || !!winner?.talentName;
  };

  const nextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setIsRevealingWinner(false);
    } else {
      setShowResults(true);
    }
  };

  const revealWinner = () => {
    setIsRevealingWinner(true);
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
              {ceremony.ceremonyName} Awards {ceremony.year}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Skip Ceremony
            </Button>
          </div>
        </DialogHeader>

        {!showResults ? (
          // Category presentation
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Category {currentCategoryIndex + 1} of {categories.length}
              </div>
              <Progress value={((currentCategoryIndex + 1) / categories.length) * 100} className="mt-2" />
            </div>

            {currentCategory && (
              <>
                {/* Category Header */}
                <Card className="border-2 border-gradient-golden">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">
                      {currentCategory}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* Nominees List */}
                {!isRevealingWinner && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">The Nominees Are:</h3>
                    <div className="grid gap-3">
                      {currentNominations.map((nomination, index) => {
                        const isPlayer = isPlayerProject(nomination.project);
                        return (
                          <Card 
                            key={`${nomination.project.id}-${index}`}
                            className={`p-4 ${isPlayer ? 'border-primary bg-primary/5' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">{nomination.project.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {nomination.project.script.genre} • {studioLabel(nomination.project)}
                                </div>
                                {isTalentCategory(nomination.category) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Nominee: {nomination.talentName ?? '—'}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">
                                  Score: {nomination.score.toFixed(0)}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                    <div className="text-center">
                      <Button onClick={revealWinner} size="lg">
                        Reveal Winner
                      </Button>
                    </div>
                  </div>
                )}

                {/* Winner Reveal */}
                {isRevealingWinner && currentWinner && (
                  <div className="space-y-6">
                    <Card className="border-4 border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                      <CardContent className="p-8 text-center">
                        <TrophyIcon className="w-16 h-16 mx-auto text-yellow-600 animate-bounce mb-4" />
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          WINNER!
                        </div>
                        <div className="text-2xl font-semibold mb-2">
                          {currentWinner.project.title}
                        </div>
                        <div className="text-lg text-muted-foreground mb-2">
                          {currentWinner.project.script.genre} • {studioLabel(currentWinner.project)}
                        </div>
                        {isTalentCategory(currentWinner.category) && (currentWinner as any).talentName && (
                          <div className="text-base font-medium">
                            Recipient: {(currentWinner as any).talentName}
                          </div>
                        )}
                        {isPlayerProject(currentWinner.project) && currentWinner.award && (
                          <div className="space-y-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <div className="font-semibold text-green-700 dark:text-green-300">
                              {isTalentCategory(currentWinner.category) && (currentWinner as any).talentName
                                ? `Congratulations to ${(currentWinner as any).talentName} and your studio!`
                                : 'Congratulations!'}
                            </div>
                            <div className="text-sm">
                              +{currentWinner.award.reputationBoost} Reputation • 
                              +${(currentWinner.award.revenueBoost / 1000000).toFixed(1)}M Revenue
                            </div>
                          </div>
                        )}
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
          // Final Results Summary
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{ceremony.ceremonyName} Awards {ceremony.year}</h3>
              <div className="text-muted-foreground">
                Final Results Summary
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{playerNominations.length}</div>
                  <div className="text-sm text-muted-foreground">Your Nominations</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{playerWins.length}</div>
                  <div className="text-sm text-muted-foreground">Your Wins</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-muted-foreground">{categories.length}</div>
                  <div className="text-sm text-muted-foreground">Total Categories</div>
                </CardContent>
              </Card>
            </div>

            {playerWins.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-yellow-600" />
                    Your Studio's Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {playerWins.map((winner, index) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <div>
                          <div className="font-medium">{(winner as any).talentName ? `${(winner as any).talentName} (${winner.project.title})` : winner.project.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {Object.keys(ceremony.winners).find(cat => ceremony.winners[cat] === winner)}
                          </div>
                        </div>
                        {winner.award && (
                          <div className="text-right">
                            <div className="text-sm font-medium">+{winner.award.reputationBoost} Reputation</div>
                            <div className="text-xs text-muted-foreground">
                              +${(winner.award.revenueBoost / 1000000).toFixed(1)}M Revenue
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {playerNominations.length > 0 && playerWins.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Nominations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-4">
                    Your studio received {playerNominations.length} nomination{playerNominations.length !== 1 ? 's' : ''} but didn't win this time.
                    <br />
                    Keep producing great films!
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Button onClick={onClose} size="lg" className="px-8">
                Continue Game
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
