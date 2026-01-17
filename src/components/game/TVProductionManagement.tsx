import React, { useState } from 'react';
import { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DevelopmentProgressModal } from './DevelopmentProgressModal';
import { RoleBasedCasting } from './RoleBasedCasting';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ProductionIcon, 
  CalendarIcon, 
  LocationIcon, 
  BudgetIcon,
  CrewIcon,
  CameraIcon,
  EditIcon,
  ScriptIcon,
  AlertIcon
} from '@/components/ui/icons';
import { advanceProjectState } from '@/utils/projectState';

interface TVProductionManagementProps {
  gameState: GameState;
  selectedProject: Project | null;
  onProjectUpdate: (project: Project) => void;
}

export const TVProductionManagement: React.FC<TVProductionManagementProps> = ({
  gameState,
  selectedProject,
  onProjectUpdate,
}) => {
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<'pre' | 'principal' | 'post'>('pre');
  const [selectedDevProject, setSelectedDevProject] = useState<Project | null>(null);
  const [castingProject, setCastingProject] = useState<Project | null>(null);
  const [showCastingModal, setShowCastingModal] = useState(false);

  const getTVProjectsInProduction = () => {
    return gameState.projects.filter(p => 
      (p.type === 'series' || p.type === 'limited-series') && (
        p.currentPhase === 'production' || 
        p.currentPhase === 'pre-production' ||
        p.currentPhase === 'post-production'
      )
    );
  };
  
  const getTVProjectsInDevelopment = () => {
    return gameState.projects.filter(p => 
      (p.type === 'series' || p.type === 'limited-series') && 
      p.currentPhase === 'development'
    );
  };

  const advanceTVProductionPhase = (project: Project) => {
    let updatedProject = { ...project };
    
    switch (project.currentPhase) {
      case 'development':
        if (!project.castingConfirmed) {
          toast({
            title: 'Casting Not Confirmed',
            description: 'Cast your lead actors and show runner before moving to Pre-Production.',
            variant: 'destructive'
          });
          return;
        }
        // TV: keep manual phase transition semantics
        updatedProject = {
          ...updatedProject,
          currentPhase: 'pre-production',
          status: 'pre-production',
          phaseDuration: 6 // 6 weeks for TV pre-production
        };
        break;
      case 'pre-production':
        updatedProject = {
          ...updatedProject,
          currentPhase: 'production',
          status: 'filming',
          phaseDuration: 12 // 12 weeks for TV production (multiple episodes)
        };
        break;
      case 'production':
        updatedProject = {
          ...updatedProject,
          currentPhase: 'post-production',
          status: 'post-production',
          phaseDuration: 8 // 8 weeks for TV post-production
        };
        break;
      case 'post-production':
        // ADVANCE to marketing phase when button is clicked - shared helper for ready-for-marketing meta-state
        updatedProject = advanceProjectState(updatedProject, 'markReadyForMarketing');
        updatedProject = {
          ...updatedProject,
          phaseDuration: -1, // Manual control until marketing campaign starts
          // Initialize marketing data for TV - essential for showing budget
          marketingData: {
            totalSpent: 0,
            currentBuzz: 0,
            campaigns: []
          }
        };
        break;
    }

    onProjectUpdate(updatedProject);

    toast({
      title: "TV Production Advanced",
      description: `"${project.title}" moved to ${updatedProject.currentPhase.replace('-', ' ')}`,
    });
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'development': return <ScriptIcon className="h-4 w-4" />;
      case 'pre-production': return <CalendarIcon className="h-4 w-4" />;
      case 'production': return <CameraIcon className="h-4 w-4" />;
      case 'post-production': return <EditIcon className="h-4 w-4" />;
      default: return <ProductionIcon className="h-4 w-4" />;
    }
  };

  const getPhaseProgress = (project: Project) => {
    if (project.phaseDuration <= 0) return 100;
    
    const totalDuration = {
      'development': 8,
      'pre-production': 6,
      'production': 12,
      'post-production': 8
    }[project.currentPhase] || 8;

    const remaining = project.phaseDuration;
    const completed = totalDuration - remaining;
    return Math.round((completed / totalDuration) * 100);
  };

  const productionProjects = getTVProjectsInProduction();
  const developmentProjects = getTVProjectsInDevelopment();

  return (
    <div className="space-y-6">
      {/* Development Phase Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ScriptIcon className="mr-2 h-5 w-5" />
            TV Shows in Development ({developmentProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {developmentProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">📝</div>
              <p>No TV shows in development</p>
              <p className="text-sm">Greenlight scripts to start development</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {developmentProjects.map((project) => (
                <Card key={project.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{project.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{project.script.genre}</Badge>
                          <Badge variant="secondary">{project.type}</Badge>
                          <Badge variant="outline">{project.script.estimatedRuntime}min</Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getPhaseIcon(project.currentPhase)}
                        Development
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{getPhaseProgress(project)}%</span>
                      </div>
                      <Progress value={getPhaseProgress(project)} className="h-2" />
                    </div>

                    {/* Casting Progress Visualization */}
                    <div className="mb-4 p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Casting Progress</span>
                        <Badge variant={project.castingConfirmed ? "default" : "destructive"}>
                          {project.castingConfirmed ? "✓ Ready" : "Incomplete"}
                        </Badge>
                      </div>
                      {(() => {
                        const characters = project.script?.characters || [];
                        const castCount = characters.filter(c => c.assignedTalentId).length;
                        const hasDirector = characters.some(c => c.requiredType === 'director' && c.assignedTalentId);
                        const hasLead = characters.some(c => c.importance === 'lead' && c.requiredType === 'actor' && c.assignedTalentId);
                        const progress = characters.length > 0 ? (castCount / characters.length) * 100 : 0;
                        
                        return (
                          <>
                            <Progress value={progress} className="h-2 mb-2" />
                            <div className="flex gap-2 text-xs">
                              <Badge variant={hasDirector ? "default" : "outline"} className="text-xs">
                                {hasDirector ? "✓" : "○"} Director
                              </Badge>
                              <Badge variant={hasLead ? "default" : "outline"} className="text-xs">
                                {hasLead ? "✓" : "○"} Lead Actor
                              </Badge>
                              <span className="text-muted-foreground ml-auto">
                                {castCount}/{characters.length} roles cast
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Season Budget: </span>
                        <span>
                          ${((project.budget?.total ?? project.script.budget) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weeks Left: </span>
                        <span>{project.phaseDuration || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quality: </span>
                        <span>{project.script.quality}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Episodes: </span>
                        <span>{project.seasons?.[0]?.totalEpisodes || 10}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="secondary"
                        size="sm" 
                        onClick={() => { setCastingProject(project); setShowCastingModal(true); }}
                        className="flex-1"
                      >
                        Cast Roles
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => advanceTVProductionPhase(project)}
                        disabled={!project.castingConfirmed}
                        className="flex-1"
                      >
                        Move to Pre-Production
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedDevProject(project)}
                      >
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Phase Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CameraIcon className="mr-2 h-5 w-5" />
            TV Shows in Production ({productionProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productionProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">🎬</div>
              <p>No TV shows currently in production</p>
              <p className="text-sm">Complete development phase to start production</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {productionProjects.map((project) => (
                <Card key={project.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{project.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{project.script.genre}</Badge>
                          <Badge variant="secondary">{project.type}</Badge>
                          <Badge variant="outline">Season 1</Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getPhaseIcon(project.currentPhase)}
                        {project.currentPhase.replace('-', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Phase Progress</span>
                        <span>{getPhaseProgress(project)}%</span>
                      </div>
                      <Progress value={getPhaseProgress(project)} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Episodes: </span>
                        <span>13</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weeks Left: </span>
                        <span>{project.phaseDuration || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        <span className="capitalize">{project.status}</span>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      onClick={() => advanceTVProductionPhase(project)}
                      className="w-full"
                    >
                      {project.currentPhase === 'pre-production' && 'Start Filming'}
                      {project.currentPhase === 'production' && 'Wrap Production'}
                      {project.currentPhase === 'post-production' && 'Move to Marketing'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Development Details Modal */}
      {selectedDevProject && (
        <DevelopmentProgressModal
          project={selectedDevProject}
          open={!!selectedDevProject}
          onClose={() => setSelectedDevProject(null)}
        />
      )}

      {/* Casting Modal */}
      {showCastingModal && castingProject && (
        <Dialog open={showCastingModal} onOpenChange={() => { setShowCastingModal(false); setCastingProject(null); }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Casting - {castingProject.title}</DialogTitle>
            </DialogHeader>
            <RoleBasedCasting
              project={castingProject}
              gameState={gameState}
              onCastRole={(characterId, talentId) => {
                const updatedCharacters = (castingProject.script?.characters || []).map(c =>
                  c.id === characterId ? { ...c, assignedTalentId: talentId } : c
                );
                const hasDirector = updatedCharacters.some(c => c.requiredType === 'director' && c.assignedTalentId);
                const hasLead = updatedCharacters.some(c => c.importance === 'lead' && c.requiredType === 'actor' && c.assignedTalentId);
                const updated = { 
                  ...castingProject, 
                  script: { ...castingProject.script, characters: updatedCharacters }, 
                  castingConfirmed: hasDirector && hasLead 
                };
                onProjectUpdate(updated);
              }}
              onCreateRole={(role) => {
                const updatedCharacters = [...(castingProject.script?.characters || []), role];
                const hasDirector = updatedCharacters.some(c => c.requiredType === 'director' && c.assignedTalentId);
                const hasLead = updatedCharacters.some(c => c.importance === 'lead' && c.requiredType === 'actor' && c.assignedTalentId);
                const updated = { 
                  ...castingProject, 
                  script: { ...castingProject.script, characters: updatedCharacters }, 
                  castingConfirmed: hasDirector && hasLead 
                };
                onProjectUpdate(updated);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};