import React, { useMemo } from 'react';
import { GameState, Project, CompetitorRelease, SeasonalTrend, IndustryTrend, Genre } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MarketIcon, 
  TrendingIcon, 
  CalendarIcon,
  AlertIcon,
  BarChartIcon,
  DollarIcon 
} from '@/components/ui/icons';

interface MarketCompetitionProps {
  gameState: GameState;
}

export const MarketCompetition: React.FC<MarketCompetitionProps> = ({ gameState }) => {
  
  // Generate seasonal trends based on current week
  const getCurrentSeasonalTrends = (): SeasonalTrend[] => {
    const week = gameState.currentWeek;
    const trends: SeasonalTrend[] = [];
    
    if (week >= 20 && week <= 35) { // Summer (May-August)
      trends.push({
        season: 'summer',
        weeks: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
        name: 'Summer Blockbuster Season',
        description: 'Big budget spectacles dominate theaters',
        impact: {
          favoredGenres: ['action', 'adventure', 'superhero', 'sci-fi'],
          boxOfficeMultiplier: 1.4,
          audienceSize: 1.3,
          competitionLevel: 9
        }
      });
    }
    
    if (week >= 48 || week <= 2) { // Holiday (Dec-Jan)
      trends.push({
        season: 'holiday',
        weeks: [48, 49, 50, 51, 52, 1, 2],
        name: 'Holiday Family Season',
        description: 'Family-friendly films and awards contenders',
        impact: {
          favoredGenres: ['family', 'animation', 'drama', 'musical'],
          boxOfficeMultiplier: 1.2,
          audienceSize: 1.1,
          competitionLevel: 7
        }
      });
    }
    
    if (week >= 36 && week <= 47) { // Fall
      trends.push({
        season: 'fall',
        weeks: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
        name: 'Awards Season Prep',
        description: 'Quality dramas and prestige pictures',
        impact: {
          favoredGenres: ['drama', 'biography', 'historical', 'thriller'],
          boxOfficeMultiplier: 0.9,
          audienceSize: 0.9,
          competitionLevel: 6
        }
      });
    }
    
    return trends;
  };

  const competitorReleases = useMemo<CompetitorRelease[]>(() => {
    const releasesThisWeek = gameState.allReleases
      .filter((r): r is Project => 'script' in r)
      .filter((r) =>
        r.status === 'released' &&
        r.releaseWeek === gameState.currentWeek &&
        r.releaseYear === gameState.currentYear &&
        r.type !== 'series' &&
        r.type !== 'limited-series'
      );

    return releasesThisWeek.map((project) => {
      const critics = project.metrics?.criticsScore ?? 65;
      const audience = project.metrics?.audienceScore ?? 65;
      const marketingSpend =
        project.marketingCampaign?.budgetAllocated ??
        project.distributionStrategy?.marketingBudget ??
        project.budget?.allocated?.marketing ??
        0;

      return {
        id: project.id,
        title: project.title,
        studio: project.studioName || 'Unknown Studio',
        genre: project.script.genre as Genre,
        budget: project.budget?.total ?? project.script.budget,
        quality: Math.round((critics + audience) / 2),
        marketing: marketingSpend,
        releaseWeek: project.releaseWeek || gameState.currentWeek,
        releaseYear: project.releaseYear || gameState.currentYear,
        expectedRevenue: project.metrics?.boxOfficeTotal || 0,
        targetAudience: [project.script.targetAudience || 'general'],
        marketingBuzz: project.marketingData?.currentBuzz ?? 50,
      };
    });
  }, [gameState.allReleases, gameState.currentWeek, gameState.currentYear]);

  // Calculate genre oversaturation
  const calculateGenreOversaturation = (releases: CompetitorRelease[]): { [genre: string]: number } => {
    const genreCounts: { [genre: string]: number } = {};
    const totalReleases = releases.length;
    
    releases.forEach(release => {
      genreCounts[release.genre] = (genreCounts[release.genre] || 0) + 1;
    });
    
    const oversaturation: { [genre: string]: number } = {};
    Object.keys(genreCounts).forEach(genre => {
      const percentage = (genreCounts[genre] / Math.max(totalReleases, 1)) * 100;
      oversaturation[genre] = Math.min(100, percentage * 3); // Scale to 0-100
    });
    
    return oversaturation;
  };

  // Get market impact for player's projects
  const getMarketImpact = (project: Project): {
    competitionLevel: number;
    seasonalBonus: number;
    oversaturationPenalty: number;
  } => {
    // Competition level based on similar releases
    const similarReleases = competitorReleases.filter(r => r.genre === project.script.genre);
    const competitionLevel = Math.min(100, similarReleases.length * 25);

    // Seasonal bonus
    let seasonalBonus = 0;
    currentTrends.forEach(trend => {
      if (trend.impact.favoredGenres.includes(project.script.genre)) {
        seasonalBonus = (trend.impact.boxOfficeMultiplier - 1) * 100;
      }
    });

    // Oversaturation penalty
    const oversaturationPenalty = oversaturation[project.script.genre] || 0;

    return { competitionLevel, seasonalBonus, oversaturationPenalty };
  };

  const currentTrends = getCurrentSeasonalTrends();
  const oversaturation = calculateGenreOversaturation(competitorReleases);
  
  // Get player's released projects for impact analysis
  const releasedProjects = gameState.projects.filter(p => p.status === 'released' || p.status === 'scheduled-for-release');

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <div className="p-2 rounded-lg bg-gradient-golden mr-3">
              <MarketIcon className="text-primary-foreground" size={20} />
            </div>
            Market Overview - Week {gameState.currentWeek}, {gameState.currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="text-sm text-muted-foreground">Competitor Releases</div>
              <div className="text-2xl font-bold text-primary">
                {competitorReleases.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">This week</div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10">
              <div className="text-sm text-muted-foreground">Market Heat</div>
              <div className="text-2xl font-bold text-accent">
                {Math.min(10, competitorReleases.length * 3)}/10
              </div>
              <div className="text-xs text-muted-foreground mt-1">Competition level</div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-600/10">
              <div className="text-sm text-muted-foreground">Audience Attention</div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(20, 100 - (competitorReleases.length * 15))}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Available share</div>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <div className="text-sm text-muted-foreground">Active Trends</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentTrends.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Seasonal effects</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Trends */}
      {currentTrends.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <CalendarIcon className="mr-2" size={20} />
              Active Seasonal Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTrends.map((trend, index) => (
              <div key={index} className="p-4 rounded-lg border border-border/50 bg-card/50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-lg">{trend.name}</div>
                    <div className="text-sm text-muted-foreground">{trend.description}</div>
                  </div>
                  <Badge variant="default" className="capitalize">
                    {trend.season}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Box Office:</span>
                    <span className={`ml-1 font-semibold ${trend.impact.boxOfficeMultiplier > 1 ? 'text-green-600' : 'text-orange-600'}`}>
                      {trend.impact.boxOfficeMultiplier > 1 ? '+' : ''}{((trend.impact.boxOfficeMultiplier - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audience:</span>
                    <span className={`ml-1 font-semibold ${trend.impact.audienceSize > 1 ? 'text-green-600' : 'text-orange-600'}`}>
                      {trend.impact.audienceSize > 1 ? '+' : ''}{((trend.impact.audienceSize - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Competition:</span>
                    <span className={`ml-1 font-semibold ${trend.impact.competitionLevel > 7 ? 'text-red-600' : trend.impact.competitionLevel > 5 ? 'text-orange-600' : 'text-green-600'}`}>
                      {trend.impact.competitionLevel}/10
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Favored:</span>
                    <span className="ml-1 text-xs">
                      {trend.impact.favoredGenres.slice(0, 2).join(', ')}
                      {trend.impact.favoredGenres.length > 2 && '...'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitor Releases */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <BarChartIcon className="mr-2" size={20} />
            Competing Releases This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitorReleases.length > 0 ? (
            <div className="space-y-3">
              {competitorReleases.map(release => (
                <div key={release.id} className="flex justify-between items-center p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex-1">
                    <div className="font-medium">{release.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {release.studio} • {release.genre} • ${(release.budget / 1000000).toFixed(0)}M budget
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground">Quality</div>
                      <div className="font-semibold">{release.quality}/100</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Marketing</div>
                      <div className="font-semibold">${(release.marketing / 1000000).toFixed(0)}M</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Buzz</div>
                      <div className="font-semibold">{release.marketingBuzz}/100</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <MarketIcon className="mx-auto mb-2" size={32} />
              <div>No major competitor releases this week</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Genre Oversaturation */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <TrendingIcon className="mr-2" size={20} />
            Genre Market Saturation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(oversaturation).map(([genre, saturation]) => (
              <div key={genre} className="p-3 rounded-lg border border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium capitalize">{genre}</span>
                  <Badge variant={saturation > 60 ? "destructive" : saturation > 30 ? "secondary" : "default"}>
                    {saturation.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={saturation} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {saturation > 60 ? 'Oversaturated' : saturation > 30 ? 'Competitive' : 'Open Market'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Impact Analysis */}
      {releasedProjects.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <AlertIcon className="mr-2" size={20} />
              Your Projects Market Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {releasedProjects.map(project => {
              const impact = getMarketImpact(project);
              return (
                <div key={project.id} className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{project.title}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {project.script.genre} • {project.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground mb-1">Competition</div>
                      <div className={`font-semibold ${impact.competitionLevel > 60 ? 'text-red-600' : impact.competitionLevel > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                        {impact.competitionLevel.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-muted-foreground mb-1">Seasonal Bonus</div>
                      <div className={`font-semibold ${impact.seasonalBonus > 0 ? 'text-green-600' : impact.seasonalBonus < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {impact.seasonalBonus > 0 ? '+' : ''}{impact.seasonalBonus.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-muted-foreground mb-1">Saturation</div>
                      <div className={`font-semibold ${impact.oversaturationPenalty > 50 ? 'text-red-600' : impact.oversaturationPenalty > 25 ? 'text-orange-600' : 'text-green-600'}`}>
                        -{impact.oversaturationPenalty.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  {(impact.competitionLevel > 60 || impact.oversaturationPenalty > 50) && (
                    <Alert className="mt-3">
                      <AlertIcon className="h-4 w-4" />
                      <AlertDescription>
                        High competition and oversaturation may impact box office performance
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {impact.seasonalBonus > 20 && (
                    <Alert className="mt-3 border-green-200 bg-green-50 text-green-800">
                      <TrendingIcon className="h-4 w-4" />
                      <AlertDescription>
                        Perfect timing! This genre is favored this season
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};