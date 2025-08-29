import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Project, TalentPerson, GameState, ScriptCharacter } from '@/types/game';
import { Users, User, Crown, Star, CheckCircle } from 'lucide-react';
import { importRolesForScript } from '@/utils/roleImport';

interface RoleBasedCastingProps {
  project: Project;
  gameState: GameState;
  onCastRole: (characterId: string, talentId: string) => void;
  onCreateRole: (role: ScriptCharacter) => void;
}

export const RoleBasedCasting: React.FC<RoleBasedCastingProps> = ({
  project,
  gameState,
  onCastRole,
  onCreateRole
}) => {
  const { toast } = useToast();

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
      const sourceLabel = script.sourceType === 'franchise'
        ? gameState.franchises.find(f => f.id === script.franchiseId)?.title
        : gameState.publicDomainIPs.find(p => p.id === script.publicDomainId)?.name;
      toast({
        title: 'Roles Imported',
        description: `Added ${toAdd.length} predefined roles${sourceLabel ? ` from ${sourceLabel}` : ''}`
      });
    }
  };

  const getCastingProgress = () => {
    const totalRoles = project.script?.characters?.length || 0;
    const castRoles = project.script?.characters?.filter(c => c.assignedTalentId).length || 0;
    return { cast: castRoles, total: totalRoles };
  };

  const { cast, total } = getCastingProgress();
  const hasDirector = project.script?.characters?.some(c => 
    c.requiredType === 'director' && c.assignedTalentId
  );
  const hasLead = project.script?.characters?.some(c => 
    c.importance === 'lead' && c.requiredType === 'actor' && c.assignedTalentId
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
        {project.script?.characters?.map((character) => {
          const availableTalent = getAvailableTalent(character);
          const castTalent = character.assignedTalentId 
            ? gameState.talent.find(t => t.id === character.assignedTalentId)
            : null;

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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {character.importance}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {character.requiredType || 'actor'}
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
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <div>
                      <p className="font-medium">{castTalent.name}</p>
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
                    <p className="text-sm text-amber-600">
                      Role not cast • {availableTalent.length} available candidates
                    </p>
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