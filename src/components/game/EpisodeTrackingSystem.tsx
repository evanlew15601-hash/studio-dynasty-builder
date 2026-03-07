import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { EpisodeData, SeasonData } from '@/types/streamingTypes';
import { Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Play, Users, Calendar, BarChart3, Star, Edit, Settings } from 'lucide-react';
import { TVRatingsSystem } from './TVRatingsSystem';

export const EpisodeTrackingSystem: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const updateProject = useGameStore((s) => s.updateProject);
  const { toast } = useToast();
  const [selectedSeason] = useState<number>(1);

  

  // Get TV projects - both released AND those in marketing/release phase ready to set up episodes
  const getTVProjects = () => {
    return (gameState?.projects ?? []).filter(p => 
      (p.type === 'series' || p.type === 'limited-series') &&
      (p.status === 'released' || p.currentPhase === 'marketing' || p.currentPhase === 'release' || p.status === 'ready-for-release')
    );
  };
  
  // Get TV projects ready for episode setup (not yet released)
  const getPreReleaseProjects = () => {
    return (gameState?.projects ?? []).filter(p =>
      (p.type === 'series' || p.type === 'limited-series') &&
      p.status !== 'released' &&
      (p.currentPhase === 'marketing' || p.currentPhase === 'release' || p.status === 'ready-for-marketing' || p.status === 'ready-for-release')
    );
  };

  // Initialize season data for a project
  const initializeSeasonData = (project: Project, episodeCount?: number): SeasonData => {
    const numEpisodes =
      episodeCount ||
      project.episodeCount ||
      project.seasons?.[0]?.totalEpisodes ||
      (project.type === 'limited-series' ? 8 : 13);
    
    const episodes: EpisodeData[] = Array.from({ length: numEpisodes }, (_, i) => ({
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
      productionCost: (project.budget.total || 0) / numEpisodes,
      socialMentions: 0
    }));

    return {
      seasonNumber: 1,
      totalEpisodes: numEpisodes,
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

  // Update episode details before release
  const updateEpisode = (project: Project, episodeIndex: number, updates: Partial<EpisodeData>) => {
    if (!project.seasons || project.seasons.length === 0) return;
    
    const updatedSeasons = [...project.seasons];
    const season = updatedSeasons[0];
    if (!season || episodeIndex >= season.episodes.length) return;
    
    season.episodes[episodeIndex] = { ...season.episodes[episodeIndex], ...updates };
    
    updateProject(project.id, { seasons: updatedSeasons });
    toast({ title: "Episode Updated", description: `Episode ${episodeIndex + 1} details saved.` });
  };

  // Release episodes based on format
  const releaseEpisodes = (project: Project, format: 'weekly' | 'binge' | 'batch') => {
    if (!gameState) return;

    // Get fresh project data to avoid stale state
    const sourceProject = gameState.projects.find(p => p.id === project.id) || project;

    const seasons: SeasonData[] = (sourceProject.seasons && sourceProject.seasons.length > 0)
      ? sourceProject.seasons.map(s => ({
          ...s,
          episodes: s.episodes.map(e => ({ ...e }))
        }))
      : [initializeSeasonData(sourceProject)];

    const currentSeason = seasons[selectedSeason - 1];
    if (!currentSeason) return;
    
    // Check if all episodes already aired
    if (currentSeason.episodesAired >= currentSeason.totalEpisodes) {
      console.log(`${sourceProject.title}: All ${currentSeason.totalEpisodes} episodes already aired`);
      return;
    }

    let episodesToRelease: number;
    switch (format) {
      case 'binge':
        episodesToRelease = currentSeason.totalEpisodes - currentSeason.episodesAired;
        break;
      case 'batch':
        episodesToRelease = Math.min(3, currentSeason.totalEpisodes - currentSeason.episodesAired);
        break;
      case 'weekly':
      default:
        episodesToRelease = 1;
        break;
    }

    console.log(`Releasing ${episodesToRelease} episode(s) for ${sourceProject.title} (${currentSeason.episodesAired}/${currentSeason.totalEpisodes} aired)`);

    const startEpisode = currentSeason.episodesAired;
    const endEpisode = Math.min(startEpisode + episodesToRelease, currentSeason.totalEpisodes);

    const currentAbs = gameState.currentYear * 52 + gameState.currentWeek;

    // Determine premiere date: respect scheduled calendar release if present
    let premiereWeek = sourceProject.releaseWeek;
    let premiereYear = sourceProject.releaseYear;
    const hasScheduledPremiere = sourceProject.scheduledReleaseWeek && sourceProject.scheduledReleaseYear;

    const targetPremiereWeek = hasScheduledPremiere ? sourceProject.scheduledReleaseWeek! : premiereWeek;
    const targetPremiereYear = hasScheduledPremiere ? sourceProject.scheduledReleaseYear! : premiereYear;

    if (targetPremiereWeek && targetPremiereYear) {
      const premiereAbs = targetPremiereYear * 52 + targetPremiereWeek;

      if (currentAbs < premiereAbs) {
        toast({
          title: "Show Not Yet Premiered",
          description: `Episodes can be released after the premiere in Week ${targetPremiereWeek}, ${targetPremiereYear}.`,
          variant: "destructive"
        });
        return;
      }

      premiereWeek = targetPremiereWeek;
      premiereYear = targetPremiereYear;
    } else {
      // No schedule set – treat first episode release as the premiere date
      premiereWeek = gameState.currentWeek;
      premiereYear = gameState.currentYear;
    }

    // Process initial ratings for new episodes using the canonical premiere date.
    // Only initialize TV ratings once per series to avoid resetting streaming metrics
    // when additional episodes are released later.
    const baseProject = {
      ...sourceProject,
      seasons,
      releaseFormat: format
    };

    const hasStreamingMetrics = !!baseProject.metrics?.streaming;
    const hasReleaseDate = !!baseProject.releaseWeek && !!baseProject.releaseYear;
    const isReleased = baseProject.status === 'released';

    const shouldInitializeNow = !hasStreamingMetrics || !hasReleaseDate || !isReleased;

    const updatedProject = shouldInitializeNow
      ? TVRatingsSystem.initializeAiring(
          baseProject,
          premiereWeek!,
          premiereYear!
        )
      : baseProject;

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

    updateProject(sourceProject.id, {
      ...updatedProject,
      seasons,
      releaseFormat: format,
      status: 'released' // Ensure it's marked as released
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

  // Pre-release: make sure episode/season data exists without triggering state updates during render.
  useEffect(() => {
    if (!gameState) return;

    const preRelease = getPreReleaseProjects();
    preRelease.forEach(project => {
      if (!project.seasons || project.seasons.length === 0) {
        const seasonData = initializeSeasonData(project);
        updateProject(project.id, { seasons: [seasonData] });
      }
    });
  }, [gameState, updateProject]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading episode tracking...</div>;
  }

  const tvProjects = getTVProjects();
  const preReleaseProjects = getPreReleaseProjects();

  return (
    <div className="space-y-6">
      {/* Pre-Release Episode Setup */}
      {preReleaseProjects.length > 0 && (
        <Card className="border-2 border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Episode Setup (Pre-Release)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure episode titles and details before your show airs. Once released, you can manage episode releases.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {preReleaseProjects.map(project => {
                const currentSeason = project.seasons?.[0];
                const isStreamingPrimary = project.distributionStrategy?.primary?.type === 'streaming';
                
                return (
                  <Card key={project.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{project.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {project.script?.genre} • {currentSeason?.totalEpisodes || 10} episodes
                          </p>
                        </div>
                        <Badge variant="outline">Setup</Badge>
                      </div>
                      
                      {currentSeason && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            {currentSeason.episodes.slice(0, 3).map((ep, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Ep {ep.episodeNumber}:</span>
                                <Input 
                                  value={ep.title}
                                  onChange={(e) => updateEpisode(project, idx, { title: e.target.value })}
                                  className="h-7 text-sm"
                                  placeholder={`Episode ${idx + 1}`}
                                />
                              </div>
                            ))}
                            {currentSeason.episodes.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{currentSeason.episodes.length - 3} more episodes...
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Season Release Format</Label>
                            <Select
                              value={currentSeason.releaseFormat}
                              onValueChange={(value: any) => {
                                if (!project.seasons || project.seasons.length === 0) return;
                                const seasons = [...project.seasons];
                                seasons[0] = { ...seasons[0], releaseFormat: value };
                                updateProject(project.id, { seasons, releaseFormat: value });
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly (1 episode)</SelectItem>
                                <SelectItem value="batch">Batch (3 episodes)</SelectItem>
                                <SelectItem value="binge" disabled={!isStreamingPrimary}>
                                  Binge (Full season){!isStreamingPrimary ? ' – streaming only' : ''}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              This choice applies to this season when it premieres.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mt-3">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit All Episodes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{project.title} - Episode Setup</DialogTitle>
                          </DialogHeader>
                          <EpisodeSetupPanel 
                            project={project} 
                            onUpdateEpisode={(idx, updates) => updateEpisode(project, idx, updates)}
                          />
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Released TV Projects - Episode Tracking */}
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
              No TV shows available for episode tracking. Complete marketing and set a release date for your TV series.
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
                              className="flex-1"
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
                              onUpdateEpisode={(idx, updates) => updateEpisode(project, idx, updates)}
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

// Episode Setup Panel for pre-release editing - FULL customization
interface EpisodeSetupPanelProps {
  project: Project;
  onUpdateEpisode: (episodeIndex: number, updates: Partial<EpisodeData>) => void;
}

const EpisodeSetupPanel: React.FC<EpisodeSetupPanelProps> = ({ project, onUpdateEpisode }) => {
  const currentSeason = project.seasons?.[0];
  if (!currentSeason) return <p>No season data available.</p>;
  
  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted/30 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>Customize your episodes before release.</strong> Set titles, runtime, descriptions, and assign directors/writers for each episode.
        </p>
      </div>
      <div className="grid gap-4">
        {currentSeason.episodes.map((episode, index) => (
          <Card key={index} className="p-4 border-l-4 border-l-primary/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Episode {episode.episodeNumber}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ${(episode.productionCost / 1000000).toFixed(1)}M budget
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs mb-1">Episode Title</Label>
                  <Input 
                    value={episode.title}
                    onChange={(e) => onUpdateEpisode(index, { title: e.target.value })}
                    placeholder={`Episode ${index + 1} Title`}
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Runtime (minutes)</Label>
                  <Input 
                    type="number"
                    value={episode.runtime}
                    onChange={(e) => onUpdateEpisode(index, { runtime: parseInt(e.target.value) || 45 })}
                    min={15}
                    max={120}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Director</Label>
                  <Input 
                    value={episode.director || ''}
                    onChange={(e) => onUpdateEpisode(index, { director: e.target.value })}
                    placeholder="Episode Director"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Writer</Label>
                  <Input 
                    value={episode.writer || ''}
                    onChange={(e) => onUpdateEpisode(index, { writer: e.target.value })}
                    placeholder="Episode Writer"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Guest Stars (comma-separated)</Label>
                  <Input 
                    value={episode.guestStars?.join(', ') || ''}
                    onChange={(e) => onUpdateEpisode(index, { 
                      guestStars: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Guest actors"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Episode Management Modal Component
interface EpisodeManagementModalProps {
  project: Project;
  onRelease: (format: 'weekly' | 'binge' | 'batch') => void;
  onUpdateEpisode?: (episodeIndex: number, updates: Partial<EpisodeData>) => void;
}

const EpisodeManagementModal: React.FC<EpisodeManagementModalProps> = ({
  project,
  onRelease,
  onUpdateEpisode
}) => {
  const currentSeason = project.seasons?.[0] || {
    seasonNumber: 1,
    totalEpisodes: 10,
    episodesAired: 0,
    episodes: []
  };

  const [releaseFormat, setReleaseFormat] = useState<'weekly' | 'binge' | 'batch'>(
    (currentSeason as any).releaseFormat || project.releaseFormat || 'weekly'
  );

  const canRelease = currentSeason.episodesAired < currentSeason.totalEpisodes;
  const isStreamingPrimary = project.distributionStrategy?.primary?.type === 'streaming';

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
                    <SelectItem value="binge" disabled={!isStreamingPrimary}>
                      Binge (Full season){!isStreamingPrimary ? ' – streaming only' : ''}
                    </SelectItem>
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
                  className={`p-4 border rounded-lg ${!isAired ? 'bg-muted/30 border-dashed' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {/* Editable title for unreleased episodes */}
                      {!isAired && onUpdateEpisode ? (
                        <div className="space-y-2">
                          <Input
                            value={episode.title}
                            onChange={(e) => onUpdateEpisode(index, { title: e.target.value })}
                            className="font-medium h-8"
                            placeholder={`Episode ${episode.episodeNumber} Title`}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Runtime</Label>
                              <Input
                                type="number"
                                value={episode.runtime}
                                onChange={(e) => onUpdateEpisode(index, { runtime: parseInt(e.target.value) || 45 })}
                                className="h-7 text-xs"
                                min={15}
                                max={120}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Director</Label>
                              <Input
                                value={episode.director || ''}
                                onChange={(e) => onUpdateEpisode(index, { director: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="Director"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Writer</Label>
                              <Input
                                value={episode.writer || ''}
                                onChange={(e) => onUpdateEpisode(index, { writer: e.target.value })}
                                className="h-7 text-xs"
                                placeholder="Writer"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium">
                            Episode {episode.episodeNumber}: {episode.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {episode.runtime} minutes
                            {episode.director && <> • Dir: {episode.director}</>}
                            {episode.airDate && (
                              <> • Aired Week {episode.airDate.week}, {episode.airDate.year}</>
                            )}
                          </p>
                        </>
                      )}
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