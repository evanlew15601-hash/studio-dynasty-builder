import React, { useState } from 'react';
import { GameState, Franchise, Script } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Film, Crown, TrendingUp } from 'lucide-react';

interface FranchiseProjectCreatorProps {
  gameState: GameState;
  onProjectCreate: (script: Script) => void;
}

interface NewProjectForm {
  title: string;
  description: string;
  genre: string;
  budget: number;
  timeline: string;
  tone: string;
  targetAudience: string;
  estimatedRuntime: number;
  projectType: 'film' | 'tv';
}

export const FranchiseProjectCreator: React.FC<FranchiseProjectCreatorProps> = ({
  gameState,
  onProjectCreate
}) => {
  const { toast } = useToast();
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [projectForm, setProjectForm] = useState<NewProjectForm>({
    title: '',
    description: '',
    genre: 'action',
    budget: 15000000,
    timeline: 'standard',
    tone: 'balanced',
    targetAudience: 'general',
    estimatedRuntime: 120,
    projectType: 'film'
  });

  // Get franchises owned by the player
  const ownedFranchises = gameState.franchises.filter(f => f.creatorStudioId === gameState.studio.id);

  // Get franchise projects count
  const getFranchiseProjectCount = (franchise: Franchise) => {
    return gameState.projects.filter(p => p.script?.franchiseId === franchise.id).length;
  };

  // Start creating a new franchise project
  const startProjectCreation = (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    const projectCount = getFranchiseProjectCount(franchise);
    
    setProjectForm({
      title: `${franchise.title} ${projectCount === 0 ? 'Origins' : projectCount === 1 ? 'Returns' : `Part ${projectCount + 1}`}`,
      description: `A new entry in the ${franchise.title} franchise`,
      genre: franchise.genre?.[0] || 'action',
      budget: 15000000 + (projectCount * 5000000), // Increasing budgets for features by default
      timeline: 'standard',
      tone: franchise.tone || 'balanced',
      targetAudience: 'general',
      estimatedRuntime: 120,
      projectType: 'film'
    });
    setIsCreating(true);
  };

  // Create the franchise project
  const createFranchiseProject = () => {
    if (!selectedFranchise) return;

    if (projectForm.budget > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Need ${(projectForm.budget / 1000000).toFixed(1)}M to develop this project`,
        variant: "destructive"
      });
      return;
    }

    const projectCount = getFranchiseProjectCount(selectedFranchise);
    
    // Derive script fields based on chosen project type (film vs TV)
    const isTV = projectForm.projectType === 'tv';
    const pages = isTV ? 60 : 100 + Math.floor(Math.random() * 40);
    const estimatedRuntime = isTV ? 45 : projectForm.estimatedRuntime;
    const pacing = isTV ? 'episodic' : 'fast-paced';

    const script: Script = {
      id: `script-franchise-${Date.now()}`,
      title: projectForm.title,
      genre: projectForm.genre as any,
      logline: projectForm.description,
      writer: 'Studio Writer',
      pages,
      quality: 60 + Math.floor(Math.random() * 20), // 60-80 starting quality
      budget: projectForm.budget,
      developmentStage: 'concept',
      themes: selectedFranchise.franchiseTags?.slice(0, 3) || ['adventure'],
      targetAudience: projectForm.targetAudience as any,
      estimatedRuntime: estimatedRuntime,
      characteristics: {
        tone: projectForm.tone as any,
        pacing: pacing as any,
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 6 + Math.floor(selectedFranchise.culturalWeight / 20),
        criticalPotential: 5 + Math.floor(selectedFranchise.culturalWeight / 25),
        cgiIntensity: 'moderate'
      },
      characters: [], // Will be populated by character system
      franchiseId: selectedFranchise.id,
      sourceType: 'franchise'
    };

    onProjectCreate(script);
    
    toast({
      title: "Franchise Project Started",
      description: `"${projectForm.title}" is now in development as part of ${selectedFranchise.title}`,
    });

    setIsCreating(false);
    setSelectedFranchise(null);
  };

  if (ownedFranchises.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Owned Franchises</h3>
          <p className="text-muted-foreground">
            Create or acquire franchises to start developing franchise projects.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Franchise Project Creator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create new projects within your owned franchises. Build cinematic universes and expand successful properties.
          </p>
        </CardContent>
      </Card>

      {/* Project Creation Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Franchise Project</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedFranchise && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedFranchise.title}</span>
                <Badge variant="outline">
                  {getFranchiseProjectCount(selectedFranchise)} existing projects
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-title">Project Title</Label>
                <Input
                  id="project-title"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="project-genre">Genre</Label>
                <Select value={projectForm.genre} onValueChange={(value) => setProjectForm(prev => ({ ...prev, genre: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={projectForm.description}
                onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="project-type">Project Type</Label>
                <Select
                  value={projectForm.projectType}
                  onValueChange={(value: any) => setProjectForm(prev => ({ ...prev, projectType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="film">Feature Film</SelectItem>
                    <SelectItem value="tv">TV Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-budget">Budget (${(projectForm.budget / 1000000).toFixed(1)}M)</Label>
                <Input
                  id="project-budget"
                  type="range"
                  min="5000000"
                  max="200000000"
                  step="5000000"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <Label htmlFor="project-tone">Tone</Label>
                <Select value={projectForm.tone} onValueChange={(value) => setProjectForm(prev => ({ ...prev, tone: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="satirical">Satirical</SelectItem>
                    <SelectItem value="dramatic">Dramatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-runtime">Runtime (minutes)</Label>
                <Input
                  id="project-runtime"
                  type="number"
                  min={projectForm.projectType === 'tv' ? 20 : 90}
                  max={projectForm.projectType === 'tv' ? 90 : 240}
                  value={projectForm.estimatedRuntime}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, estimatedRuntime: parseInt(e.target.value) || (prev.projectType === 'tv' ? 45 : 120) }))}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={createFranchiseProject}
                disabled={!projectForm.title || projectForm.budget > gameState.studio.budget}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Development (${(projectForm.budget / 1000000).toFixed(1)}M)
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owned Franchises */}
      <div className="grid gap-4">
        {ownedFranchises.map(franchise => {
          const projectCount = getFranchiseProjectCount(franchise);
          const franchiseProjects = gameState.projects.filter(p => p.script?.franchiseId === franchise.id);
          const totalBoxOffice = franchiseProjects.reduce((sum, p) => sum + (p.metrics?.boxOfficeTotal || 0), 0);
          
          return (
            <Card key={franchise.id} className="border-l-4 border-l-primary">
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
                  
                  <Button onClick={() => startProjectCreation(franchise)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">Projects</div>
                    <div className="text-xl font-bold">{projectCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Total Box Office</div>
                    <div className="text-xl font-bold">${(totalBoxOffice / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Cultural Weight</div>
                    <div className="text-xl font-bold">{franchise.culturalWeight}/100</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Potential</div>
                    <div className="text-xl font-bold flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      High
                    </div>
                  </div>
                </div>

                {franchiseProjects.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Recent Projects</h4>
                    <div className="space-y-1">
                      {franchiseProjects.slice(-3).map(project => (
                        <div key={project.id} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {project.title}
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              {project.type === 'feature'
                                ? 'Film'
                                : project.type === 'documentary'
                                ? 'Doc'
                                : 'TV'}
                            </Badge>
                          </span>
                          <Badge
                            variant={project.status === 'released' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {project.status}
                          </Badge>
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
    </div>
  );
};