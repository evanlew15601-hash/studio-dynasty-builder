import React from 'react';
import { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  DistributionIcon, 
  BoxOfficeIcon, 
  StreamingIcon, 
  FestivalIcon,
  MarketingIcon,
  TrophyIcon,
  RevenueIcon,
  AudienceIcon
} from '@/components/ui/icons';

interface DistributionDashboardProps {
  gameState: GameState;
  onProjectUpdate: (project: Project) => void;
}

export const DistributionDashboard: React.FC<DistributionDashboardProps> = ({
  gameState,
  onProjectUpdate,
}) => {
  const { toast } = useToast();

  const getCompletedProjects = () => {
    return gameState.projects.filter(p => 
      p.currentPhase === 'distribution' || p.status === 'completed'
    );
  };

  const getReleasedProjects = () => {
    return gameState.projects.filter(p => p.status === 'released');
  };

  const releaseProject = (project: Project, platform: 'theatrical' | 'streaming' | 'festival') => {
    // Simulate box office/streaming performance
    const basePerformance = Math.random() * 100;
    const reputationBonus = gameState.studio.reputation * 0.5;
    const genreBonus = gameState.marketConditions.trendingGenres.includes(project.script?.genre) ? 20 : 0;
    
    const performance = Math.min(100, basePerformance + reputationBonus + genreBonus);
    
    let revenue = 0;
    let viewership = 0;
    let criticsScore = Math.floor(40 + (performance * 0.6));
    const audienceScore = Math.floor(45 + (performance * 0.55));

    if (platform === 'theatrical') {
      revenue = project.budget.total * (0.5 + (performance / 100));
      viewership = Math.floor(50000 + (performance * 5000));
    } else if (platform === 'streaming') {
      revenue = project.budget.total * (0.3 + (performance / 150));
      viewership = Math.floor(100000 + (performance * 10000));
    } else {
      revenue = project.budget.total * 0.2;
      viewership = Math.floor(5000 + (performance * 500));
      criticsScore += 15; // Festival bump
    }

    const updatedProject = {
      ...project,
      status: 'released' as const,
      metrics: {
        boxOfficeTotal: revenue,
        streamingViews: viewership,
        criticsScore,
        audienceScore,
        awards: performance > 85 ? ['Critics Circle'] : performance > 70 ? ['Film Festival Award'] : [],
        socialMediaMentions: Math.floor(1000 + (performance * 100)),
        internationalSales: revenue * 0.4
      }
    };

    onProjectUpdate(updatedProject);

    toast({
      title: "Project Released!",
      description: `"${project.title}" earned ${(revenue / 1000000).toFixed(1)}M on ${platform}`,
    });
  };

  const formatCurrency = (amount: number) => `$${(amount / 1000000).toFixed(1)}M`;
  const formatNumber = (num: number) => num.toLocaleString();

  const completedProjects = getCompletedProjects();
  const releasedProjects = getReleasedProjects();
  const inTheatersProjects = releasedProjects.filter(p => p.metrics?.inTheaters);

  const totalRevenue = inTheatersProjects.reduce((acc, p) => 
    acc + (p.metrics?.boxOfficeTotal || 0), 0
  );

  const averageCriticsScore = inTheatersProjects.length > 0 
    ? inTheatersProjects.reduce((acc, p) => acc + (p.metrics?.criticsScore || 0), 0) / inTheatersProjects.length
    : 0;

  return (
    <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <DistributionIcon className="mr-3" size={24} />
            Distribution Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <RevenueIcon className="mx-auto mb-2 text-primary" size={32} />
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
              <TrophyIcon className="mx-auto mb-2 text-accent" size={32} />
              <div className="text-2xl font-bold text-accent">{averageCriticsScore.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">Avg Critics Score</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <AudienceIcon className="mx-auto mb-2 text-primary" size={32} />
              <div className="text-2xl font-bold text-primary">{releasedProjects.length}</div>
              <div className="text-sm text-muted-foreground">Released Films</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
              <FestivalIcon className="mx-auto mb-2 text-accent" size={32} />
              <div className="text-2xl font-bold text-accent">
                {releasedProjects.reduce((acc, p) => acc + (p.metrics?.awards?.length || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Awards Won</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ready for Release */}
      {completedProjects.filter(p => !p.metrics).length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MarketingIcon className="mr-3" size={20} />
              Ready for Release
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedProjects.filter(p => !p.metrics).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <h3 className="font-bold">{project.title}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{project.script?.genre || 'Unknown'}</Badge>
                      <Badge>{project.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Budget: {formatCurrency(project.budget.total)} • Marketing: {formatCurrency(project.distributionStrategy.marketingBudget)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => releaseProject(project, 'theatrical')}
                      className="btn-studio"
                      size="sm"
                    >
                      <BoxOfficeIcon className="mr-2" size={16} />
                      Theatrical
                    </Button>
                    <Button 
                      onClick={() => releaseProject(project, 'streaming')}
                      variant="outline"
                      size="sm"
                    >
                      <StreamingIcon className="mr-2" size={16} />
                      Streaming
                    </Button>
                    <Button 
                      onClick={() => releaseProject(project, 'festival')}
                      variant="outline"
                      size="sm"
                    >
                      <FestivalIcon className="mr-2" size={16} />
                      Festival
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Released Projects Performance */}
      {inTheatersProjects.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BoxOfficeIcon className="mr-3" size={20} />
              Box Office Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {inTheatersProjects.map((project) => (
                <div key={project.id} className="space-y-4 p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{project.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{project.script?.genre || 'Unknown'}</Badge>
                        {project.metrics?.awards?.map((award) => (
                          <Badge key={award} className="bg-gradient-golden text-primary-foreground">
                            <TrophyIcon className="mr-1" size={12} />
                            {award}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(project.metrics?.boxOfficeTotal || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Box Office</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Critics Score</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={project.metrics?.criticsScore || 0} className="flex-1 h-2" />
                        <span className="font-medium">{project.metrics?.criticsScore}/100</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Audience Score</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={project.metrics?.audienceScore || 0} className="flex-1 h-2" />
                        <span className="font-medium">{project.metrics?.audienceScore}/100</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Viewership</div>
                      <div className="font-medium">{formatNumber(project.metrics?.streamingViews || 0)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Social Buzz</div>
                      <div className="font-medium">{formatNumber(project.metrics?.socialMediaMentions || 0)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground">International: </span>
                      <span className="font-medium">{formatCurrency(project.metrics?.internationalSales || 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ROI: </span>
                      <span className={`font-medium ${
                        (project.metrics?.boxOfficeTotal || 0) > project.budget.total 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {(((project.metrics?.boxOfficeTotal || 0) / project.budget.total - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {completedProjects.length === 0 && (
        <Card className="card-premium">
          <CardContent className="text-center py-12">
            <DistributionIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
            <p className="text-lg text-muted-foreground mb-2">No Projects Ready for Distribution</p>
            <p className="text-sm text-muted-foreground">
              Complete production on a project to begin distribution and marketing
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};