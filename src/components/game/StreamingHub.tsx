import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StreamingContractSystem } from './StreamingContractSystem';
import { StreamingAnalyticsDashboard } from './StreamingAnalyticsDashboard';
import { PostTheatricalManagement } from './PostTheatricalManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Film, Tv, TrendingUp } from 'lucide-react';
import { useGameStore } from '@/game/store';
import { useUiStore } from '@/game/uiStore';

export const StreamingHub: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  // Streaming originals: films that have releaseStrategy.type === 'streaming' or distributionStrategy.primary.type === 'streaming'
  const streamingOriginals = (gameState?.projects || []).filter(p => {
    const isStreamingFilm = p.releaseStrategy?.type === 'streaming';
    const isStreamingDistribution = p.distributionStrategy?.primary?.type === 'streaming';
    return isStreamingFilm || isStreamingDistribution;
  });

  const activeOriginals = streamingOriginals.filter(p => p.status !== 'released');
  const releasedOriginals = streamingOriginals.filter(p => p.status === 'released');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Streaming Hub
        </h2>
        <p className="text-muted-foreground">
          Manage streaming contracts, originals slate, track performance, and manage secondary distribution windows.
        </p>
      </div>

      <Tabs defaultValue="originals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="originals">Originals Slate</TabsTrigger>
          <TabsTrigger value="post">Secondary Windows</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="originals">
          <div className="space-y-6">
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Commission Streaming Originals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create original films for direct-to-streaming premiere. Start a new script in Script Development,
                  then choose &ldquo;Direct-to-Streaming&rdquo; as the release strategy to sign a premiere deal with a streaming provider.
                </p>
                <div className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3 space-y-1">
                  <p className="font-medium text-foreground">How to commission a streaming original:</p>
                  <p>1. Go to <strong>Script Development</strong> and create a new script with a title and logline.</p>
                  <p>2. Advance the script to Final stage, then <strong>Greenlight</strong> it.</p>
                  <p>3. Assign a <strong>Director</strong> and <strong>Lead Actor</strong> in Casting.</p>
                  <p>4. When ready, open <strong>Plan Release</strong> and select <strong>Direct-to-Streaming</strong>.</p>
                  <p>5. Sign a <strong>Streaming Premiere Deal</strong> with your preferred provider.</p>
                </div>
              </CardContent>
            </Card>

            {/* Active originals in pipeline */}
            {activeOriginals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">In Development</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeOriginals.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                        <div>
                          <div className="text-sm font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.script?.genre} • {p.currentPhase} • {p.script?.logline ? p.script.logline.slice(0, 60) + (p.script.logline.length > 60 ? '…' : '') : 'No logline'}
                          </div>
                          {(p.script?.characters || []).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Cast: {(p.script?.characters || []).filter(c => c.assignedTalentId).length}/{(p.script?.characters || []).length} roles filled
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Released originals */}
            {releasedOriginals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Released Originals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {releasedOriginals.map(p => {
                      const views = p.metrics?.streaming?.totalViews ?? p.metrics?.streamingViews ?? 0;
                      const perfScore = p.streamingContract?.performanceScore ?? 0;
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
                          <div>
                            <div className="text-sm font-medium">{p.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.script?.genre} • {views > 0 ? `${(views / 1_000_000).toFixed(1)}M views` : 'No data'}
                              {p.script?.logline ? ` • ${p.script.logline.slice(0, 40)}…` : ''}
                            </div>
                            {(p.script?.characters || []).length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Cast: {(p.script?.characters || []).filter(c => c.assignedTalentId).length} roles
                              </div>
                            )}
                          </div>
                          <Badge variant={perfScore >= 80 ? 'default' : perfScore >= 50 ? 'secondary' : 'outline'}>
                            {perfScore > 0 ? `Score: ${perfScore}` : 'Pending'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {streamingOriginals.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No streaming originals yet. Create a script and choose Direct-to-Streaming release to get started.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="post">
          <PostTheatricalManagement />
        </TabsContent>

        <TabsContent value="contracts">
          <StreamingContractSystem />
        </TabsContent>

        <TabsContent value="analytics">
          <StreamingAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};