import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIStudioManager, AIFilmProject, TalentCommitment } from './AIStudioManager';
import { AIStudioIntegrationTests } from './AIStudioIntegrationTests';
import { Building, Film, Users, TrendingUp, Play, TestTube } from 'lucide-react';
import { useGameStore } from '@/game/store';
import { isDebugUiEnabled } from '@/utils/debugFlags';

export const CompetitorMonitor: React.FC = () => {
  const [aiFilms, setAIFilms] = useState<AIFilmProject[]>([]);
  const [commitments, setCommitments] = useState<TalentCommitment[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [resetAiConfirmOpen, setResetAiConfirmOpen] = useState(false);

  const game = useGameStore((s) => s.game);

  const competitorStudios = game?.competitorStudios ?? [];
  const currentWeek = game?.currentWeek ?? 0;
  const currentYear = game?.currentYear ?? 0;
  const currentAbsWeek = (currentYear * 52) + currentWeek;

  useEffect(() => {
    // Refresh AI data
    setAIFilms(AIStudioManager.getAllAIFilms());
    setCommitments(AIStudioManager.getAllCommitments());
  }, [currentWeek, currentYear]);

  const debugUiEnabled = isDebugUiEnabled();
  const simplifiedUi = !debugUiEnabled;

  // Auto-run tests once on mount to surface issues early (debug only)
  useEffect(() => {
    if (!debugUiEnabled) return;
    const results = AIStudioIntegrationTests.runAllTests();
    setTestResults(results);
  }, [debugUiEnabled]);

  const getStudioAIFilms = (studioId: string) => {
    return aiFilms.filter(f => f.studioId === studioId);
  };

  const getActiveCommitments = () => {
    return commitments.filter(c =>
      currentAbsWeek >= c.startAbsWeek &&
      currentAbsWeek <= c.endAbsWeek
    );
  };

  const runIntegrationTests = () => {
    const results = AIStudioIntegrationTests.runAllTests();
    setTestResults(results);
  };

  const absWeek = (y: number, w: number) => (y * 52) + w;

  const upcomingFilms = aiFilms
    .filter(f => f.status !== 'released')
    .slice()
    .sort((a, b) => absWeek(a.timeline.expectedReleaseYear, a.timeline.expectedReleaseWeek) - absWeek(b.timeline.expectedReleaseYear, b.timeline.expectedReleaseWeek));

  const recentFilms = aiFilms
    .filter(f => f.status === 'released')
    .slice()
    .sort((a, b) => absWeek(b.timeline.expectedReleaseYear, b.timeline.expectedReleaseWeek) - absWeek(a.timeline.expectedReleaseYear, a.timeline.expectedReleaseWeek));

  if (!game) {
    return <div className="p-6 text-sm text-muted-foreground">Loading competitor data...</div>;
  }

  return (
    <>
      {debugUiEnabled && (
        <AlertDialog open={resetAiConfirmOpen} onOpenChange={setResetAiConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset AI system?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears AI studios, films, and talent commitments for this session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setResetAiConfirmOpen(false);
                  AIStudioManager.resetAISystem();
                  setAIFilms([]);
                  setCommitments([]);
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="space-y-6">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2" size={20} />
            Competition
          </CardTitle>
        </CardHeader>
        <CardContent>
          {simplifiedUi ? (
            <div className="text-sm text-muted-foreground">
              Competitor studios develop projects in the background. This panel highlights notable releases and booked talent.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {aiFilms.filter(f => f.status !== 'released').length}
                </div>
                <div className="text-sm text-muted-foreground">Active AI Films</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {aiFilms.filter(f => f.status === 'released').length}
                </div>
                <div className="text-sm text-muted-foreground">Released AI Films</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {getActiveCommitments().length}
                </div>
                <div className="text-sm text-muted-foreground">Busy Actors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {aiFilms.filter(f =>
                    f.timeline.expectedReleaseWeek <= currentWeek + 4 &&
                    f.timeline.expectedReleaseYear === currentYear &&
                    f.status !== 'released'
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">Releasing Soon</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="studios">
        <TabsList className={`grid w-full ${debugUiEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="studios">Studios</TabsTrigger>
          <TabsTrigger value="films">{simplifiedUi ? 'Releases' : 'AI Films'}</TabsTrigger>
          <TabsTrigger value="talent">{simplifiedUi ? 'Booked Talent' : 'Talent Activity'}</TabsTrigger>
          {debugUiEnabled && <TabsTrigger value="testing">System Tests</TabsTrigger>}
        </TabsList>

        <TabsContent value="studios" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2" size={20} />
                Competitor Studios Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitorStudios.map(studio => {
                  const studioFilms = getStudioAIFilms(studio.id);
                  const activeFilms = studioFilms.filter(f => f.status !== 'released');
                  const releasedFilms = studioFilms.filter(f => f.status === 'released');
                  
                  return (
                    <Card key={studio.id} className="bg-card/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{studio.name}</h3>
                            <div className="text-sm text-muted-foreground">
                              Reputation: {Math.round(studio.reputation)}/100
                            </div>
                            {studio.personality && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {studio.personality}
                              </div>
                            )}
                            {studio.biography && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {studio.biography.length > 180 ? studio.biography.slice(0, 180) + '…' : studio.biography}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">
                            {activeFilms.length > 0 ? 'Active slate' : 'Quiet'}
                          </Badge>
                        </div>

                        {simplifiedUi ? (() => {
                          const absWeek = (y: number, w: number) => (y * 52) + w;

                          const latest = releasedFilms
                            .slice()
                            .sort((a, b) => absWeek(b.timeline.expectedReleaseYear, b.timeline.expectedReleaseWeek) - absWeek(a.timeline.expectedReleaseYear, a.timeline.expectedReleaseWeek))[0];

                          const nextUp = activeFilms
                            .slice()
                            .sort((a, b) => absWeek(a.timeline.expectedReleaseYear, a.timeline.expectedReleaseWeek) - absWeek(b.timeline.expectedReleaseYear, b.timeline.expectedReleaseWeek))[0];

                          return (
                            <div className="space-y-2 text-sm">
                              {latest && (
                                <div className="text-muted-foreground">
                                  Latest: <span className="text-foreground">{latest.title}</span>
                                  {latest.performance?.criticsScore ? ` • Critics ${latest.performance.criticsScore}/100` : ''}
                                </div>
                              )}
                              {nextUp && (
                                <div className="text-muted-foreground">
                                  In production: <span className="text-foreground">{nextUp.title}</span> • ETA Y{nextUp.timeline.expectedReleaseYear}W{nextUp.timeline.expectedReleaseWeek}
                                </div>
                              )}
                              {!latest && !nextUp && (
                                <div className="text-xs text-muted-foreground">No notable activity.</div>
                              )}
                            </div>
                          );
                        })() : (
                          <>
                            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                              <div className="text-center">
                                <div className="font-semibold text-blue-700 dark:text-blue-400">
                                  {activeFilms.length}
                                </div>
                                <div className="text-muted-foreground text-xs">In Prod</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-green-700 dark:text-green-400">
                                  {releasedFilms.length}
                                </div>
                                <div className="text-muted-foreground text-xs">Released</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-primary">
                                  ${releasedFilms.reduce((sum, f) => 
                                    sum + (f.performance?.boxOffice || 0), 0
                                  ).toFixed(0)}M
                                </div>
                                <div className="text-muted-foreground text-xs">Box Office</div>
                              </div>
                            </div>

                            {activeFilms.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Current Projects:
                                </div>
                                {activeFilms.slice(0, 2).map(film => (
                                  <div key={film.id} className="text-xs p-1 bg-muted/30 rounded mb-1">
                                    <div className="font-medium">{film.title}</div>
                                    <div className="text-muted-foreground">
                                      {film.script.genre} • {film.status}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="films" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Film className="mr-2" size={20} />
                {simplifiedUi ? 'Competitor Releases' : 'AI Films Pipeline'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {simplifiedUi ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Upcoming</div>
                    {upcomingFilms.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No upcoming releases tracked yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {upcomingFilms.slice(0, 12).map((film) => (
                          <div key={film.id} className="flex items-start justify-between rounded-md border bg-card/50 p-3">
                            <div>
                              <div className="font-medium text-sm">{film.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {film.studioName} • {film.script.genre}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              ETA Y{film.timeline.expectedReleaseYear}W{film.timeline.expectedReleaseWeek}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Recent</div>
                    {recentFilms.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No releases yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {recentFilms.slice(0, 12).map((film) => (
                          <div key={film.id} className="flex items-start justify-between rounded-md border bg-card/50 p-3">
                            <div>
                              <div className="font-medium text-sm">{film.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {film.studioName} • {film.script.genre}
                              </div>
                              {film.performance && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Critics {film.performance.criticsScore}/100 • BO ${(film.performance.boxOffice / 1000000).toFixed(0)}M
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Released
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {aiFilms.map(film => (
                      <Card key={film.id} className="bg-card/50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{film.title}</h4>
                              <div className="text-sm text-muted-foreground">
                                {film.studioName} • {film.script.genre}
                              </div>
                            </div>
                            <Badge variant={
                              film.status === 'released' ? 'default' :
                              film.status === 'production' ? 'secondary' :
                              'outline'
                            }>
                              {film.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-muted-foreground">Budget:</span>{' '}
                              ${(film.budget.production / 1000000).toFixed(0)}M
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cast:</span>{' '}
                              {film.cast.length} roles
                            </div>
                            <div>
                              <span className="text-muted-foreground">Release:</span>{' '}
                              Y{film.timeline.expectedReleaseYear}W{film.timeline.expectedReleaseWeek}
                            </div>
                          </div>

                          {film.performance && (
                            <div className="text-xs p-2 rounded border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-200">
                              <strong>Box Office:</strong> ${(film.performance.boxOffice / 1000000).toFixed(0)}M • 
                              <strong> Critics:</strong> {film.performance.criticsScore}/100
                            </div>
                          )}

                          {film.cast.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">Cast:</div>
                              <div className="flex flex-wrap gap-1">
                                {film.cast.slice(0, 3).map((cast, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {cast.talentName} ({cast.role})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {aiFilms.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Film className="mx-auto mb-4 opacity-50" size={48} />
                        <p>No AI films in production yet.</p>
                        <p className="text-sm">Films will be generated automatically as competitor studios become active.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="talent" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2" size={20} />
                {simplifiedUi ? 'Booked Talent' : 'Talent Commitments'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {getActiveCommitments().map(commitment => {
                    const film = aiFilms.find(f => f.id === commitment.filmId);
                    const weeksRemaining = Math.max(0, commitment.endAbsWeek - currentAbsWeek);
                    
                    return (
                      <Card key={commitment.talentId + commitment.filmId} className="bg-card/50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{commitment.talentName}</h4>
                              <div className="text-sm text-muted-foreground">
                                {commitment.role} in "{film?.title || 'Unknown Film'}"
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {simplifiedUi ? `${weeksRemaining}w` : `${weeksRemaining} weeks left`}
                            </Badge>
                          </div>

                          {simplifiedUi ? (
                            <div className="text-xs text-muted-foreground">
                              Studio: {commitment.studio}
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Studio:</span>{' '}
                                {commitment.studio}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pay:</span>{' '}
                                ${commitment.weeklyPay}k/week
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duration:</span>{' '}
                                {commitment.commitmentWeeks.length} weeks
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {getActiveCommitments().length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Users className="mx-auto mb-4 opacity-50" size={48} />
                      <p>No active talent commitments.</p>
                      <p className="text-sm">Booked talent will appear here when competitors are in production.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {debugUiEnabled && (
          <TabsContent value="testing" className="space-y-4">
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TestTube className="mr-2" size={20} />
                  AI Studio System Testing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Integration Tests</h3>
                      <p className="text-sm text-muted-foreground">
                        Verify AI Studio system functionality
                      </p>
                    </div>
                    <Button onClick={runIntegrationTests} className="flex items-center gap-2">
                      <Play size={16} />
                      Run Tests
                    </Button>
                  </div>

                  {testResults && (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Test Results</h4>
                        <Badge variant={testResults.success ? 'default' : 'destructive'}>
                          {testResults.passed}/{testResults.total} Passed
                        </Badge>
                      </div>

                      <div className="text-sm">
                        {testResults.success ? (
                          <div className="text-green-600">
                            All tests passed. AI Studio system is functioning correctly.
                          </div>
                        ) : (
                          <div className="text-red-600">
                            Some tests failed. Check console for details.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium mb-2">System Stats:</div>
                      <div className="space-y-1 text-muted-foreground">
                        <div>Total AI Films: {aiFilms.length}</div>
                        <div>Active Commitments: {getActiveCommitments().length}</div>
                        <div>Studios with Films: {new Set(aiFilms.map(f => f.studioId)).size}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-2">Quick Actions:</div>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log('AI Films:', AIStudioManager.getAllAIFilms());
                            console.log('Commitments:', AIStudioManager.getAllCommitments());
                          }}
                        >
                          Log System Data
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetAiConfirmOpen(true)}
                        >
                          Reset System
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </>
  );
};