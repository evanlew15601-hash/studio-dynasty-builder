import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, DollarSign, TrendingUp, Tv } from 'lucide-react';
import { Project, GameState } from '@/types/game';
import { ReleaseSystem } from './ReleaseSystem';
import { useToast } from '@/hooks/use-toast';

interface ReleaseStrategyModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
}

export const ReleaseStrategyModal: React.FC<ReleaseStrategyModalProps> = ({
  project,
  isOpen,
  onClose,
  gameState,
  onProjectUpdate
}) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<{ week: number; year: number } | null>(null);
  
  if (!project) return null;

  const currentTime = {
    currentWeek: gameState.currentWeek,
    currentYear: gameState.currentYear,
    currentQuarter: Math.ceil(gameState.currentWeek / 13)
  };

  // Get optimal release windows
  const optimalWindows = [
    { week: 20, year: gameState.currentYear, season: 'Summer Blockbuster', multiplier: 1.3 },
    { week: 47, year: gameState.currentYear, season: 'Holiday Season', multiplier: 1.2 },
    { week: 8, year: gameState.currentYear + 1, season: 'Early Year', multiplier: 0.9 },
    { week: 35, year: gameState.currentYear, season: 'Back to School', multiplier: 1.1 }
  ].filter(window => {
    const windowTime = (window.year * 52) + window.week;
    const currentTimeValue = (gameState.currentYear * 52) + gameState.currentWeek;
    return windowTime > currentTimeValue + 2; // At least 2 weeks in future
  });

  const handleScheduleRelease = () => {
    if (!selectedDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a release date first.",
        variant: "destructive"
      });
      return;
    }

    const result = ReleaseSystem.scheduleRelease(
      project,
      selectedDate.week,
      selectedDate.year,
      currentTime
    );

    if (result.success) {
      onProjectUpdate(project.id, {
        releaseWeek: result.releaseWeek,
        releaseYear: result.releaseYear,
        status: 'scheduled-for-release'
      });

      toast({
        title: "Release Scheduled!",
        description: result.message,
      });

      onClose();
    } else {
      toast({
        title: "Release Failed",
        description: result.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Release Strategy - {project.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Film Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marketing Buzz</p>
                  <p className="font-semibold">
                    {project.marketingData?.currentBuzz || 0}/150
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={project.status === 'completed' ? 'default' : 'outline'}>
                    {project.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimal Release Windows */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommended Release Windows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimalWindows.map((window, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedDate?.week === window.week && selectedDate?.year === window.year
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedDate({ week: window.week, year: window.year })}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{window.season}</h4>
                          <p className="text-sm text-muted-foreground">
                            Year {window.year}, Week {window.week}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {window.multiplier}x Box Office
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {((window.year * 52 + window.week) - (gameState.currentYear * 52 + gameState.currentWeek))} weeks away
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marketing Summary */}
          {project.marketingData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Marketing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="font-semibold flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${(project.marketingData.totalSpent / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Buzz</p>
                    <p className="font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {project.marketingData.currentBuzz}/150
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleRelease}
              disabled={!selectedDate}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Release
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};