import React, { useState } from 'react';
import { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ProductionIcon, 
  CalendarIcon, 
  LocationIcon, 
  BudgetIcon,
  CrewIcon,
  CameraIcon,
  EditIcon
} from '@/components/ui/icons';

interface ProductionManagementProps {
  gameState: GameState;
  selectedProject: Project | null;
  onProjectUpdate: (project: Project) => void;
}

export const ProductionManagement: React.FC<ProductionManagementProps> = ({
  gameState,
  selectedProject,
  onProjectUpdate,
}) => {
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<'pre' | 'principal' | 'post'>('pre');

  const getProjectsInProduction = () => {
    return gameState.projects.filter(p => 
      p.currentPhase === 'production' || 
      p.currentPhase === 'pre-production' ||
      p.currentPhase === 'post-production'
    );
  };

  const advanceProductionPhase = (project: Project) => {
    let newPhase = project.currentPhase;
    let newStatus = project.status;
    
    switch (project.currentPhase) {
      case 'development':
        newPhase = 'pre-production';
        newStatus = 'pre-production';
        break;
      case 'pre-production':
        newPhase = 'production';
        newStatus = 'filming';
        break;
      case 'production':
        newPhase = 'post-production';
        newStatus = 'post-production';
        break;
      case 'post-production':
        newPhase = 'distribution';
        newStatus = 'completed';
        break;
    }

    const updatedProject = {
      ...project,
      currentPhase: newPhase,
      status: newStatus
    };

    onProjectUpdate(updatedProject);

    toast({
      title: "Production Advanced",
      description: `"${project.title}" moved to ${newPhase.replace('-', ' ')}`,
    });
  };

  const formatCurrency = (amount: number) => `$${(amount / 1000000).toFixed(1)}M`;

  const getPhaseProgress = (project: Project) => {
    switch (project.currentPhase) {
      case 'development': return 10;
      case 'pre-production': return 30;
      case 'production': return 65;
      case 'post-production': return 90;
      case 'distribution': return 100;
      default: return 0;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'development': return 'bg-blue-500';
      case 'pre-production': return 'bg-yellow-500';
      case 'production': return 'bg-green-500';
      case 'post-production': return 'bg-purple-500';
      case 'distribution': return 'bg-primary';
      default: return 'bg-gray-500';
    }
  };

  const productionProjects = getProjectsInProduction();

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <ProductionIcon className="mr-3" size={24} />
            Production Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <CameraIcon className="mx-auto mb-2 text-primary" size={32} />
              <div className="text-2xl font-bold text-primary">{productionProjects.length}</div>
              <div className="text-sm text-muted-foreground">Active Productions</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
              <CrewIcon className="mx-auto mb-2 text-accent" size={32} />
              <div className="text-2xl font-bold text-accent">
                {productionProjects.reduce((acc, p) => acc + p.cast.length + p.crew.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Talent</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <BudgetIcon className="mx-auto mb-2 text-primary" size={32} />
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(productionProjects.reduce((acc, p) => acc + p.budget.total, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Combined Budget</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Productions */}
      {productionProjects.length > 0 ? (
        <div className="space-y-6">
          {productionProjects.map((project) => (
            <Card key={project.id} className="card-premium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={`${getPhaseColor(project.currentPhase)} text-white`}>
                        {project.currentPhase.replace('-', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {project.script.genre}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Budget</div>
                    <div className="text-lg font-bold">{formatCurrency(project.budget.total)}</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Production Progress</span>
                    <span>{getPhaseProgress(project)}%</span>
                  </div>
                  <Progress value={getPhaseProgress(project)} className="h-2" />
                </div>

                {/* Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium">
                      <CalendarIcon size={16} />
                      <span>Pre-Production</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.timeline.preProduction.start.toLocaleDateString()} - 
                      {project.timeline.preProduction.end.toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      Cast: {project.cast.length} • Crew: {project.crew.length}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium">
                      <CameraIcon size={16} />
                      <span>Principal Photography</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.timeline.principalPhotography.start.toLocaleDateString()} - 
                      {project.timeline.principalPhotography.end.toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      Locations: {project.locations.length || 'TBD'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium">
                      <EditIcon size={16} />
                      <span>Post-Production</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.timeline.postProduction.start.toLocaleDateString()} - 
                      {project.timeline.postProduction.end.toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      Release: {project.timeline.release.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Budget Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <BudgetIcon className="mr-2" size={16} />
                    Budget Allocation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Above the Line</div>
                      <div className="font-medium">{formatCurrency(project.budget.total * 0.4)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Below the Line</div>
                      <div className="font-medium">{formatCurrency(project.budget.total * 0.35)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Post-Production</div>
                      <div className="font-medium">{formatCurrency(project.budget.total * 0.15)}</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                  {project.currentPhase !== 'distribution' && (
                    <Button 
                      onClick={() => advanceProductionPhase(project)}
                      className="btn-studio"
                    >
                      <ProductionIcon className="mr-2" size={16} />
                      Advance to {
                        project.currentPhase === 'development' ? 'Pre-Production' :
                        project.currentPhase === 'pre-production' ? 'Principal Photography' :
                        project.currentPhase === 'production' ? 'Post-Production' :
                        'Distribution'
                      }
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <LocationIcon className="mr-2" size={16} />
                    Manage Locations
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <CrewIcon className="mr-2" size={16} />
                    Hire Crew
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-premium">
          <CardContent className="text-center py-12">
            <ProductionIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
            <p className="text-lg text-muted-foreground mb-2">No Active Productions</p>
            <p className="text-sm text-muted-foreground">
              Greenlight a project and advance it to production to start filming
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};