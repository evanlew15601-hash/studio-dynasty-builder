
import { useState, useMemo } from 'react';
import { Project, TalentPerson, ProductionRole, ScriptCharacter } from '@/types/game';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { isDirectorRole } from '@/utils/scriptRoles';
import { describeTalentInterest, recordStudioNegotiationOutcome } from '@/utils/talentNegotiation';
import { TalentNegotiationDialog } from './TalentNegotiationDialog';
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
  const shortlistedTalentIds = useGameStore((s) => s.game?.shortlistedTalentIds ?? []);
  const toggleShortlist = useGameStore((s) => s.toggleShortlist);
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

  const TALENT_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(0);

  const [negotiationTarget, setNegotiationTarget] = useState<{ talent: TalentPerson; role: string } | null>(null);

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

  const paginatedTalent = useMemo(() => {
    const start = currentPage * TALENT_PER_PAGE;
    return availableTalent.slice(start, start + TALENT_PER_PAGE);
  }, [availableTalent, currentPage]);

  const handleHireTalent = (talent: TalentPerson, role: string) => {
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project first.",
        variant: "destructive"
      });
      return;
    }

    setNegotiationTarget({ talent, role });
  };

  const finalizeHireTalent = (result: { interestScore: number; askWeeklyPay: number; weeklyPay: number; contractWeeks: number }) => {
    if (!selectedProject || !negotiationTarget) return;

    const { talent, role } = negotiationTarget;
    const interest = describeTalentInterest(result.interestScore);

    const weeklySalary = result.weeklyPay;
    const contractWeeks = result.contractWeeks;

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
      cast: talent.type === 'actor' ? [...selectedProject.cast.filter(r => r.role !== role), newRole] : selectedProject.cast,
      crew: talent.type === 'director' ? [...selectedProject.crew.filter(r => r.role !== role), newRole] : selectedProject.crew,
      contractedTalent: [...selectedProject.contractedTalent.filter(ct => ct.role !== role), contractedTalent]
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
      contractStatus: 'contracted' as const,
      currentContractWeeks: contractWeeks,
      studioInterest: recordStudioNegotiationOutcome({
        talent,
        studioId: gameState.studio.id,
        currentWeek: gameState.currentWeek,
        currentYear: gameState.currentYear,
        interestScore: result.interestScore,
        outcome: 'signed',
      }),
    });

    toast({
      title: "Talent Signed!",
      description: `${talent.name} accepted (${interest.label}) — ${'\u0024'}${(weeklySalary / 1000).toFixed(0)}k/week for ${contractWeeks} weeks as ${role}`,
    });

    setNegotiationTarget(null);
  };

  const formatCurrency = (amount: number) => `$${(amount / 1000000).toFixed(0)}M`;

  const getProjectBudget = () => {
    return selectedProject ? selectedProject.budget.total * 0.05 : 0;
  };

  return (
    <div className="space-y-6">
      {selectedProject && negotiationTarget && (
        <TalentNegotiationDialog
          open={true}
          onOpenChange={(open) => setNegotiationTarget(open ? negotiationTarget : null)}
          studio={gameState.studio}
          project={selectedProject}
          talent={negotiationTarget.talent}
          roleLabel={negotiationTarget.role}
          requiredType={negotiationTarget.talent.type === 'director' ? 'director' : 'actor'}
          importance={negotiationTarget.role.toLowerCase().includes('lead') ? 'lead' : undefined}
          currentWeek={gameState.currentWeek}
          currentYear={gameState.currentYear}
          onAccepted={finalizeHireTalent}
          onRejected={(res) => {
            const label = describeTalentInterest(res.interestScore).label;

            if (res.reason === 'too-low' || res.reason === 'not-interested') {
              updateTalent(negotiationTarget.talent.id, {
                studioInterest: recordStudioNegotiationOutcome({
                  talent: negotiationTarget.talent,
                  studioId: gameState.studio.id,
                  currentWeek: gameState.currentWeek,
                  currentYear: gameState.currentYear,
                  interestScore: res.interestScore,
                  outcome: 'rejected',
                }),
              });
            }

            toast({
              title: `${negotiationTarget.talent.name}: ${label}`,
              description:
                res.reason === 'held'
                  ? 'This talent is not currently available.'
                  : res.reason === 'cooldown'
                    ? 'Their agent isn’t taking meetings with your studio right now.'
                    : `Offer declined. (Ask: ${'\u0024'}${(res.askWeeklyPay / 1000).toFixed(0)}k/week)`,
              variant: 'destructive',
            });

            setNegotiationTarget(null);
          }}
        />
      )}

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

      {/* Shortlist Panel */}
      {shortlistedTalentIds.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">Shortlist ({shortlistedTalentIds.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => useGameStore.getState().clearShortlist()}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4">
            {shortlistedTalentIds.slice(0, 20).map((id) => {
              const talent = gameState.talent.find(t => t.id === id);
              if (!talent) return null;
              return (
                <Button
                  key={id}
                  variant="outline"
                  size="sm"
                  className="h-16 p-1 flex flex-col gap-1"
                  onClick={() => openTalentProfile(id)}
                >
                  <Avatar className="h-10 w-10 mx-auto">
                    <AvatarFallback className="text-xs">{talent.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-left truncate">{talent.name}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Talent */}
      {/* Pager */}
      {availableTalent.length > TALENT_PER_PAGE && (
        <div className="flex items-center gap-2 justify-center pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{currentPage + 1}</span>
            <span>of</span>
            <span>{Math.ceil(availableTalent.length / TALENT_PER_PAGE)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(availableTalent.length / TALENT_PER_PAGE) - 1, p + 1))}
            disabled={currentPage === Math.ceil(availableTalent.length / TALENT_PER_PAGE) - 1}
          >
            Next
          </Button>
        </div>
      )}

      {paginatedTalent.length === 0 ? (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          <TalentIcon className="mx-auto mb-4" size={64} />
          <p className="text-lg font-medium mb-2">No Matching Talent</p>
          <p className="text-sm">
            Adjust your filters or check back later. All available talent shown above if no project selected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedTalent.map((talent) => (
            <Card key={talent.id} className="card-premium hover:shadow-golden transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-golden text-primary-foreground">
                        {talent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  <div className="flex-1">
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
                    {shortlistedTalentIds.includes(talent.id) ? (
                      <Badge variant="default" className="mt-1 bg-primary">
                        Shortlisted
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-6 px-2"
                        onClick={() => toggleShortlist(talent.id)}
                      >
                        Shortlist
                      </Button>
                    )}
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
      )}

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