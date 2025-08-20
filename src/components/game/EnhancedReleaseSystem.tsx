import React, { useState, useEffect } from 'react';
import { Project, GameState } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, AlertTriangle, CheckCircle, Film } from 'lucide-react';

interface EnhancedReleaseSystemProps {
  gameState: GameState;
  projects: Project[];
  onProjectUpdate: (project: Project) => void;
  onAdvanceTime: () => void;
}

export const EnhancedReleaseSystem: React.FC<EnhancedReleaseSystemProps> = ({
  gameState,
  projects,
  onProjectUpdate,
  onAdvanceTime
}) => {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const validateForRelease = (project: Project) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check casting requirements
    const hasDirector = project.cast?.some(c => 
      c.role === 'Director' || c.role.toLowerCase().includes('director')
    );
    
    if (!hasDirector) {
      errors.push("Director must be assigned before release");
    }
    
    const hasLeadActor = project.cast?.some(c => 
      c.role.toLowerCase().includes('lead') || c.role.toLowerCase().includes('protagonist')
    );
    
    if (!hasLeadActor) {
      errors.push("At least one lead actor must be cast before release");
    }
    
    // Check casting confirmation
    if (!project.castingConfirmed) {
      errors.push("Casting must be confirmed before release");
    }
    
    if (project.cast && project.cast.length < 2) {
      warnings.push("Very small cast - consider adding more roles");
    }

    // Check production status
    if (project.status !== 'post-production') {
      errors.push("Film must complete post-production before release");
    }

    // Check marketing
    if (!project.marketingCampaign?.isActive) {
      warnings.push("No active marketing campaign");
    }

    // Check budget
    const totalSpent = typeof project.budget.spent === 'number' ? project.budget.spent : 
                      (project.budget.spent?.aboveTheLine || 0) + (project.budget.spent?.belowTheLine || 0);
    if (totalSpent > project.budget.total) {
      warnings.push("Project is over budget");
    }

    return { 
      canRelease: errors.length === 0, 
      errors, 
      warnings 
    };
  };

  const scheduleRelease = (project: Project, releaseWeek: number, releaseYear: number) => {
    const validation = validateForRelease(project);
    
    if (!validation.canRelease) {
      toast({
        title: "Cannot Schedule Release",
        description: validation.errors[0],
        variant: "destructive"
      });
      return;
    }

    // Prevent releasing if already released
    if (project.releaseDate || project.status === 'released' || project.status === 'scheduled-for-release') {
      toast({
        title: "Already Scheduled/Released",
        description: "This film has already been released or scheduled for release.",
        variant: "destructive"
      });
      return;
    }

    // Check if release date is in the future
    const currentTime = gameState.currentWeek + (gameState.currentYear - 1) * 52;
    const releaseTime = releaseWeek + (releaseYear - 1) * 52;
    
    if (releaseTime <= currentTime) {
      toast({
        title: "Invalid Release Date",
        description: "Release date must be in the future",
        variant: "destructive"
      });
      return;
    }

    const updatedProject = {
      ...project,
      status: 'scheduled-for-release' as const,
      releaseDate: `${releaseYear}-${String(Math.ceil(releaseWeek / 4)).padStart(2, '0')}-01`,
      scheduledReleaseWeek: releaseWeek,
      scheduledReleaseYear: releaseYear
    };

    onProjectUpdate(updatedProject);
    
    toast({
      title: "Release Scheduled",
      description: `${project.title} will release in week ${releaseWeek}, ${releaseYear}`,
    });
  };

  const processReleases = () => {
    const currentTime = gameState.currentWeek + (gameState.currentYear - 1) * 52;
    
    projects.forEach(project => {
      if (project.status === 'scheduled-for-release' && 
          project.scheduledReleaseWeek && 
          project.scheduledReleaseYear) {
        
        const releaseTime = project.scheduledReleaseWeek + (project.scheduledReleaseYear - 1) * 52;
        
        if (releaseTime === currentTime) {
          // Release the film
          const updatedProject = {
            ...project,
            status: 'released' as const,
            releaseDate: `${project.scheduledReleaseYear}-${String(Math.ceil(project.scheduledReleaseWeek / 4)).padStart(2, '0')}-01`,
            releaseWeek: project.scheduledReleaseWeek,
            releaseYear: project.scheduledReleaseYear
          };

          onProjectUpdate(updatedProject);
          
          toast({
            title: "Film Released!",
            description: `${project.title} is now in theaters`,
          });
        }
      }
    });
  };

  useEffect(() => {
    processReleases();
  }, [gameState.currentWeek, gameState.currentYear]);

  const getReleasableProjects = () => {
    return projects.filter(p => 
      p.status === 'post-production' || p.status === 'scheduled-for-release'
    );
  };

  const getUpcomingReleases = () => {
    return projects.filter(p => p.status === 'scheduled-for-release')
      .map(p => {
        // Fix calculation to handle missing or invalid scheduled dates
        const scheduledWeek = p.scheduledReleaseWeek || 0;
        const scheduledYear = p.scheduledReleaseYear || gameState.currentYear + 1;
        const currentTime = gameState.currentWeek + (gameState.currentYear - 1) * 52;
        const releaseTime = scheduledWeek + (scheduledYear - 1) * 52;
        const weeksUntil = Math.max(0, releaseTime - currentTime);
        
        return {
          project: p,
          weeksUntil: weeksUntil
        };
      })
      .filter(item => item.weeksUntil >= 0 && item.weeksUntil < 999) // Filter out invalid calculations
      .sort((a, b) => a.weeksUntil - b.weeksUntil);
  };

  const handlePostTheatrical = (project: Project) => {
    if (project.hasReleasedPostTheatrical) {
      toast({
        title: "Already Released",
        description: "Post-theatrical release has already been completed for this film",
        variant: "destructive"
      });
      return;
    }

    // Check if film has been released for at least 8 weeks
    const releaseTime = project.scheduledReleaseWeek! + (project.scheduledReleaseYear! - 1) * 52;
    const currentTime = gameState.currentWeek + (gameState.currentYear - 1) * 52;
    const weeksReleased = currentTime - releaseTime;
    
    if (weeksReleased < 8) {
      toast({
        title: "Too Early",
        description: `Film must be in theaters for at least 8 weeks. ${8 - weeksReleased} weeks remaining.`,
        variant: "destructive"
      });
      return;
    }

    // Calculate additional revenue based on theatrical performance
    const baseRevenue = project.metrics?.boxOfficeTotal || 0;
    const postTheatricalRevenue = baseRevenue * 0.25; // 25% of theatrical

    const updatedProject = {
      ...project,
      hasReleasedPostTheatrical: true,
      postTheatricalRevenue,
      metrics: {
        ...project.metrics,
        totalRevenue: (project.metrics?.totalRevenue || baseRevenue) + postTheatricalRevenue
      }
    };

    onProjectUpdate(updatedProject);
    
      toast({
        title: "Post-Theatrical Released",
        description: `${project.title} earned additional $${(postTheatricalRevenue / 1000000).toFixed(0)}M from streaming/digital`,
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          Release Management
        </h2>
        <p className="text-muted-foreground">Schedule and manage film releases</p>
      </div>

      {/* Upcoming Releases */}
      {getUpcomingReleases().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Releases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getUpcomingReleases().map(({ project, weeksUntil }) => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">{project.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Week {project.scheduledReleaseWeek}, {project.scheduledReleaseYear}
                    </p>
                  </div>
                   <div className="text-right">
                     <Badge variant={weeksUntil <= 1 ? "destructive" : weeksUntil <= 4 ? "default" : "secondary"}>
                       {weeksUntil > 0 ? `${weeksUntil} week${weeksUntil !== 1 ? 's' : ''}` : 'This week'}
                     </Badge>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Releasable Projects */}
      <div className="grid gap-4">
        {getReleasableProjects().map((project) => {
          const validation = validateForRelease(project);
          
          return (
            <Card key={project.id} className={project.status === 'scheduled-for-release' ? "border-blue-200" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Film className="h-5 w-5" />
                      {project.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {project.script?.genre} • ${(project.budget.total / 1000000).toFixed(0)}M
                    </p>
                  </div>
                  <Badge variant={validation.canRelease ? "default" : "destructive"}>
                    {project.status === 'scheduled-for-release' ? 'Scheduled' : 
                     validation.canRelease ? 'Ready' : 'Not Ready'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Validation Messages */}
                {validation.errors.length > 0 && (
                  <div className="space-y-1">
                    {validation.errors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    ))}
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="flex items-center gap-2 text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Release Actions */}
                <div className="flex gap-2">
                  {project.status === 'post-production' && validation.canRelease && (
                    <Button 
                      onClick={() => {
                        if (project.scheduledReleaseWeek && project.scheduledReleaseYear) {
                          scheduleRelease(project, project.scheduledReleaseWeek, project.scheduledReleaseYear);
                        } else {
                          toast({
                            title: "Select Release Date",
                            description: "Set the exact release week/year via Release Strategy.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Schedule Release
                    </Button>
                  )}
                  
                  {project.status === 'released' && !project.hasReleasedPostTheatrical && (
                    <Button 
                      variant="outline"
                      onClick={() => handlePostTheatrical(project)}
                    >
                      Post-Theatrical Release
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {getReleasableProjects().length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Film className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Films Ready for Release</h3>
            <p className="text-muted-foreground">
              Complete post-production on your films to schedule releases
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};