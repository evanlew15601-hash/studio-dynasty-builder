import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
// Temporary interfaces until AwardsSystem is created
interface AwardNomination {
  id: string;
  categoryId: string;
  projectId: string;
  projectTitle: string;
  studioId: string;
  studioName: string;
  nominee?: string;
  nomineeRole?: string;
  score: number;
  year: number;
}

interface AwardWinner {
  nomination: AwardNomination;
  categoryName: string;
  won: boolean;
  ceremonyYear: number;
}

interface AwardsCeremony {
  year: number;
  week: number;
  nominations: AwardNomination[];
  winners: AwardWinner[];
  playerStudioWins: number;
  playerStudioNominations: number;
}
import { Trophy, Star, Award, Calendar, TrendingUp } from 'lucide-react';

interface AwardsCeremonyModalProps {
  ceremony: AwardsCeremony;
  isOpen: boolean;
  onClose: () => void;
}

export const AwardsCeremonyModal: React.FC<AwardsCeremonyModalProps> = ({
  ceremony,
  isOpen,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categorizedWinners = ceremony.winners.reduce((acc, winner) => {
    if (!acc[winner.nomination.categoryId]) {
      acc[winner.nomination.categoryId] = [];
    }
    acc[winner.nomination.categoryId].push(winner);
    return acc;
  }, {} as Record<string, AwardWinner[]>);

  const playerWins = ceremony.winners.filter(w => 
    w.won && w.nomination.studioId === 'player-studio'
  );

  const playerNominations = ceremony.winners.filter(w => 
    !w.won && w.nomination.studioId === 'player-studio'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center font-studio text-2xl">
            <Trophy className="mr-3 text-yellow-500" size={28} />
            Year {ceremony.year} Awards Ceremony
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Player Studio Summary */}
          {(playerWins.length > 0 || playerNominations.length > 0) && (
            <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <Star className="mr-2" size={20} />
                  Your Studio Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {playerWins.length}
                    </div>
                    <div className="text-sm text-yellow-700">Awards Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">
                      {ceremony.playerStudioNominations}
                    </div>
                    <div className="text-sm text-amber-700">Total Nominations</div>
                  </div>
                </div>
                
                {playerWins.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">Your Wins:</h4>
                    {playerWins.map((winner, index) => {
                      const hasNamedNominee = !!winner.nomination.nominee;
                      const label = hasNamedNominee
                        ? `${winner.categoryName}: ${winner.nomination.nominee}${winner.nomination.projectTitle ? ` (${winner.nomination.projectTitle})` : ''}`
                        : `${winner.categoryName}: ${winner.nomination.projectTitle}`;
                      return (
                        <Badge key={index} variant="default" className="mr-2 mb-1">
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Awards by Category */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="mr-2" size={20} />
                All Winners & Nominees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-6">
                  {Object.entries(categorizedWinners).map(([categoryId, winners]) => {
                    const winnersList = winners as AwardWinner[];
                    const winner = winnersList.find(w => w.won);
                    const nominees = winnersList.filter(w => !w.won);
                    
                    return (
                      <div key={categoryId} className="border-b border-border/50 pb-4">
                        <h3 className="font-semibold text-lg mb-3 text-primary">
                          {winner?.categoryName || categoryId}
                        </h3>
                        
                        {winner && (
                          <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-yellow-800">
                                  {(() => {
                                    const hasNamedNominee = !!winner.nomination.nominee;
                                    if (hasNamedNominee) {
                                      const filmTitle = winner.nomination.projectTitle;
                                      const nomineeName = winner.nomination.nominee;
                                      return `WINNER: ${nomineeName}${filmTitle ? ` (${filmTitle})` : ''}`;
                                    }
                                    return `WINNER: ${winner.nomination.projectTitle}`;
                                  })()}
                                </div>
                                <div className="text-sm text-yellow-700">
                                  {winner.nomination.studioName}
                                </div>
                              </div>
                              <Trophy className="text-yellow-500" size={24} />
                            </div>
                          </div>
                        )}
                        
                        {nominees.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              Nominees:
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {nominees.map((nominee, index) => {
                                const hasNamedNominee = !!nominee.nomination.nominee;
                                const displayTitle = hasNamedNominee
                                  ? `${nominee.nomination.nominee}${nominee.nomination.projectTitle ? ` (${nominee.nomination.projectTitle})` : ''}`
                                  : nominee.nomination.projectTitle;

                                return (
                                  <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                                    <div className="font-medium">
                                      {displayTitle}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {nominee.nomination.studioName}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};