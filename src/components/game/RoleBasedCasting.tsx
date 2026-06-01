import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Project, TalentPerson, ScriptCharacter } from '@/types/game';
import { getTalentRoleFitScore, talentMatchesRole, talentMatchesRoleExceptAge } from '@/utils/castingEligibility';
import { Users, User, Crown, Star, CheckCircle } from 'lucide-react';
import { importRolesForScript } from '@/utils/roleImport';
import { useGameStore } from '@/game/store';
import { describeTalentInterest, recordStudioNegotiationOutcome } from '@/utils/talentNegotiation';
import { TalentNegotiationDialog } from './TalentNegotiationDialog';

interface RoleBasedCastingProps {
  project: Project;
}

export const RoleBasedCasting: React.FC<RoleBasedCastingProps> = ({
  project: propProject
}) => {
  const gameState = useGameStore((s) => s.game);
  const project = useGameStore((s) => s.game?.projects.find(p => p.id === propProject.id) || propProject);
  const updateProject = useGameStore((s) => s.updateProject);
  const updateTalent = useGameStore((s) => s.updateTalent);
  const { toast } = useToast();
  const [negotiationTarget, setNegotiationTarget] = React.useState<{ role: ScriptCharacter; talent: TalentPerson } | null>(null);
  const [editingRoleId, setEditingRoleId] = React.useState<string | null>(null);
  const [requirementDraft, setRequirementDraft] = React.useState({ minAge: '', maxAge: '', gender: '', race: '', nationality: '' });
  const [overrideRoleIds, setOverrideRoleIds] = React.useState<Set<string>>(() => new Set());

  // Import roles when project changes or script updates (auto-add mandatory TV roles)
  React.useEffect(() => {
    if (!gameState || !project?.script) return;

    const existing = project.script.characters || [];
    
    // Skip if we already have characters (prevent infinite loop)
    if (existing.length > 0) return;
    
    const importedRoles = importRolesForScript(project.script, gameState);

    // Determine if TV and whether mandatory roles are missing
    const combined = [...existing, ...importedRoles];

    const resolveRequiredType = (c: ScriptCharacter): 'actor' | 'director' => {
      return c.importance === 'crew' ? 'director' : (c.requiredType || 'actor');
    };

    const hasDirector = combined.some(c => resolveRequiredType(c) === 'director');
    const hasLead = combined.some(c => c.importance === 'lead' && resolveRequiredType(c) === 'actor');

    const rolesToCreate: ScriptCharacter[] = [];

    // If no roles were imported and none exist, attempt to import and/or seed defaults
    if ((!existing || existing.length === 0) && importedRoles.length > 0) {
      rolesToCreate.push(...importedRoles);
    }

    // Seed mandatory roles if missing (works for TV and films; harmless otherwise)
    if (!hasDirector) {
      rolesToCreate.push({
        id: `director-${Date.now()}`,
        name: 'Director',
        importance: 'crew',
        description: 'Showrunner/Director responsible for creative vision',
        requiredType: 'director',
      });
    }
    if (!hasLead) {
      rolesToCreate.push({
        id: `lead-${Date.now()}`,
        name: 'Lead Character',
        importance: 'lead',
        description: 'Main protagonist of the story',
        requiredType: 'actor',
        requiredGender: 'Male',
      });
    }

    if (rolesToCreate.length > 0) {
      updateProject(project.id, {
        script: {
          ...project.script,
          characters: [...existing, ...rolesToCreate]
        }
      } as any);

      toast({
        title: 'Roles Ready',
        description: `${rolesToCreate.length} role${rolesToCreate.length > 1 ? 's' : ''} prepared (Director/Lead ensured)`,
      });
    }
  }, [project?.id, project?.script?.franchiseId, project?.script?.publicDomainId]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading casting system...</div>;
  }

  const resolveRequiredType = (role: ScriptCharacter): 'actor' | 'director' => {
    return role.importance === 'crew' ? 'director' : (role.requiredType || 'actor');
  };

  const getAvailableTalent = (role: ScriptCharacter) => {
    const availableOfType = gameState.talent.filter(talent => {
      if (talent.contractStatus !== 'available') return false;
      return talent.type === resolveRequiredType(role);
    });

    if (overrideRoleIds.has(role.id)) {
      return {
        candidates: [...availableOfType].sort((a, b) => getTalentRoleFitScore(b, role) - getTalentRoleFitScore(a, role)),
        mode: 'override' as const,
        strictCount: availableOfType.filter(talent => talentMatchesRole(talent, role)).length,
      };
    }

    const strict = availableOfType.filter(talent => talentMatchesRole(talent, role));
    if (strict.length > 0) return { candidates: strict, mode: 'strict' as const, strictCount: strict.length };

    const ageOnlyIssue = !!role.ageRange && availableOfType.some(talent => talentMatchesRoleExceptAge(talent, role));
    if (ageOnlyIssue) {
      const flexibleAge = availableOfType.filter(talent => talentMatchesRole(talent, role, { ageFlexYears: 5 }));
      if (flexibleAge.length > 0) return { candidates: flexibleAge, mode: 'age-flex' as const, strictCount: 0 };
    }

    return { candidates: [] as TalentPerson[], mode: 'empty' as const, strictCount: 0 };
  };

  const startEditingRole = (role: ScriptCharacter) => {
    setEditingRoleId(role.id);
    setRequirementDraft({
      minAge: role.ageRange?.[0]?.toString() || '',
      maxAge: role.ageRange?.[1]?.toString() || '',
      gender: role.requiredGender || '',
      race: role.requiredRace || '',
      nationality: role.requiredNationality || '',
    });
  };

  const saveRoleRequirements = (role: ScriptCharacter) => {
    const parsedMin = Number.parseInt(requirementDraft.minAge, 10);
    const parsedMax = Number.parseInt(requirementDraft.maxAge, 10);

    const hasMin = Number.isFinite(parsedMin);
    const hasMax = Number.isFinite(parsedMax);

    let nextAgeRange: [number, number] | undefined;
    if (hasMin || hasMax) {
      const DEFAULT_MIN = 18;
      const DEFAULT_MAX = 100;
      const min = hasMin ? Math.max(0, parsedMin) : DEFAULT_MIN;
      const max = hasMax ? parsedMax : DEFAULT_MAX;
      nextAgeRange = [Math.min(min, max), Math.max(min, max)];
    } else {
      nextAgeRange = undefined;
    }

    const updatedCharacters = (project.script?.characters || []).map(c => {
      if (c.id !== role.id) return c;

      const updates: Partial<typeof c> = {
        ageRange: nextAgeRange,
        requiredGender: requirementDraft.gender || undefined,
        requiredRace: requirementDraft.race || undefined,
        requiredNationality: requirementDraft.nationality || undefined,
      };

      // If role is locked/imported, persist editable fields into localOverrides
      if (c.locked) {
        const prevOverrides = c.localOverrides || {};
        const overridePatch: Partial<typeof c.localOverrides> = {};
        if (updates.ageRange !== undefined) overridePatch.ageRange = updates.ageRange as any;
        if ('requiredGender' in updates) overridePatch.requiredGender = updates.requiredGender as any;
        if ('requiredRace' in updates) overridePatch.requiredRace = updates.requiredRace as any;
        if ('requiredNationality' in updates) overridePatch.requiredNationality = updates.requiredNationality as any;

        return {
          ...c,
          ...updates,
          localOverrides: { ...prevOverrides, ...overridePatch },
        } as any;
      }

      return { ...c, ...updates } as any;
    });

    updateProject(project.id, {
      script: {
        ...project.script!,
        characters: updatedCharacters,
      }
    } as any);
    setEditingRoleId(null);
    toast({ title: 'Role Requirements Updated', description: `${role.name} casting requirements were adjusted.` });
  };

  const toggleOverride = (roleId: string) => {
    setOverrideRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleCastTalent = (character: ScriptCharacter, talent: TalentPerson) => {
    setNegotiationTarget({ role: character, talent });
  };

  const finalizeCastTalent = (result: { interestScore: number; askWeeklyPay: number; weeklyPay: number; contractWeeks: number }) => {
    if (!negotiationTarget) return;

    const { role: character, talent } = negotiationTarget;
    const requiredType = resolveRequiredType(character);
    const contractWeeks = result.contractWeeks;
    const weeklyPay = result.weeklyPay;

    const updatedCharacters = (project.script?.characters || []).map(c =>
      c.id === character.id
        ? {
          ...c,
          assignedTalentId: talent.id,
          negotiatedContract: {
            weeklyPay,
            contractWeeks,
            interestScore: result.interestScore,
            askWeeklyPay: result.askWeeklyPay,
            negotiatedWeek: gameState.currentWeek,
            negotiatedYear: gameState.currentYear,
          },
        }
        : c
    );

    const roleLabel = requiredType === 'director'
      ? 'Director'
      : character.importance === 'lead'
        ? `Lead - ${character.name}`
        : `Supporting - ${character.name}`;

    const castEntry = {
      talentId: talent.id,
      role: roleLabel,
      salary: weeklyPay,
      points: requiredType === 'director' ? 15 : 10,
      contractTerms: {
        duration: new Date(Date.now() + contractWeeks * 7 * 24 * 60 * 60 * 1000),
        exclusivity: true,
        merchandising: true,
        sequelOptions: project.script?.franchiseId && character.importance === 'lead' ? 2 : 1
      }
    } as any;

    const contractedEntry = {
      talentId: talent.id,
      role: roleLabel,
      weeklyPay,
      contractWeeks,
      weeksRemaining: contractWeeks,
      startWeek: gameState.currentWeek
    };

    const nextCast = requiredType === 'actor'
      ? [...(project.cast || []).filter(r => r.role !== roleLabel), castEntry]
      : (project.cast || []);

    const nextCrew = requiredType === 'director'
      ? [...(project.crew || []).filter(r => r.role !== roleLabel), castEntry]
      : (project.crew || []);

    const nextContractedTalent = [
      ...((project.contractedTalent || []).filter(ct => ct.role !== roleLabel)),
      contractedEntry
    ];

    updateProject(project.id, {
      cast: nextCast,
      crew: nextCrew,
      contractedTalent: nextContractedTalent,
      script: {
        ...project.script,
        characters: updatedCharacters
      }
    } as any);

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

    const interest = describeTalentInterest(result.interestScore);

    toast({
      title: "Talent Signed",
      description: `${talent.name} accepted (${interest.label}) — ${(weeklyPay / 1000).toFixed(0)}k/week for ${contractWeeks} weeks`,
    });

    setNegotiationTarget(null);
  };

  const importRolesFromSource = () => {
    const script = project.script;
    if (!script?.sourceType) {
      // Create default roles for original projects
      const defaultRoles: ScriptCharacter[] = [
        {
          id: `director-${Date.now()}`,
          name: 'Director',
          importance: 'crew',
          description: 'Film director responsible for creative vision',
          ageRange: [25, 70],
          requiredType: 'director'
        },
        {
          id: `lead-${Date.now()}`,
          name: 'Lead Character',
          importance: 'lead',
          description: 'Main protagonist of the story',
          ageRange: [20, 50],
          requiredType: 'actor',
          requiredGender: 'Male'
        }
      ];
      updateProject(project.id, {
        script: {
          ...project.script!,
          characters: [...(project.script?.characters || []), ...defaultRoles]
        }
      } as any);
      toast({
        title: 'Default Roles Added',
        description: 'Added Director and Lead Actor roles'
      });
      return;
    }
    
    const imported = importRolesForScript(script, gameState);

    updateProject(project.id, {
      script: {
        ...project.script!,
        characters: imported
      }
    } as any);

    const sourceLabel = script.sourceType === 'franchise'
      ? gameState.franchises.find(f => f.id === script.franchiseId)?.title
      : gameState.publicDomainIPs.find(p => p.id === script.publicDomainId)?.name;

    toast({
      title: 'Roles Imported',
      description: `Imported ${imported.length} roles${sourceLabel ? ` from ${sourceLabel}` : ''}`
    });
  };

  const getCastingProgress = () => {
    const totalRoles = project.script?.characters?.length || 0;
    const castRoles = project.script?.characters?.filter(c => c.assignedTalentId).length || 0;
    return { cast: castRoles, total: totalRoles };
  };

  const { cast, total } = getCastingProgress();
  const hasDirector = project.script?.characters?.some(c => resolveRequiredType(c) === 'director' && c.assignedTalentId);
  const hasLead = project.script?.characters?.some(c => c.importance === 'lead' && resolveRequiredType(c) === 'actor' && c.assignedTalentId);
  const canProceed = hasDirector && hasLead;

  return (
    <div className="space-y-6">
      {negotiationTarget && (
        <TalentNegotiationDialog
          open={true}
          onOpenChange={(open) => setNegotiationTarget(open ? negotiationTarget : null)}
          studio={gameState.studio}
          project={project}
          talent={negotiationTarget.talent}
          roleLabel={resolveRequiredType(negotiationTarget.role) === 'director'
            ? 'Director'
            : negotiationTarget.role.importance === 'lead'
              ? `Lead - ${negotiationTarget.role.name}`
              : `Supporting - ${negotiationTarget.role.name}`}
          requiredType={resolveRequiredType(negotiationTarget.role)}
          importance={negotiationTarget.role.importance}
          currentWeek={gameState.currentWeek}
          currentYear={gameState.currentYear}
          onAccepted={finalizeCastTalent}
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

      {/* Header with Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Role-Based Casting
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={hasDirector ? "default" : "destructive"}>
                Director: {hasDirector ? "Cast" : "Required"}
              </Badge>
              <Badge variant={hasLead ? "default" : "destructive"}>
                Lead: {hasLead ? "Cast" : "Required"}
              </Badge>
              <Badge variant={cast >= total && canProceed ? "default" : "secondary"}>
                {cast}/{total} Roles Cast
              </Badge>
              {!canProceed && (
                <Badge variant="destructive">
                  Cannot proceed without Director & Lead
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={importRolesFromSource} variant="outline">
              Import Predefined Roles
            </Button>
            <Button 
              onClick={() => {
                const newRole: ScriptCharacter = {
                  id: `custom-${Date.now()}`,
                  name: 'Custom Role',
                  importance: 'supporting',
                  description: 'A custom character role',
                  requiredType: 'actor',
                  requiredGender: 'Male'
                };

                updateProject(project.id, {
                  script: {
                    ...project.script!,
                    characters: [...(project.script?.characters || []), newRole]
                  }
                } as any);
              }}
              variant="outline"
            >
              Add Custom Role
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Character Roles */}
      <div className="grid gap-4">
        {project.script?.characters?.map((character) => {
          const requiredType = resolveRequiredType(character);
          const isDirectorRole = requiredType === 'director';

          const availability = getAvailableTalent(character);
          const availableTalent = availability.candidates;
          const castTalent = character.assignedTalentId 
            ? gameState.talent.find(t => t.id === character.assignedTalentId)
            : null;

          return (
            <Card key={character.id} className={castTalent ? "border-green-200 dark:border-green-800" : "border-amber-200 dark:border-amber-800"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {character.importance === 'lead' && <Crown className="h-4 w-4 text-yellow-500" />}
                      {character.importance === 'supporting' && <Star className="h-4 w-4 text-blue-500" />}
                      {isDirectorRole && <User className="h-4 w-4 text-purple-500" />}
                      {character.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {character.importance}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {requiredType}
                    </Badge>
                    {castTalent && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Assigned
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {castTalent ? (
                  <div className="flex items-center justify-between p-3 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                    <div>
                      <p className="font-medium text-foreground">{castTalent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${(castTalent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(castTalent.reputation)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Role not cast • {availableTalent.length} available candidates
                        {availability.mode === 'age-flex' && ' (age range auto-expanded ±5 years)'}
                        {availability.mode === 'override' && availability.strictCount === 0 && ' (override: requirements ignored)'}
                      </p>
                      {availability.mode === 'empty' && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                          No matching talent exists for these requirements. Edit this role or enable override casting to keep production moving.
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => startEditingRole(character)}>
                          Edit Requirements
                        </Button>
                        <Button type="button" variant={overrideRoleIds.has(character.id) ? "default" : "outline"} size="sm" onClick={() => toggleOverride(character.id)}>
                          {overrideRoleIds.has(character.id) ? 'Override On' : 'Allow Any Available'}
                        </Button>
                      </div>
                    </div>

                    {editingRoleId === character.id && (
                      <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-5">
                        <label className="text-xs font-medium">
                          Min Age
                          <input className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={requirementDraft.minAge} onChange={(e) => setRequirementDraft(d => ({ ...d, minAge: e.target.value }))} placeholder="Any" type="number" />
                        </label>
                        <label className="text-xs font-medium">
                          Max Age
                          <input className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={requirementDraft.maxAge} onChange={(e) => setRequirementDraft(d => ({ ...d, maxAge: e.target.value }))} placeholder="Any" type="number" />
                        </label>
                        <label className="text-xs font-medium">
                          Gender
                          <select className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={requirementDraft.gender} onChange={(e) => setRequirementDraft(d => ({ ...d, gender: e.target.value }))}>
                            <option value="">Any</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </label>
                        <label className="text-xs font-medium">
                          Race
                          <input className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={requirementDraft.race} onChange={(e) => setRequirementDraft(d => ({ ...d, race: e.target.value }))} placeholder="Any" />
                        </label>
                        <label className="text-xs font-medium">
                          Nationality
                          <input className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm" value={requirementDraft.nationality} onChange={(e) => setRequirementDraft(d => ({ ...d, nationality: e.target.value }))} placeholder="Any" />
                        </label>
                        <div className="flex gap-2 sm:col-span-5">
                          <Button type="button" size="sm" onClick={() => saveRoleRequirements(character)}>Save Requirements</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingRoleId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {availableTalent.slice(0, 5).map((talent) => (
                        <div key={talent.id} className="flex items-center justify-between p-2 border rounded bg-card">
                          <div>
                            <p className="font-medium text-sm text-foreground">{talent.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${(talent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(talent.reputation)}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleCastTalent(character, talent)}
                          >
                            Cast
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!project.script?.characters || project.script.characters.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Roles Defined</h3>
            <p className="text-muted-foreground mb-4">
              Import predefined roles from your source material or create custom roles
            </p>
            <Button onClick={importRolesFromSource}>
              Import Roles
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};