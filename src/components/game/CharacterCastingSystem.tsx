import React, { useState } from 'react';
import { Project, TalentPerson, ScriptCharacter } from '@/types/game';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { talentMatchesRole } from '@/utils/castingEligibility';
import { isDirectorRole } from '@/utils/scriptRoles';
import { describeTalentInterest, recordStudioNegotiationOutcome } from '@/utils/talentNegotiation';
import { TalentNegotiationDialog } from './TalentNegotiationDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TalentPortrait } from '@/components/ui/talent-portrait';
import { useToast } from '@/hooks/use-toast';
import { Users, User, Crown, Star, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CharacterCastingSystemProps {
  project: Project;
}

interface CastingSlot {
  character: ScriptCharacter;
  talent: TalentPerson | null;
  isRequired: boolean;
  contractCost: number;
}

export const CharacterCastingSystem: React.FC<CharacterCastingSystemProps> = ({
  project: propProject
}) => {
  const gameState = useGameStore((s) => s.game);
  const project = useGameStore((s) => s.game?.projects.find(p => p.id === propProject.id) || propProject);
  const replaceProject = useGameStore((s) => s.replaceProject);
  const updateTalent = useGameStore((s) => s.updateTalent);
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'all' | 'cast' | 'crew'>('all');
  const [negotiationTarget, setNegotiationTarget] = useState<{ character: ScriptCharacter; talent: TalentPerson } | null>(null);

  if (!gameState) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading casting...</p>
      </div>
    );
  }

  // Early return if project or script is null
  if (!project || !project.script) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No script available for casting</p>
      </div>
    );
  }

  const createCastingSlots = (): CastingSlot[] => {
    const characters = project.script?.characters || [];
    
    return characters.map(character => {
      const talent = character.assignedTalentId 
        ? gameState.talent.find(t => t.id === character.assignedTalentId)
        : null;

      const requiredType = character.importance === 'crew' ? 'director' : (character.requiredType || 'actor');
      
      const isRequired = (character.traits?.includes('mandatory')) || 
                        character.importance === 'lead' || 
                        requiredType === 'director';
      
      const negotiated = character.negotiatedContract;
      const baseMarketValue = talent?.marketValue || 5000000; // Default market value
      const contractCost = negotiated
        ? negotiated.weeklyPay * negotiated.contractWeeks
        : (baseMarketValue * 0.1) + (baseMarketValue * 0.05 * (character.importance === 'lead' ? 2 : character.importance === 'supporting' ? 1.5 : 1));

      return {
        character,
        talent,
        isRequired,
        contractCost
      };
    });
  };

  const getEligibleTalent = (character: ScriptCharacter): TalentPerson[] => {
    return gameState.talent.filter(talent => {
      // Must be available
      if (talent.contractStatus !== 'available') return false;

      // Type/age/demographic matching
      if (!talentMatchesRole(talent, character)) return false;

      // Genre compatibility (prefer matching genres)
      if (project.script?.genre && talent.genres?.length > 0) {
        // Don't filter out, but this will be used for sorting
      }

      // Check if already cast in this project
      const alreadyCast = (project.script?.characters || []).some(c => 
        c.assignedTalentId === talent.id && c.id !== character.id
      );
      if (alreadyCast) return false;

      return true;
    }).sort((a, b) => {
      // Sort by genre match first, then reputation
      const aGenreMatch = project.script?.genre && a.genres?.includes(project.script?.genre) ? 1 : 0;
      const bGenreMatch = project.script?.genre && b.genres?.includes(project.script?.genre) ? 1 : 0;

      if (aGenreMatch !== bGenreMatch) return bGenreMatch - aGenreMatch;
      return b.reputation - a.reputation;
    });
  };

  const handleCastTalent = (character: ScriptCharacter, talent: TalentPerson) => {
    setNegotiationTarget({ character, talent });
  };

  const finalizeAssignment = (result: { interestScore: number; askWeeklyPay: number; weeklyPay: number; contractWeeks: number }) => {
    if (!negotiationTarget) return;

    const { character, talent } = negotiationTarget;
    const requiredType = character.importance === 'crew' ? 'director' : (character.requiredType || 'actor');

    const updatedCharacters = (project.script?.characters || []).map(c =>
      c.id === character.id
        ? {
          ...c,
          assignedTalentId: talent.id,
          negotiatedContract: {
            weeklyPay: result.weeklyPay,
            contractWeeks: result.contractWeeks,
            interestScore: result.interestScore,
            askWeeklyPay: result.askWeeklyPay,
            negotiatedWeek: gameState.currentWeek,
            negotiatedYear: gameState.currentYear,
          }
        }
        : c
    );

    const updatedProject = {
      ...project,
      script: {
        ...project.script!,
        characters: updatedCharacters
      }
    };

    replaceProject(updatedProject);

    const interest = describeTalentInterest(result.interestScore);

    toast({
      title: requiredType === 'director' ? 'Key Crew Attached' : 'Role Offered',
      description: `${talent.name} agreed (${interest.label}) — ${(result.weeklyPay / 1000).toFixed(0)}k/week for ${result.contractWeeks} weeks`,
    });

    setNegotiationTarget(null);
  };

  const handleRemoveTalent = (character: ScriptCharacter) => {
    const updatedCharacters = (project.script?.characters || []).map(c =>
      c.id === character.id ? { ...c, assignedTalentId: undefined, negotiatedContract: undefined } : c
    );

    const updatedProject = {
      ...project,
      script: {
        ...project.script!,
        characters: updatedCharacters
      }
    };

    replaceProject(updatedProject);

    const requiredType = character.importance === 'crew' ? 'director' : (character.requiredType || 'actor');

    toast({
      title: "Talent Removed",
      description: requiredType === 'director'
        ? 'Director slot is now unassigned'
        : `${character.name} is now uncast`,
    });
  };

  const getCastingProgress = () => {
    const slots = createCastingSlots();
    const requiredSlots = slots.filter(s => s.isRequired);
    const castRequired = requiredSlots.filter(s => s.talent).length;
    const totalCast = slots.filter(s => s.talent).length;
    
    return {
      requiredCast: castRequired,
      requiredTotal: requiredSlots.length,
      totalCast,
      totalSlots: slots.length,
      canProceed: castRequired === requiredSlots.length
    };
  };

  const getTotalCastingCost = () => {
    return createCastingSlots()
      .filter(slot => slot.talent)
      .reduce((sum, slot) => sum + slot.contractCost, 0);
  };

  const handleConfirmCasting = () => {
    const slots = createCastingSlots();
    const requiredSlots = slots.filter(s => s.isRequired);
    const castRequired = requiredSlots.filter(s => s.talent).length;
    if (castRequired !== requiredSlots.length) {
      toast({ title: 'Cannot Confirm', description: 'Director (Key Crew) and Lead Actor must be assigned', variant: 'destructive' });
      return;
    }

    const directorSlots = slots.filter(s => s.talent && isDirectorRole(s.character));
    const actorSlots = slots.filter(s => s.talent && !isDirectorRole(s.character));

    const isFranchiseProject = !!project.script?.franchiseId;

    const negotiatedByTalentId = new Map<string, { weeklyPay: number; contractWeeks: number; interestLabel: string; interestScore: number }>();

    let requiredCashTotal = 0;

    for (const slot of slots) {
      if (!slot.talent) continue;

      const deal = slot.character.negotiatedContract;
      if (!deal) {
        toast({
          title: 'Missing Contract Terms',
          description: `Please negotiate a deal for ${slot.talent.name} (${slot.character.name}) before confirming.`,
          variant: 'destructive',
        });
        return;
      }

      const interest = describeTalentInterest(deal.interestScore);
      requiredCashTotal += deal.weeklyPay * Math.min(4, deal.contractWeeks);

      negotiatedByTalentId.set(slot.talent.id, {
        weeklyPay: deal.weeklyPay,
        contractWeeks: deal.contractWeeks,
        interestLabel: interest.label,
        interestScore: deal.interestScore,
      });
    }

    if (requiredCashTotal > gameState.studio.budget) {
      toast({
        title: 'Insufficient Cash Runway',
        description: `Need at least ${(requiredCashTotal / 1000000).toFixed(1)}M available to sign these deals (covers first 4 weeks of payroll).`,
        variant: 'destructive',
      });
      return;
    }

    // Directors belong in crew; only actors belong in cast.
    const castEntries = actorSlots.map(s => {
      const talent = s.talent as TalentPerson;
      const deal = negotiatedByTalentId.get(talent.id)!;
      const contractWeeks = deal.contractWeeks;

      return {
        talentId: talent.id,
        role: s.character.importance === 'lead'
          ? `Lead - ${s.character.name}`
          : `Supporting - ${s.character.name}`,
        salary: deal.weeklyPay,
        points: 10,
        contractTerms: {
          duration: new Date(Date.now() + contractWeeks * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: isFranchiseProject && s.character.importance === 'lead' ? 2 : 1
        }
      };
    });

    const crewEntries = directorSlots.map(s => {
      const talent = s.talent as TalentPerson;
      const deal = negotiatedByTalentId.get(talent.id)!;
      const contractWeeks = deal.contractWeeks;

      return {
        talentId: talent.id,
        role: 'Director',
        salary: deal.weeklyPay,
        points: 15,
        contractTerms: {
          duration: new Date(Date.now() + contractWeeks * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: 1
        }
      };
    });

    const assignedActorTalents = actorSlots.map(s => s.talent!) as TalentPerson[];
    const fameScores = assignedActorTalents
      .filter(t => t.type === 'actor')
      .map(t => t.fame ?? Math.min(100, Math.round(t.reputation)));
    const topTwo = fameScores.sort((a, b) => b - a).slice(0, 2);
    const starPowerBonus = Math.min(0.5, (topTwo.reduce((a, b) => a + b, 0) / (topTwo.length || 1)) / 200); // up to +0.5

const totalCost = slots
  .filter(s => s.talent)
  .reduce((sum, s) => {
    const deal = negotiatedByTalentId.get((s.talent as TalentPerson).id);
    if (!deal) return sum;
    return sum + deal.weeklyPay * deal.contractWeeks;
  }, 0);

const contracted = slots
  .filter(s => s.talent)
  .map(s => {
    const talent = s.talent as TalentPerson;
    const deal = negotiatedByTalentId.get(talent.id)!;
    const requiredType = isDirectorRole(s.character) ? 'director' : 'actor';

    return {
      talentId: talent.id,
      role: requiredType === 'director'
        ? 'Director'
        : s.character.importance === 'lead'
          ? `Lead - ${s.character.name}`
          : `Supporting - ${s.character.name}`,
      weeklyPay: deal.weeklyPay,
      contractWeeks: deal.contractWeeks,
      weeksRemaining: deal.contractWeeks,
      startWeek: gameState.currentWeek
    };
  });

const keepContracted = (project.contractedTalent || []).filter(ct => !contracted.some(nc => nc.talentId === ct.talentId && nc.role === ct.role));

const updatedProject: Project = {
  ...project,
  cast: castEntries as any,
  crew: crewEntries as any,
  contractedTalent: [...keepContracted, ...contracted],
  castingConfirmed: true,
  starPowerBonus,
  currentPhase: project.currentPhase === 'development' ? 'pre-production' as any : project.currentPhase,
  status: project.currentPhase === 'development' ? 'pre-production' as any : project.status,
  phaseDuration: project.currentPhase === 'development' ? 4 : project.phaseDuration,
  budget: {
    ...project.budget,
    spent: {
      ...project.budget.spent,
      aboveTheLine: (project.budget.spent?.aboveTheLine || 0) + Math.round(totalCost)
    }
  }
};

    replaceProject(updatedProject);

    for (const slot of slots) {
      if (!slot.talent) continue;
      const deal = negotiatedByTalentId.get(slot.talent.id);
      if (!deal) continue;
      updateTalent(slot.talent.id, {
        contractStatus: 'contracted' as const,
        currentContractWeeks: deal.contractWeeks,
        studioInterest: recordStudioNegotiationOutcome({
          talent: slot.talent,
          studioId: gameState.studio.id,
          currentWeek: gameState.currentWeek,
          currentYear: gameState.currentYear,
          interestScore: deal.interestScore,
          outcome: 'signed',
        }),
      });
    }

    toast({
      title: 'Casting Confirmed',
      description: 'All assignments locked. Moved to Pre-Production.',
    });
  };

  const allSlots = createCastingSlots();
  const isCrewSlot = (slot: CastingSlot) => (slot.character.importance === 'crew' ? 'director' : (slot.character.requiredType || 'actor')) === 'director';

  const crewSlots = allSlots.filter(isCrewSlot);
  const castSlots = allSlots.filter(slot => !isCrewSlot(slot));

  const displayedCrewSlots = filterType === 'all' || filterType === 'crew' ? crewSlots : [];
  const displayedCastSlots = filterType === 'all' || filterType === 'cast' ? castSlots : [];

  const progress = getCastingProgress();

  return (
    <div className="space-y-6">
      {negotiationTarget && (
        <TalentNegotiationDialog
          open={true}
          onOpenChange={(open) => setNegotiationTarget(open ? negotiationTarget : null)}
          studio={gameState.studio}
          project={project}
          talent={negotiationTarget.talent}
          roleLabel={isDirectorRole(negotiationTarget.character)
            ? 'Director'
            : negotiationTarget.character.importance === 'lead'
              ? `Lead - ${negotiationTarget.character.name}`
              : `Supporting - ${negotiationTarget.character.name}`}
          requiredType={isDirectorRole(negotiationTarget.character) ? 'director' : 'actor'}
          importance={negotiationTarget.character.importance}
          currentWeek={gameState.currentWeek}
          currentYear={gameState.currentYear}
          onAccepted={finalizeAssignment}
          onRejected={(res) => {
            const interestLabel = describeTalentInterest(res.interestScore).label;

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
              title: `${negotiationTarget.talent.name}: ${interestLabel}`,
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

      {/* Header with Progress and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              Cast & Key Crew
              <Badge variant={progress.canProceed ? "default" : "destructive"}>
                {progress.requiredCast}/{progress.requiredTotal} Required
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  <SelectItem value="cast">Cast</SelectItem>
                  <SelectItem value="crew">Key Crew</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline">
                Total Cost: ${(getTotalCastingCost() / 1000000).toFixed(1)}M
              </Badge>
<Button 
  onClick={handleConfirmCasting}
  variant={progress.canProceed && !project.castingConfirmed ? "default" : "outline"}
  disabled={!progress.canProceed || project.castingConfirmed}
>
  {project.castingConfirmed ? 'Casting Confirmed' : 'Confirm Casting'}
</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{progress.totalCast}</div>
              <div className="text-sm text-muted-foreground">Assignments Filled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{progress.requiredCast}</div>
              <div className="text-sm text-muted-foreground">Required Filled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{progress.totalSlots - progress.totalCast}</div>
              <div className="text-sm text-muted-foreground">Open Assignments</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${progress.canProceed ? 'text-green-600' : 'text-red-600'}`}>
                {progress.canProceed ? 'Ready' : 'Blocked'}
              </div>
              <div className="text-sm text-muted-foreground">Production Status</div>
            </div>
          </div>
          
{!progress.canProceed && !project.castingConfirmed && (
  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
    <AlertTriangle className="h-4 w-4 text-destructive" />
    <span className="text-sm text-destructive">
      Must assign all required roles (Director + Lead Actor) before proceeding to production
    </span>
  </div>
)}
{project.castingConfirmed && (
  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400/30 rounded-lg flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <span className="text-sm text-green-700 dark:text-green-300">
      Casting confirmed and locked. Roles can no longer be changed.
    </span>
  </div>
)}
        </CardContent>
      </Card>

      {/* Cast & Key Crew Slots */}
      <div className="grid gap-6">
        {displayedCrewSlots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Key Crew</h3>
              <Badge variant="secondary">{displayedCrewSlots.filter(s => s.talent).length}/{displayedCrewSlots.length} Assigned</Badge>
            </div>
            <div className="grid gap-4">
              {displayedCrewSlots.map((slot) => (
                <CastingSlotCard
                  key={slot.character.id}
                  slot={slot}
                  project={project}
                  getEligibleTalent={getEligibleTalent}
                  onCast={handleCastTalent}
                  onRemove={handleRemoveTalent}
                />
              ))}
            </div>
          </div>
        )}

        {displayedCastSlots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cast</h3>
              <Badge variant="secondary">{displayedCastSlots.filter(s => s.talent).length}/{displayedCastSlots.length} Filled</Badge>
            </div>
            <div className="grid gap-4">
              {displayedCastSlots.map((slot) => (
                <CastingSlotCard
                  key={slot.character.id}
                  slot={slot}
                  project={project}
                  getEligibleTalent={getEligibleTalent}
                  onCast={handleCastTalent}
                  onRemove={handleRemoveTalent}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {displayedCrewSlots.length === 0 && displayedCastSlots.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Roles Defined</h3>
            <p className="text-muted-foreground">
              Add roles to your script first before casting
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface CastingSlotCardProps {
  slot: CastingSlot;
  project: Project;
  getEligibleTalent: (character: ScriptCharacter) => TalentPerson[];
  onCast: (character: ScriptCharacter, talent: TalentPerson) => void;
  onRemove: (character: ScriptCharacter) => void;
}

const CastingSlotCard: React.FC<CastingSlotCardProps> = ({
  slot,
  project,
  getEligibleTalent,
  onCast,
  onRemove,
}) => {
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);
  const isDirector = (slot.character.importance === 'crew' ? 'director' : (slot.character.requiredType || 'actor')) === 'director';
  const candidates = getEligibleTalent(slot.character);

  const assignmentLabel = isDirector ? 'Director' : slot.character.name;

  return (
    <Card 
      key={slot.character.id} 
      className={`transition-colors ${
        slot.talent ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20 dark:border-green-400/30' : 
        slot.isRequired ? 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20 dark:border-red-400/30' : 
        'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-400/30'
      } bg-card`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {slot.character.importance === 'lead' && <Crown className="h-5 w-5 text-yellow-500" />}
            {slot.character.importance === 'supporting' && <Star className="h-5 w-5 text-blue-500" />}
            {isDirector && <User className="h-5 w-5 text-purple-500" />}
            <div>
              <CardTitle className="text-lg">{assignmentLabel}</CardTitle>
              <p className="text-sm text-muted-foreground">{slot.character.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {slot.character.importance}
            </Badge>
            <Badge variant="secondary">
              {isDirector ? 'Key Crew' : 'Cast'}
            </Badge>
            {slot.isRequired && (
              <Badge variant="destructive">Required</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {slot.talent ? (
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-green-500/30 dark:border-green-400/30">
            <div className="flex items-center gap-3">
              <TalentPortrait talent={slot.talent} size="sm" />
              <div>
                <button
                  type="button"
                  className="font-semibold hover:underline text-left"
                  onClick={() => openTalentProfile(slot.talent!.id)}
                >
                  {slot.talent.name}
                </button>
                <p className="text-sm text-muted-foreground">
                  ${(slot.talent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(slot.talent.reputation)}
                  {slot.talent.gender && ` • ${slot.talent.gender}`}
                  {slot.talent.race && ` • ${slot.talent.race}`}
                  {slot.talent.nationality && ` • ${slot.talent.nationality}`}
                </p>
                <p className="text-sm text-green-600">
                  Contract Cost: ${(slot.contractCost / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={project.castingConfirmed}>
                    Change
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isDirector ? 'Assign Director' : `Cast ${slot.character.name}`}</DialogTitle>
                  </DialogHeader>
                  <CastingCandidatesList 
                    character={slot.character}
                    candidates={candidates}
                    currentTalent={slot.talent}
                    onCast={onCast}
                    projectGenre={project.script?.genre}
                  />
                </DialogContent>
              </Dialog>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onRemove(slot.character)}
                disabled={project.castingConfirmed}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Requirements:
                {slot.character.ageRange && ` Age ${slot.character.ageRange[0]}-${slot.character.ageRange[1]}`}
                {!isDirector && slot.character.requiredGender && ` • ${slot.character.requiredGender}`}
                {!isDirector && slot.character.requiredRace && ` • ${slot.character.requiredRace}`}
                {!isDirector && slot.character.requiredNationality && ` • ${slot.character.requiredNationality}`}
              </p>
              <p className="text-sm font-medium">
                Budget: ${(slot.contractCost / 1000000).toFixed(1)}M
              </p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant={slot.isRequired ? "default" : "outline"} disabled={project.castingConfirmed}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  {isDirector ? 'Assign Director' : 'Cast Role'} ({candidates.length} candidates)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isDirector ? 'Assign Director' : `Cast ${slot.character.name}`}</DialogTitle>
                </DialogHeader>
                <CastingCandidatesList 
                  character={slot.character}
                  candidates={candidates}
                  currentTalent={null}
                  onCast={onCast}
                  projectGenre={project.script?.genre}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Separate component for the casting candidates list
interface CastingCandidatesListProps {
  character: ScriptCharacter;
  candidates: TalentPerson[];
  currentTalent: TalentPerson | null;
  onCast: (character: ScriptCharacter, talent: TalentPerson) => void;
  projectGenre?: string;
}

const CastingCandidatesList: React.FC<CastingCandidatesListProps> = ({
  character,
  candidates,
  currentTalent,
  onCast,
  projectGenre
}) => {
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);

  return (
    <div className="space-y-4">
      {candidates.length === 0 ? (
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No eligible talent available for this role</p>
        </div>
      ) : (
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {candidates.map((talent) => {
            const isGenreMatch = projectGenre && talent.genres?.includes(projectGenre as any);
            const isCurrent = currentTalent?.id === talent.id;
            
            return (
              <div 
                key={talent.id} 
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  isCurrent ? 'border-green-500 bg-green-50 dark:bg-green-950/20 dark:border-green-400' : 
                  isGenreMatch ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400' : 
                  'border-border hover:border-accent'
                } bg-card`}
              >
                <div className="flex items-center gap-3">
                  <TalentPortrait talent={talent} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="font-medium text-foreground hover:underline text-left"
                        onClick={() => openTalentProfile(talent.id)}
                      >
                        {talent.name}
                      </button>
                      {isGenreMatch && <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">Genre Match</Badge>}
                      {isCurrent && <Badge variant="default" className="text-xs bg-green-600 text-white dark:bg-green-700">Current</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${(talent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(talent.reputation)} • Age: {talent.age}
                      {talent.gender && ` • ${talent.gender}`}
                      {talent.race && ` • ${talent.race}`}
                      {talent.nationality && ` • ${talent.nationality}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {talent.genres?.slice(0, 3).map(genre => (
                        <Badge key={genre} variant="secondary" className="text-xs bg-secondary/80 text-secondary-foreground">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm"
                  onClick={() => {
                    onCast(character, talent);
                    setTimeout(() => {
                      const dialog = document.querySelector('[role="dialog"]');
                      if (dialog) {
                        const backdrop = dialog.parentElement?.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
                        if (backdrop) backdrop.click();
                      }
                    }, 100);
                  }}
                  disabled={isCurrent}
                  className={isCurrent ? 'opacity-50' : ''}
                >
                  {isCurrent ? 'Current' : 'Cast'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};