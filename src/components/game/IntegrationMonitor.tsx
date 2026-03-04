import React, { useState, useEffect } from 'react';
import { GameState, Project, Studio } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameplayLoops } from './GameplayLoops';
import { FinancialEngine } from './FinancialEngine';
import { CalendarManager } from './CalendarManager';
import { DeepReputationSystem } from './DeepReputationSystem';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Star,
  Film,
  Play
} from 'lucide-react';

interface TimeState {
  week: number;
  year: number;
}

interface IntegrationMonitorProps {
  gameState: GameState;
  onRunLoop?: (projectId: string) => void;
}

export const IntegrationMonitor: React.FC<IntegrationMonitorProps> = ({ 
  gameState, 
  onRunLoop 
}) => {
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loopResults, setLoopResults] = useState<Record<string, any>>({});

  const calendarTime = {
    currentWeek: gameState.currentWeek,
    currentYear: gameState.currentYear,
    currentQuarter: Math.ceil(gameState.currentWeek / 13)
  };
  const upcomingCalendarEvents = CalendarManager.getUpcomingEvents(calendarTime, gameState.projects, 12);
  
  useEffect(() => {
    // Run integration verification on mount and when gameState changes
    const verification = GameplayLoops.verifySystemIntegration(
      gameState.projects,
      [gameState.studio, ...gameState.competitorStudios],
      { week: gameState.currentWeek, year: gameState.currentYear }
    );
    setIntegrationStatus(verification);
  }, [gameState]);
  
  const runProjectLoop = (project: Project) => {
    const studio = gameState.competitorStudios.find(s => s.id === (project as any).studioId) || gameState.studio;
    const result = GameplayLoops.processFilmProductionLoop(
      project,
      studio,
      { week: gameState.currentWeek, year: gameState.currentYear }
    );
    
    setLoopResults(prev => ({
      ...prev,
      [project.id]: result
    }));
    
    console.log(`LOOP RESULT for ${project.title}:`, result);
    
    if (onRunLoop) {
      onRunLoop(project.id);
    }
  };
  
  const runStudioLoop = (studio: Studio) => {
    const studioProjects = gameState.projects.filter(p => 
      (p as any).studioId === studio.id || (studio.id === gameState.studio.id && !(p as any).studioId)
    );
    
    const result = GameplayLoops.processStudioManagementLoop(
      studio,
      studioProjects,
      { week: gameState.currentWeek, year: gameState.currentYear }
    );
    
    setLoopResults(prev => ({
      ...prev,
      [`studio-${studio.id}`]: result
    }));
    
    console.log(`STUDIO LOOP RESULT for ${studio.name}:`, result);
  };
  
  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) return <CheckCircle className="text-green-600" size={16} />;
    if (status === false) return <XCircle className="text-red-600" size={16} />;
    return <AlertTriangle className="text-yellow-600" size={16} />;
  };
  
  const getStatusBadge = (success: boolean, hasWarnings: boolean = false) => {
    if (success && !hasWarnings) return <Badge variant="default">Success</Badge>;
    if (success && hasWarnings) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="destructive">Error</Badge>;
  };
  
  return (
    <div className="space-y-6">
      {/* Integration Health Overview */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center font-studio text-primary">
            <Activity className="mr-2" size={20} />
            System Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {integrationStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                {getStatusIcon(integrationStatus.financial)}
                <div className="text-sm font-medium mt-1">Financial</div>
              </div>
              <div className="text-center">
                {getStatusIcon(integrationStatus.calendar)}
                <div className="text-sm font-medium mt-1">Calendar</div>
              </div>
              <div className="text-center">
                {getStatusIcon(integrationStatus.reputation)}
                <div className="text-sm font-medium mt-1">Reputation</div>
              </div>
              <div className="text-center">
                {getStatusIcon(integrationStatus.release)}
                <div className="text-sm font-medium mt-1">Release</div>
              </div>
              <div className="text-center">
                {getStatusIcon(integrationStatus.production)}
                <div className="text-sm font-medium mt-1">Production</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">Running verification...</div>
          )}
          
          {integrationStatus && (integrationStatus.errors.length > 0 || integrationStatus.warnings.length > 0) && (
            <div className="mt-4 space-y-2">
              {integrationStatus.errors.map((error: string, index: number) => (
                <Alert key={`error-${index}`} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              {integrationStatus.warnings.map((warning: string, index: number) => (
                <Alert key={`warning-${index}`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="projects">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">Project Loops</TabsTrigger>
          <TabsTrigger value="studio">Studio Loop</TabsTrigger>
          <TabsTrigger value="systems">System Monitor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center font-studio text-primary">
                <Film className="mr-2" size={20} />
                Film Production Loops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameState.projects.map(project => {
                  const loopResult = loopResults[project.id];
                  const progressPhases = ['development', 'pre-production', 'production', 'post-production', 'completed', 'ready-for-release', 'released'];
                  const normalizedStatus =
                    project.status === 'filming'
                      ? 'production'
                      : project.status === 'ready-for-marketing'
                        ? 'completed'
                        : project.status === 'scheduled-for-release'
                          ? 'ready-for-release'
                          : project.status;
                  const currentPhaseIndex = progressPhases.indexOf(normalizedStatus as any);
                  const progress = currentPhaseIndex >= 0 ? ((currentPhaseIndex + 1) / progressPhases.length) * 100 : 0;
                  
                  return (
                    <div key={project.id} className="p-4 border border-border/50 rounded-lg bg-card/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{project.title}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{project.status.replace('-', ' ')}</p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => runProjectLoop(project)}
                          className="flex items-center gap-1"
                        >
                          <Play size={12} />
                          Run Loop
                        </Button>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      
                      {loopResult && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Loop Status:</span>
                            {getStatusBadge(loopResult.success, loopResult.warnings?.length > 0)}
                          </div>
                          
                          <div className="text-sm">
                            <span className="text-muted-foreground">Next Action:</span>{' '}
                            <span className="font-medium">{loopResult.nextAction}</span>
                          </div>
                          
                          {loopResult.errors?.length > 0 && (
                            <div className="text-xs text-red-600">
                              Errors: {loopResult.errors.join(', ')}
                            </div>
                          )}
                          
                          {loopResult.warnings?.length > 0 && (
                            <div className="text-xs text-yellow-600">
                              Warnings: {loopResult.warnings.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="studio" className="space-y-4">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center font-studio text-primary">
                <TrendingUp className="mr-2" size={20} />
                Studio Management Loop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[gameState.studio, ...gameState.competitorStudios].map(studio => {
                  const loopResult = loopResults[`studio-${studio.id}`];
                  
                  return (
                    <div key={studio.id} className="p-4 border border-border/50 rounded-lg bg-card/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{studio.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Reputation: {studio.reputation || 'N/A'}
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => runStudioLoop(studio)}
                          className="flex items-center gap-1"
                        >
                          <Play size={12} />
                          Run Loop
                        </Button>
                      </div>
                      
                      {loopResult && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Status:</span>
                            {getStatusBadge(loopResult.success, loopResult.warnings?.length > 0)}
                          </div>
                          
                          {loopResult.metrics?.portfolio && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Active:</span>{' '}
                                {loopResult.metrics.portfolio.activeProjects}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Released:</span>{' '}
                                {loopResult.metrics.portfolio.releasedProjects}
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Success Rate:</span>{' '}
                                {(loopResult.metrics.portfolio.successRate * 100).toFixed(0)}%
                              </div>
                            </div>
                          )}
                          
                          {loopResult.warnings?.length > 0 && (
                            <div className="text-xs text-yellow-600">
                              {loopResult.warnings.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="systems" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <DollarSign className="mr-1" size={16} />
                  Financial Engine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1">
                  <div>Transactions: {FinancialEngine.getRecentTransactions(100).length}</div>
                  <div>Week Revenue: ${(FinancialEngine.getWeeklyFinancials(gameState.currentWeek, gameState.currentYear).totalRevenue / 1000).toFixed(0)}k</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Calendar className="mr-1" size={16} />
                  Calendar System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1">
                  <div>Current: Y{gameState.currentYear}W{gameState.currentWeek}</div>
                  <div>Upcoming events: {upcomingCalendarEvents.length}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Star className="mr-1" size={16} />
                  Reputation System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1">
                  <div>Studio Rep: {gameState.studio.reputation || 'N/A'}</div>
                  <div>Factors: 5</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Film className="mr-1" size={16} />
                  Production System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1">
                  <div>Active: {gameState.projects.filter(p => ['development', 'pre-production', 'production', 'post-production'].includes(p.status)).length}</div>
                  <div>Released: {gameState.projects.filter(p => p.status === 'released').length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
