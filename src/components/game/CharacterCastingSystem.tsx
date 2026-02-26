import React, { useState } from 'react';
import { Project, TalentPerson, GameState, ScriptCharacter } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getCastingProgressStatus } from '@/utils/castingRequirements';
import { Users, User, Crown, Star, UserCheck, AlertTriangle, Filter, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CharacterCastingSystemProps {
  project: Project;
  gameState: GameState;
  onProjectUpdate: (project: Project) => void;
}

interface CastingSlot {
  character: ScriptCharacter;
  talent: TalentPerson | null;
  isRequired: boolean;
  contractCost: number;
}

export const CharacterCastingSystem: React.FC<CharacterCastingSystemProps> = ({
  project,
  gameState,
  onProjectUpdate
}) => {
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<CastingSlot | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'actor' | 'director'>('all');
  const [showExcluded, setShowExcluded] = useState(false);

  // Early return if project or script is null
  if (!project || !project.script) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No script available for casting</p>
      </div>
    );
  }

  const createCastingSlots = (): CastingSlot[] => {
    const allCharacters = project.script?.characters || [];
    // Hide excluded roles unless already assigned (so existing contracts remain visible)
    const characters = showExcluded
      ? allCharacters
      : allCharacters.filter(c => !c.excluded || !!c.assignedTalentId);

    return characters.map(character => {
      const talent = character.assignedTalentId 
        ? gameState.talent.find(t => t.id === character.assignedTalentId)
        : null;
      
      const isRequired = !character.excluded && (
        (character.traits?.includes('mandatory')) ||
        character.importance === 'lead' ||
        character.requiredType === 'director'
      );
      
      const baseMarketValue = talent?.marketValue || 5000000; // Default market value
      const contractCost = (baseMarketValue * 0.1) + (baseMarketValue * 0.05 * (character.importance === 'lead' ? 2 : character.importance === 'supporting' ? 1.5 : 1));

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
      
      // Must match required type (actor/director)
      if (character.requiredType && talent.type !== character.requiredType) return false;
      
      // Age range requirements
      if (character.ageRange) {
        const [minAge, maxAge] = character.ageRange;
        if (talent.age < minAge || talent.age > maxAge) return false;
      }
      
      // Genre compatibility (prefer matching genres)
      if (project.script?.genre && talent.genres?.length > 0) {
        // Don't filter out, but this will be used for sorting
      }
      
      // Check if already cast in this project
      const alreadyCast = (project.script?.characters || []).some(c => 
        !c.excluded && c.assignedTalentId === talent.id && c.id !== character.id
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
    const slot = createCastingSlots().find(s => s.character.id === character.id);
    if (!slot) return;

    if (slot.contractCost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford ${talent.name} - need $${(slot.contractCost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    // Update character with assigned talent
    const updatedCharacters = (project.script?.characters || []).map(c =>
      c.id === character.id ? { ...c, assignedTalentId: talent.id } : c
    );

    // Update project
    const updatedProject = {
      ...project,
      script: {
        ...project.script!,
        characters: updatedCharacters
      }
    };

    onProjectUpdate(updatedProject);

    toast({
      title: "Role Cast",
      description: `${talent.name} has been cast as ${character.name}`,
    });

    setSelectedSlot(null);
  };

  const handleRemoveTalent = (character: ScriptCharacter) => {
    const updatedCharacters = (project.script?.characters || []).map(c =>
      c.id === character.id ? { ...c, assignedTalentId: undefined } : c
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
      title: "Talent Removed",
      description: `${character.name} is now uncast`,
    });
  };

  const getCastingProgress = () => {
    return getCastingProgressStatus(project.script?.characters || []);
  };

  const getTotalCastingCost = () => {
    return createCastingSlots()
      .filter(slot => slot.talent && !slot.character.excluded)
      .reduce((sum, slot) => sum + slot.contractCost, 0);
  };

  const handleConfirmCasting = () => {
    const slots = createCastingSlots();

    const progress = getCastingProgressStatus(project.script?.characters || []);
    if (!progress.canProceed) {
      toast({ title: 'Cannot Confirm', description: 'Director and Lead roles must be cast', variant: 'destructive' });
      return;
    }

    // Build cast entries and compute star power
    const castEntries = slots
      .filter(s => s.talent && !s.character.excluded)
      .map(s => ({
        talentId: (s.talent as TalentPerson).id,
        role: s.character.requiredType === 'director'
          ? 'Director'
          : s.character.importance === 'lead'
            ? `Lead - ${s.character.name}`
            : `Supporting - ${s.character.name}`,
        salary: Math.round(s.contractCost),
        points: 0,
        contractTerms: {
          duration: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
          exclusivity: false,
          merchandising: false,
          sequelOptions: 1
        }
      }));

    const assignedTalents = slots.filter(s => s.talent && !s.character.excluded).map(s => s.talent!) as TalentPerson[];
    const fameScores = assignedTalents
      .filter(t => t.type === 'actor' || t.type === 'director')
      .map(t => t.fame ?? Math.min(100, Math.round(t.reputation)));
    const topTwo = fameScores.sort((a, b) => b - a).slice(0, 2);
    const starPowerBonus = Math.min(0.5, (topTwo.reduce((a, b) => a + b, 0) / (topTwo.length || 1)) / 200); // up to +0.5

const totalCost = getTotalCastingCost();

const contracted = slots
  .filter(s => s.talent && !s.character.excluded)
  .map(s => ({
    talentId: (s.talent as TalentPerson).id,
    role: s.character.requiredType === 'director'
      ? 'Director'
      : s.character.importance === 'lead'
        ? `Lead - ${s.character.name}`
        : `Supporting - ${s.character.name}`,
    weeklyPay: Math.round(((s.talent as TalentPerson).marketValue) / 52),
    contractWeeks: 16,
    weeksRemaining: 16,
    startWeek: gameState.currentWeek
  }));

const updatedProject: Project = {
  ...project,
  cast: castEntries as any,
  contractedTalent: [...(project.contractedTalent || []), ...contracted],
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

    onProjectUpdate(updatedProject);

    toast({
      title: 'Casting Confirmed',
      description: 'All assignments locked. Moved to Pre-Production.',
    });
  };

  const filteredSlots = createCastingSlots().filter(slot => {
    if (filterType === 'all') return true;
    return slot.character.requiredType === filterType;
  });

  const progress = getCastingProgress();

  return (
    <div className="space-y-6">
      {/* Header with Progress and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              Character Casting
              <Badge variant={progress.canProceed ? "default" : "destructive"}>
                {progress.requiredCast}/{progress.requiredTotal} Required
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="actor">Actors</SelectItem>
                  <SelectItem value="director">Directors</SelectItem>
                </SelectContent>
              </Select>
              {(project.script?.characters || []).some(c => !!c.excluded) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExcluded(v => !v)}
                  title={showExcluded ? 'Hide excluded roles' : 'Show excluded roles'}
                >
                  {showExcluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
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
              <div className="text-sm text-muted-foreground">Roles Cast</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{progress.requiredCast}</div>
              <div className="text-sm text-muted-foreground">Required Cast</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{progress.totalSlots - progress.totalCast}</div>
              <div className="text-sm text-muted-foreground">Open Roles</div>
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
      Must cast all required roles (Director and Lead) before proceeding to production
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

      {/* Character Casting Slots */}
      <div className="grid gap-4">
        {filteredSlots.map((slot) => (
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
                  {slot.character.requiredType === 'director' && <User className="h-5 w-5 text-purple-500" />}
                  <div>
                    <CardTitle className="text-lg">{slot.character.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{slot.character.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {slot.character.importance}
                  </Badge>
                  {slot.character.requiredType && (
                    <Badge variant="secondary" className="capitalize">
                      {slot.character.requiredType}
                    </Badge>
                  )}
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
                    <Avatar>
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {slot.talent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{slot.talent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${(slot.talent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(slot.talent.reputation)}
                        {slot.talent.gender && ` • ${slot.talent.gender}`}
                      </p>
                      <p className="text-sm text-green-600">
                        Contract Cost: ${(slot.contractCost / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
<Dialog>
  <DialogTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      disabled={project.castingConfirmed || slot.character.excluded}
      title={slot.character.excluded ? 'Role is excluded' : 'Change casting'}
    >
      Change
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Cast {slot.character.name}</DialogTitle>
                        </DialogHeader>
                        <CastingCandidatesList 
                          character={slot.character}
                          candidates={getEligibleTalent(slot.character)}
                          currentTalent={slot.talent}
                          onCast={handleCastTalent}
                          projectGenre={project.script?.genre}
                        />
                      </DialogContent>
                    </Dialog>
<Button 
  variant="destructive" 
  size="sm"
  onClick={() => handleRemoveTalent(slot.character)}
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
                      Role Requirements:
                      {slot.character.ageRange && ` Age ${slot.character.ageRange[0]}-${slot.character.ageRange[1]}`}
                      {slot.character.requiredType && ` • ${slot.character.requiredType}`}
                    </p>
                    <p className="text-sm font-medium">
                      Budget: ${(slot.contractCost / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  
<Dialog>
  <DialogTrigger asChild>
    <Button
      className="w-full"
      variant={slot.isRequired ? "default" : "outline"}
      disabled={project.castingConfirmed || slot.character.excluded}
      title={slot.character.excluded ? 'Role is excluded' : undefined}
    >
      <UserCheck className="h-4 w-4 mr-2" />
      Cast Role ({getEligibleTalent(slot.character).length} candidates)
    </Button>
  </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Cast {slot.character.name}</DialogTitle>
                      </DialogHeader>
                      <CastingCandidatesList 
                        character={slot.character}
                        candidates={getEligibleTalent(slot.character)}
                        currentTalent={null}
                        onCast={handleCastTalent}
                        projectGenre={project.script?.genre}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSlots.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Characters Defined</h3>
            <p className="text-muted-foreground">
              Add characters to your script first before casting
            </p>
          </CardContent>
        </Card>
      )}
    </div>
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
                  isCurrent
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20 dark:border-green-400'
                    : isGenreMatch
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400'
                      : 'border-border hover:border-accent'
                } bg-card`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback
                      className={`${
                        isCurrent
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                          : isGenreMatch
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-muted text-foreground'
                      }`}
                    >
                      {talent.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{talent.name}</p>
                      {isGenreMatch && (
                        <Badge
                          variant="outline"
                          className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                        >
                          Genre Match
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="default" className="text-xs bg-green-600 text-white dark:bg-green-700">
                          Current
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      ${(talent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(talent.reputation)} • Age: {talent.age}
                      {talent.gender && ` • ${talent.gender}`}
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
                  onClick={() => onCast(character, talent)}
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