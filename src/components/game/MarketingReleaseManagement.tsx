import React, { useMemo, useState } from 'react';
import { Project } from '@/types/game';
import { TimeSystem } from './TimeSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarketingCampaignModal } from './MarketingCampaignModal';
import { ReleaseStrategyModal } from './ReleaseStrategyModal';
import { MarketingActivities } from './MarketingActivities';
import { useGameStore } from '@/game/store';
import { 
  MarketingIcon, 
  TrendingIcon,
  CalendarIcon,
  StreamingIcon,
  BoxOfficeIcon
} from '@/components/ui/icons';

interface MarketingReleaseManagementProps {
  // Filter to only show TV or only show films - undefined shows all
  projectTypeFilter?: 'tv' | 'film';
}

export const MarketingReleaseManagement: React.FC<MarketingReleaseManagementProps> = ({
  projectTypeFilter
}) => {
  const gameState = useGameStore((s) => s.game);
  const updateProject = useGameStore((s) => s.updateProject);
  const replaceProject = useGameStore((s) => s.replaceProject);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  const selectedProject = useMemo(() => {
    if (!gameState || !selectedProjectId) return null;
    return gameState.projects.find((p) => p.id === selectedProjectId) ?? null;
  }, [gameState, selectedProjectId]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading marketing & release...</div>;
  }

  // Helper to check if project matches type filter
  const matchesTypeFilter = (p: Project) => {
    if (!projectTypeFilter) return true;
    const isTVProject = p.type === 'series' || p.type === 'limited-series';
    return projectTypeFilter === 'tv' ? isTVProject : !isTVProject;
  };

  const getProjectsInMarketing = () => {
    return gameState.projects.filter(p => 
      p.currentPhase === 'marketing' && 
      p.status !== 'released' &&
      matchesTypeFilter(p)
    );
  };

  const getProjectsInRelease = () => {
    return gameState.projects.filter(p => 
      p.currentPhase === 'release' && 
      p.status !== 'released' &&
      matchesTypeFilter(p)
    );
  };

  const getReleasedProjects = () => {
    // Only show released projects that have ended their theatrical run
    return gameState.projects.filter(p => {
      if (p.status !== 'released') return false;
      if (!matchesTypeFilter(p)) return false;
      
      // Check if theatrical run has ended
      const weeksSinceRelease = p.releaseWeek && p.releaseYear ? 
        TimeSystem.calculateWeeksSince(
          p.releaseWeek,
          p.releaseYear, 
          gameState.currentWeek,
          gameState.currentYear
        ) : 0;
      
      // Theatrical runs typically last 6-12 weeks depending on performance
      const inTheaters = p.metrics?.inTheaters;
      const theatricalEnded = !inTheaters || weeksSinceRelease > 12;
      
      return theatricalEnded;
    });
  };

  const handleMarketingCampaign = (project: Project) => {
    setSelectedProjectId(project.id);
    setShowMarketingModal(true);
  };

  const handleReleaseStrategy = (project: Project) => {
    setSelectedProjectId(project.id);
    setShowReleaseModal(true);
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
                          {project.script?.genre || 'Unknown'} • {project.type === 'series' || project.type === 'limited-series' ? 'TV Series' : `$${(project.budget.total / 1000000).toFixed(1)}M Budget`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {project.phaseDuration === -1 ? 'Manual Control' : project.phaseDuration === 0 ? 'Complete' : `${project.phaseDuration} weeks left`}
                        </Badge>
                      </div>
                    </div>
                    
                    {project.marketingCampaign ? (
                      <div className="space-y-3">
                        <MarketingActivities 
                          project={project}
                        />

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Planned Release</span>
                          {project.scheduledReleaseWeek && project.scheduledReleaseYear ? (
                            <span className="font-medium">
                              Y{project.scheduledReleaseYear}W{project.scheduledReleaseWeek}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not scheduled</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleReleaseStrategy(project)}
                            className="flex-1"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {project.type === 'series' || project.type === 'limited-series' ? 'Plan Air Date' : 'Plan Release'}
                          </Button>
                        </div>
                      </div>
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
                          {project.script?.genre || 'Unknown'} • {project.type === 'series' || project.type === 'limited-series' ? 'TV Series - Ready for air date' : 'Ready for theatrical release'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {project.phaseDuration === -1 ? 'Awaiting Release' : project.phaseDuration === 0 ? 'Ready' : `${project.phaseDuration} weeks left`}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Release Status</span>
                        {project.scheduledReleaseWeek && project.scheduledReleaseYear ? (
                          <span className="font-medium">
                            Scheduled: Y{project.scheduledReleaseYear}W{project.scheduledReleaseWeek}
                          </span>
                        ) : (
                          <span>Need to set release strategy</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleReleaseStrategy(project)}
                          className="flex-1"
                        >
                          <BoxOfficeIcon className="w-4 h-4 mr-2" />
                          {project.type === 'series' || project.type === 'limited-series'
                            ? (project.scheduledReleaseWeek ? 'Change Air Date' : 'Set Air Date')
                            : (project.scheduledReleaseWeek ? 'Change Release Date' : 'Plan Release')}
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
                          <div className="text-center p-4 border border-primary/20 rounded-lg bg-primary/5">
                            <p className="text-sm text-primary font-medium mb-2">
                              Theatrical Run Complete
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This film is now eligible for post-theatrical distribution. 
                              Visit the Post-Theatrical Management section to launch streaming, digital, or physical releases.
                            </p>
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
            <h3 className="text-lg font-medium mb-2">No Active Marketing or Release Projects</h3>
            <p className="text-sm text-muted-foreground">
              Complete post-production on your projects to begin marketing campaigns
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Films with ended theatrical runs can be found in Post-Theatrical Distribution
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
            setSelectedProjectId(null);
          }}
          onCreateCampaign={(strategy, budget, duration) => {
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
            replaceProject(updatedProject);
            setShowMarketingModal(false);
            setSelectedProjectId(null);
          }}
          studioBudget={gameState.studio.budget}
        />
      )}

      {showReleaseModal && selectedProject && (
        <ReleaseStrategyModal
          project={selectedProject}
          isOpen={showReleaseModal}
          onClose={() => {
            setShowReleaseModal(false);
            setSelectedProjectId(null);
          }}
          gameState={gameState}
          onProjectUpdate={(projectId, updates) => {
            updateProject(projectId, updates);
            setShowReleaseModal(false);
            setSelectedProjectId(null);
          }}
        />
      )}
    </div>
  );
};