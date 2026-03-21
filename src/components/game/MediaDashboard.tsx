import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaItem, MediaSource } from '@/types/game';
import { MediaEngine } from './MediaEngine';
import { MediaReputationIntegration } from './MediaReputationIntegration';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';
import { 
  Newspaper,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Star,
  
  Activity,
  Eye,
  BookOpen,
  Monitor,
  Tv,
  Smartphone,
  BarChart3
} from 'lucide-react';

interface MediaDashboardProps {
  onProcessEvents?: () => void;
  onNavigatePhase?: (phase: 'reputation' | 'awards') => void;
}

export const MediaDashboard: React.FC<MediaDashboardProps> = ({
  onProcessEvents,
  onNavigatePhase
}) => {
  const gameState = useGameStore((s) => s.game);
  const setPhase = useUiStore((s) => s.setPhase);
  const navigatePhase = onNavigatePhase ?? ((phase: 'reputation' | 'awards') => setPhase(phase));
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [mediaStats, setMediaStats] = useState<any>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'positive' | 'negative' | 'player'>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const updateMediaData = useCallback(() => {
    const media = MediaEngine.getRecentMedia(50);
    const stats = MediaEngine.getMediaStats();
    setRecentMedia(media);
    setMediaStats(stats);
  }, []);

  useEffect(() => {
    // Initialize media engine
    MediaEngine.initialize();

    // Load recent media and stats
    updateMediaData();
  }, [updateMediaData]);

  useEffect(() => {
    if (!gameState) return;
    updateMediaData();
  }, [gameState?.currentWeek, gameState?.currentYear, updateMediaData]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading media dashboard...</div>;
  }

  const studioMediaProfile = MediaReputationIntegration.calculateStudioReputationEffects(
    gameState.studio
  );

  const getFilteredMedia = () => {
    let filtered = recentMedia;

    // Filter by sentiment
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'player') {
        filtered = filtered.filter(item => 
          item.targets.studios?.includes(gameState.studio.id) ||
          item.targets.projects?.some(projectId => 
            gameState.projects.some(p => p.id === projectId)
          )
        );
      } else {
        filtered = filtered.filter(item => item.sentiment === selectedFilter);
      }
    }

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(item => item.source.id === selectedSource);
    }

    return filtered;
  };

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSourceTypeLabel = (type: MediaSource['type']) => {
    switch (type) {
      case 'newspaper':
        return 'Newspaper';
      case 'magazine':
        return 'Magazine';
      case 'blog':
        return 'Blog';
      case 'tv_network':
        return 'TV Network';
      case 'social_media':
        return 'Social';
      case 'trade_publication':
        return 'Trade';
      default:
        return 'Press';
    }
  };

  const getSourceTypeIcon = (type: MediaSource['type']) => {
    const className = "h-3.5 w-3.5 text-muted-foreground";

    switch (type) {
      case 'newspaper':
        return <Newspaper className={className} />;
      case 'magazine':
        return <BookOpen className={className} />;
      case 'blog':
        return <Monitor className={className} />;
      case 'tv_network':
        return <Tv className={className} />;
      case 'social_media':
        return <Smartphone className={className} />;
      case 'trade_publication':
        return <BarChart3 className={className} />;
      default:
        return <Newspaper className={className} />;
    }
  };

  const generateTestEvent = () => {
    if (!gameState) return;

    // Trigger a test media event
    if (gameState.projects.length > 0 && gameState.talent.length > 0) {
      const project = gameState.projects[0];
      const talent = gameState.talent[0];
      
      MediaEngine.triggerCastingAnnouncement(project, talent, gameState);
      
      // Process the event immediately
      MediaEngine.processMediaEvents(gameState);
      updateMediaData();
    }
  };

  const processQueuedEvents = useCallback(() => {
    updateMediaData();
    onProcessEvents?.();
  }, [onProcessEvents, updateMediaData]);

  const allSources = MediaEngine.getAllMediaSources();

  return (
    <div className="space-y-6">
      {/* Media Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stories</p>
                <p className="text-2xl font-bold">{mediaStats.totalItems || 0}</p>
              </div>
              <Newspaper className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Queued Events</p>
                <p className="text-2xl font-bold">{mediaStats.queuedEvents || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracked Entities</p>
                <p className="text-2xl font-bold">{mediaStats.entitiesTracked || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                <p className="text-2xl font-bold">{mediaStats.recentActivity || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Media-driven reputation snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Media Reputation Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Industry Reputation</p>
              <p className="font-semibold">
                {Math.round(studioMediaProfile.industryReputation)}/100
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Public Reputation</p>
              <p className="font-semibold">
                {Math.round(studioMediaProfile.publicReputation)}/100
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Investor Confidence</p>
              <p className="font-semibold">
                {Math.round(studioMediaProfile.investorConfidence)}/100
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Media Relations</p>
              <p className="font-semibold">
                {Math.round(studioMediaProfile.mediaRelations)}/100
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These scores are derived from recent coverage and are applied gradually on top of your
            core reputation each week.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigatePhase('reputation')}
            >
              Open Reputation Panel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigatePhase('awards')}
            >
              Awards & Campaigns
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Media Control Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={processQueuedEvents}>
              Refresh Media View
            </Button>
            {import.meta.env.DEV && (
              <Button variant="outline" onClick={generateTestEvent}>
                Generate Test Event
              </Button>
            )}
            <Button variant="outline" onClick={updateMediaData}>
              Refresh Data
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Filter by:</label>
              <div className="flex gap-2 mt-1">
                {['all', 'positive', 'negative', 'player'].map(filter => (
                  <Button
                    key={filter}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFilter(filter as any)}
                  >
                    {filter === 'player' ? 'My Studio' : filter}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Source:</label>
              <select 
                className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                <option value="all">All Sources</option>
                {allSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({getSourceTypeLabel(source.type)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Media Feed ({getFilteredMedia().length} stories)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {getFilteredMedia().map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getSentimentIcon(item.sentiment)}
                        <h3 className="font-semibold text-sm">{item.headline}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        {getSourceTypeIcon(item.source.type)}
                        {item.source.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Week {item.publishDate.week}, {item.publishDate.year}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {item.impact.reach}% reach
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {item.impact.credibility}% credible
                      </Badge>
                      <Badge 
                        variant={item.sentiment === 'positive' ? 'default' : 
                                item.sentiment === 'negative' ? 'destructive' : 'secondary'}
                      >
                        {item.sentiment}
                      </Badge>
                    </div>
                  </div>

                  {item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {getFilteredMedia().length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No media stories match your current filters.</p>
                  <p className="text-sm">Try generating some test events or changing your filters.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};