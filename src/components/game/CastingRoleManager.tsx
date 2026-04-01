// Role-Based Casting System - Assign specific actors to specific roles
import React, { useState } from 'react';
import { Project, TalentPerson, ScriptCharacter } from '@/types/game';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';
import { CastingIcon, TalentIcon } from '@/components/ui/icons';
import { Search, Star as StarIcon } from 'lucide-react';

interface RoleCast {
  characterId: string;
  characterName: string;
  roleType: 'director' | 'lead' | 'supporting' | 'character';
  requiredType: 'actor' | 'director';
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
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);
  const [castingDialogOpen, setCastingDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleCast | null>(null);
  const shortlistedTalentIds = useGameStore((s) => s.game?.shortlistedTalentIds ?? []);
  const toggleShortlist = useGameStore((s) => s.toggleShortlist);
  const [tab, setTab] = useState<'shortlist' | 'browse'>('shortlist');
  const [talentFilter, setTalentFilter] = useState('');

  // Initialize roles from script characters and current cast
  const initializeRoles = (): RoleCast[] => {
    const roles: RoleCast[] = [];

    const resolveRequiredType = (character: ScriptCharacter): 'actor' | 'director' => {
      return character.importance === 'crew' ? 'director' : (character.requiredType || 'actor');
    };

    const resolveRoleType = (character: ScriptCharacter, requiredType: 'actor' | 'director'): RoleCast['roleType'] => {
      if (requiredType === 'director') return 'director';
      if (character.importance === 'lead') return 'lead';
      if (character.importance === 'supporting') return 'supporting';
      return 'character';
    };

    const findExisting = (characterName: string, requiredType: 'actor' | 'director') => {
      const pool = requiredType === 'director' ? (project.crew || []) : (project.cast || []);
      return pool.find((c) => c.role === characterName) || pool.find((c) => c.role?.endsWith(`- ${characterName}`));
    };

    // Add script characters
    if (project.script?.characters) {
      project.script.characters.forEach(character => {
        const requiredType = resolveRequiredType(character);
        const roleType = resolveRoleType(character, requiredType);

        const existingCast = findExisting(character.name, requiredType);

        roles.push({
          characterId: character.id,
          characterName: character.name,
          roleType,
          requiredType,
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
    const essentialRoles: Array<{ id: string; name: string; roleType: RoleCast['roleType']; requiredType: RoleCast['requiredType'] }> = [
      { id: 'director', name: 'Director', roleType: 'director', requiredType: 'director' },
      { id: 'lead', name: 'Lead Actor', roleType: 'lead', requiredType: 'actor' },
      { id: 'supporting', name: 'Supporting Actor', roleType: 'supporting', requiredType: 'actor' },
    ];

    essentialRoles.forEach(role => {
      if (!roles.find(r => r.characterName === role.name)) {
        const existingCast = findExisting(role.name, role.requiredType);
        roles.push({
          characterId: `essential_${role.id}`,
          characterName: role.name,
          roleType: role.roleType,
          requiredType: role.requiredType,
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
    let talentPool = availableTalent.filter(talent => talent.contractStatus === 'available');

    // Filter by role type compatibility
    if (selectedRole) {
      talentPool = talentPool.filter(talent => {
        if (selectedRole.requiredType === 'director' && talent.type !== 'director') return false;
        if (selectedRole.requiredType === 'actor' && talent.type !== 'actor') return false;
        return true;
      });
    }

    // Filter by search query
    if (talentFilter) {
      talentPool = talentPool.filter(talent => 
        talent.name.toLowerCase().includes(talentFilter.toLowerCase())
      );
    }

    if (tab === 'shortlist') {
      // Shortlist first: available shortlisted + rest
      const shortlistedAvailable = talentPool.filter(t => shortlistedTalentIds.includes(t.id));
      const otherAvailable = talentPool.filter(t => !shortlistedTalentIds.includes(t.id));
      return [...shortlistedAvailable, ...otherAvailable];
    }

    return talentPool;
  };

  const calculateTalentCost = (talent: TalentPerson): number => {
    const contractWeeks = selectedRole?.requiredType === 'director' ? 20 : 16;
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
        description: `Cannot afford ${talent.name}. Need $${(cost / 1000000).toFixed(0)}M more.`,
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
            contractWeeks: selectedRole.requiredType === 'director' ? 20 : 16
          }
        : role
    );

    setProjectRoles(updatedRoles);

    const castEntries = updatedRoles
      .filter(role => role.talentId && role.requiredType === 'actor')
      .map(role => ({
        talentId: role.talentId!,
        role: role.characterName,
        salary: role.salary!,
        points: 10,
        contractTerms: {
          duration: new Date(Date.now() + role.contractWeeks! * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: project.script?.franchiseId ? 2 : 1
        }
      }));

    const crewEntries = updatedRoles
      .filter(role => role.talentId && role.requiredType === 'director')
      .map(role => ({
        talentId: role.talentId!,
        role: role.characterName,
        salary: role.salary!,
        points: 15,
        contractTerms: {
          duration: new Date(Date.now() + role.contractWeeks! * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: 1
        }
      }));

    const updatedProject = {
      ...project,
      cast: castEntries,
      crew: crewEntries,
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

    const castEntries = updatedRoles
      .filter(role => role.talentId && role.requiredType === 'actor')
      .map(role => ({
        talentId: role.talentId!,
        role: role.characterName,
        salary: role.salary!,
        points: 10,
        contractTerms: {
          duration: new Date(Date.now() + role.contractWeeks! * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: project.script?.franchiseId ? 2 : 1
        }
      }));

    const crewEntries = updatedRoles
      .filter(role => role.talentId && role.requiredType === 'director')
      .map(role => ({
        talentId: role.talentId!,
        role: role.characterName,
        salary: role.salary!,
        points: 15,
        contractTerms: {
          duration: new Date(Date.now() + role.contractWeeks! * 7 * 24 * 60 * 60 * 1000),
          exclusivity: true,
          merchandising: true,
          sequelOptions: 1
        }
      }));

    onCastingUpdate({
      ...project,
      cast: castEntries,
      crew: crewEntries,
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

  const getRoleTypeColor = (roleType: RoleCast['roleType']) => {
    switch (roleType) {
      case 'director':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'lead':
        return 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/30';
      case 'supporting':
        return 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30';
      case 'character':
        return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-muted/50 text-muted-foreground';
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
                ${(getTotalBudgetUsed() / 1000000).toFixed(0)}M
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
                            {role.roleType}
                          </Badge>
                          {talent && (
                            <Badge variant="secondary">${(talent.marketValue / 1000000).toFixed(0)}M</Badge>
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
                      {role.roleType}
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
              Cast {selectedRole?.characterName} ({selectedRole?.roleType})
            </DialogTitle>
          </DialogHeader>

          {/* Talent Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'shortlist' | 'browse')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shortlist">
                Shortlist ({shortlistedTalentIds.filter(id => availableTalent.some(t => t.id === id && t.contractStatus === 'available')).length})
              </TabsTrigger>
              <TabsTrigger value="browse">
                Browse All
              </TabsTrigger>
            </TabsList>
            <TabsContent value="shortlist" className="mt-4">
              Shortlist prioritized - quick cast your favorites first.
            </TabsContent>
            <TabsContent value="browse" className="mt-4">
              Full available talent pool.
            </TabsContent>
          </Tabs>

          {/* Talent Filters */}
          <div className="flex gap-4 mt-4">
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium">{talent.name}</div>
                          {shortlistedTalentIds.includes(talent.id) && (
                            <Badge variant="default" className="text-xs">
                              <StarIcon className="h-3 w-3 mr-1" />
                              Shortlisted
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {talent.type} • Age {talent.age} • Rep: {Math.round(talent.reputation)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            ${(talent.marketValue / 1000000).toFixed(0)}M value
                          </Badge>
                          <Badge variant="outline">
                            ${(cost / 1000000).toFixed(0)}M total cost
                          </Badge>
                          {talent.awards && talent.awards.length > 0 && (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-800 dark:text-yellow-300">
                              {talent.awards.length} Awards
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleShortlist(talent.id)}
                        className="h-8 w-8 p-0"
                      >
                        <StarIcon className="h-4 w-4" fill={shortlistedTalentIds.includes(talent.id) ? "currentColor" : "none"} />
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => {
                          setCastingDialogOpen(false);
                          openTalentProfile(talent.id);
                        }}
                      >
                        Profile
                      </Button>
                      <Button
                        onClick={() => handleCastTalent(talent)}
                        disabled={!canAfford}
                        variant={canAfford ? "default" : "outline"}
                        size="sm"
                      >
                        {shortlistedTalentIds.includes(talent.id) ? "Quick Cast" : "Cast"}
                      </Button>
                    </div>
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