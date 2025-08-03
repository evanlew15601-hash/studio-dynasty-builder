// Role-Based Casting System - Assign specific actors to specific roles
import React, { useState } from 'react';
import { Project, TalentPerson, ScriptCharacter } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CastingIcon, TalentIcon } from '@/components/ui/icons';
import { Search } from 'lucide-react';

interface RoleCast {
  characterId: string;
  characterName: string;
  roleType: string;
  talentId?: string;
  talentName?: string;
  salary?: number;
  contractWeeks?: number;
}

interface CastingRoleManagerProps {
  project: Project;
  availableTalent: TalentPerson[];
  onCastingUpdate: (project: Project) => void;
  studioBudget: number;
}

export const CastingRoleManager: React.FC<CastingRoleManagerProps> = ({
  project,
  availableTalent,
  onCastingUpdate,
  studioBudget
}) => {
  const { toast } = useToast();
  const [castingDialogOpen, setCastingDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleCast | null>(null);
  const [talentFilter, setTalentFilter] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState('all');

  // Initialize roles from script characters and current cast
  const initializeRoles = (): RoleCast[] => {
    const roles: RoleCast[] = [];
    
    // Add script characters
    if (project.script?.characters) {
      project.script.characters.forEach(character => {
        const existingCast = project.cast?.find(c => c.role === character.name);
        roles.push({
          characterId: character.id,
          characterName: character.name,
          roleType: character.roleType,
          talentId: existingCast?.talentId,
          talentName: existingCast ? availableTalent.find(t => t.id === existingCast.talentId)?.name : undefined,
          salary: existingCast?.salary,
          contractWeeks: existingCast?.contractTerms ? 
            Math.ceil((new Date(existingCast.contractTerms.duration).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)) : 
            undefined
        });
      });
    }

    // Add essential roles if not in script
    const essentialRoles = ['Director', 'Lead Actor', 'Supporting Actor'];
    essentialRoles.forEach(role => {
      if (!roles.find(r => r.roleType === role.toLowerCase().replace(' ', '_'))) {
        const existingCast = project.cast?.find(c => c.role === role);
        roles.push({
          characterId: `essential_${role.toLowerCase().replace(' ', '_')}`,
          characterName: role,
          roleType: role.toLowerCase().replace(' ', '_'),
          talentId: existingCast?.talentId,
          talentName: existingCast ? availableTalent.find(t => t.id === existingCast.talentId)?.name : undefined,
          salary: existingCast?.salary,
          contractWeeks: existingCast?.contractTerms ? 
            Math.ceil((new Date(existingCast.contractTerms.duration).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)) : 
            undefined
        });
      }
    });

    return roles;
  };

  const [projectRoles, setProjectRoles] = useState<RoleCast[]>(initializeRoles);

  const getFilteredTalent = () => {
    return availableTalent.filter(talent => {
      // Filter by search query
      if (talentFilter && !talent.name.toLowerCase().includes(talentFilter.toLowerCase())) {
        return false;
      }

      // Filter by role type compatibility
      if (selectedRole) {
        const roleType = selectedRole.roleType;
        if (roleType === 'director' && talent.type !== 'director') return false;
        if (['lead', 'supporting', 'character'].includes(roleType) && talent.type !== 'actor') return false;
      }

      // Only available talent
      return talent.contractStatus === 'available';
    });
  };

  const calculateTalentCost = (talent: TalentPerson): number => {
    const contractWeeks = selectedRole?.roleType === 'director' ? 20 : 16;
    const weeklySalary = talent.marketValue / 52;
    return weeklySalary * contractWeeks;
  };

  const handleCastTalent = (talent: TalentPerson) => {
    if (!selectedRole) return;

    const cost = calculateTalentCost(talent);
    const currentBudgetUsed = projectRoles
      .filter(role => role.talentId && role.characterId !== selectedRole.characterId)
      .reduce((sum, role) => sum + (role.salary! * role.contractWeeks!), 0);

    if (currentBudgetUsed + cost > studioBudget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford ${talent.name}. Need $${(cost / 1000000).toFixed(1)}M more.`,
        variant: "destructive"
      });
      return;
    }

    // Update role casting
    const updatedRoles = projectRoles.map(role => 
      role.characterId === selectedRole.characterId 
        ? {
            ...role,
            talentId: talent.id,
            talentName: talent.name,
            salary: talent.marketValue / 52,
            contractWeeks: selectedRole.roleType === 'director' ? 20 : 16
          }
        : role
    );

    setProjectRoles(updatedRoles);

    // Update project cast
    const updatedCast = updatedRoles
      .filter(role => role.talentId)
      .map(role => ({
        talentId: role.talentId!,
        role: role.characterName,
        salary: role.salary!,
        points: role.roleType === 'director' ? 15 : 10,
        contractTerms: {
          duration: new Date(Date.now() + role.contractWeeks! * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: 1
        }
      }));

    const updatedProject = {
      ...project,
      cast: updatedCast
    };

    onCastingUpdate(updatedProject);

    toast({
      title: "Talent Cast",
      description: `${talent.name} has been cast as ${selectedRole.characterName}`,
    });

    setCastingDialogOpen(false);
    setSelectedRole(null);
  };

  const handleRemoveCasting = (role: RoleCast) => {
    const updatedRoles = projectRoles.map(r => 
      r.characterId === role.characterId 
        ? { ...r, talentId: undefined, talentName: undefined, salary: undefined, contractWeeks: undefined }
        : r
    );

    setProjectRoles(updatedRoles);

    // Update project
    const updatedCast = updatedRoles
      .filter(role => role.talentId)
      .map(role => ({
        talentId: role.talentId!,
        role: role.characterName,
        salary: role.salary!,
        points: role.roleType === 'director' ? 15 : 10,
        contractTerms: {
          duration: new Date(Date.now() + role.contractWeeks! * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: 1
        }
      }));

    onCastingUpdate({
      ...project,
      cast: updatedCast
    });

    toast({
      title: "Casting Removed",
      description: `${role.talentName} removed from ${role.characterName}`,
    });
  };

  const openCastingDialog = (role: RoleCast) => {
    setSelectedRole(role);
    setTalentFilter('');
    setCastingDialogOpen(true);
  };

  const getRoleTypeColor = (roleType: string) => {
    switch (roleType) {
      case 'director': return 'bg-purple-100 text-purple-800';
      case 'lead': return 'bg-red-100 text-red-800';
      case 'supporting': return 'bg-blue-100 text-blue-800';
      case 'character': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUncastRoles = () => projectRoles.filter(role => !role.talentId);
  const getCastRoles = () => projectRoles.filter(role => role.talentId);
  const getTotalBudgetUsed = () => projectRoles
    .filter(role => role.talentId)
    .reduce((sum, role) => sum + (role.salary! * role.contractWeeks!), 0);

  const filteredTalent = getFilteredTalent();

  return (
    <div className="space-y-6">
      {/* Casting Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CastingIcon className="w-5 h-5" />
            Cast & Crew for "{project.title}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-primary">{getCastRoles().length}</div>
              <div className="text-sm text-muted-foreground">Roles Cast</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{getUncastRoles().length}</div>
              <div className="text-sm text-muted-foreground">Roles Open</div>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${(getTotalBudgetUsed() / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-muted-foreground">Budget Used</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cast Roles */}
      {getCastRoles().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Cast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getCastRoles().map(role => {
                const talent = availableTalent.find(t => t.id === role.talentId);
                return (
                  <div key={role.characterId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{role.talentName?.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{role.talentName}</div>
                        <div className="text-sm text-muted-foreground">as {role.characterName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getRoleTypeColor(role.roleType)}>
                            {role.roleType.replace('_', ' ')}
                          </Badge>
                          {talent && (
                            <Badge variant="secondary">${(talent.marketValue / 1000000).toFixed(1)}M</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCasting(role)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Roles */}
      {getUncastRoles().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getUncastRoles().map(role => (
                <div key={role.characterId} className="p-4 border rounded-lg border-dashed">
                  <div className="text-center">
                    <div className="font-medium">{role.characterName}</div>
                    <Badge variant="outline" className={`mt-2 ${getRoleTypeColor(role.roleType)}`}>
                      {role.roleType.replace('_', ' ')}
                    </Badge>
                    <Button
                      className="w-full mt-3"
                      onClick={() => openCastingDialog(role)}
                    >
                      <TalentIcon className="w-4 h-4 mr-2" />
                      Cast Role
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Casting Dialog */}
      <Dialog open={castingDialogOpen} onOpenChange={setCastingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cast {selectedRole?.characterName} ({selectedRole?.roleType.replace('_', ' ')})
            </DialogTitle>
          </DialogHeader>

          {/* Talent Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="talent-search">Search Talent</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="talent-search"
                  placeholder="Search by name..."
                  value={talentFilter}
                  onChange={(e) => setTalentFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Available Talent */}
          <div className="space-y-4">
            {filteredTalent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TalentIcon className="mx-auto mb-4 w-12 h-12" />
                <p>No available talent found for this role</p>
              </div>
            ) : (
              filteredTalent.map(talent => {
                const cost = calculateTalentCost(talent);
                const canAfford = getTotalBudgetUsed() + cost <= studioBudget;

                return (
                  <div key={talent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{talent.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{talent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {talent.type} • Age {talent.age} • Rep: {talent.reputation}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            ${(talent.marketValue / 1000000).toFixed(1)}M value
                          </Badge>
                          <Badge variant="outline">
                            ${(cost / 1000000).toFixed(1)}M total cost
                          </Badge>
                          {talent.awards && talent.awards.length > 0 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {talent.awards.length} Awards
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCastTalent(talent)}
                      disabled={!canAfford}
                      variant={canAfford ? "default" : "outline"}
                    >
                      {canAfford ? "Cast" : "Can't Afford"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};