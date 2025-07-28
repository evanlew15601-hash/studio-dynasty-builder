import React, { useState } from 'react';
import { Project, GameState } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  StreamingIcon, 
  DollarIcon,
  CalendarIcon,
  PlayIcon,
  DiscIcon,
  TrendingIcon,
  CheckIcon
} from '@/components/ui/icons';

interface PostTheatricalManagementProps {
  gameState: GameState;
  onProjectUpdate: (project: Project) => void;
}

interface PostTheatricalRelease {
  id: string;
  projectId: string;
  platform: 'streaming' | 'digital' | 'physical' | 'tv-licensing';
  releaseDate: Date;
  revenue: number;
  weeklyRevenue: number;
  weeksActive: number;
  status: 'planned' | 'active' | 'declining' | 'ended';
  cost: number;
}

const POST_THEATRICAL_OPTIONS = [
  {
    platform: 'streaming',
    name: 'Streaming Release',
    description: 'License to major streaming platforms',
    icon: StreamingIcon,
    minimumWeeksAfterTheatrical: 12, // 3 months
    baseCost: 50000,
    revenueModel: 'licensing', // Flat licensing fee
    duration: 26, // 6 months typically
    revenuePotential: 'high'
  },
  {
    platform: 'digital',
    name: 'Digital Purchase/Rental',
    description: 'Video-on-demand platforms (iTunes, Amazon, etc.)',
    icon: PlayIcon,
    minimumWeeksAfterTheatrical: 8, // 2 months
    baseCost: 25000,
    revenueModel: 'percentage', // Revenue share
    duration: 104, // 2 years
    revenuePotential: 'medium'
  },
  {
    platform: 'physical',
    name: 'Blu-ray/DVD Release',
    description: 'Physical media production and distribution',
    icon: DiscIcon,
    minimumWeeksAfterTheatrical: 16, // 4 months
    baseCost: 200000,
    revenueModel: 'gross', // Direct sales
    duration: 52, // 1 year primary sales window
    revenuePotential: 'medium'
  },
  {
    platform: 'tv-licensing',
    name: 'Television Licensing',
    description: 'License to television networks and cable',
    icon: TrendingIcon,
    minimumWeeksAfterTheatrical: 52, // 1 year
    baseCost: 30000,
    revenueModel: 'licensing',
    duration: 156, // 3 years
    revenuePotential: 'low'
  }
];

export const PostTheatricalManagement: React.FC<PostTheatricalManagementProps> = ({
  gameState,
  onProjectUpdate
}) => {
  const { toast } = useToast();
  const [activeReleases, setActiveReleases] = useState<PostTheatricalRelease[]>([]);

  const getEligibleProjects = () => {
    return gameState.projects.filter(project => 
      project.postTheatricalEligible && 
      project.theatricalEndDate &&
      project.status === 'released'
    );
  };

  const calculateWeeksSinceTheatricalEnd = (project: Project): number => {
    if (!project.theatricalEndDate || !project.releaseWeek || !project.releaseYear) return 0;
    
    // Use game time instead of real time
    const currentGameWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    const releaseGameWeek = (project.releaseYear * 52) + project.releaseWeek;
    const weeksSinceRelease = currentGameWeek - releaseGameWeek;
    
    // Assume theatrical run lasted the weeks since release from metrics
    const theatricalRunWeeks = project.metrics.weeksSinceRelease || 0;
    const weeksSinceTheatricalEnd = Math.max(0, weeksSinceRelease - theatricalRunWeeks);
    
    console.log(`🎭 POST-THEATRICAL CHECK: ${project.title}`);
    console.log(`   Release: Y${project.releaseYear}W${project.releaseWeek} (${releaseGameWeek})`);
    console.log(`   Current: Y${gameState.currentYear}W${gameState.currentWeek} (${currentGameWeek})`);
    console.log(`   Weeks since release: ${weeksSinceRelease}`);
    console.log(`   Theatrical run weeks: ${theatricalRunWeeks}`);
    console.log(`   Weeks since theatrical end: ${weeksSinceTheatricalEnd}`);
    
    return weeksSinceTheatricalEnd;
  };

  const calculatePostTheatricalRevenue = (project: Project, platform: string): number => {
    const boxOffice = project.metrics.boxOfficeTotal || 0;
    const performance = (project.metrics.criticsScore || 50) + (project.metrics.audienceScore || 50);
    const buzzBonus = (project.marketingCampaign?.buzz || 0) * 0.1;
    
    let revenueMultiplier = 0;
    
    switch (platform) {
      case 'streaming':
        // High box office = higher licensing fees
        revenueMultiplier = 0.15 + (performance / 1000) + (buzzBonus / 100);
        break;
      case 'digital':
        // More consistent revenue stream
        revenueMultiplier = 0.08 + (performance / 1500) + (buzzBonus / 150);
        break;
      case 'physical':
        // Depends heavily on audience score
        revenueMultiplier = 0.06 + ((project.metrics.audienceScore || 50) / 1000);
        break;
      case 'tv-licensing':
        // Lower but steady revenue
        revenueMultiplier = 0.04 + (performance / 2000);
        break;
    }
    
    return Math.floor(boxOffice * revenueMultiplier);
  };

  const canReleaseOnPlatform = (project: Project, option: any): { canRelease: boolean; reason: string } => {
    const weeksSinceEnd = calculateWeeksSinceTheatricalEnd(project);
    
    if (weeksSinceEnd < option.minimumWeeksAfterTheatrical) {
      return {
        canRelease: false,
        reason: `Available in ${option.minimumWeeksAfterTheatrical - weeksSinceEnd} weeks`
      };
    }
    
    // Check if already released on this platform
    const alreadyReleased = activeReleases.some(r => 
      r.projectId === project.id && r.platform === option.platform
    );
    
    if (alreadyReleased) {
      return { canRelease: false, reason: 'Already released' };
    }
    
    // Check budget
    if (gameState.studio.budget < option.baseCost) {
      return { canRelease: false, reason: 'Insufficient budget' };
    }
    
    return { canRelease: true, reason: '' };
  };

  const launchPostTheatricalRelease = (project: Project, option: any) => {
    const { canRelease, reason } = canReleaseOnPlatform(project, option);
    
    if (!canRelease) {
      toast({
        title: "Cannot Launch Release",
        description: reason,
        variant: "destructive"
      });
      return;
    }

    const estimatedRevenue = calculatePostTheatricalRevenue(project, option.platform);
    
    const newRelease: PostTheatricalRelease = {
      id: `release-${Date.now()}`,
      projectId: project.id,
      platform: option.platform,
      releaseDate: new Date(),
      revenue: 0,
      weeklyRevenue: estimatedRevenue / option.duration,
      weeksActive: 0,
      status: 'planned',
      cost: option.baseCost
    };

    // Update studio budget
    const updatedProject = {
      ...project,
      postTheatricalReleases: [...(project.postTheatricalReleases || []), newRelease]
    };

    setActiveReleases([...activeReleases, newRelease]);
    onProjectUpdate(updatedProject);

    toast({
      title: "Post-Theatrical Release Scheduled",
      description: `${project.title} will be available on ${option.name} platforms. Estimated revenue: $${(estimatedRevenue / 1000000).toFixed(1)}M`,
    });
  };

  const eligibleProjects = getEligibleProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Post-Theatrical Distribution
          </h2>
          <p className="text-muted-foreground">
            Maximize revenue through streaming, digital, and physical releases
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{eligibleProjects.length}</div>
            <div className="text-sm text-muted-foreground">Films Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{activeReleases.length}</div>
            <div className="text-sm text-muted-foreground">Active Releases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              ${(activeReleases.reduce((sum, r) => sum + r.revenue, 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-muted-foreground">Post-Theatrical Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary-foreground">
              {Math.round(activeReleases.reduce((sum, r) => sum + r.weeklyRevenue, 0) / 1000)}K
            </div>
            <div className="text-sm text-muted-foreground">Weekly Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Eligible Projects */}
      {eligibleProjects.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <StreamingIcon className="w-6 h-6" />
              Films Ready for Post-Theatrical Release
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {eligibleProjects.map(project => {
                const weeksSinceEnd = calculateWeeksSinceTheatricalEnd(project);
                
                return (
                  <Card key={project.id} className="border-2 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold">{project.title}</h3>
                          <p className="text-muted-foreground">
                            {project.script?.genre || 'Unknown'} • Box Office: ${((project.metrics.boxOfficeTotal || 0) / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Theatrical run ended {weeksSinceEnd} weeks ago
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Performance Scores</div>
                          <div className="flex gap-4 mt-1">
                            <div>
                              <div className="font-medium">{project.metrics.criticsScore || 0}</div>
                              <div className="text-xs text-muted-foreground">Critics</div>
                            </div>
                            <div>
                              <div className="font-medium">{project.metrics.audienceScore || 0}</div>
                              <div className="text-xs text-muted-foreground">Audience</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {POST_THEATRICAL_OPTIONS.map(option => {
                          const { canRelease, reason } = canReleaseOnPlatform(project, option);
                          const estimatedRevenue = calculatePostTheatricalRevenue(project, option.platform);
                          const IconComponent = option.icon;

                          return (
                            <Card 
                              key={option.platform}
                              className={`transition-all duration-200 ${
                                canRelease ? 'hover:border-primary/30 cursor-pointer' : 'opacity-60'
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`p-2 rounded-lg ${
                                    canRelease ? 'bg-primary/20' : 'bg-muted/20'
                                  }`}>
                                    <IconComponent className={`w-5 h-5 ${
                                      canRelease ? 'text-primary' : 'text-muted-foreground'
                                    }`} />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{option.name}</h4>
                                    <p className="text-xs text-muted-foreground">{option.revenuePotential} revenue</p>
                                  </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span>Cost:</span>
                                    <span>${(option.baseCost / 1000).toFixed(0)}K</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Est. Revenue:</span>
                                    <span>${(estimatedRevenue / 1000000).toFixed(1)}M</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Duration:</span>
                                    <span>{Math.round(option.duration / 4)} months</span>
                                  </div>
                                </div>

                                <Button
                                  onClick={() => launchPostTheatricalRelease(project, option)}
                                  disabled={!canRelease}
                                  className="w-full mt-3"
                                  size="sm"
                                  variant={canRelease ? 'default' : 'outline'}
                                >
                                  {canRelease ? (
                                    <>
                                      <DollarIcon className="w-4 h-4 mr-1" />
                                      Launch Release
                                    </>
                                  ) : (
                                    reason
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/20 to-muted/10 flex items-center justify-center">
                <StreamingIcon className="text-muted-foreground" size={32} />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">No Films Ready</h3>
            <p className="text-sm text-muted-foreground">
              Films become eligible for post-theatrical distribution after their theatrical run ends
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active Post-Theatrical Releases */}
      {activeReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingIcon className="w-6 h-6" />
              Active Post-Theatrical Releases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeReleases.map(release => {
                const project = gameState.projects.find(p => p.id === release.projectId);
                if (!project) return null;

                return (
                  <div key={release.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/20">
                        <CheckIcon className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <div className="font-medium">{project.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {release.platform.charAt(0).toUpperCase() + release.platform.slice(1)} Release
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${(release.revenue / 1000000).toFixed(2)}M</div>
                      <div className="text-sm text-muted-foreground">
                        ${(release.weeklyRevenue / 1000).toFixed(0)}K/week
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};