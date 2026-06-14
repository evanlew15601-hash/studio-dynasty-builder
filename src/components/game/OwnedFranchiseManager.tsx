import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Franchise } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, BookOpen, Calendar, Crown, Edit3, GitBranch, Skull, Star, TrendingUp, Users, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FinancialEngine } from './FinancialEngine';

interface OwnedFranchiseManagerProps {
  onCreateProject: (franchiseId?: string) => void;
  onCreateTVProject?: (franchiseId: string) => void;
}

export const OwnedFranchiseManager: React.FC<OwnedFranchiseManagerProps> = ({
  onCreateProject,
  onCreateTVProject
}) => {
  const { gameState, updateFranchise } = useGameStore(
    useShallow((s) => ({
      gameState: s.game,
      updateFranchise: s.updateFranchise,
    }))
  );
  const { toast } = useToast();
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: 'active' as 'active' | 'dormant' | 'rebooted' | 'retired'
  });
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading franchises...</div>;
  }

  const uniqById = <T extends { id: string }>(items: T[]): T[] => {
    const byId = new Map<string, T>();
    const order: string[] = [];

    for (const item of items) {
      if (!item?.id) continue;
      if (!byId.has(item.id)) order.push(item.id);
      byId.set(item.id, item);
    }

    return order.map((id) => byId.get(id)!).filter(Boolean);
  };

  const franchises = uniqById(gameState.franchises || []);

  // Get franchises owned by the player (deduped by id + title)
  const ownedFranchises = (() => {
    const seenTitles = new Set<string>();

    return franchises
      .filter(f => f.creatorStudioId === gameState.studio.id)
      .filter((f) => {
        const key = (f.title || '').trim().toLowerCase();
        if (!key) return false;
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      });
  })();

  // Calculate franchise metrics
  const getFranchiseMetrics = (franchise: Franchise) => {
    const franchiseProjects = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
    const financials = FinancialEngine.getFranchiseFinancials(franchiseProjects);
    const totalBoxOffice = financials.boxOfficeRevenue;
    const totalBudget = franchiseProjects.reduce((sum, p) => sum + p.budget.total, 0);
    const avgCriticsScore = franchiseProjects.length > 0 
      ? franchiseProjects.reduce((sum, p) => sum + (p.metrics?.criticsScore || 0), 0) / franchiseProjects.length
      : 0;

    return {
      projectCount: franchiseProjects.length,
      totalBoxOffice,
      totalBudget,
      profitability: totalBudget > 0 ? ((financials.totalRevenue - totalBudget) / totalBudget) * 100 : 0,
      avgCriticsScore,
      franchiseValue: financials.totalRevenue,
      projects: franchiseProjects
    };
  };

  const startEdit = (franchise: Franchise) => {
    setEditingFranchise(franchise);
    setEditForm({
      title: franchise.title,
      description: franchise.description || '',
      status: franchise.status
    });
  };

  const saveEdit = () => {
    if (!editingFranchise) return;

    updateFranchise(editingFranchise.id, {
      title: editForm.title,
      description: editForm.description,
      status: editForm.status,
    });

    toast({
      title: "Franchise Updated",
      description: `"${editForm.title}" has been updated successfully.`
    });

    setEditingFranchise(null);
  };

  const updateCharacterStatus = (franchise: Franchise, characterId: string, status: 'active' | 'retired' | 'deceased' | 'unavailable') => {
    const currentContinuity = franchise.continuity || {
      timelineEvents: [],
      characterAppearances: {},
      deaths: {},
      relationships: [],
      locations: [],
      plotThreads: [],
      warnings: [],
    };

    updateFranchise(franchise.id, {
      characterLibrary: (franchise.characterLibrary || []).map((character) =>
        character.characterId === characterId ? { ...character, status } : character
      ),
      continuity: {
        ...currentContinuity,
        deaths: status === 'deceased'
          ? {
              ...currentContinuity.deaths,
              [characterId]: { description: 'Marked deceased in franchise canon.' },
            }
          : currentContinuity.deaths,
        warnings: Array.from(new Set([
          ...(currentContinuity.warnings || []),
          status === 'deceased' ? `${franchise.characterLibrary?.find((c) => c.characterId === characterId)?.name || characterId} is deceased in canon.` : '',
          status === 'unavailable' ? `${franchise.characterLibrary?.find((c) => c.characterId === characterId)?.name || characterId} is unavailable for new entries.` : '',
        ].filter(Boolean))),
      },
    });
  };

  const promoteCharacter = (franchise: Franchise, characterId: string) => {
    updateFranchise(franchise.id, {
      characterLibrary: (franchise.characterLibrary || []).map((character) =>
        character.characterId === characterId
          ? { ...character, narrativeImportance: 'lead', recurrencePotential: Math.max(character.recurrencePotential, 90) }
          : character
      ),
    });
  };

  const getFranchiseIntelligence = (franchise: Franchise, metrics: ReturnType<typeof getFranchiseMetrics>): string[] => {
    const recommendations: string[] = [];
    const topCharacter = [...(franchise.characterLibrary || [])].sort((a, b) => (b.popularity || b.recurrencePotential) - (a.popularity || a.recurrencePotential))[0];
    const returningDirector = franchise.talentLibrary?.find((t) => t.role === 'director' && t.continuityPreference === 'return');
    const unavailableTalent = franchise.talentLibrary?.find((t) => t.status === 'busy' || t.status === 'contract-conflict');
    const activeThreads = franchise.continuity?.plotThreads?.filter((thread) => thread.status === 'active') || [];

    if (topCharacter) recommendations.push(`Audience interest strongly favors ${topCharacter.name} returning.`);
    if (returningDirector) recommendations.push('Previous director continuity is available and should be considered before replacement.');
    if (unavailableTalent) recommendations.push(`${unavailableTalent.name || unavailableTalent.talentId} has a ${unavailableTalent.status === 'busy' ? 'scheduling' : 'contract'} conflict; plan buyout, recasting, or replacement explicitly.`);
    if (metrics.projectCount >= 2 && metrics.avgCriticsScore >= 80) recommendations.push('Recent entries are critically strong; preserve the core creative team.');
    if (activeThreads.length > 0) recommendations.push(`${activeThreads.length} active story arc${activeThreads.length === 1 ? '' : 's'} can anchor the next installment.`);
    if (metrics.projectCount > 0 && metrics.profitability < 0) recommendations.push('Box office trend is weak; consider a lower-budget spin-off or TV adaptation.');

    return recommendations.length > 0 ? recommendations : ['No major continuity risks detected; the franchise is ready for a new entry.'];
  };

  if (ownedFranchises.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Owned Franchises</h3>
          <p className="text-muted-foreground">
            Create successful films or purchase franchise rights to build your intellectual property portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Your Franchises ({ownedFranchises.length})
          </h2>
          <p className="text-muted-foreground">
            Manage and expand your owned intellectual properties
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {ownedFranchises.map(franchise => {
          const metrics = getFranchiseMetrics(franchise);
          
          return (
            <Card key={franchise.id} className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      {franchise.title}
                      <Badge variant="outline" className="capitalize">
                        {franchise.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {franchise.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(franchise)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onCreateProject(franchise.id)}
                    >
                      Add Film
                    </Button>
                    {onCreateTVProject && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCreateTVProject(franchise.id)}
                      >
                        Add TV Series
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Franchise Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Projects</div>
                    <div className="text-xl font-bold">{metrics.projectCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Box Office</div>
                    <div className="text-xl font-bold">${(metrics.totalBoxOffice / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Profitability</div>
                    <div className={`text-xl font-bold ${metrics.profitability > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.profitability > 0 ? '+' : ''}{metrics.profitability.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Value</div>
                    <div className="text-xl font-bold">${(metrics.franchiseValue / 1000000).toFixed(1)}M</div>
                  </div>
                </div>

                {/* Franchise Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Since {new Date(franchise.originDate).getFullYear()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>Cultural Weight: {franchise.culturalWeight}/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>Avg Critics: {metrics.avgCriticsScore.toFixed(0)}/100</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDashboardId(selectedDashboardId === franchise.id ? null : franchise.id)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {selectedDashboardId === franchise.id ? 'Hide' : 'Open'} Franchise Dashboard
                </Button>

                {selectedDashboardId === franchise.id && (
                  <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Franchise Intelligence
                      </h4>
                      <div className="grid gap-2">
                        {getFranchiseIntelligence(franchise, metrics).map((recommendation) => (
                          <div key={recommendation} className="rounded border bg-background p-2 text-sm">
                            {recommendation}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Character Library ({franchise.characterLibrary?.length || 0})
                        </h4>
                        <div className="grid gap-2">
                          {(franchise.characterLibrary || []).map((character) => (
                            <div key={character.characterId} className="rounded border bg-background p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-medium">{character.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {character.gender}, {character.ageRange[0]}-{character.ageRange[1]} • {character.narrativeImportance} • recurrence {character.recurrencePotential}/100
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{character.description}</p>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Appearances: {character.appearances.length || 0} • Popularity: {character.popularity || 0}/100
                                  </div>
                                </div>
                                <Badge variant={character.status === 'active' ? 'default' : 'secondary'}>{character.status}</Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => promoteCharacter(franchise, character.characterId)}>
                                  Promote
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateCharacterStatus(franchise, character.characterId, 'retired')}>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Retire
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateCharacterStatus(franchise, character.characterId, 'deceased')}>
                                  <Skull className="h-3 w-3 mr-1" />
                                  Deceased
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateCharacterStatus(franchise, character.characterId, 'unavailable')}>
                                  Unavailable
                                </Button>
                                {character.status !== 'active' && (
                                  <Button size="sm" variant="outline" onClick={() => updateCharacterStatus(franchise, character.characterId, 'active')}>
                                    Restore
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {(franchise.characterLibrary || []).length === 0 && (
                            <div className="rounded border bg-background p-3 text-sm text-muted-foreground">
                              No library entries yet. Release or attach a franchise project to audit characters automatically.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Talent Library ({franchise.talentLibrary?.length || 0})
                          </h4>
                          <div className="grid gap-2">
                            {(franchise.talentLibrary || []).map((talent) => (
                              <div key={`${talent.talentId}-${talent.characterId || talent.role}`} className="rounded border bg-background p-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>{talent.name || talent.talentId} • {talent.role}</span>
                                  <Badge variant={talent.status === 'available' ? 'default' : 'secondary'}>{talent.status}</Badge>
                                </div>
                                {talent.warning && <div className="mt-1 text-xs text-amber-600">{talent.warning}</div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Canon & Continuity
                          </h4>
                          <div className="rounded border bg-background p-3 text-sm space-y-2">
                            <div>Timeline events: {franchise.continuity?.timelineEvents?.length || 0}</div>
                            <div>Active story arcs: {franchise.continuity?.plotThreads?.filter((thread) => thread.status === 'active').length || 0}</div>
                            <div>Returning locations: {franchise.continuity?.locations?.length || 0}</div>
                            {(franchise.continuity?.warnings || []).map((warning) => (
                              <div key={warning} className="text-amber-600">{warning}</div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Franchise Bible
                          </h4>
                          <div className="rounded border bg-background p-3 text-sm space-y-2">
                            <div>Planned arc: {franchise.franchiseBible?.plannedArc || 'standalone'}</div>
                            <div>Worldbuilding notes: {franchise.franchiseBible?.worldbuilding?.length || 0}</div>
                            <div>Future hooks: {(franchise.franchiseBible?.sequelHooks || []).join(' • ') || 'None yet'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Franchise Projects */}
                {metrics.projects.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Franchise Projects ({metrics.projects.length})
                    </h4>
                    <div className="grid gap-2">
                      {metrics.projects
                        .sort((a, b) => (a.franchisePosition || 0) - (b.franchisePosition || 0))
                        .map(project => (
                          <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {project.franchisePosition || '?'}
                              </div>
                              <div>
                                <div className="font-medium">{project.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  ${((project.metrics?.boxOfficeTotal || 0) / 1000000).toFixed(1)}M • 
                                  {project.metrics?.criticsScore || 0}/100 critics
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {project.type === 'feature'
                                  ? 'Film'
                                  : project.type === 'documentary'
                                  ? 'Doc'
                                  : 'TV'}
                              </Badge>
                              <Badge
                                variant={project.status === 'released' ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Franchise Tags */}
                {franchise.franchiseTags && franchise.franchiseTags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Tags:</div>
                    <div className="flex flex-wrap gap-1">
                      {franchise.franchiseTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingFranchise} onOpenChange={() => setEditingFranchise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Franchise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Franchise Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                  <SelectItem value="rebooted">Rebooted</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingFranchise(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
