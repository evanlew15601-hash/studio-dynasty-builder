import React from 'react';
import { GameState, Studio, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StudioDashboardProps {
  gameState: GameState;
  onStudioUpdate: (updates: Partial<Studio>) => void;
  onProjectSelect: (project: Project | null) => void;
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({
  gameState,
  onStudioUpdate,
  onProjectSelect,
}) => {
  const activeProjects = gameState.projects.filter(p => p.status !== 'archived');
  const recentReleases = gameState.projects.filter(p => p.status === 'distribution').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Studio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/20 shadow-studio">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">💰</span>
              Financial Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Current Budget</span>
                  <span className="font-mono">${(gameState.studio.budget / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Projects Active</span>
                  <span className="font-mono">{activeProjects.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quarterly Revenue</span>
                  <span className="font-mono text-success">+$2.0M</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 shadow-golden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">⭐</span>
              Studio Reputation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Industry Standing</span>
                  <span className="font-mono">{gameState.studio.reputation}/100</span>
                </div>
                <Progress 
                  value={gameState.studio.reputation} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {gameState.studio.reputation >= 80 ? 'Prestigious' :
                   gameState.studio.reputation >= 60 ? 'Respected' :
                   gameState.studio.reputation >= 40 ? 'Emerging' : 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blockbuster/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">🎯</span>
              Studio Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Specialties</div>
                <div className="flex flex-wrap gap-1">
                  {gameState.studio.specialties.map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Founded</div>
                <div className="font-mono text-sm">{gameState.studio.founded}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🎬</span>
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">📽️</div>
              <p>No active projects</p>
              <p className="text-sm">Start by developing a script to begin your first production</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer border-border hover:border-primary/40 transition-colors"
                  onClick={() => onProjectSelect(project)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base truncate">{project.title}</CardTitle>
                    <Badge variant="outline" className="w-fit">
                      {project.currentPhase}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Genre:</span>
                        <span>{project.script.genre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-mono">${(project.budget.total / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="secondary" className="text-xs">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">📈</span>
              Trending Genres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gameState.marketConditions.trendingGenres.map((genre, index) => (
                <div key={genre} className="flex items-center justify-between">
                  <span className="text-sm">{genre}</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={90 - (index * 15)} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground w-8">
                      {index === 0 ? '🔥' : index === 1 ? '📈' : '📊'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">🌍</span>
              Market Climate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Economic Climate</span>
                <Badge 
                  variant={gameState.marketConditions.economicClimate === 'boom' ? 'default' : 
                          gameState.marketConditions.economicClimate === 'stable' ? 'secondary' : 'destructive'}
                >
                  {gameState.marketConditions.economicClimate}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Industry conditions are favorable for new productions.</p>
                <p>Audience appetite for quality content remains strong.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <span className="text-2xl">📝</span>
              <span className="text-sm">New Script</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <span className="text-2xl">🎭</span>
              <span className="text-sm">Scout Talent</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <span className="text-2xl">🏢</span>
              <span className="text-sm">Expand Studio</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <span className="text-2xl">📊</span>
              <span className="text-sm">Market Analysis</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};