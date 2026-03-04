import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, DollarSign, TrendingUp, Tv } from 'lucide-react';
import { Project, GameState } from '@/types/game';
import { ReleaseSystem } from './ReleaseSystem';
import { CalendarManager } from './CalendarManager';
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

  useEffect(() => {
    if (!isOpen) return;

    if (!project) {
      setSelectedDate(null);
      return;
    }

    if (project.scheduledReleaseWeek && project.scheduledReleaseYear) {
      setSelectedDate({ week: project.scheduledReleaseWeek, year: project.scheduledReleaseYear });
    } else {
      setSelectedDate(null);
    }
  }, [isOpen, project?.id, project?.scheduledReleaseWeek, project?.scheduledReleaseYear]);

  if (!project) return null;

  const currentTime = {
    currentWeek: gameState.currentWeek,
    currentYear: gameState.currentYear,
    currentQuarter: Math.ceil(gameState.currentWeek / 13)
  };

  // Get optimal windows - different messaging for TV vs films
  const isTV = project.type === 'series' || project.type === 'limited-series';
  const validation = ReleaseSystem.validateFilmForRelease(project);

  const marketingLeadWeeks = project.marketingCampaign
    ? Math.max(1, project.marketingCampaign.weeksRemaining)
    : 4;

  const baseWindows = [
    { week: 20, year: gameState.currentYear, season: isTV ? 'Summer TV Season' : 'Summer Blockbuster', multiplier: 1.3 },
    { week: 47, year: gameState.currentYear, season: isTV ? 'Fall TV Season' : 'Holiday Season', multiplier: 1.2 },
    { week: 8, year: gameState.currentYear + 1, season: isTV ? 'Winter Premieres' : 'Early Year', multiplier: 0.9 },
    { week: 35, year: gameState.currentYear, season: isTV ? 'Fall Premieres' : 'Back to School', multiplier: 1.1 }
  ];

  const getCalendarValidation = (week: number, year: number) =>
    CalendarManager.validateRelease(project.id, week, year, currentTime, gameState.projects);

  const earliestAvailable = (() => {
    const currentAbs = (gameState.currentYear * 52) + gameState.currentWeek;
    for (let delta = 1; delta <= 104; delta++) {
      const abs = currentAbs + delta;
      const year = Math.floor((abs - 1) / 52);
      const week = ((abs - 1) % 52) + 1;
      const v = getCalendarValidation(week, year);
      if (v.canRelease) {
        return {
          week,
          year,
          season: 'Earliest Available',
          multiplier: 1.0,
          awardEligibility: v.awardEligibility,
        };
      }
    }
    return null;
  })();

  const optimalWindows = [
    ...(earliestAvailable ? [earliestAvailable] : []),
    ...baseWindows
      .map(w => {
        const v = getCalendarValidation(w.week, w.year);
        return { ...w, awardEligibility: v.awardEligibility, canRelease: v.canRelease };
      })
      .filter(w => w.canRelease)
  ].filter((w, idx, arr) => arr.findIndex(o => o.week === w.week && o.year === w.year) === idx);

  const selectedCalendarValidation = selectedDate
    ? getCalendarValidation(selectedDate.week, selectedDate.year)
    : null;

  const handleClearSchedule = () => {
    CalendarManager.clearFilmEvents(project.id);

    const clearingDuringMarketing = project.currentPhase === 'marketing';

    onProjectUpdate(project.id, {
      scheduledReleaseWeek: undefined,
      scheduledReleaseYear: undefined,
      releaseStrategy: undefined,
      status: (clearingDuringMarketing ? 'marketing' : 'ready-for-release') as any,
      readyForRelease: !clearingDuringMarketing,
      ...(clearingDuringMarketing
        ? {}
        : {
            currentPhase: 'release',
            phaseDuration: 0,
          }),
    });

    toast({
      title: "Release Schedule Cleared",
      description: `Cleared planned ${isTV ? 'air date' : 'release date'} for ${project.title}.`,
    });

    onClose();
  };

  const handleScheduleRelease = () => {
    if (!selectedDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a release date first.",
        variant: "destructive"
      });
      return;
    }

    // Debug: capture state before attempting release
    console.log('RELEASE_MODAL: scheduling', {
      projectId: project.id,
      type: project.type,
      phase: project.currentPhase,
      status: project.status,
      selectedDate,
      validation
    });

    const result = ReleaseSystem.scheduleRelease(
      project,
      selectedDate.week,
      selectedDate.year,
      currentTime,
      gameState.projects
    );

    console.log('RELEASE_MODAL: schedule result', result);

    if (result.success) {
      const schedulingDuringMarketing =
        project.currentPhase === 'marketing' &&
        !!project.marketingCampaign &&
        project.marketingCampaign.weeksRemaining > 0;

      onProjectUpdate(project.id, {
        scheduledReleaseWeek: result.releaseWeek,
        scheduledReleaseYear: result.releaseYear,
        status: 'scheduled-for-release',
        readyForRelease: false,
        ...(schedulingDuringMarketing
          ? {}
          : {
              currentPhase: 'release',
              phaseDuration: -1,
            }),
      });

      toast({
        title: "Release Scheduled!",
        description: result.message,
      });

      onClose();
    } else {
      console.error('RELEASE_MODAL: scheduling failed', result);
      toast({
        title: "Release Failed",
        description: result.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {project.type === 'series' || project.type === 'limited-series' ? 'Air Date Strategy' : 'Release Strategy'} - {project.title}
          </DialogTitle>
          <DialogDescription>
            {project.marketingCampaign
              ? project.marketingCampaign.weeksRemaining > 0
                ? `Marketing campaign has ${project.marketingCampaign.weeksRemaining} weeks remaining. Release must be at least ${marketingLeadWeeks} weeks away.`
                : 'Marketing campaign is complete. You can release as soon as next week.'
              : (isTV ? 'TV premieres require at least 4 weeks of lead time for marketing.' : 'Films require at least 4 weeks of lead time for marketing.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{project.type === 'series' || project.type === 'limited-series' ? 'Series Readiness' : 'Film Readiness'}</CardTitle>
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

          {/* Readiness Issues */}
          {!validation.canRelease && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg">Readiness Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {validation.errors.map((e, idx) => (
                    <li key={idx} className="text-sm text-destructive">{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

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
                            {window.multiplier}x {project.type === 'series' || project.type === 'limited-series' ? 'Viewership' : 'Box Office'}
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {project.status === 'scheduled-for-release' && project.scheduledReleaseWeek && project.scheduledReleaseYear && (
                <Button variant="destructive" onClick={handleClearSchedule}>
                  Clear Schedule
                </Button>
              )}
            </div>
            <Button 
              onClick={handleScheduleRelease}
              disabled={!selectedDate || !validation.canRelease || !selectedCalendarValidation?.canRelease}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {project.type === 'series' || project.type === 'limited-series' ? 'Schedule Air Date' : 'Schedule Release'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};