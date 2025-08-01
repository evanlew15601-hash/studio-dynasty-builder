import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIStudioManager, AIFilmProject, TalentCommitment } from './AIStudioManager';
import { AIStudioIntegrationTests } from './AIStudioIntegrationTests';
import { Building, Film, Users, TrendingUp, Play, TestTube } from 'lucide-react';

interface CompetitorMonitorProps {
  competitorStudios: any[];
  currentWeek: number;
  currentYear: number;
}

export const CompetitorMonitor: React.FC<CompetitorMonitorProps> = ({
  competitorStudios,
  currentWeek,
  currentYear
}) => {
  const [aiFilms, setAIFilms] = useState<AIFilmProject[]>([]);
  const [commitments, setCommitments] = useState<TalentCommitment[]>([]);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    // Refresh AI data
    setAIFilms(AIStudioManager.getAllAIFilms());
    setCommitments(AIStudioManager.getAllCommitments());
  }, [currentWeek, currentYear]);

  const getStudioAIFilms = (studioId: string) => {
    return aiFilms.filter(f => f.studioId === studioId);
  };

  const getActiveCommitments = () => {
    return commitments.filter(c => 
      c.year === currentYear && 
      currentWeek >= c.startWeek && 
      currentWeek <= c.endWeek
    );
  };

  const runIntegrationTests = () => {
    const results = AIStudioIntegrationTests.runAllTests();
    setTestResults(results);
  };

  return (
    <div className="space-y-6">
      {/* **CHECKPOINT 3**: System Overview */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2" size={20} />
            AI Studio Competition Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {aiFilms.filter(f => f.status !== 'released').length}
              </div>
              <div className="text-sm text-muted-foreground">Active AI Films</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
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
              <div className="text-2xl font-bold text-yellow-600">
                {aiFilms.filter(f => 
                  f.timeline.expectedReleaseWeek <= currentWeek + 4 && 
                  f.timeline.expectedReleaseYear === currentYear &&
                  f.status !== 'released'
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Releasing Soon</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="studios">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="studios">Studios</TabsTrigger>
          <TabsTrigger value="films">AI Films</TabsTrigger>
          <TabsTrigger value="talent">Talent Activity</TabsTrigger>
          <TabsTrigger value="testing">System Tests</TabsTrigger>
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
                              Reputation: {studio.reputation}/100
                            </div>
                          </div>
                          <Badge variant="outline">
                            {activeFilms.length} Active
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">
                              {activeFilms.length}
                            </div>
                            <div className="text-muted-foreground text-xs">In Prod</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">
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
                AI Films Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                            ${(film.budget.production / 1000000).toFixed(1)}M
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
                          <div className="text-xs p-2 bg-green-50 rounded">
                            <strong>Box Office:</strong> ${(film.performance.boxOffice / 1000000).toFixed(1)}M • 
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="talent" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2" size={20} />
                Talent Commitments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {getActiveCommitments().map(commitment => {
                    const film = aiFilms.find(f => f.id === commitment.filmId);
                    const weeksRemaining = commitment.endWeek - currentWeek;
                    
                    return (
                      <Card key={commitment.talentId + commitment.filmId} className="bg-card/50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{commitment.talentId}</h4>
                              <div className="text-sm text-muted-foreground">
                                {commitment.role} in "{film?.title || 'Unknown Film'}"
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {weeksRemaining} weeks left
                            </Badge>
                          </div>

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
                        </CardContent>
                      </Card>
                    );
                  })}

                  {getActiveCommitments().length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Users className="mx-auto mb-4 opacity-50" size={48} />
                      <p>No active talent commitments.</p>
                      <p className="text-sm">Actors will be automatically cast in AI films during production.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

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
                          ✅ All tests passed! AI Studio system is functioning correctly.
                        </div>
                      ) : (
                        <div className="text-red-600">
                          ❌ Some tests failed. Check console for details.
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
                        onClick={() => {
                          AIStudioManager.resetAISystem();
                          setAIFilms([]);
                          setCommitments([]);
                        }}
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
      </Tabs>
    </div>
  );
};