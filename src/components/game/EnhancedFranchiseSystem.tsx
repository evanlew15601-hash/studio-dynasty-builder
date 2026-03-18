import React, { useState } from 'react';
import { Franchise, Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Crown, Users, Plus, Film } from 'lucide-react';
import { FinancialEngine } from './FinancialEngine';

interface EnhancedFranchiseSystemProps {}

export const EnhancedFranchiseSystem: React.FC<EnhancedFranchiseSystemProps> = () => {
  const gameState = useGameStore((s) => s.game);
  const upsertFranchise = useGameStore((s) => s.upsertFranchise);
  const appendFranchiseEntry = useGameStore((s) => s.appendFranchiseEntry);
  const updateProject = useGameStore((s) => s.updateProject);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  
  const [newFranchise, setNewFranchise] = useState({
    title: '',
    description: '',
    genre: [] as string[],
    tone: 'light' as const,
    culturalWeight: 50,
    cost: 0
  });

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading franchise system...</div>;
  }

  // Get franchises created by the player studio
  const ownedFranchises = gameState.franchises.filter(f => f.creatorStudioId === gameState.studio.id);
  
  // Get ALL released projects that could become franchises - NO PERFORMANCE RESTRICTIONS
  const eligibleForFranchise = gameState.projects.filter(p => 
    p.status === 'released' && 
    !p.script.franchiseId // Not already part of a franchise - that's the only requirement
  );

  // Calculate franchise performance metrics (films + TV/streaming)
  const getFranchiseMetrics = (franchise: Franchise) => {
    const franchiseProjects = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
    const financials = FinancialEngine.getFranchiseFinancials(franchiseProjects);

    const totalBoxOffice = financials.boxOfficeRevenue;
    const totalBudget = franchiseProjects.reduce((sum, p) => sum + p.budget.total, 0);
    const avgCriticsScore =
      franchiseProjects.length > 0
        ? franchiseProjects.reduce((sum, p) => sum + (p.metrics?.criticsScore || 0), 0) /
          franchiseProjects.length
        : 0;
    const avgAudienceScore =
      franchiseProjects.length > 0
        ? franchiseProjects.reduce((sum, p) => sum + (p.metrics?.audienceScore || 0), 0) /
          franchiseProjects.length
        : 0;

    // Aggregate streaming performance from any franchise TV/streaming projects
    const totalStreamingViews = franchiseProjects.reduce(
      (sum, p) => sum + (p.metrics?.streaming?.totalViews || 0),
      0
    );

    return {
      projectCount: franchiseProjects.length,
      totalBoxOffice,
      totalBudget,
      totalStreamingViews,
      profitability:
        totalBudget > 0 ? ((financials.totalRevenue - totalBudget) / totalBudget) * 100 : 0,
      avgCriticsScore,
      avgAudienceScore,
      franchiseValue: financials.totalRevenue
    };
  };

  const createFranchiseFromProject = (project: Project) => {
    if (project.script?.franchiseId) {
      toast({
        title: "Already a Franchise",
        description: `"${project.title}" is already connected to a franchise.`,
      });
      return;
    }

    const expectedTitle = `${project.title} Universe`;

    const existing = gameState.franchises.find((f) =>
      f.creatorStudioId === gameState.studio.id &&
      (f.title === expectedTitle || (f.entries || []).includes(project.id))
    );

    if (existing) {
      updateProject(project.id, {
        script: {
          ...project.script,
          franchiseId: existing.id
        },
        franchisePosition: 1
      });

      appendFranchiseEntry(existing.id, project.id);

      toast({
        title: "Franchise Already Established",
        description: `"${existing.title}" already exists for this project.`,
      });

      return;
    }

    const cost = Math.floor(project.budget.total * 0.2); // 20% of project budget
    
    if (cost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford to establish franchise - need \u0024${(cost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    const franchise: Franchise = {
      id: `franchise-${Date.now()}`,
      title: expectedTitle,
      description: `Franchise based on the film "${project.title}"`,
      originDate: new Date().toISOString().split('T')[0],
      creatorStudioId: gameState.studio.id,
      genre: project.script.genre ? [project.script.genre] : [],
      tone: (project.script as any).tone || 'light',
      entries: [project.id],
      status: 'active',
      franchiseTags: [`${project.script.genre}`, 'original'],
      culturalWeight: Math.min(90, 40 + (project.metrics?.criticsScore || 0) / 2),
      cost: 0 // No ongoing costs for owned franchise
    };

    // Update the original project to be part of the franchise
    updateProject(project.id, {
      script: {
        ...project.script,
        franchiseId: franchise.id
      },
      franchisePosition: 1
    });

    upsertFranchise(franchise);
    updateBudget(-cost);
    
    toast({
      title: "Franchise Established!",
      description: `"${franchise.title}" franchise created from your release (cost \u0024${(cost / 1000000).toFixed(1)}M)`,
    });
  };

  const createOriginalFranchise = () => {
    if (!newFranchise.title) {
      toast({
        title: "Missing Information",
        description: "Franchise title is required",
        variant: "destructive"
      });
      return;
    }

    const cost = Math.floor(newFranchise.culturalWeight * 150000); // Higher cost for original franchise
    
    if (cost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford to create franchise - need $${(cost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    const franchise: Franchise = {
      id: `franchise-${Date.now()}`,
      title: newFranchise.title,
      description: newFranchise.description,
      originDate: new Date().toISOString().split('T')[0],
      creatorStudioId: gameState.studio.id,
      genre: newFranchise.genre as any,
      tone: newFranchise.tone,
      entries: [],
      status: 'active',
      franchiseTags: ['original', 'studio-created'],
      culturalWeight: newFranchise.culturalWeight,
      cost: 0
    };

    upsertFranchise(franchise);
    updateBudget(-cost);
    
    toast({
      title: "Original Franchise Created",
      description: `${franchise.title} franchise established (cost \u0024${(cost / 1000000).toFixed(1)}M)`,
    });

    setIsCreating(false);
    setNewFranchise({
      title: '',
      description: '',
      genre: [],
      tone: 'light',
      culturalWeight: 50,
      cost: 0
    });
  };

  const addProjectToFranchise = (project: Project, franchise: Franchise) => {
    const nextPosition = (franchise.entries?.length || 0) + 1;
    
    updateProject(project.id, {
      script: {
        ...project.script,
        franchiseId: franchise.id
      },
      franchisePosition: nextPosition
    });

    appendFranchiseEntry(franchise.id, project.id);

    toast({
      title: "Added to Franchise",
      description: `"${project.title}" is now part of ${franchise.title}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Franchise Management
            </div>
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Create Original Franchise
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Build lasting intellectual properties from your releases, or create original franchises from scratch.
          </div>
        </CardContent>
      </Card>

      {/* Franchise Creation Options */}
      {isCreating && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle>Create New Franchise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="franchise-title">Franchise Title</Label>
              <Input
                id="franchise-title"
                value={newFranchise.title}
                onChange={(e) => setNewFranchise(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter franchise name..."
              />
            </div>
            
            <div>
              <Label htmlFor="franchise-description">Description</Label>
              <Textarea
                id="franchise-description"
                value={newFranchise.description}
                onChange={(e) => setNewFranchise(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the franchise concept..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cultural Impact ({newFranchise.culturalWeight})</Label>
                <Input
                  type="range"
                  min="10"
                  max="90"
                  value={newFranchise.culturalWeight}
                  onChange={(e) => setNewFranchise(prev => ({ ...prev, culturalWeight: parseInt(e.target.value) }))}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Cost: ${(newFranchise.culturalWeight * 150000 / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createOriginalFranchise}>
                <Crown className="h-4 w-4 mr-2" />
                Create Original Franchise (${(newFranchise.culturalWeight * 150000 / 1000000).toFixed(1)}M)
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eligible Projects for Franchise Creation */}
      {eligibleForFranchise.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Projects Eligible for Franchise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Released projects that are not yet attached to a franchise.
            </div>
            <div className="grid gap-3">
              {eligibleForFranchise.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{project.title}</div>
                    <div className="text-sm text-muted-foreground">
                      ${((project.metrics?.boxOfficeTotal || 0) / 1000000).toFixed(1)}M box office • 
                      {project.metrics?.criticsScore}/100 critics
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createFranchiseFromProject(project)}
                  >
                    <Crown className="h-4 w-4 mr-1" />
                    Create Franchise
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owned Franchises */}
      <div className="grid gap-4">
        {ownedFranchises.map(franchise => {
          const metrics = getFranchiseMetrics(franchise);
          const franchiseProjects = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
          
          return (
            <Card key={franchise.id} className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
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
                  <Badge variant="secondary">
                    Owned IP
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Projects</div>
                    <div className="text-xl font-bold">{metrics.projectCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Box Office</div>
                    <div className="text-xl font-bold">${(metrics.totalBoxOffice / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Streaming Views</div>
                    <div className="text-xl font-bold">
                      {(metrics.totalStreamingViews / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Value</div>
                    <div className="text-xl font-bold">${(metrics.franchiseValue / 1000000).toFixed(1)}M</div>
                  </div>
                </div>

                {/* Franchise Projects (films & TV) */}
                {franchiseProjects.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Franchise Projects ({franchiseProjects.length})
                    </h4>
                    <div className="grid gap-2">
                      {franchiseProjects
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ownedFranchises.length === 0 && eligibleForFranchise.length === 0 && !isCreating && (
        <Card>
          <CardContent className="text-center py-8">
            <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Franchises Yet</h3>
            <p className="text-muted-foreground mb-4">
              Release a film, then turn it into a franchise (or create an original franchise from scratch).
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Original Franchise
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};