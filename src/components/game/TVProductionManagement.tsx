import React, { useState } from 'react';
import { GameState, TalentPerson } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TVShowScript } from './TVShowDevelopment';
import { 
  Tv, 
  Camera, 
  Edit, 
  Calendar, 
  Users,
  DollarSign,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export interface TVShowProject {
  id: string;
  script: TVShowScript;
  currentPhase: 'pre-production' | 'production' | 'post-production' | 'ready-to-air';
  status: 'pre-production' | 'filming' | 'post-production' | 'completed';
  phaseDuration: number; // weeks
  weeksRemaining: number;
  episodeProgress: {
    currentEpisode: number;
    totalEpisodes: number;
    episodesCompleted: number;
  };
  cast: Array<{
    talentId: string;
    talentName: string;
    role: string;
    salary: number;
    episodeCommitment: number;
  }>;
  crew: Array<{
    role: string;
    name: string;
    salary: number;
  }>;
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
  };
  schedule: {
    startWeek: number;
    startYear: number;
    estimatedCompletionWeek: number;
    estimatedCompletionYear: number;
  };
  castingConfirmed: boolean;
  network?: string;
  quality: number; // 0-100, evolves during production
  performanceMetrics?: {
    onTime: boolean;
    onBudget: boolean;
    crewMorale: number;
    productionIssues: string[];
  };
}

interface TVProductionManagementProps {
  gameState: GameState;
  onProjectUpdate: (project: TVShowProject) => void;
  onBudgetUpdate: (amount: number) => void;
}

export const TVProductionManagement: React.FC<TVProductionManagementProps> = ({
  gameState,
  onProjectUpdate,
  onBudgetUpdate,
}) => {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<TVShowProject | null>(null);

  const getProjectsInProduction = (): TVShowProject[] => {
    return gameState.tvProjects?.filter(p =>
      p.currentPhase === 'pre-production' || 
      p.currentPhase === 'production' ||
      p.currentPhase === 'post-production'
    ) || [];
  };

  const getReadyToStartProjects = (): TVShowScript[] => {
    const projectIds = gameState.tvProjects?.map(p => p.script.id) || [];
    return gameState.tvScripts?.filter(s => 
      s.developmentStage === 'ready-for-production' && 
      !projectIds.includes(s.id)
    ) || [];
  };

  const advanceProductionPhase = (project: TVShowProject) => {
    let updatedProject = { ...project };
    
    switch (project.currentPhase) {
      case 'pre-production':
        if (!project.castingConfirmed) {
          toast({
            title: 'Casting Not Confirmed',
            description: 'Confirm main cast before moving to Production.',
            variant: 'destructive'
          });
          return;
        }
        updatedProject = {
          ...updatedProject,
          currentPhase: 'production',
          status: 'filming',
          phaseDuration: project.script.episodeCount * 0.7, // ~0.7 weeks per episode
          weeksRemaining: project.script.episodeCount * 0.7,
          episodeProgress: {
            ...project.episodeProgress,
            currentEpisode: 1
          }
        };
        break;
      case 'production':
        updatedProject = {
          ...updatedProject,
          currentPhase: 'post-production',
          status: 'post-production',
          phaseDuration: Math.ceil(project.script.episodeCount * 0.4), // ~0.4 weeks per episode
          weeksRemaining: Math.ceil(project.script.episodeCount * 0.4),
          episodeProgress: {
            ...project.episodeProgress,
            episodesCompleted: project.script.episodeCount
          }
        };
        break;
      case 'post-production':
        updatedProject = {
          ...updatedProject,
          currentPhase: 'ready-to-air',
          status: 'completed',
          phaseDuration: 0,
          weeksRemaining: 0,
          quality: Math.min(100, project.quality + Math.random() * 10 + 5)
        };
        break;
    }

    onProjectUpdate(updatedProject);

    toast({
      title: "Production Advanced",
      description: `"${project.script.title}" moved to ${updatedProject.currentPhase.replace('-', ' ')}`,
    });
  };

  const startProduction = (script: TVShowScript) => {
    if (script.budget.totalSeason > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Need $${(script.budget.totalSeason / 1000000).toFixed(1)}M to start production`,
        variant: "destructive"
      });
      return;
    }

    const project: TVShowProject = {
      id: `tv-project-${Date.now()}`,
      script: script,
      currentPhase: 'pre-production',
      status: 'pre-production',
      phaseDuration: 4, // 4 weeks for pre-production
      weeksRemaining: 4,
      episodeProgress: {
        currentEpisode: 0,
        totalEpisodes: script.episodeCount,
        episodesCompleted: 0
      },
      cast: [],
      crew: [
        { role: 'Showrunner', name: script.writer, salary: script.budget.perEpisode * 0.1 },
        { role: 'Director', name: 'TBD', salary: script.budget.perEpisode * 0.08 },
        { role: 'Producer', name: 'TBD', salary: script.budget.perEpisode * 0.06 }
      ],
      budget: {
        allocated: script.budget.totalSeason,
        spent: 0,
        remaining: script.budget.totalSeason
      },
      schedule: {
        startWeek: gameState.currentWeek,
        startYear: gameState.currentYear,
        estimatedCompletionWeek: gameState.currentWeek + 12, // ~12 weeks total
        estimatedCompletionYear: gameState.currentYear
      },
      castingConfirmed: false,
      quality: script.quality,
      performanceMetrics: {
        onTime: true,
        onBudget: true,
        crewMorale: 75,
        productionIssues: []
      }
    };

    // Deduct initial production budget
    onBudgetUpdate(-script.budget.totalSeason);

    onProjectUpdate(project);

    toast({
      title: "Production Started",
      description: `"${script.title}" entered pre-production`,
    });
  };

  const castTalentInTVShow = (project: TVShowProject, talent: TalentPerson, role: string) => {
    const episodeSalary = talent.marketValue * 0.4; // TV pays less than films
    const totalSalary = episodeSalary * project.script.episodeCount;

    const updatedProject: TVShowProject = {
      ...project,
      cast: [...project.cast, {
        talentId: talent.id,
        talentName: talent.name,
        role: role,
        salary: episodeSalary,
        episodeCommitment: project.script.episodeCount
      }],
      budget: {
        ...project.budget,
        spent: project.budget.spent + totalSalary,
        remaining: project.budget.remaining - totalSalary
      }
    };

    // Check if main roles are filled
    const hasLead = updatedProject.cast.some(c => c.role.toLowerCase().includes('lead'));
    const hasSupporting = updatedProject.cast.length >= 2;
    
    if (hasLead && hasSupporting) {
      updatedProject.castingConfirmed = true;
    }

    onProjectUpdate(updatedProject);

    toast({
      title: `${talent.name} Cast`,
      description: `Added to "${project.script.title}" as ${role}`,
    });
  };

  const getAvailableTalent = (): TalentPerson[] => {
    const busyTalentIds = new Set(
      gameState.tvProjects?.flatMap(p => p.cast.map(c => c.talentId)) || []
    );
    
    return gameState.talent.filter(t => 
      t.type === 'actor' && !busyTalentIds.has(t.id)
    );
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'pre-production': return <Calendar className="h-4 w-4" />;
      case 'production': return <Camera className="h-4 w-4" />;
      case 'post-production': return <Edit className="h-4 w-4" />;
      case 'ready-to-air': return <CheckCircle className="h-4 w-4" />;
      default: return <Tv className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'pre-production': return 'bg-blue-500';
      case 'production': return 'bg-green-500';
      case 'post-production': return 'bg-orange-500';
      case 'ready-to-air': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const projectsInProduction = getProjectsInProduction();
  const readyToStart = getReadyToStartProjects();
  const availableTalent = getAvailableTalent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            TV Production Management
          </h2>
          <p className="text-muted-foreground">Manage television show production from pre-production to completion</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready to Start Production */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Ready to Start ({readyToStart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readyToStart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No shows ready for production</p>
            ) : (
              readyToStart.map(script => (
                <Card key={script.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{script.title}</h3>
                      <p className="text-sm text-muted-foreground">{script.genre} • {script.format}</p>
                    </div>
                    <Badge className="ml-2">Ready</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Episodes: </span>
                      <span>{script.episodeCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality: </span>
                      <span>{script.quality.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Per Episode: </span>
                      <span>${(script.budget.perEpisode / 1000000).toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Budget: </span>
                      <span>${(script.budget.totalSeason / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => startProduction(script)}
                    disabled={script.budget.totalSeason > gameState.studio.budget}
                    size="sm"
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Production
                  </Button>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Projects in Production */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              In Production ({projectsInProduction.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectsInProduction.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No shows in production</p>
            ) : (
              projectsInProduction.map(project => (
                <Card key={project.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{project.script.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.script.genre} • Episode {project.episodeProgress.currentEpisode}/{project.episodeProgress.totalEpisodes}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPhaseIcon(project.currentPhase)}
                      <Badge variant="outline">
                        {project.currentPhase.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.weeksRemaining} weeks remaining</span>
                    </div>
                    <Progress 
                      value={((project.phaseDuration - project.weeksRemaining) / project.phaseDuration) * 100} 
                      className="h-2" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Cast: </span>
                      <span>{project.cast.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality: </span>
                      <span>{project.quality.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spent: </span>
                      <span>${(project.budget.spent / 1000000).toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining: </span>
                      <span>${(project.budget.remaining / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>

                  {project.currentPhase === 'pre-production' && !project.castingConfirmed && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Cast Needed</span>
                      </div>
                      <div className="space-y-2">
                        {availableTalent.slice(0, 3).map(talent => (
                          <div key={talent.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                            <div>
                              <span className="font-medium">{talent.name}</span>
                              <span className="text-muted-foreground ml-2">
                                Rep: {talent.reputation} • ${(talent.marketValue / 1000000).toFixed(1)}M
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => castTalentInTVShow(project, talent, 'Lead Character')}
                            >
                              Cast
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => advanceProductionPhase(project)}
                    disabled={project.currentPhase === 'pre-production' && !project.castingConfirmed}
                    size="sm"
                    className="w-full"
                  >
                    {project.currentPhase === 'ready-to-air' ? 'Complete Production' : 'Advance Phase'}
                  </Button>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};