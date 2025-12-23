import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, MediaItem } from '@/types/game';
import { MediaEngine } from './MediaEngine';
import { Activity, BarChart2, Clock, Eye, Newspaper, TrendingDown, TrendingUp } from 'lucide-react';

interface MediaAnalyticsPanelProps {
  gameState: GameState;
}

export const MediaAnalyticsPanel: React.FC<MediaAnalyticsPanelProps> = ({ gameState }) => {
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [mediaStats, setMediaStats] = useState<any>({});

  useEffect(() => {
    MediaEngine.initialize();
    updateMediaData();
  }, []);

  const updateMediaData = () => {
    const media = MediaEngine.getRecentMedia(100);
    const stats = MediaEngine.getMediaStats();
    setRecentMedia(media);
    setMediaStats(stats);
  };

  const sentimentCounts = recentMedia.reduce(
    (acc, item) => {
      acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 } as Record<'positive' | 'neutral' | 'negative', number>
  );

  const totalSentiment = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative || 1;

  const studioCoverage = recentMedia.filter(item =>
    item.targets.studios?.includes(gameState.studio.id) ||
    item.targets.projects?.some(projectId => gameState.projects.some(p => p.id === projectId))
  );

  const recentStudioStories = studioCoverage.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Stories</p>
              <p className="text-2xl font-bold">{mediaStats.totalItems || 0}</p>
            </div>
            <Newspaper className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Queued Events</p>
              <p className="text-2xl font-bold">{mediaStats.queuedEvents || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Studio Coverage</p>
              <p className="text-2xl font-bold">{studioCoverage.length}</p>
            </div>
            <Eye className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recent Activity</p>
              <p className="text-2xl font-bold">{mediaStats.recentActivity || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Sentiment Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Positive
                </span>
                <span className="font-semibold">{sentimentCounts.positive}</span>
              </div>
              <Progress
                value={(sentimentCounts.positive / totalSentiment) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Activity className="h-4 w-4 text-gray-600" />
                  Neutral
                </span>
                <span className="font-semibold">{sentimentCounts.neutral}</span>
              </div>
              <Progress
                value={(sentimentCounts.neutral / totalSentiment) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Negative
                </span>
                <span className="font-semibold">{sentimentCounts.negative}</span>
              </div>
              <Progress
                value={(sentimentCounts.negative / totalSentiment) * 100}
                className="h-2"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on the last {recentMedia.length} media stories tracked by the system.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Coverage of Your Studio</CardTitle>
        </CardHeader>
        <CardContent>
          {recentStudioStories.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No recent media stories directly referencing your studio or projects.
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {recentStudioStories.map(item => (
                  <div key={item.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{item.headline}</div>
                      <Badge
                        variant={
                          item.sentiment === 'positive'
                            ? 'default'
                            : item.sentiment === 'negative'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {item.sentiment}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {item.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {item.source.name} • Week {item.publishDate.week}, {item.publishDate.year}
                      </span>
                      <span>
                        Reach {item.impact.reach}% • Credibility {item.impact.credibility}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};