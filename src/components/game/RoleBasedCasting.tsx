import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Project, TalentPerson, GameState, ScriptCharacter } from '@/types/game';
import { Users, User, Crown, Star, CheckCircle, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { importRolesForScript } from '@/utils/roleImport';

interface RoleBasedCastingProps {
  project: Project;
  gameState: GameState;
  onCastRole: (characterId: string, talentId: string) => void;
  onCreateRole: (role: ScriptCharacter) => void;
  onUpdateRole: (characterId: string, updates: Partial<ScriptCharacter>) => void;
  onRemoveRole: (characterId: string) => void;
}

export const RoleBasedCasting: React.FC<RoleBasedCastingProps> = ({
  project,
  gameState,
  onCastRole,
  onCreateRole,
  onUpdateRole,
  onRemoveRole
}) => {
  const { toast } = useToast();

  const [showExcluded, setShowExcluded] = React.useState(false);
  const [editingRoleId, setEditingRoleId] = React.useState<string | null>(null);

  const castingLocked = !!project.castingConfirmed;

  const visibleCharacters = (project.script?.characters || []).filter(c =>
    showExcluded ? true : (!c.excluded || !!c.assignedTalentId)
  );

  const handleToggleExcluded = (character: ScriptCharacter) => {
    if (castingLocked) return;
    const nextExcluded = !character.excluded;

    // Excluding a role removes it from production/casting requirements, but does not
    // revoke the talent attachment (contracts/ownership can still matter).
    onUpdateRole(character.id, {
      excluded: nextExcluded,
    });

    if (nextExcluded) setEditingRoleId(null);
  };

  const handleRemoveRole = (character: ScriptCharacter) => {
    if (castingLocked) return;
    if (character.locked) return;
    onRemoveRole(character.id);
  };

  const handleRemoveTalent = (character: ScriptCharacter) => {
    if (castingLocked) return;
    onUpdateRole(character.id, { assignedTalentId: undefined });
  };

  const isIpBackedScript = React.useMemo(() => {
    const s = project?.script;
    if (!s) return false;

    return (
      (s.sourceType === 'franchise' && !!s.franchiseId) ||
      (s.sourceType === 'public-domain' && !!s.publicDomainId) ||
      (s.sourceType === 'adaptation' && (!!s.franchiseId || !!s.publicDomainId))
    );
  }, [project?.script?.sourceType, project?.script?.franchiseId, project?.script?.publicDomainId]);

  // Import roles when project changes or script updates (auto-add mandatory TV roles)
  React.useEffect(() => {
    if (!project?.script) return;

    const existing = project.script.characters || [];
    const importedRoles =
      isIpBackedScript && (!existing || existing.length === 0)
        ? importRolesForScript(project.script, gameState)
        : [];

    // Determine if TV and whether mandatory roles are missing
    const combinedActive = [...existing, ...importedRoles].filter(c => !c.excluded);
    const hasDirector = combinedActive.some(c => c.requiredType === 'director');
    const hasLead = combinedActive.some(c => c.importance === 'lead' && c.requiredType === 'actor');

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
      });
    }

    if (rolesToCreate.length > 0) {
      rolesToCreate.forEach(onCreateRole);
      toast({
        title: 'Roles Ready',
        description: `${rolesToCreate.length} role${rolesToCreate.length > 1 ? 's' : ''} prepared (Director/Lead ensured)`,
      });
    }
  }, [project?.id, project?.script?.franchiseId, project?.script?.publicDomainId, project?.script?.characters?.length]);

  const getAvailableTalent = (role: ScriptCharacter) => {
    return gameState.talent.filter(talent => {
      if (talent.contractStatus !== 'available') return false;
      if (role.requiredType && talent.type !== role.requiredType) return false;
      if (role.ageRange) {
        const [minAge, maxAge] = role.ageRange;
        if (talent.age < minAge || talent.age > maxAge) return false;
      }
      return true;
    });
  };

  const handleCastTalent = (character: ScriptCharacter, talent: TalentPerson) => {
    if (castingLocked) return;
    if (character.excluded) {
      toast({
        title: 'Role Excluded',
        description: 'Include this role before casting talent.',
        variant: 'destructive',
      });
      return;
    }

    const contractCost = talent.marketValue * 0.1; // 10% of market value

    if (contractCost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford ${talent.name} - need $${(contractCost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    onCastRole(character.id, talent.id);
    
    toast({
      title: "Role Cast",
      description: `${talent.name} has been cast as ${character.name}`,
    });
  };

  const importRolesFromSource = () => {
    const script = project.script;
    if (!script || !isIpBackedScript) {
      // Create default roles for non-IP-backed projects
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
          requiredType: 'actor'
        }
      ];
      defaultRoles.forEach(onCreateRole);
      toast({
        title: 'Default Roles Added',
        description: 'Added Director and Lead Actor roles'
      });
      return;
    }
    
    const imported = importRolesForScript(script, gameState);
    const existingIds = new Set((project.script?.characters || []).map(c => c.id));
    const toAdd = imported.filter(r => !existingIds.has(r.id));
    toAdd.forEach(onCreateRole);
    if (toAdd.length > 0) {
      const sourceLabel = script.franchiseId
        ? gameState.franchises.find(f => f.id === script.franchiseId)?.title
        : script.publicDomainId
          ? gameState.publicDomainIPs.find(p => p.id === script.publicDomainId)?.name
          : undefined;

      toast({
        title: 'Roles Imported',
        description: `Added ${toAdd.length} predefined roles${sourceLabel ? ` from ${sourceLabel}` : ''}`
      });
    }
  };

  const getCastingProgress = () => {
    const active = (project.script?.characters || []).filter(c => !c.excluded);
    const totalRoles = active.length;
    const castRoles = active.filter(c => c.assignedTalentId).length;
    return { cast: castRoles, total: totalRoles };
  };

  const { cast, total } = getCastingProgress();
  const hasDirector = project.script?.characters?.some(c => 
    !c.excluded && c.requiredType === 'director' && c.assignedTalentId
  );
  const hasLead = project.script?.characters?.some(c => 
    !c.excluded && c.importance === 'lead' && c.requiredType === 'actor' && c.assignedTalentId
  );
  const canProceed = hasDirector && hasLead;

  return (
    <div className="space-y-6">
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
              onClick={() => onCreateRole({
                id: `custom-${Date.now()}`,
                name: 'Custom Role',
                importance: 'supporting',
                description: 'A custom character role',
                requiredType: 'actor'
              })}
              variant="outline"
            >
              Add Custom Role
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Character Roles */}
      <div className="grid gap-4">
        {visibleCharacters.map((character) => {
          const availableTalent = getAvailableTalent(character);
          const castTalent = character.assignedTalentId
            ? gameState.talent.find(t => t.id === character.assignedTalentId)
            : null;

          const isEditing = editingRoleId === character.id;

          return (
            <Card key={character.id} className={castTalent ? "border-green-200" : "border-amber-200"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {character.importance === 'lead' && <Crown className="h-4 w-4 text-yellow-500" />}
                      {character.importance === 'supporting' && <Star className="h-4 w-4 text-blue-500" />}
                      {character.requiredType === 'director' && <User className="h-4 w-4 text-purple-500" />}
                      {character.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">
                      {character.importance}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {character.requiredType || 'actor'}
                    </Badge>
                    {character.locked && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Imported
                      </Badge>
                    )}
                    {character.excluded && <Badge variant="secondary">Excluded</Badge>}
                    {castTalent && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Assigned
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleExcluded(character)}
                      disabled={castingLocked}
                      title={character.excluded ? 'Include in production' : 'Exclude from production'}
                    >
                      {character.excluded ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(character)}
                      className="text-destructive hover:text-destructive"
                      disabled={castingLocked || !!character.locked}
                      title={character.locked ? 'Imported roles are locked' : 'Remove role'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {castTalent && !isEditing ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <div>
                      <p className="font-medium">{castTalent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${(castTalent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(castTalent.reputation)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRoleId(character.id)}
                        disabled={castingLocked || character.excluded}
                        title={character.excluded ? 'Cannot change an excluded role' : 'Change casting'}
                      >
                        Change
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveTalent(character)}
                        disabled={castingLocked}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-amber-600">
                        {character.excluded
                          ? 'Excluded role'
                          : (castTalent ? 'Choose a replacement' : `Role not cast • ${availableTalent.length} available candidates`)}
                      </p>
                      {isEditing && (
                        <Button variant="outline" size="sm" onClick={() => setEditingRoleId(null)}>
                          Done
                        </Button>
                      )}
                    </div>

                    {!character.excluded && (
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {availableTalent.slice(0, 5).map((talent) => (
                          <div key={talent.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium text-sm">{talent.name}</p>
                              <p className="text-xs text-muted-foreground">
                                ${(talent.marketValue / 1000000).toFixed(1)}M • Rep: {Math.round(talent.reputation)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                handleCastTalent(character, talent);
                                setEditingRoleId(null);
                              }}
                              disabled={castingLocked || castTalent?.id === talent.id}
                            >
                              {castTalent?.id === talent.id ? 'Current' : 'Cast'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(project.script?.characters || []).filter(c => !c.excluded).length === 0 && (
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