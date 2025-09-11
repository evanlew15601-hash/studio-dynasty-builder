import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { EpisodeData, SeasonData, WeeklyStreamingMetrics } from '@/types/streamingTypes';
import { GameState, Project } from '@/types/game';
import { Play, Users, Clock, TrendingUp, Calendar, BarChart3, Star } from 'lucide-react';
import { TVRatingsSystem } from './TVRatingsSystem';

interface EpisodeTrackingSystemProps {
  gameState: GameState;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
}

export const EpisodeTrackingSystem: React.FC<EpisodeTrackingSystemProps> = ({
  gameState,
  onProjectUpdate
}) => {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [releaseFormat, setReleaseFormat] = useState<'weekly' | 'binge' | 'batch'>('weekly');

  // Get TV projects with streaming data
  const getTVProjects = () => {
    return gameState.projects.filter(p => 
      (p.type === 'series' || p.type === 'limited-series') &&
      p.status === 'released'
    );
  };

  // Initialize season data for a project
  const initializeSeasonData = (project: Project): SeasonData => {
    const episodeCount = project.script?.estimatedRuntime ? 
      Math.ceil(project.script.estimatedRuntime / 45) : 10;
    
    const episodes: EpisodeData[] = Array.from({ length: episodeCount }, (_, i) => ({
      episodeNumber: i + 1,
      seasonNumber: 1,
      title: `Episode ${i + 1}`,
      runtime: 45,
      viewers: 0,
      completionRate: 0,
      averageWatchTime: 0,
      replayViews: 0,
      weeklyViews: [],
      cumulativeViews: 0,
      viewerRetention: 100,
      productionCost: (project.budget.total || 0) / episodeCount,
      socialMentions: 0
    }));

    return {
      seasonNumber: 1,
      totalEpisodes: episodeCount,
      episodesAired: 0,
      releaseFormat: 'weekly',
      averageViewers: 0,
      seasonCompletionRate: 0,
      seasonDropoffRate: 0,
      totalBudget: project.budget.total || 0,
      spentBudget: 0,
      productionStatus: 'complete',
      episodes
    };
  };

  // Release episodes based on format
  const releaseEpisodes = (project: Project, format: 'weekly' | 'binge' | 'batch') => {
    if (!project.seasons || project.seasons.length === 0) {
      // Initialize first season
      const seasonData = initializeSeasonData(project);
      project.seasons = [seasonData];
    }

    const currentSeason = project.seasons[selectedSeason - 1];
    if (!currentSeason) return;

    let episodesToRelease: number;
    switch (format) {
      case 'binge':
        episodesToRelease = currentSeason.totalEpisodes;
        break;
      case 'batch':
        episodesToRelease = Math.min(3, currentSeason.totalEpisodes - currentSeason.episodesAired);
        break;
      case 'weekly':
      default:
        episodesToRelease = 1;
        break;
    }

    const startEpisode = currentSeason.episodesAired;
    const endEpisode = Math.min(startEpisode + episodesToRelease, currentSeason.totalEpisodes);

    // Process initial ratings for new episodes
    const updatedProject = TVRatingsSystem.initializeAiring(
      project, 
      gameState.currentWeek, 
      gameState.currentYear
    );

    // Generate episode data for released episodes
    for (let i = startEpisode; i < endEpisode; i++) {
      const episode = currentSeason.episodes[i];
      if (episode) {
        const baseViewers = updatedProject.metrics?.streaming?.viewsFirstWeek || 1000000;
        const episodeMultiplier = i === 0 ? 1.0 : Math.max(0.6, 1 - (i * 0.05)); // First episode gets full views
        
        episode.viewers = Math.floor(baseViewers * episodeMultiplier);
        episode.completionRate = Math.max(60, 85 - (i * 2)); // Slight dropoff over season
        episode.averageWatchTime = Math.floor(episode.runtime * (episode.completionRate / 100));
        episode.replayViews = Math.floor(episode.viewers * 0.15);
        episode.cumulativeViews = episode.viewers + episode.replayViews;
        episode.airDate = {
          week: gameState.currentWeek,
          year: gameState.currentYear
        };
        episode.weeklyViews = [episode.viewers];
        episode.viewerRetention = i === 0 ? 100 : Math.max(70, 100 - (i * 3));
        episode.criticsScore = Math.floor(Math.random() * 30) + 60;
        episode.audienceScore = Math.floor(Math.random() * 30) + 65;
        episode.socialMentions = Math.floor(episode.viewers / 10000);
      }
    }

    // Update season stats
    currentSeason.episodesAired = endEpisode;
    currentSeason.releaseFormat = format;
    currentSeason.averageViewers = Math.floor(
      currentSeason.episodes
        .slice(0, endEpisode)
        .reduce((sum, ep) => sum + ep.viewers, 0) / endEpisode
    );
    currentSeason.seasonCompletionRate = Math.floor(
      currentSeason.episodes
        .slice(0, endEpisode)
        .reduce((sum, ep) => sum + ep.completionRate, 0) / endEpisode
    );

    // Set premiere date for first episode
    if (!currentSeason.premiereDate && endEpisode > 0) {
      currentSeason.premiereDate = {
        week: gameState.currentWeek,
        year: gameState.currentYear
      };
    }

    // Set finale date if season is complete
    if (currentSeason.episodesAired >= currentSeason.totalEpisodes && !currentSeason.finaleDate) {
      currentSeason.finaleDate = {
        week: gameState.currentWeek,
        year: gameState.currentYear
      };
    }

    onProjectUpdate(project.id, {
      ...updatedProject,
      seasons: project.seasons,
      releaseFormat: format
    });

    const formatNames = {
      'weekly': 'Weekly Release',
      'binge': 'Full Season Drop',
      'batch': 'Batch Release (3 episodes)'
    };

    toast({
      title: "Episodes Released!",
      description: `Released ${episodesToRelease} episode(s) in ${formatNames[format]} format`,
    });
  };

  // Process weekly updates for all aired episodes
  const processWeeklyUpdates = () => {
    const tvProjects = getTVProjects();
    
    tvProjects.forEach(project => {
      if (!project.seasons) return;
      
      let hasUpdates = false;
      const updatedSeasons = project.seasons.map(season => {
        const updatedEpisodes = season.episodes.map(episode => {
          if (episode.airDate && episode.weeklyViews.length < 12) { // Track for 12 weeks max
            const weeksSinceAir = 
              (gameState.currentYear * 52 + gameState.currentWeek) - 
              (episode.airDate.year * 52 + episode.airDate.week);
            
            if (weeksSinceAir >= 0 && weeksSinceAir < 12) {
              // Calculate weekly decay
              const decayRate = episode.episodeNumber === 1 ? 0.15 : 0.20; // Premiere has better retention
              const weeklyViews = Math.floor(
                episode.viewers * Math.pow(1 - decayRate, weeksSinceAir + 1)
              );
              
              episode.weeklyViews.push(weeklyViews);
              episode.cumulativeViews += weeklyViews;
              hasUpdates = true;
            }
          }
          return episode;
        });
        
        return { ...season, episodes: updatedEpisodes };
      });
      
      if (hasUpdates) {
        // Update overall project streaming metrics
        const updatedProject = TVRatingsSystem.processWeeklyRatings(
          { ...project, seasons: updatedSeasons },
          gameState.currentWeek,
          gameState.currentYear
        );
        
        onProjectUpdate(project.id, updatedProject);
      }
    });
  };

  // Run weekly updates
  useEffect(() => {
    processWeeklyUpdates();
  }, [gameState.currentWeek]);

  const tvProjects = getTVProjects();

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Episode Tracking & Release Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tvProjects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No TV shows available for episode tracking. Release a TV series first.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tvProjects.map(project => {
                const currentSeason = project.seasons?.[0];
                const hasEpisodes = currentSeason && currentSeason.episodesAired > 0;
                
                return (
                  <Card key={project.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{project.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {project.script?.genre} • {project.type}
                          </p>
                        </div>
                        <Badge variant={hasEpisodes ? "default" : "outline"}>
                          {hasEpisodes ? 'Airing' : 'Ready'}
                        </Badge>
                      </div>
                      
                      {currentSeason && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Episodes Released:</span>
                            <span className="font-medium">
                              {currentSeason.episodesAired}/{currentSeason.totalEpisodes}
                            </span>
                          </div>
                          {hasEpisodes && (
                            <>
                              <div className="flex justify-between">
                                <span>Avg Viewers:</span>
                                <span className="font-medium">
                                  {(currentSeason.averageViewers / 1000000).toFixed(1)}M
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Completion Rate:</span>
                                <span className="font-medium">{currentSeason.seasonCompletionRate}%</span>
                              </div>
                            </>
                          )}
                          <Progress 
                            value={(currentSeason.episodesAired / currentSeason.totalEpisodes) * 100} 
                            className="mt-2"
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedProject(project)}
                            >
                              {hasEpisodes ? 'Manage Episodes' : 'Release Episodes'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{project.title} - Episode Management</DialogTitle>
                            </DialogHeader>
                            
                            <EpisodeManagementModal 
                              project={project}
                              onRelease={(format) => releaseEpisodes(project, format)}
                              gameState={gameState}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Episode Management Modal Component
interface EpisodeManagementModalProps {
  project: Project;
  onRelease: (format: 'weekly' | 'binge' | 'batch') => void;
  gameState: GameState;
}

const EpisodeManagementModal: React.FC<EpisodeManagementModalProps> = ({
  project,
  onRelease,
  gameState
}) => {
  const [releaseFormat, setReleaseFormat] = useState<'weekly' | 'binge' | 'batch'>('weekly');
  
  const currentSeason = project.seasons?.[0] || {
    seasonNumber: 1,
    totalEpisodes: 10,
    episodesAired: 0,
    episodes: []
  };

  const canRelease = currentSeason.episodesAired < currentSeason.totalEpisodes;

  return (
    <div className="space-y-6">
      {/* Release Controls */}
      {canRelease && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Release New Episodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Release Format</label>
                <Select value={releaseFormat} onValueChange={(value: any) => setReleaseFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly (1 episode)</SelectItem>
                    <SelectItem value="batch">Batch (3 episodes)</SelectItem>
                    <SelectItem value="binge">Binge (Full season)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => onRelease(releaseFormat)}>
                Release Episodes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Episode List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Season {currentSeason.seasonNumber} Episodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentSeason.episodes.map((episode, index) => {
              const isAired = index < currentSeason.episodesAired;
              
              return (
                <div 
                  key={episode.episodeNumber}
                  className={`p-4 border rounded-lg ${!isAired ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">
                        Episode {episode.episodeNumber}: {episode.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {episode.runtime} minutes
                        {episode.airDate && (
                          <> • Aired Week {episode.airDate.week}, {episode.airDate.year}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isAired && (
                        <>
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            {episode.criticsScore}/100
                          </Badge>
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {(episode.viewers / 1000000).toFixed(1)}M
                          </Badge>
                        </>
                      )}
                      {!isAired && (
                        <Badge variant="outline">Not Aired</Badge>
                      )}
                    </div>
                  </div>
                  
                  {isAired && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Completion Rate:</span>
                        <p className="font-medium">{episode.completionRate}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Watch Time:</span>
                        <p className="font-medium">{episode.averageWatchTime}min</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cumulative Views:</span>
                        <p className="font-medium">{(episode.cumulativeViews / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Social Mentions:</span>
                        <p className="font-medium">{(episode.socialMentions || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {isAired && episode.weeklyViews.length > 1 && (
                    <div className="mt-3">
                      <label className="text-sm font-medium">Weekly Performance</label>
                      <div className="flex items-end gap-1 h-16 mt-1">
                        {episode.weeklyViews.slice(0, 8).map((views, weekIndex) => {
                          const height = (views / Math.max(...episode.weeklyViews)) * 100;
                          return (
                            <div 
                              key={weekIndex}
                              className="bg-primary flex-1 rounded-t"
                              style={{ height: `${height}%` }}
                              title={`Week ${weekIndex + 1}: ${(views / 1000000).toFixed(1)}M views`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};