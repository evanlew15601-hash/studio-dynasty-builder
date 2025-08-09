import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrophyIcon, StarIcon, CalendarIcon } from '@/components/ui/icons';
import { Project, StudioAward } from '@/types/game';

interface AwardsShowModalProps {
  open: boolean;
  onClose: () => void;
  ceremony: string;
  nominations: Array<{
    project: Project;
    category: string;
    won: boolean;
    award?: StudioAward;
  }>;
  year: number;
}

export const AwardsShowModal: React.FC<AwardsShowModalProps> = ({
  open,
  onClose,
  ceremony,
  nominations,
  year
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showingResults, setShowingResults] = useState(false);

  const nextSlide = () => {
    if (currentSlide < nominations.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setShowingResults(true);
    }
  };

  const winners = nominations.filter(nom => nom.won);
  const totalNominations = nominations.length;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600">
              <TrophyIcon className="w-6 h-6 text-white" />
            </div>
            {ceremony} Awards {year}
          </DialogTitle>
        </DialogHeader>

        {!showingResults ? (
          // Nomination/Winner Announcement Slides
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {currentSlide + 1} of {nominations.length}
              </div>
              <Progress value={((currentSlide + 1) / nominations.length) * 100} className="mt-2" />
            </div>

            {nominations[currentSlide] && (
              <Card className="border-2 border-gradient-golden">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {nominations[currentSlide].category}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-bold mb-2">
                      {nominations[currentSlide].project.title}
                    </div>
                    <div className="text-muted-foreground">
                      {nominations[currentSlide].project.script.genre} • 
                      Studio Production
                    </div>
                  </div>

                  {nominations[currentSlide].won ? (
                    <div className="space-y-4">
                      <div className="text-6xl animate-bounce">🏆</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        WINNER!
                      </div>
                      <div className="text-lg text-muted-foreground">
                        Congratulations to your studio!
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-4xl">🎭</div>
                      <div className="text-xl font-semibold">
                        Nominated
                      </div>
                      <div className="text-muted-foreground">
                        A prestigious nomination for your studio
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button onClick={nextSlide} size="lg">
                {currentSlide < nominations.length - 1 ? 'Next Award' : 'View Results'}
              </Button>
            </div>
          </div>
        ) : (
          // Final Results Summary
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Awards Night Results</h3>
              <div className="text-muted-foreground">
                Your studio's performance at the {ceremony} Awards {year}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{winners.length}</div>
                  <div className="text-sm text-muted-foreground">Awards Won</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{totalNominations}</div>
                  <div className="text-sm text-muted-foreground">Total Nominations</div>
                </CardContent>
              </Card>
            </div>

            {winners.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-yellow-600" />
                    Awards Won
                  </h4>
                  <div className="space-y-3">
                    {winners.map((winner, index) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <div>
                          <div className="font-medium">{winner.project.title}</div>
                          <div className="text-sm text-muted-foreground">{winner.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">+{winner.award?.reputationBoost || 0} Reputation</div>
                          <div className="text-xs text-muted-foreground">
                            +${((winner.award?.revenueBoost || 0) / 1000000).toFixed(0)}M Revenue
                          </div>
                        </div>
                      </div>
                    ))}
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