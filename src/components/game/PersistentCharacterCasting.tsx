import React, { useState } from 'react';
import { GameState, Project, TalentPerson, ScriptCharacter } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Crown, History, UserCheck, Star, Users, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface PersistentCharacterCastingProps {
  project: Project;
  gameState: GameState;
  onProjectUpdate: (project: Project) => void;
}

interface CharacterHistory {
  characterName: string;
  talentId: string;
  talentName: string;
  projectId: string;
  projectTitle: string;
  performance: {
    boxOffice?: number;
    criticsScore?: number;
    audienceScore?: number;
  };
  releaseYear?: number;
}

interface ContractOffer {
  talentId: string;
  characterId: string;
  baseSalary: number;
  sequelBonus: number;
  loyaltyDiscount: number;
  totalCost: number;
  contractTerms: {
    exclusivity: boolean;
    merchandising: boolean;
    sequelOptions: number;
    duration: number; // weeks
  };
}

export const PersistentCharacterCasting: React.FC<PersistentCharacterCastingProps> = ({
  project,
  gameState,
  onProjectUpdate
}) => {
  const { toast } = useToast();
  const [selectedCharacter, setSelectedCharacter] = useState<ScriptCharacter | null>(null);
  const [contractOffers, setContractOffers] = useState<ContractOffer[]>([]);

  // Get character casting history from all previous projects
  const getCharacterHistory = (): CharacterHistory[] => {
    const history: CharacterHistory[] = [];

    // Check all completed projects for character casting
    gameState.projects
      .filter(p => p.status === 'released' && p.script?.characters)
      .forEach(pastProject => {
        pastProject.script?.characters?.forEach(character => {
          if (character.excluded) return;
          if (!character.assignedTalentId) return;

          const talent = gameState.talent.find(t => t.id === character.assignedTalentId);
          if (!talent) return;

          history.push({
            characterName: character.name,
            talentId: talent.id,
            talentName: talent.name,
            projectId: pastProject.id,
            projectTitle: pastProject.title,
            performance: {
              boxOffice: pastProject.metrics?.boxOfficeTotal,
              criticsScore: pastProject.metrics?.criticsScore,
              audienceScore: pastProject.metrics?.audienceScore
            },
            releaseYear: pastProject.releaseYear
          });
        });
      });

    return history;
  };

  // Find actors who have played similar/same characters before
  const findReturningActors = (character: ScriptCharacter): CharacterHistory[] => {
    const history = getCharacterHistory();
    
    // For franchise films, look for exact character matches by name
    if (project.script?.franchiseId) {
      const exactMatches = history.filter(h => 
        h.characterName.toLowerCase() === character.name.toLowerCase()
      );
      if (exactMatches.length > 0) return exactMatches;
    }
    
    // Look for similar character types and importance levels
    return history.filter(h => {
      const pastProject = gameState.projects.find(p => p.id === h.projectId);
      const pastCharacter = pastProject?.script?.characters?.find(c => !c.excluded && c.name === h.characterName);
      
      if (!pastCharacter) return false;
      
      // Match by character importance and type
      return pastCharacter.importance === character.importance &&
             pastCharacter.requiredType === character.requiredType &&
             // Prefer same genre
             (pastProject?.script?.genre === project.script?.genre);
    });
  };

  // Calculate sequel/returning actor contract terms
  const calculateReturningActorOffer = (talent: TalentPerson, character: ScriptCharacter, history: CharacterHistory[]): ContractOffer => {
    const baseMarketValue = talent.marketValue || 5000000;
    
    // Find their best performance in similar roles
    const bestPerformance = history
      .filter(h => h.talentId === talent.id)
      .sort((a, b) => (b.performance.boxOffice || 0) - (a.performance.boxOffice || 0))[0];
    
    let loyaltyDiscount = 0;
    let sequelBonus = 0;
    
    if (bestPerformance) {
      // Loyalty discount for returning actors (5-15% discount)
      loyaltyDiscount = Math.min(0.15, Math.max(0.05, (bestPerformance.performance.criticsScore || 0) / 1000));
      
      // Sequel bonus if it was successful (increases cost but guarantees participation)
      if ((bestPerformance.performance.boxOffice || 0) > 50000000) {
        sequelBonus = baseMarketValue * 0.1; // 10% bonus for successful franchise returns
      }
    }
    
    const baseSalary = baseMarketValue * (1 - loyaltyDiscount);
    const totalCost = baseSalary + sequelBonus;
    
    return {
      talentId: talent.id,
      characterId: character.id,
      baseSalary,
      sequelBonus,
      loyaltyDiscount,
      totalCost,
      contractTerms: {
        exclusivity: character.importance === 'lead',
        merchandising: (bestPerformance?.performance.boxOffice || 0) > 100000000,
        sequelOptions: project.script?.franchiseId ? 2 : 1,
        duration: 16 // standard 16-week contract
      }
    };
  };

  // Quick-cast returning actor
  const quickCastReturningActor = (character: ScriptCharacter, talent: TalentPerson) => {
    const history = findReturningActors(character);
    const offer = calculateReturningActorOffer(talent, character, history);
    
    if (offer.totalCost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford ${talent.name} - need $${(offer.totalCost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }
    
    // Update character assignment
    const updatedCharacters = (project.script?.characters || []).map(c =>
      c.id === character.id ? { ...c, assignedTalentId: talent.id } : c
    );
    
    const updatedProject = {
      ...project,
      script: {
        ...project.script!,
        characters: updatedCharacters
      }
    };
    
    onProjectUpdate(updatedProject);
    
    toast({
      title: "Returning Actor Cast",
      description: `${talent.name} returns as ${character.name} with loyalty discount!`,
    });
  };

  // Start negotiation with returning actor
  const startNegotiation = (character: ScriptCharacter, talent: TalentPerson) => {
    const history = findReturningActors(character);
    const offer = calculateReturningActorOffer(talent, character, history);
    
    setContractOffers(prev => [...prev.filter(o => o.characterId !== character.id), offer]);
    setSelectedCharacter(character);
  };

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Character Casting History
            {project.script?.franchiseId && (
              <Badge variant="default">
                <Crown className="h-3 w-3 mr-1" />
                Franchise
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {project.script?.franchiseId ? 
              'Cast returning actors for franchise continuity with loyalty discounts' :
              'Find actors with experience in similar roles for better chemistry'
            }
          </p>
        </CardContent>
      </Card>

      {/* Character Casting with History */}
      <div className="space-y-4">
        {(project.script?.characters || []).filter(c => !c.excluded || !!c.assignedTalentId).map(character => {
          const returningActors = findReturningActors(character);
          const currentTalent = character.assignedTalentId ? 
            gameState.talent.find(t => t.id === character.assignedTalentId) : null;
          
          return (
            <Card key={character.id} className="border-l-4 border-l-primary/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {character.importance === 'lead' && <Crown className="h-4 w-4 text-yellow-500" />}
                      {character.importance === 'supporting' && <Star className="h-4 w-4 text-blue-500" />}
                      {character.name}
                      <Badge variant="outline" className="capitalize">
                        {character.importance}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>
                  
                  {currentTalent && (
                    <Badge variant="default">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Cast: {currentTalent.name}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Current Casting */}
                {currentTalent && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {currentTalent.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{currentTalent.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(currentTalent.marketValue / 1000000).toFixed(1)}M market value
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Returning Actor Options */}
                {returningActors.length > 0 && !currentTalent && (
                  <>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Returning Actors Available
                    </h4>
                    
                    <div className="space-y-3">
                      {returningActors.slice(0, 3).map(history => {
                        const talent = gameState.talent.find(t => t.id === history.talentId);
                        if (!talent || talent.contractStatus !== 'available') return null;
                        
                        const offer = calculateReturningActorOffer(talent, character, [history]);
                        
                        return (
                          <div key={history.talentId} className="flex items-center justify-between p-3 border rounded bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-amber-100 text-amber-700">
                                  {talent.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{talent.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Previously: {history.characterName} in "{history.projectTitle}"
                                </p>
                                <p className="text-xs text-green-600">
                                  Loyalty Discount: {(offer.loyaltyDiscount * 100).toFixed(1)}% 
                                  • Total: ${(offer.totalCost / 1000000).toFixed(1)}M
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startNegotiation(character, talent)}
                              >
                                Negotiate
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => quickCastReturningActor(character, talent)}
                                className="bg-amber-600 hover:bg-amber-700"
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Quick Cast
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                
                {/* Character History Display */}
                {returningActors.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="mt-3">
                        <History className="h-3 w-3 mr-1" />
                        View Character History ({returningActors.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Casting History: {character.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {returningActors.map(history => (
                          <div key={`${history.projectId}-${history.talentId}`} className="p-3 border rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{history.talentName}</p>
                                <p className="text-sm text-muted-foreground">
                                  as {history.characterName} in "{history.projectTitle}" ({history.releaseYear})
                                </p>
                              </div>
                              <div className="text-right text-sm">
                                {history.performance.boxOffice && (
                                  <div>${(history.performance.boxOffice / 1000000).toFixed(0)}M BO</div>
                                )}
                                {history.performance.criticsScore && (
                                  <div>{history.performance.criticsScore}/100 critics</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {returningActors.length === 0 && !currentTalent && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No casting history for this character type</p>
                    <p className="text-xs">Use regular casting to find new talent</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Contract Negotiations */}
      {contractOffers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contract Negotiations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contractOffers.map(offer => {
                const talent = gameState.talent.find(t => t.id === offer.talentId);
                const character = project.script?.characters?.find(c => c.id === offer.characterId);
                
                if (!talent || !character) return null;
                
                return (
                  <div key={offer.talentId} className="p-4 border rounded">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{talent.name} as {character.name}</h4>
                        <p className="text-sm text-muted-foreground">Contract Terms</p>
                      </div>
                      <Badge variant="outline">
                        Total: ${(offer.totalCost / 1000000).toFixed(1)}M
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>Base Salary: ${(offer.baseSalary / 1000000).toFixed(1)}M</div>
                      <div>Sequel Bonus: ${(offer.sequelBonus / 1000000).toFixed(1)}M</div>
                      <div>Loyalty Discount: {(offer.loyaltyDiscount * 100).toFixed(1)}%</div>
                      <div>Contract Duration: {offer.contractTerms.duration} weeks</div>
                      <div>Sequel Options: {offer.contractTerms.sequelOptions}</div>
                      <div>Merchandising: {offer.contractTerms.merchandising ? 'Yes' : 'No'}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => quickCastReturningActor(character, talent)}
                        disabled={offer.totalCost > gameState.studio.budget}
                      >
                        Accept Terms
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setContractOffers(prev => prev.filter(o => o.talentId !== offer.talentId))}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};