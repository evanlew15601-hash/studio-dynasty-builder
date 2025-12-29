import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock, Cpu } from 'lucide-react';
import { LoadingState } from '@/hooks/useLoading';
import { ClapperboardIcon, TvIcon, AwardIcon } from '@/components/ui/icons';

interface LoadingOverlayProps {
  loading: LoadingState;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ loading, className = '' }) => {
  if (!loading.isLoading) return null;

  const formatEstimatedTime = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s`;
    return `~${Math.round(seconds / 60)}m`;
  };

  const stageHint =
    loading.progress < 30
      ? 'Spinning up studios, talent rosters, and competitor slates...'
      : loading.progress < 70
      ? 'Scheduling releases, marketing beats, and awards calendars...'
      : 'Finalizing finances, media landscape, and AI rivalry before you step in.';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl ${className}`}
    >
      {/* Subtle cinematic gradients behind the card */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.15),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.18),_transparent_55%)]" />

      <Card className="relative w-[420px] mx-4 shadow-2xl border-primary/40 bg-gradient-to-br from-background via-background/95 to-primary/10">
        <CardContent className="p-6 space-y-4">
          {/* Header: operation + ETA */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg tracking-tight">
                  {loading.currentOperation || 'Preparing your studio...'}
                </h3>
                {loading.operationDetails && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {loading.operationDetails}
                  </p>
                )}
              </div>
            </div>
            {loading.estimatedTime && (
              <div className="flex flex-col items-end text-xs text-muted-foreground ml-3">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatEstimatedTime(loading.estimatedTime)}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wide opacity-75">
                  Simulating world
                </span>
              </div>
            )}
          </div>

          {/* Progress + status */}
          <div className="space-y-3">
            <Progress value={loading.progress} className="h-2 overflow-hidden bg-primary/10" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{Math.round(loading.progress)}% complete</span>
              <span className="flex items-center">
                <Cpu className="h-3 w-3 mr-1" />
                Systems booting...
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/90 mt-1">
              {stageHint}
            </p>
          </div>

          {/* Cinematic flavor row */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground/90">
            <div className="flex items-center gap-2">
              <ClapperboardIcon className="h-4 w-4 text-primary" />
              <span>Building film slate</span>
            </div>
            <div className="flex items-center gap-2">
              <TvIcon className="h-4 w-4 text-accent" />
              <span>Programming TV grid</span>
            </div>
            <div className="flex items-center gap-2">
              <AwardIcon className="h-4 w-4 text-yellow-500" />
              <span>Tuning awards season</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => <Loader2 className={`animate-spin ${className}`} size={size} />;

export const LoadingCard: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => (
  <Card className="w-full">
    <CardContent className="p-6">
      <div className="flex items-center space-x-3">
        <LoadingSpinner />
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);