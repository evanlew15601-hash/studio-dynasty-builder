import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project, GameState } from '@/types/game';
import { 
  Film, 
  DollarSign, 
  Star, 
  Users, 
  Calendar, 
  Award,
  TrendingUp,
  Clock,
  User
} from 'lucide-react';

interface FilmStatsModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

export const FilmStatsModal: React.FC<FilmStatsModalProps> = ({
  project,
  isOpen,
  onClose,
  gameState
}) => {
  if (!project) return null;

  const formatCurrency = (amount: number) => {
    return `$${(amount / 1000000).toFixed(1)}M`;
  };

  const formatDate = (year?: number, week?: number) => {
    if (!year || !week) return 'TBA';
    return `Week ${week}, ${year}`;
  };

  const getGenreBadgeVariant = (genre: string) => {
    const variants: Record<string, any> = {
      'action': 'destructive',
      'comedy': 'secondary',
      'drama': 'outline',
      'horror': 'destructive',
      'romance': 'default',
      'sci-fi': 'default',
      'thriller': 'destructive'
    };
    return variants[genre] || 'outline';
  };

  const profitMargin = project.metrics?.boxOfficeTotal 
    ? ((project.metrics.boxOfficeTotal - project.budget.total) / project.budget.total) * 100
    : 0;

  const getCastInfo = () => {
    if (!project.script?.characters) return [];
    return project.script.characters
      .filter(char => char.assignedTalentId)
      .map(char => {
        const talent = gameState.talent.find(t => t.id === char.assignedTalentId);
        return {
          character: char,
          talent
        };
      });
  };

  const cast = getCastInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            {project.title} - Film Statistics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Genre</p>
                <Badge variant={getGenreBadgeVariant(project.script?.genre || 'drama')}>
                  {project.script?.genre || 'Unknown'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={project.status === 'released' ? 'default' : 'outline'}>
                  {project.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-semibold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(project.budget.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Release Date</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(project.releaseYear, project.releaseWeek)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          {project.metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Box Office Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(project.metrics.boxOfficeTotal || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(project.metrics.boxOfficeTotal || 0) > 0 
                        ? `${((project.metrics.boxOfficeTotal - project.budget.total) / project.budget.total * 100).toFixed(0)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Critics Score</span>
                      <span className="text-sm font-bold">{project.metrics.criticsScore || 0}/100</span>
                    </div>
                    <Progress value={project.metrics.criticsScore || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Audience Score</span>
                      <span className="text-sm font-bold">{project.metrics.audienceScore || 0}/100</span>
                    </div>
                    <Progress value={project.metrics.audienceScore || 0} className="h-2" />
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Cast & Crew */}
          {cast.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Cast & Crew
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cast.map(({ character, talent }) => (
                    <div key={character.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{talent?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            as {character.name} • {character.importance} role
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {talent?.type || 'actor'}
                        </Badge>
                        {talent?.reputation && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {talent.reputation} reputation
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {/* Production Details */}
          {project.script && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Production Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Runtime</p>
                  <p className="font-medium">{project.script.estimatedRuntime || 'Unknown'} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Writer</p>
                  <p className="font-medium">{project.script.writer || 'Unknown'}</p>
                </div>
                {project.script.logline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Logline</p>
                    <p className="text-sm italic">{project.script.logline}</p>
                  </div>
                )}
                {project.script.themes && project.script.themes.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Themes</p>
                    <div className="flex flex-wrap gap-1">
                      {project.script.themes.map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};