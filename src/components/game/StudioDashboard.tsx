import React from 'react';
import { Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BudgetIcon, 
  ReputationIcon, 
  MarketIcon,
  AwardIcon,
  TrendingIcon,
  ProductionIcon,
  ScriptIcon,
  CastingIcon,
  StudioIcon
} from '@/components/ui/icons';

interface StudioDashboardProps {}

export const StudioDashboard: React.FC<StudioDashboardProps> = () => {
  const gameState = useGameStore((s) => s.game);
  const setSelectedProjectId = useUiStore((s) => s.setSelectedProjectId);
  const setPhase = useUiStore((s) => s.setPhase);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading studio dashboard...</div>;
  }
  const activeProjects = gameState.projects.filter(p => p.status !== 'archived');

  const getBestProjectForCasting = (): Project | null => {
    const castingCandidates = activeProjects.filter(p =>
      p.currentPhase === 'development' ||
      p.currentPhase === 'pre-production' ||
      p.currentPhase === 'production'
    );
    return castingCandidates[0] || activeProjects[0] || null;
  };
  
  // Box office calculations for films only
  const inTheatersProjects = gameState.projects.filter(p => p.metrics?.inTheaters && (p.type === 'feature' || p.type === 'documentary'));
  const totalBoxOfficeThisWeek = inTheatersProjects.reduce((sum, p) => {
    return sum + (p.metrics?.boxOfficeTotal || 0);
  }, 0);
  const totalTheaters = inTheatersProjects.reduce((sum, p) => sum + (p.metrics?.theaterCount || 0), 0);

  // TV metrics for series
  const airingTVShows = gameState.projects.filter(p => p.status === 'released' && (p.type === 'series' || p.type === 'limited-series'));
  const totalTVViews = airingTVShows.reduce((sum, p) => sum + (p.metrics?.streaming?.totalViews || 0), 0);
  const avgAudienceShare = airingTVShows.length > 0 ? 
    airingTVShows.reduce((sum, p) => sum + (p.metrics?.streaming?.audienceShare || 0), 0) / airingTVShows.length : 0;

  return (
    <div className="space-y-6">
      {/* Box Office Performance - Show if any films in theaters */}
      {inTheatersProjects.length > 0 && (
        <Card className="card-golden border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 mr-3">
                <TrendingIcon className="text-primary" size={20} />
              </div>
              Box Office Performance
              <Badge className="ml-3 bg-primary/20 text-primary border-primary/30">
                {inTheatersProjects.length} Film{inTheatersProjects.length !== 1 ? 's' : ''} in Theaters
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Total Box Office</div>
                <div className="studio-mono text-2xl font-bold text-primary">
                  ${(totalBoxOfficeThisWeek / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <div className="text-sm text-muted-foreground mb-1">Total Theaters</div>
                <div className="studio-mono text-2xl font-bold text-accent">
                  {totalTheaters.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-success/10 to-primary/10 border border-success/20">
                <div className="text-sm text-muted-foreground mb-1">Average per Theater</div>
                <div className="studio-mono text-2xl font-bold text-success">
                  ${totalTheaters > 0 ? Math.round(totalBoxOfficeThisWeek / totalTheaters).toLocaleString() : '0'}
                </div>
              </div>
            </div>
            
            {/* Individual film performance */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium text-muted-foreground mb-3">Films Currently in Theaters:</div>
              {inTheatersProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      Week {project.metrics?.weeksSinceRelease || 0}
                    </Badge>
                    <span className="font-medium">{project.title}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-muted-foreground">
                      {(project.metrics?.theaterCount || 0).toLocaleString()} theaters
                    </span>
                    <span className="studio-mono font-semibold text-primary">
                      ${((project.metrics?.boxOfficeTotal || 0) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TV Shows Performance - Show if any shows airing */}
      {airingTVShows.length > 0 && (
        <Card className="card-premium border-2 border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-accent">
              <div className="p-2 rounded-lg bg-gradient-to-r from-accent/20 to-primary/20 mr-3">
                <TrendingIcon className="text-accent" size={20} />
              </div>
              TV Shows Performance
              <Badge className="ml-3 bg-accent/20 text-accent border-accent/30">
                {airingTVShows.length} Show{airingTVShows.length !== 1 ? 's' : ''} Airing
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <div className="text-sm text-muted-foreground mb-1">Total Views</div>
                <div className="studio-mono text-2xl font-bold text-accent">
                  {(totalTVViews / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Avg Audience Share</div>
                <div className="studio-mono text-2xl font-bold text-primary">
                  {avgAudienceShare.toFixed(1)}%
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-success/10 to-accent/10 border border-success/20">
                <div className="text-sm text-muted-foreground mb-1">Active Shows</div>
                <div className="studio-mono text-2xl font-bold text-success">
                  {airingTVShows.length}
                </div>
              </div>
            </div>
            
            {/* Individual TV show performance */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium text-muted-foreground mb-3">Currently Airing TV Shows:</div>
              {airingTVShows.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="border-accent/30 text-accent">
                      Week {project.metrics?.weeksSinceRelease || 0}
                    </Badge>
                    <span className="font-medium">{project.title}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-muted-foreground">
                      {((project.metrics?.streaming?.totalViews || 0) / 1000000).toFixed(1)}M views
                    </span>
                    <span className="studio-mono font-semibold text-accent">
                      {(project.metrics?.streaming?.audienceShare || 0).toFixed(1)}% share
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Studio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        <Card className="card-golden hover:shadow-golden transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 mr-3">
                <BudgetIcon className="text-primary" size={20} />
              </div>
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                  <span className="text-sm text-muted-foreground">Current Budget</span>
                  <span className="studio-mono font-semibold text-primary">
                    ${(gameState.studio.budget / 1000000).toFixed(0)}M
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-card/50">
                  <span className="text-sm text-muted-foreground">Active Projects</span>
                  <span className="studio-mono font-medium">{activeProjects.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gradient-to-r from-success/5 to-success/10 border border-success/20">
                  <span className="text-sm text-muted-foreground">Quarterly Revenue</span>
                  <span className="studio-mono font-semibold text-success">+$2.0M</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium border-accent/30 hover:shadow-golden transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-accent/20 to-primary/20 mr-3">
                <ReputationIcon className="text-accent" size={20} />
              </div>
              Industry Standing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-muted-foreground">Reputation Score</span>
                  <span className="studio-mono font-semibold text-accent text-lg">
                    {Math.round(gameState.studio.reputation)}/100
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress 
                    value={gameState.studio.reputation} 
                    className="h-3 bg-muted/30"
                  />
                  <div className="text-center">
                    <Badge 
                      variant={gameState.studio.reputation >= 80 ? 'default' : 
                              gameState.studio.reputation >= 60 ? 'secondary' : 'outline'}
                      className="px-3 py-1"
                    >
                      {gameState.studio.reputation >= 80 ? 'Prestigious Studio' :
                       gameState.studio.reputation >= 60 ? 'Respected Studio' :
                       gameState.studio.reputation >= 40 ? 'Emerging Studio' : 'Unknown Studio'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-navy hover:shadow-navy transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-secondary/20 to-muted/20 mr-3">
                <StudioIcon className="text-secondary-foreground" size={20} />
              </div>
              Studio Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-3">Genre Specialties</div>
                <div className="flex flex-wrap gap-2">
                  {gameState.studio.specialties.map((genre) => (
                    <Badge 
                      key={genre} 
                      variant="outline" 
                      className="border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    >
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Founded</span>
                  <span className="studio-mono font-medium text-foreground">
                    {gameState.studio.founded}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio">
            <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 mr-3">
              <ProductionIcon className="text-primary" size={20} />
            </div>
            Active Productions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/20 to-muted/10 flex items-center justify-center">
                  <ProductionIcon className="text-muted-foreground" size={32} />
                </div>
              </div>
              <p className="text-lg font-medium mb-2">No active projects</p>
              <p className="text-sm text-muted-foreground">Start by developing a script to begin your first production</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="card-premium cursor-pointer hover:border-primary/50 hover:shadow-golden transition-all duration-300 group"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-studio group-hover:text-primary transition-colors">
                        {project.title}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className="border-primary/30 text-primary bg-primary/5"
                      >
                        {project.currentPhase}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-card/50">
                        <span className="text-sm text-muted-foreground">Genre:</span>
                        <Badge variant="secondary" className="text-xs">
                          {project.script?.genre || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-card/50">
                        <span className="text-sm text-muted-foreground">Budget:</span>
                        <span className="studio-mono font-medium">
                          ${(project.budget.total / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge 
                          variant="default" 
                          className="text-xs bg-gradient-to-r from-primary to-accent"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-premium border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-accent/20 to-primary/20 mr-3">
                <TrendingIcon className="text-accent" size={20} />
              </div>
              Market Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gameState.marketConditions.trendingGenres.map((genre, index) => (
                <div key={genre} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-card/50 to-card/30 border border-border/30">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-red-500 animate-pulse' : 
                      index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-sm font-medium capitalize">{genre}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Progress 
                      value={90 - (index * 15)} 
                      className="w-24 h-2 bg-muted/20"
                    />
                    <span className="studio-mono text-xs text-muted-foreground min-w-[2rem]">
                      {90 - (index * 15)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-navy">
          <CardHeader>
            <CardTitle className="flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-secondary/20 to-muted/20 mr-3">
                <MarketIcon className="text-secondary-foreground" size={20} />
              </div>
              Industry Climate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-card/30 to-card/10 border border-border/20">
                <span className="text-sm font-medium">Economic Climate</span>
                <Badge 
                  variant={gameState.marketConditions.economicClimate === 'boom' ? 'default' : 
                          gameState.marketConditions.economicClimate === 'stable' ? 'secondary' : 'destructive'}
                  className="px-3 py-1"
                >
                  {gameState.marketConditions.economicClimate.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-3 p-4 rounded-lg bg-gradient-to-br from-muted/10 to-muted/5 border border-border/20">
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-3" />
                  Industry conditions favorable for new productions
                </p>
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-3" />
                  Strong audience appetite for quality content
                </p>
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3" />
                  Premium content commanding higher valuations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio">
            <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 mr-3">
              <AwardIcon className="text-primary" size={20} />
            </div>
            Studio Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-3 btn-ghost-premium hover:border-primary/50 group"
              onClick={() => setPhase('scripts')}
            >
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                <ScriptIcon className="text-primary" size={24} />
              </div>
              <span className="text-sm font-medium">Develop Script</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-3 btn-ghost-premium hover:border-accent/50 group"
              onClick={() => {
                const project = getBestProjectForCasting();
                setSelectedProjectId(project?.id ?? null);
                setPhase('casting');
              }}
            >
              <div className="p-3 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-300">
                <CastingIcon className="text-accent" size={24} />
              </div>
              <span className="text-sm font-medium">Scout Talent</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-3 btn-ghost-premium hover:border-secondary/50 group"
              onClick={() => setPhase('production')}
            >
              <div className="p-3 rounded-lg bg-gradient-to-r from-secondary/10 to-muted/10 group-hover:from-secondary/20 group-hover:to-muted/20 transition-all duration-300">
                <StudioIcon className="text-secondary-foreground" size={24} />
              </div>
              <span className="text-sm font-medium">Production</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-3 btn-ghost-premium hover:border-primary/50 group"
              onClick={() => setPhase('distribution')}
            >
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                <MarketIcon className="text-primary" size={24} />
              </div>
              <span className="text-sm font-medium">Distribution</span>
            </Button>
          </div>
          
          {/* Financial Actions Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex items-center space-x-3 btn-ghost-premium hover:border-primary/50 group"
              onClick={() => setPhase('finance')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                <BudgetIcon className="text-primary" size={20} />
              </div>
              <span className="text-sm font-medium">Financial Center</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex items-center space-x-3 btn-ghost-premium hover:border-green-500/50 group"
              onClick={() => setPhase('loans')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 group-hover:from-green-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                <BudgetIcon className="text-green-600" size={20} />
              </div>
              <span className="text-sm font-medium">Manage Loans</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex items-center space-x-3 btn-ghost-premium hover:border-accent/50 group"
              onClick={() => setPhase('reputation')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-300">
                <ReputationIcon className="text-accent" size={20} />
              </div>
              <span className="text-sm font-medium">Reputation Panel</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};