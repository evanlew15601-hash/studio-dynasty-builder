import React, { useState } from 'react';
import { Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DevelopmentProgressModal } from './DevelopmentProgressModal';
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

interface ProductionManagementProps {
  selectedProject: Project | null;
}

export const ProductionManagement: React.FC<ProductionManagementProps> = ({
  selectedProject,
}) => {
  const gameState = useGameStore((s) => s.game);
  const updateProject = useGameStore((s) => s.updateProject);
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<'pre' | 'principal' | 'post'>('pre');
  const [selectedDevProject, setSelectedDevProject] = useState<Project | null>(null);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading production workspace...</div>;
  }

  const getProjectsInProduction = () => {
    return gameState.projects.filter(p => 
      p.currentPhase === 'production' || 
      p.currentPhase === 'pre-production' ||
      p.currentPhase === 'post-production'
    );
  };
  
  const getProjectsInDevelopment = () => {
    return gameState.projects.filter(p => p.currentPhase === 'development');
  };

  const advanceProductionPhase = (project: Project) => {
    let updatedProject = { ...project };
    
    switch (project.currentPhase) {
      case 'development':
        if (!project.castingConfirmed) {
          toast({
            title: 'Casting Not Confirmed',
            description: 'Confirm casting (Director and Lead) before moving to Pre-Production.',
            variant: 'destructive'
          });
          return;
        }
        updatedProject = {
          ...updatedProject,
          currentPhase: 'pre-production',
          status: 'pre-production',
          phaseDuration: 4 // 4 weeks for pre-production
        };
        break;
      case 'pre-production': {
        // Gate: require Director + Lead Actor before entering production
        const chars = project.script?.characters || [];
        const hasDirector = chars.some(c => c.requiredType === 'director' && c.assignedTalentId);
        const hasLead = chars.some(c => c.importance === 'lead' && c.requiredType !== 'director' && c.assignedTalentId);
        if (!hasDirector || !hasLead) {
          toast({
            title: 'Cast Required',
            description: `Attach a Director${hasDirector ? '' : ' (missing)'} and Lead Actor${hasLead ? '' : ' (missing)'} before production can begin.`,
            variant: 'destructive'
          });
          return;
        }
        updatedProject = {
          ...updatedProject,
          currentPhase: 'production',
          status: 'filming',
          castingConfirmed: true,
          phaseDuration: 8 // 8 weeks for production
        };
        break;
      }
      case 'production':
        updatedProject = {
          ...updatedProject,
          currentPhase: 'post-production',
          status: 'post-production',
          phaseDuration: 6 // 6 weeks for post-production
        };
        break;
      case 'post-production':
        // ADVANCE to marketing phase when button is clicked
        updatedProject = {
          ...updatedProject,
          currentPhase: 'marketing',
          status: 'ready-for-marketing' as any,
          phaseDuration: -1, // Manual control - wait for marketing campaign
          readyForMarketing: true
        };
        toast({
          title: "Post-Production Complete!",
          description: `${project.title} is ready for marketing. Launch a campaign in the Marketing & Release tab.`,
        });
        break;
    }

    updateProject(project.id, updatedProject as any);

    toast({
      title: "Production Advanced",
      description: `"${project.title}" moved to ${updatedProject.currentPhase.replace('-', ' ')}`,
    });
  };

  const getPhaseLabel = (phase: string) => {
    return phase.charAt(0).toUpperCase() + phase.slice(1).replace('-', ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Production Management
          </h2>
          <p className="text-muted-foreground">
            Manage active projects and development pipeline
          </p>
        </div>
      </div>

      {/* Development Projects */}
      {getProjectsInDevelopment().length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ScriptIcon className="w-6 h-6" />
              Projects in Development ({getProjectsInDevelopment().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {getProjectsInDevelopment().map(project => {
                const progress = project.developmentProgress;
                const averageProgress = (progress.scriptCompletion + progress.budgetApproval + progress.talentAttached + progress.locationSecured) / 4;
                const hasIssues = progress.issues.length > 0;
                
                return (
                  <Card key={project.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.script?.genre || 'Unknown'} • ${(project.budget.total / 1000000).toFixed(1)}M Budget
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasIssues && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertIcon className="w-3 h-3 mr-1" />
                              {progress.issues.length} Issue{progress.issues.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {project.phaseDuration === -1 ? 'Ready' : project.phaseDuration === 0 ? 'Complete' : `${project.phaseDuration} weeks left`}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Development Progress</span>
                          <span className="font-medium">{averageProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={averageProgress} className="h-2" />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          Need {progress.completionThreshold}% to advance to Pre-Production
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDevProject(project)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { 
            phase: 'pre-production', 
            title: 'Pre-Production', 
            icon: CalendarIcon,
            description: 'Planning and preparation' 
          },
          { 
            phase: 'production', 
            title: 'Principal Photography', 
            icon: CameraIcon,
            description: 'Active filming' 
          },
          { 
            phase: 'post-production', 
            title: 'Post-Production', 
            icon: EditIcon,
            description: 'Editing and finishing' 
          }
        ].map(({ phase, title, icon: Icon, description }) => {
          const projects = getProjectsInProduction().filter(p => p.currentPhase === phase);
          
          return (
            <Card key={phase} className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="w-5 h-5" />
                  {title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No projects in {phase.replace('-', ' ')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map(project => (
                      <Card key={project.id} className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{project.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {project.phaseDuration === -1 ? 'Ready' : project.phaseDuration === 0 ? 'Done' : `${project.phaseDuration}w left`}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            ${(project.budget.total / 1000000).toFixed(1)}M • {project.cast.length} cast
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => advanceProductionPhase(project)}
                            disabled={project.phaseDuration > 1 && project.phaseDuration !== -1}
                          >
                            {project.phaseDuration > 1 && project.phaseDuration !== -1 ? 'In Progress' :
                             project.phaseDuration === -1 ? 'Ready for Next Phase' :
                             project.currentPhase === 'post-production' ? 'Complete & Ready for Marketing' : 'Advance Phase'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Development Progress Modal */}
      <DevelopmentProgressModal
        project={selectedDevProject}
        open={!!selectedDevProject}
        onClose={() => setSelectedDevProject(null)}
        onResolveIssue={(issueId, cost) => {
          if (selectedDevProject && cost) {
            // Handle issue resolution - would need to be passed up to parent
            console.log(`Resolving issue ${issueId} for $${cost}`);
            setSelectedDevProject(null);
          }
        }}
      />
    </div>
  );
};