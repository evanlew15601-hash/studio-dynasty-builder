import React, { useState } from 'react';
import { GameState, Project, MarketingStrategy, ReleaseStrategy } from '@/types/game';
import { TimeSystem } from './TimeSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MarketingCampaignModal } from './MarketingCampaignModal';
import { ReleaseStrategyModal } from './ReleaseStrategyModal';
import { MarketingActivities } from './MarketingActivities';
import { 
  MarketingIcon, 
  TrendingIcon,
  CalendarIcon,
  StreamingIcon,
  BoxOfficeIcon,
  AwardIcon
} from '@/components/ui/icons';

interface MarketingReleaseManagementProps {
  gameState: GameState;
  onProjectUpdate: (project: Project, marketingCost?: number) => void;
  onMarketingCampaignCreate?: (project: Project, strategy: MarketingStrategy, budget: number, duration: number) => void;
  onReleaseStrategyCreate?: (project: Project, strategy: ReleaseStrategy) => void;
}

export const MarketingReleaseManagement: React.FC<MarketingReleaseManagementProps> = ({
  gameState,
  onProjectUpdate,
  onMarketingCampaignCreate,
  onReleaseStrategyCreate
}) => {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  const getProjectsInMarketing = () => {
    return gameState.projects.filter(p => p.currentPhase === 'marketing');
  };

  const getProjectsInRelease = () => {
    return gameState.projects.filter(p => p.currentPhase === 'release');
  };

  const getReleasedProjects = () => {
    return gameState.projects.filter(p => p.status === 'released');
  };

  const handleMarketingCampaign = (project: Project) => {
    setSelectedProject(project);
    setShowMarketingModal(true);
  };

  const handleReleaseStrategy = (project: Project) => {
    setSelectedProject(project);
    setShowReleaseModal(true);
  };

  const handlePostTheatricalRelease = (project: Project, platform: 'streaming' | 'digital' | 'dvd') => {
    const updatedProject = {
      ...project,
      postTheatrical: {
        platform,
        releaseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days after theatrical
        revenue: 0
      }
    };

    onProjectUpdate(updatedProject);
    
    toast({
      title: "Post-Theatrical Release Scheduled",
      description: `${project.title} will be available on ${platform} in 90 days.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Marketing & Release
          </h2>
          <p className="text-muted-foreground">
            Manage campaigns, premieres, and distribution strategies
          </p>
        </div>
      </div>

      {/* Marketing Phase Projects */}
      {getProjectsInMarketing().length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <MarketingIcon className="w-6 h-6" />
              Marketing Campaign Phase ({getProjectsInMarketing().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {getProjectsInMarketing().map(project => (
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
                        <Badge variant="outline">
                          {project.phaseDuration} weeks left
                        </Badge>
                      </div>
                    </div>
                    
                    {project.marketingCampaign ? (
                      <MarketingActivities 
                        project={project}
                        onProjectUpdate={onProjectUpdate}
                        studioBudget={gameState.studio.budget}
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Campaign Progress</span>
                          <span>Need to launch campaign</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleMarketingCampaign(project)}
                            className="flex-1"
                          >
                            <TrendingIcon className="w-4 h-4 mr-2" />
                            Launch Campaign
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Release Phase Projects */}
      {getProjectsInRelease().length > 0 && (
        <Card className="border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6" />
              Release Strategy Phase ({getProjectsInRelease().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {getProjectsInRelease().map(project => (
                <Card key={project.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{project.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.script?.genre || 'Unknown'} • Ready for theatrical release
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {project.phaseDuration} weeks left
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Release Status</span>
                        <span>Need to set release strategy</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleReleaseStrategy(project)}
                          className="flex-1"
                        >
                          <BoxOfficeIcon className="w-4 h-4 mr-2" />
                          Plan Release
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Released Projects - Post-Theatrical Management */}
      {getReleasedProjects().length > 0 && (
        <Card className="border-2 border-secondary/20 bg-gradient-to-br from-background to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <StreamingIcon className="w-6 h-6" />
              Post-Theatrical Distribution ({getReleasedProjects().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {getReleasedProjects().map(project => {
                // Use TimeSystem for accurate calculation
                const weeksSinceRelease = project.releaseWeek && project.releaseYear ? 
                  TimeSystem.calculateWeeksSince(
                    project.releaseWeek,
                    project.releaseYear, 
                    gameState.currentWeek,
                    gameState.currentYear
                  ) : 0;
                
                // Check if actually in theaters vs just released  
                const inTheaters = project.metrics?.inTheaters;
                const boxOfficeStatus = !inTheaters ? 'ended' :
                  weeksSinceRelease > 8 ? 'declining' : 'active';
                
                return (
                  <Card key={project.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Box Office: ${((project.metrics?.boxOfficeTotal || 0) / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={boxOfficeStatus === 'active' ? 'default' : 
                                        boxOfficeStatus === 'declining' ? 'secondary' : 'outline'}>
                            {boxOfficeStatus === 'active' ? 'In Theaters' :
                             boxOfficeStatus === 'declining' ? 'Limited Release' : 'Theatrical Run Ended'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-card rounded">
                            <div className="font-medium">{project.metrics?.criticsScore || 0}</div>
                            <div className="text-muted-foreground">Critics</div>
                          </div>
                          <div className="text-center p-2 bg-card rounded">
                            <div className="font-medium">{project.metrics?.audienceScore || 0}</div>
                            <div className="text-muted-foreground">Audience</div>
                          </div>
                          <div className="text-center p-2 bg-card rounded">
                            <div className="font-medium">{weeksSinceRelease}</div>
                            <div className="text-muted-foreground">Weeks</div>
                          </div>
                        </div>
                        
                        {boxOfficeStatus === 'ended' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handlePostTheatricalRelease(project, 'streaming')}
                              className="flex-1"
                            >
                              <StreamingIcon className="w-4 h-4 mr-1" />
                              Streaming
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handlePostTheatricalRelease(project, 'digital')}
                              className="flex-1"
                            >
                              Digital
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Projects Message */}
      {getProjectsInMarketing().length === 0 && 
       getProjectsInRelease().length === 0 && 
       getReleasedProjects().length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/20 to-muted/10 flex items-center justify-center">
                <MarketingIcon className="text-muted-foreground" size={32} />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">No Projects in Marketing or Release</h3>
            <p className="text-sm text-muted-foreground">
              Complete post-production on your projects to begin marketing campaigns
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showMarketingModal && selectedProject && (
        <MarketingCampaignModal
          project={selectedProject}
          open={showMarketingModal}
          onClose={() => {
            setShowMarketingModal(false);
            setSelectedProject(null);
          }}
          onCreateCampaign={(strategy, budget, duration) => {
            // Use the provided callback if available
            if (onMarketingCampaignCreate) {
              onMarketingCampaignCreate(selectedProject, strategy, budget, duration);
            } else {
              // Fallback handling
              const updatedProject = {
                ...selectedProject,
                marketingCampaign: {
                  id: `campaign-${Date.now()}`,
                  strategy,
                  budgetAllocated: budget,
                  budgetSpent: 0,
                  duration,
                  weeksRemaining: duration,
                  buzz: 0,
                  activities: [],
                  targetAudience: ['general'],
                  effectiveness: 50
                }
              };
              onProjectUpdate(updatedProject);
            }
            setShowMarketingModal(false);
            setSelectedProject(null);
          }}
          studioBudget={gameState.studio.budget}
        />
      )}

      {showReleaseModal && selectedProject && (
        <ReleaseStrategyModal
          project={selectedProject}
          open={showReleaseModal}
          onClose={() => {
            setShowReleaseModal(false);
            setSelectedProject(null);
          }}
          onCreateReleaseStrategy={(strategy) => {
            if (onReleaseStrategyCreate) {
              onReleaseStrategyCreate(selectedProject, strategy);
            }
            setShowReleaseModal(false);
            setSelectedProject(null);
          }}
          currentWeek={gameState.currentWeek}
          currentYear={gameState.currentYear}
        />
      )}
    </div>
  );
};