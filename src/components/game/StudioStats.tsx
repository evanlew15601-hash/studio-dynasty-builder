import React, { useState } from 'react';
import { GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingIcon, 
  DollarIcon,
  CalendarIcon,
  AwardIcon,
  BarChartIcon,
  StudioIcon
} from '@/components/ui/icons';

interface StudioStatsProps {
  gameState: GameState;
}

interface FilmStats {
  title: string;
  genre: string;
  boxOffice: number;
  profit: number;
  criticsScore: number;
  audienceScore: number;
  theaterWeeks: number;
  marketingSpent: number;
  status: string;
  releaseYear?: number;
}

export const StudioStats: React.FC<StudioStatsProps> = ({
  gameState
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'current-year' | 'last-year'>('all');

  const getCompletedFilms = (): FilmStats[] => {
    return gameState.projects
      .filter(p => p.status === 'released' && p.metrics.boxOfficeTotal)
      .map(p => ({
        title: p.title,
        genre: p.script.genre,
        boxOffice: p.metrics.boxOfficeTotal || 0,
        profit: (p.metrics.boxOfficeTotal || 0) - p.budget.total,
        criticsScore: p.metrics.criticsScore || 0,
        audienceScore: p.metrics.audienceScore || 0,
        theaterWeeks: p.metrics.weeksSinceRelease || 0,
        marketingSpent: p.marketingCampaign?.budgetSpent || 0,
        status: p.metrics.inTheaters ? 'In Theaters' : 'Post-Theatrical',
        releaseYear: p.releaseYear
      }));
  };

  const filterFilmsByPeriod = (films: FilmStats[]): FilmStats[] => {
    if (selectedPeriod === 'current-year') {
      return films.filter(f => f.releaseYear === gameState.currentYear);
    } else if (selectedPeriod === 'last-year') {
      return films.filter(f => f.releaseYear === gameState.currentYear - 1);
    }
    return films;
  };

  const calculateTotalStats = (films: FilmStats[]) => {
    const totalBoxOffice = films.reduce((sum, f) => sum + f.boxOffice, 0);
    const totalProfit = films.reduce((sum, f) => sum + f.profit, 0);
    const averageCriticsScore = films.length > 0 ? films.reduce((sum, f) => sum + f.criticsScore, 0) / films.length : 0;
    const averageAudienceScore = films.length > 0 ? films.reduce((sum, f) => sum + f.audienceScore, 0) / films.length : 0;
    const totalMarketingSpent = films.reduce((sum, f) => sum + f.marketingSpent, 0);
    const averageTheaterWeeks = films.length > 0 ? films.reduce((sum, f) => sum + f.theaterWeeks, 0) / films.length : 0;

    return {
      totalBoxOffice,
      totalProfit,
      averageCriticsScore,
      averageAudienceScore,
      totalMarketingSpent,
      averageTheaterWeeks,
      filmCount: films.length
    };
  };

  const getTopPerformers = (films: FilmStats[]) => {
    const byBoxOffice = [...films].sort((a, b) => b.boxOffice - a.boxOffice).slice(0, 5);
    const byProfit = [...films].sort((a, b) => b.profit - a.profit).slice(0, 5);
    const byCritics = [...films].sort((a, b) => b.criticsScore - a.criticsScore).slice(0, 5);
    const byAudience = [...films].sort((a, b) => b.audienceScore - a.audienceScore).slice(0, 5);

    return { byBoxOffice, byProfit, byCritics, byAudience };
  };

  const getGenreBreakdown = (films: FilmStats[]) => {
    const genreStats: { [key: string]: { count: number; totalRevenue: number; totalProfit: number } } = {};
    
    films.forEach(film => {
      if (!genreStats[film.genre]) {
        genreStats[film.genre] = { count: 0, totalRevenue: 0, totalProfit: 0 };
      }
      genreStats[film.genre].count++;
      genreStats[film.genre].totalRevenue += film.boxOffice;
      genreStats[film.genre].totalProfit += film.profit;
    });

    return Object.entries(genreStats)
      .map(([genre, stats]) => ({
        genre,
        ...stats,
        averageRevenue: stats.totalRevenue / stats.count,
        averageProfit: stats.totalProfit / stats.count
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const allFilms = getCompletedFilms();
  const filteredFilms = filterFilmsByPeriod(allFilms);
  const stats = calculateTotalStats(filteredFilms);
  const topPerformers = getTopPerformers(filteredFilms);
  const genreBreakdown = getGenreBreakdown(filteredFilms);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Studio Statistics
          </h2>
          <p className="text-muted-foreground">
            Performance analytics for {gameState.studio.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge 
            variant={selectedPeriod === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedPeriod('all')}
          >
            All Time
          </Badge>
          <Badge 
            variant={selectedPeriod === 'current-year' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedPeriod('current-year')}
          >
            {gameState.currentYear}
          </Badge>
          <Badge 
            variant={selectedPeriod === 'last-year' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedPeriod('last-year')}
          >
            {gameState.currentYear - 1}
          </Badge>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              ${(stats.totalBoxOffice / 1000000).toFixed(0)}M
            </div>
            <div className="text-sm text-muted-foreground">Total Box Office</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-accent/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              ${(stats.totalProfit / 1000000).toFixed(0)}M
            </div>
            <div className="text-sm text-muted-foreground">Total Profit</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-secondary/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary-foreground">
              {stats.filmCount}
            </div>
            <div className="text-sm text-muted-foreground">Films Released</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-success/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {stats.averageCriticsScore.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Critics Score</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="films">Film Library</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="genres">Genre Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <BarChartIcon className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Critics Score</span>
                    <span>{stats.averageCriticsScore.toFixed(1)}/100</span>
                  </div>
                  <Progress value={stats.averageCriticsScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Audience Score</span>
                    <span>{stats.averageAudienceScore.toFixed(1)}/100</span>
                  </div>
                  <Progress value={stats.averageAudienceScore} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Studio Reputation</span>
                    <span>{Math.round(gameState.studio.reputation)}/100</span>
                  </div>
                  <Progress value={gameState.studio.reputation} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <DollarIcon className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Budget:</span>
                  <span className="font-medium">${(gameState.studio.budget / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Marketing Spent:</span>
                  <span className="font-medium">${(stats.totalMarketingSpent / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Theater Run:</span>
                  <span className="font-medium">{stats.averageTheaterWeeks.toFixed(1)} weeks</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">ROI:</span>
                  <span className="font-bold text-primary">
                    {stats.totalBoxOffice > 0 ? 
                      `${((stats.totalProfit / stats.totalBoxOffice) * 100).toFixed(1)}%` : 
                      'N/A'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="films" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Filmography</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredFilms.length > 0 ? filteredFilms.map((film, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <StudioIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{film.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {film.genre} • {film.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${(film.boxOffice / 1000000).toFixed(1)}M</div>
                      <div className="text-sm text-muted-foreground">
                        Critics: {film.criticsScore} | Audience: {film.audienceScore}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No films released yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-performers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Box Office</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.byBoxOffice.map((film, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded">
                      <div>
                        <div className="font-medium text-sm">{film.title}</div>
                        <div className="text-xs text-muted-foreground">{film.genre}</div>
                      </div>
                      <div className="text-sm font-medium">
                        ${(film.boxOffice / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Profitable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.byProfit.map((film, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded">
                      <div>
                        <div className="font-medium text-sm">{film.title}</div>
                        <div className="text-xs text-muted-foreground">{film.genre}</div>
                      </div>
                      <div className="text-sm font-medium">
                        ${(film.profit / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critics' Favorites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.byCritics.map((film, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded">
                      <div>
                        <div className="font-medium text-sm">{film.title}</div>
                        <div className="text-xs text-muted-foreground">{film.genre}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {film.criticsScore}/100
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audience Favorites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.byAudience.map((film, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded">
                      <div>
                        <div className="font-medium text-sm">{film.title}</div>
                        <div className="text-xs text-muted-foreground">{film.genre}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {film.audienceScore}/100
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="genres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Genre Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {genreBreakdown.map((genre, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium capitalize">{genre.genre}</div>
                        <div className="text-sm text-muted-foreground">
                          {genre.count} film{genre.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${(genre.totalRevenue / 1000000).toFixed(1)}M</div>
                        <div className="text-sm text-muted-foreground">
                          Avg: ${(genre.averageRevenue / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={(genre.totalRevenue / Math.max(...genreBreakdown.map(g => g.totalRevenue))) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};