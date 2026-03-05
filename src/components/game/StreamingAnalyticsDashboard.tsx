import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project } from '@/types/game';
import { BarChart3, TrendingUp, Users, Globe, Clock, Star, Award, Target } from 'lucide-react';
import { useGameStore } from '@/game/store';

export const StreamingAnalyticsDashboard: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'season' | 'all'>('month');

  if (!gameState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Streaming Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading streaming analytics...</p>
        </CardContent>
      </Card>
    );
  }

  // Get streaming projects
  const getStreamingProjects = (): Project[] => {
    return gameState.projects.filter(p => 
      (p.type === 'series' || p.type === 'limited-series') &&
      p.status === 'released' &&
      p.metrics?.streaming
    );
  };

  const streamingProjects = getStreamingProjects();
  const project = selectedProject ? streamingProjects.find(p => p.id === selectedProject) : streamingProjects[0];

  if (!project || !project.metrics?.streaming) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Streaming Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No streaming data available. Release a TV series to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const streaming = project.metrics.streaming;
  const currentSeason = project.seasons?.[0];
  const contract = project.streamingContract;
  const streamingRelease = project.postTheatricalReleases?.find(r => r.platform === 'streaming');
  const weeksSinceRelease = project.metrics?.weeksSinceRelease || 0;

  // Calculate key metrics
  const getMetrics = () => {
    const totalViews = streaming.totalViews;
    const averageWeeklyViews = weeksSinceRelease > 0 ? totalViews / weeksSinceRelease : totalViews;
    
    return {
      totalViews,
      averageWeeklyViews,
      completionRate: streaming.completionRate,
      subscriberGrowth: streaming.subscriberGrowth,
      watchTimeHours: streaming.watchTimeHours,
      audienceShare: streaming.audienceShare,
      weeklyTrend: weeksSinceRelease > 1 ? 
        ((streaming.viewsFirstWeek || 0) - averageWeeklyViews) / (streaming.viewsFirstWeek || 1) * 100 : 0
    };
  };

  const metrics = getMetrics();

  const maxWeeksToShow = (() => {
    if (weeksSinceRelease <= 0) return 1;
    switch (timeRange) {
      case 'week':
        return Math.min(4, weeksSinceRelease);
      case 'month':
        return Math.min(8, weeksSinceRelease);
      case 'season':
        return Math.min(12, weeksSinceRelease);
      case 'all':
      default:
        return weeksSinceRelease;
    }
  })();

  // Generate competitive comparison data
  const getCompetitiveData = () => {
    const genreProjects = gameState.projects.filter(p => 
      p.script?.genre === project.script?.genre &&
      p.id !== project.id &&
      p.metrics?.streaming
    );

    if (genreProjects.length === 0) return null;

    const avgViews = genreProjects.reduce((sum, p) => sum + (p.metrics?.streaming?.totalViews || 0), 0) / genreProjects.length;
    const avgCompletion = genreProjects.reduce((sum, p) => sum + (p.metrics?.streaming?.completionRate || 0), 0) / genreProjects.length;

    return {
      genreAvgViews: avgViews,
      genreAvgCompletion: avgCompletion,
      rank: genreProjects.filter(p => (p.metrics?.streaming?.totalViews || 0) > metrics.totalViews).length + 1,
      totalInGenre: genreProjects.length + 1
    };
  };

  const competitive = getCompetitiveData();

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Streaming Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Select Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a streaming project" />
                </SelectTrigger>
                <SelectContent>
                  {streamingProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} ({p.script?.genre})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="season">Full Season</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{(metrics.totalViews / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.weeklyTrend > 0 ? '+' : ''}{metrics.weeklyTrend.toFixed(1)}% vs avg
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{metrics.completionRate}%</p>
                <Progress value={metrics.completionRate} className="mt-2" />
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subscriber Growth</p>
                <p className="text-2xl font-bold">{(metrics.subscriberGrowth / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">New subscriptions</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Watch Time</p>
                <p className="text-2xl font-bold">{(metrics.watchTimeHours / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Total hours</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="episodes">Episode Breakdown</TabsTrigger>
          <TabsTrigger value="audience">Audience Insights</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
          <TabsTrigger value="revenue">Revenue &amp; Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weekly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Weekly Viewership Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-end justify-between h-40">
                    {/* Simulated weekly data based on selected time range */}
                    {Array.from({ length: Math.max(1, Math.min(12, maxWeeksToShow)) }, (_, i) => {
                      const weekViews = streaming.viewsFirstWeek! * Math.pow(0.85, i);
                      const height = (weekViews / streaming.viewsFirstWeek!) * 100;
                      return (
                        <div 
                          key={i}
                          className="bg-primary rounded-t flex-1 mx-1"
                          style={{ height: `${height}%` }}
                          title={`Week ${i + 1}: ${(weekViews / 1000000).toFixed(1)}M views`}
                        />
                      );
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    Weeks since release
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Audience Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Completion Rate</span>
                    <span className="text-sm font-medium">{streaming.completionRate}%</span>
                  </div>
                  <Progress value={streaming.completionRate} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Audience Share</span>
                    <span className="text-sm font-medium">{streaming.audienceShare}%</span>
                  </div>
                  <Progress value={streaming.audienceShare} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Rewatch Rate</span>
                    <span className="text-sm font-medium">18%</span>
                  </div>
                  <Progress value={18} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="episodes" className="space-y-4">
          {currentSeason && (
            <Card>
              <CardHeader>
                <CardTitle>Episode Performance - Season {currentSeason.seasonNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentSeason.episodes?.slice(0, currentSeason.episodesAired).map((episode, index) => (
                    <div key={episode.episodeNumber} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">Episode {episode.episodeNumber}: {episode.title}</h4>
                        <p className="text-sm text-muted-foreground">{episode.runtime} minutes</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{(episode.viewers / 1000000).toFixed(1)}M</div>
                          <div className="text-muted-foreground">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{episode.completionRate}%</div>
                          <div className="text-muted-foreground">Completion</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{episode.criticsScore}/100</div>
                          <div className="text-muted-foreground">Critics</div>
                        </div>
                        <Badge variant={episode.viewers > metrics.averageWeeklyViews ? "default" : "secondary"}>
                          {episode.viewers > metrics.averageWeeklyViews ? 'Above Avg' : 'Below Avg'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Audience Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { age: '18-24', percentage: 28, color: 'bg-blue-500' },
                    { age: '25-34', percentage: 35, color: 'bg-green-500' },
                    { age: '35-44', percentage: 22, color: 'bg-yellow-500' },
                    { age: '45-54', percentage: 10, color: 'bg-red-500' },
                    { age: '55+', percentage: 5, color: 'bg-purple-500' }
                  ].map(demo => (
                    <div key={demo.age} className="flex items-center gap-4">
                      <div className="w-16 text-sm">{demo.age}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-4 ${demo.color} rounded`} style={{ width: `${demo.percentage * 2}px` }} />
                          <span className="text-sm">{demo.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { region: 'North America', percentage: 45, engagement: 92 },
                    { region: 'Europe', percentage: 25, engagement: 87 },
                    { region: 'Asia Pacific', percentage: 18, engagement: 79 },
                    { region: 'Latin America', percentage: 8, engagement: 85 },
                    { region: 'Other', percentage: 4, engagement: 73 }
                  ].map(region => (
                    <div key={region.region} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{region.region}</span>
                        <span className="text-sm text-muted-foreground">{region.percentage}%</span>
                      </div>
                      <Progress value={region.engagement} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        Engagement: {region.engagement}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-4">
          {competitive && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Genre Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Your Show</span>
                        <span className="font-medium">{(metrics.totalViews / 1000000).toFixed(1)}M views</span>
                      </div>
                      <Progress value={100} className="bg-primary/20" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Genre Average</span>
                        <span className="font-medium">{(competitive.genreAvgViews / 1000000).toFixed(1)}M views</span>
                      </div>
                      <Progress value={(competitive.genreAvgViews / metrics.totalViews) * 100} />
                    </div>
                    <div className="pt-2">
                      <Badge variant={competitive.rank <= 3 ? "default" : "secondary"}>
                        #{competitive.rank} of {competitive.totalInGenre} in {project.script?.genre}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Market Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">#{competitive.rank}</div>
                      <div className="text-sm text-muted-foreground">Rank in Genre</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {metrics.totalViews > competitive.genreAvgViews ? '+' : ''}
                        {(((metrics.totalViews / competitive.genreAvgViews) - 1) * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">vs Genre Avg</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Market Share</div>
                    <Progress value={streaming.audienceShare} />
                    <div className="text-xs text-muted-foreground mt-1">
                      {streaming.audienceShare}% of total streaming audience
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Streaming Revenue &amp; Contracts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contract ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Platform</p>
                        <p className="font-semibold capitalize">{contract.platform}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Performance Score</p>
                        <p className="font-semibold">{contract.performanceScore}/100</p>
                        <Progress value={contract.performanceScore} className="mt-1" />
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Upfront Payment</p>
                        <p className="font-semibold">
                          {(contract.upfrontPayment / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Expected Viewers</p>
                        <p className="font-semibold">
                          {(contract.expectedViewers / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>
                    {streaming && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Views vs Target</span>
                          <span className="font-semibold">
                            {contract.expectedViewers > 0
                              ? ((streaming.totalViews / contract.expectedViewers) * 100).toFixed(0)
                              : '0'}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            contract.expectedViewers > 0
                              ? Math.min(
                                  150,
                                  (streaming.totalViews / contract.expectedViewers) * 100
                                )
                              : 0
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Completion and subscriber growth also contribute to performance bonuses.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This series does not currently have a platform contract. Strong analytics make it easier
                    to negotiate better licensing terms in the Streaming Contracts view.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Lifecycle &amp; Long‑Tail Value
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Watch‑time per View</p>
                    <p className="font-semibold">
                      {streaming.totalViews > 0
                        ? ((streaming.watchTimeHours * 60) / streaming.totalViews).toFixed(1)
                        : '–'}{' '}
                      min
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Subscriber Conversion</p>
                    <p className="font-semibold">
                      {streaming.totalViews > 0
                        ? ((streaming.subscriberGrowth / streaming.totalViews) * 100).toFixed(2)
                        : '0.00'}
                      % per viewer
                    </p>
                  </div>
                </div>

                {streamingRelease && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Post‑Theatrical Streaming Revenue</span>
                      <span className="font-semibold">
                        ${(streamingRelease.revenue / 1000000).toFixed(2)}M
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Status: {streamingRelease.status}</span>
                      <span>Weeks active: {streamingRelease.weeksActive}</span>
                    </div>
                  </div>
                )}

                {!streamingRelease && (
                  <p className="text-xs text-muted-foreground">
                    Use post‑theatrical streaming releases to extend this series’ earnings beyond its first
                    contract window.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};