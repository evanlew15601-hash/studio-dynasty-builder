import React, { useMemo, useState } from 'react';
import { GameState, Franchise, Script } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Film, Crown, TrendingUp } from 'lucide-react';
import { finalizeScriptForSave } from '@/utils/scriptFinalization';

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

  const ownedFranchises = useMemo(
    () => (gameState.franchises || []).filter(f => f.creatorStudioId === gameState.studio.id),
    [gameState.franchises, gameState.studio.id]
  );

  const getFranchiseProjectCount = (franchise: Franchise) => {
    return (gameState.projects || []).filter(p => p.script?.franchiseId === franchise.id).length;
  };

  const getFranchiseProjects = (franchise: Franchise) => {
    return (gameState.projects || []).filter(p => p.script?.franchiseId === franchise.id);
  };

  const startProjectCreation = (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    const projectCount = getFranchiseProjectCount(franchise);

    setProjectForm({
      title: `${franchise.title} ${projectCount === 0 ? 'Origins' : projectCount === 1 ? 'Returns' : `Part ${projectCount + 1}`}`,
      description: `A new entry in the ${franchise.title} franchise`,
      genre: franchise.genre?.[0] || 'action',
      budget: 15000000 + (projectCount * 5000000),
      timeline: 'standard',
      tone: franchise.tone || 'balanced',
      targetAudience: 'general',
      estimatedRuntime: 120,
      projectType: 'film'
    });

    setIsCreating(true);
  };

  const createFranchiseProject = () => {
    if (!selectedFranchise) return;

    const developmentCost = projectForm.budget * 0.1;
    const maxLoanCapacity = Math.max(0, 50_000_000 - (gameState.studio.debt || 0));
    const availableFunds = gameState.studio.budget + maxLoanCapacity;

    if (developmentCost > availableFunds) {
      toast({
        title: 'Insufficient Budget',
        description: 'Need ' + (developmentCost / 1000000).toFixed(1) + 'M available (10% development cost) to start this project',
        variant: 'destructive'
      });
      return;
    }

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
      quality: 60 + Math.floor(Math.random() * 20),
      budget: projectForm.budget,
      developmentStage: 'draft',
      themes: selectedFranchise.franchiseTags?.slice(0, 3) || ['adventure'],
      targetAudience: projectForm.targetAudience as any,
      estimatedRuntime,
      characteristics: {
        tone: projectForm.tone as any,
        pacing: pacing as any,
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 6 + Math.floor(selectedFranchise.culturalWeight / 20),
        criticalPotential: 5 + Math.floor(selectedFranchise.culturalWeight / 25),
        cgiIntensity: 'moderate'
      },
      characters: [],
      franchiseId: selectedFranchise.id,
      sourceType: 'franchise'
    };

    const finalized = finalizeScriptForSave(script, gameState);
    onProjectCreate(finalized);

    toast({
      title: 'Franchise Project Started',
      description: '"' + projectForm.title + '" is now in development as part of ' + selectedFranchise.title,
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Franchise Project Creator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create new projects within your owned franchises.
          </p>
        </CardContent>
      </Card>

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
                <Label htmlFor="project-type">Project Type</Label>
                <Select
                  value={projectForm.projectType}
                  onValueChange={(value) => setProjectForm(prev => ({ ...prev, projectType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="project-description">Description / Logline</Label>
                <Textarea
                  id="project-description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="project-genre">Genre</Label>
                <Select
                  value={projectForm.genre}
                  onValueChange={(value) => setProjectForm(prev => ({ ...prev, genre: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-budget">Budget</Label>
                <Input
                  id="project-budget"
                  type="number"
                  min={1000000}
                  step={1000000}
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label htmlFor="project-tone">Tone</Label>
                <Select
                  value={projectForm.tone}
                  onValueChange={(value) => setProjectForm(prev => ({ ...prev, tone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-audience">Target Audience</Label>
                <Select
                  value={projectForm.targetAudience}
                  onValueChange={(value) => setProjectForm(prev => ({ ...prev, targetAudience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="young-adult">Young Adult</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
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
                  onChange={(e) => setProjectForm(prev => ({
                    ...prev,
                    estimatedRuntime: parseInt(e.target.value) || (prev.projectType === 'tv' ? 45 : 120)
                  }))}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={createFranchiseProject}
                disabled={!projectForm.title}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Development ({(projectForm.budget / 1000000).toFixed(1)}M)
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {ownedFranchises.map(franchise => {
          const franchiseProjects = getFranchiseProjects(franchise);
          const projectCount = franchiseProjects.length;
          const totalBoxOffice = franchiseProjects.reduce((sum, p) => sum + (p.metrics?.boxOfficeTotal || 0), 0);

          return (
            <Card key={franchise.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <Crown className="h-5 w-5 text-primary" />
                      {franchise.title}
                      <Badge variant="outline" className="capitalize">
                        {franchise.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{franchise.description}</p>
                  </div>

                  <Button onClick={() => startProjectCreation(franchise)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="text-lg font-semibold">{projectCount}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Cultural Weight</p>
                    <p className="text-lg font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {franchise.culturalWeight || 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Total Box Office</p>
                    <p className="text-lg font-semibold">{(totalBoxOffice / 1000000).toFixed(1)}M</p>
                  </div>
                </div>

                {franchiseProjects.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Recent Entries</p>
                    <div className="space-y-1">
                      {franchiseProjects.slice(-3).map(project => (
                        <div key={project.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{project.title}</span>
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
