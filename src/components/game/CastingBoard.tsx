import React, { useState } from 'react';
import { Project, TalentPerson, ProductionRole, ScriptCharacter } from '@/types/game';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { isDirectorRole } from '@/utils/scriptRoles';
import { CastingBoardFilters, CastingFilters } from './CastingBoardFilters';
import { 
  CastingIcon, 
  TalentIcon, 
  ContractIcon, 
  ReputationIcon,
  BudgetIcon,
  AwardIcon
} from '@/components/ui/icons';

interface CastingBoardProps {
  selectedProject: Project | null;
}

export const CastingBoard: React.FC<CastingBoardProps> = ({
  selectedProject: propSelectedProject,
}) => {
  const gameState = useGameStore((s) => s.game);
  const replaceProject = useGameStore((s) => s.replaceProject);
  const updateTalent = useGameStore((s) => s.updateTalent);
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);
  const { toast } = useToast();
  const [filters, setFilters] = useState<CastingFilters>({
    talentType: 'all',
    genre: 'all',
    ageRange: [18, 80],
    reputationRange: [0, 100],
    experienceRange: [0, 50],
    marketValueRange: [0, 50000000],
    hasAwards: null,
    searchQuery: ''
  });

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading casting board...</div>;
  }

  const selectedProject = propSelectedProject
    ? gameState.projects.find(p => p.id === propSelectedProject.id) || propSelectedProject
    : null;

  const availableTalent = gameState.talent.filter(talent => {
    if (talent.contractStatus !== 'available') return false;
    
    // Apply filters
    if (filters.talentType !== 'all' && talent.type !== filters.talentType) return false;
    if (filters.genre !== 'all' && !talent.genres.includes(filters.genre)) return false;
    if (talent.age < filters.ageRange[0] || talent.age > filters.ageRange[1]) return false;
    if (talent.reputation < filters.reputationRange[0] || talent.reputation > filters.reputationRange[1]) return false;
    if (talent.experience < filters.experienceRange[0] || talent.experience > filters.experienceRange[1]) return false;
    if (talent.marketValue < filters.marketValueRange[0] || talent.marketValue > filters.marketValueRange[1]) return false;
    if (filters.hasAwards !== null && (talent.awards?.length > 0) !== filters.hasAwards) return false;
    if (filters.searchQuery && !talent.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    
    return true;
  });

  const handleHireTalent = (talent: TalentPerson, role: string) => {
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project first.",
        variant: "destructive"
      });
      return;
    }

    const contractWeeks = 16; // Standard contract length
    const weeklySalary = talent.marketValue / 52;
    const totalCost = weeklySalary * contractWeeks;

    if (totalCost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford ${talent.name} - need ${(totalCost / 1000000).toFixed(0)}M`,
        variant: "destructive"
      });
      return;
    }

    const newRole: ProductionRole = {
      talentId: talent.id,
      role: role,
      salary: weeklySalary,
      points: talent.type === 'director' ? 15 : 10,
      contractTerms: {
        duration: new Date(Date.now() + contractWeeks * 7 * 24 * 60 * 60 * 1000),
        exclusivity: true,
        merchandising: true,
        sequelOptions: selectedProject.script?.franchiseId ? 2 : 1
      }
    };

    const contractedTalent = {
      talentId: talent.id,
      role: role,
      weeklyPay: weeklySalary,
      contractWeeks: contractWeeks,
      weeksRemaining: contractWeeks,
      startWeek: gameState.currentWeek
    };

    // Base project updates for legacy cast/crew/contracted structures
    let updatedProject: Project = {
      ...selectedProject,
      cast: talent.type === 'actor' ? [...selectedProject.cast, newRole] : selectedProject.cast,
      crew: talent.type === 'director' ? [...selectedProject.crew, newRole] : selectedProject.crew,
      contractedTalent: [...selectedProject.contractedTalent, contractedTalent]
    };

    // Keep canonical script character assignments in sync so release/phase validation works
    if (selectedProject.script) {
      const existingChars = selectedProject.script.characters || [];
      let updatedCharacters: ScriptCharacter[] = existingChars;

      if (talent.type === 'director') {
        // Prefer an existing director role
        const directorIndex = existingChars.findIndex(c => isDirectorRole(c));
        if (directorIndex >= 0) {
          updatedCharacters = existingChars.map((c, idx) =>
            idx === directorIndex ? { ...c, assignedTalentId: talent.id } : c
          );
        } else {
          // Seed a simple Director character if none exist
          const newDirector: ScriptCharacter = {
            id: `director-${Date.now()}`,
            name: 'Director',
            description: 'Film director responsible for creative vision',
            importance: 'crew',
            traits: ['mandatory'],
            requiredType: 'director',
            assignedTalentId: talent.id,
          } as any;
          updatedCharacters = [...existingChars, newDirector];
        }
      } else if (talent.type === 'actor') {
        // Prefer an explicit lead actor role
        const leadIndex = existingChars.findIndex(
          c => c.importance === 'lead' && (c.requiredType === 'actor' || !c.requiredType)
        );

        if (leadIndex >= 0) {
          updatedCharacters = existingChars.map((c, idx) =>
            idx === leadIndex
              ? {
                ...c,
                requiredType: c.requiredType || 'actor',
                requiredGender: c.requiredGender || talent.gender || 'Male',
                assignedTalentId: talent.id
              }
              : c
          );
        } else {
          // Seed a generic lead character if none exist
          const newLead: ScriptCharacter = {
            id: `lead-${Date.now()}`,
            name: 'Lead Character',
            description: 'Main protagonist of the story',
            importance: 'lead',
            traits: ['mandatory'],
            requiredType: 'actor',
            requiredGender: talent.gender || 'Male',
            assignedTalentId: talent.id,
          } as any;
          updatedCharacters = [...existingChars, newLead];
        }
      }

      if (updatedCharacters !== existingChars) {
        updatedProject = {
          ...updatedProject,
          script: {
            ...selectedProject.script,
            characters: updatedCharacters,
          },
        };
      }
    }

    replaceProject(updatedProject);

    updateTalent(talent.id, {
      contractStatus: 'contracted' as const
    });

    toast({
      title: "Talent Hired!",
      description: `${talent.name} has been cast as ${role}`,
    });
  };

  const formatCurrency = (amount: number) => `$${(amount / 1000000).toFixed(0)}M`;

  const getProjectBudget = () => {
    return selectedProject ? selectedProject.budget.total * 0.05 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Casting Filters */}
      <CastingBoardFilters
        filters={filters}
        onFiltersChange={setFilters}
        talent={gameState.talent.filter(t => t.contractStatus === 'available')}
      />

      {/* Project Selection */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <CastingIcon className="mr-3" size={24} />
            Casting Board
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedProject ? (
            <div className="text-center py-8">
              <CastingIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
              <p className="text-lg text-muted-foreground mb-2">No Project Selected</p>
              <p className="text-sm text-muted-foreground">
                Go to Script Development to greenlight a project first
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{selectedProject.title}</h3>
                  <p className="text-muted-foreground">
                    {selectedProject.script?.genre || 'Unknown'} • Budget: {formatCurrency(selectedProject.budget.total)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Available for Casting</p>
                  <p className="font-semibold text-primary">{formatCurrency(getProjectBudget())}</p>
                </div>
              </div>

              {/* Current Cast */}
              {selectedProject.cast.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center">
                    <TalentIcon className="mr-2" size={16} />
                    Current Cast
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProject.cast.map((role, index) => {
                      const talent = gameState.talent.find(t => t.id === role.talentId);
                      return talent ? (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-card border">
                          <Avatar>
                            <AvatarFallback>{talent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <button
                              type="button"
                              className="text-left font-medium hover:underline"
                              onClick={() => openTalentProfile(talent.id)}
                            >
                              {talent.name}
                            </button>
                            <p className="text-sm text-muted-foreground">{role.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(role.salary)}</p>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Talent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {availableTalent.map((talent) => (
          <Card key={talent.id} className="card-premium hover:shadow-golden transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-golden text-primary-foreground">
                      {talent.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="font-bold text-lg hover:underline"
                        onClick={() => openTalentProfile(talent.id)}
                      >
                        {talent.name}
                      </button>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => openTalentProfile(talent.id)}
                      >
                        Profile
                      </Button>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {talent.type}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <ReputationIcon size={14} />
                    <span>{Math.round(talent.reputation)}/100</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Market Value:</span>
                  <span className="font-semibold">{formatCurrency(talent.marketValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Experience:</span>
                  <span>{talent.experience} years</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{talent.age}</span>
                </div>
              </div>

              {/* Genres */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Specializes in:</p>
                <div className="flex flex-wrap gap-1">
                  {talent.genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Awards */}
              {talent.awards && talent.awards.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center">
                    <AwardIcon className="mr-1" size={14} />
                    Awards:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {talent.awards.map((award, index) => (
                      <Badge key={typeof award === 'string' ? award : award.id || index} variant="outline" className="text-xs">
                        {typeof award === 'string' ? award : award.category || 'Award'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Traits */}
              {talent.traits && talent.traits.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Traits:</p>
                  <div className="flex flex-wrap gap-1">
                    {talent.traits.map((trait) => (
                      <Badge key={trait} className="text-xs bg-gradient-to-r from-primary/20 to-accent/20">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject && (
                <div className="pt-2 border-t">
                  <Button 
                    onClick={() => handleHireTalent(talent, talent.type === 'director' ? 'Director' : 'Lead Actor')}
                    className="w-full btn-studio"
                    size="sm"
                  >
                    <ContractIcon className="mr-2" size={16} />
                    Hire for {formatCurrency(selectedProject.budget.total * (talent.type === 'director' ? 0.08 : 0.05))}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {availableTalent.length === 0 && (
        <Card className="card-premium">
          <CardContent className="text-center py-12">
            <TalentIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
            <p className="text-lg text-muted-foreground mb-2">No Available Talent</p>
            <p className="text-sm text-muted-foreground">
              All talent is currently under contract
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};