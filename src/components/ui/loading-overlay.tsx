import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock, Cpu } from 'lucide-react';
import { LoadingState } from '@/hooks/useLoading';
import { LOADING_OPERATIONS } from '@/utils/loadingUtils';

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

  const isWeeklyTick = loading.operationId === LOADING_OPERATIONS.WEEKLY_PROCESSING.id;

  const wrapperClass = isWeeklyTick
    ? `fixed inset-0 bg-black/30 z-50 flex items-center justify-center ${className}`
    : `fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`;

  const cardClass = isWeeklyTick ? 'w-[22rem] max-w-[calc(100vw-2rem)] shadow-xl' : 'w-96 mx-4';

  const footerCopy = (() => {
    if (loading.operationId === LOADING_OPERATIONS.GAME_INIT.id) {
      return 'Building the initial game world: studios, talent, franchises, public-domain IPs, and seeding AI releases.';
    }

    if (isWeeklyTick) {
      return 'Advancing the simulation: projects, AI studios, finances, media, and reputation.';
    }

    return null;
  })();

  const content = (
    <Card className={`${cardClass} ${isWeeklyTick ? 'pointer-events-auto' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{loading.currentOperation}</h3>
            {loading.operationDetails && (
              <p className="text-sm text-muted-foreground">{loading.operationDetails}</p>
            )}
          </div>
          {loading.estimatedTime && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              {formatEstimatedTime(loading.estimatedTime)}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Progress value={loading.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(loading.progress)}% complete</span>
            <span className="flex items-center">
              <Cpu className="h-3 w-3 mr-1" />
              Processing...
            </span>
          </div>
          {footerCopy && (
            <p className="text-xs text-muted-foreground mt-2">{footerCopy}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isWeeklyTick) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return <div className={wrapperClass}>{content}</div>;
};

export const LoadingSpinner: React.FC<{ size?: number; className?: string }> = ({ 
  size = 24, 
  className = '' 
}) => (
  <Loader2 className={`animate-spin ${className}`} size={size} />
);

export const LoadingCard: React.FC<{ title: string; description?: string }> = ({ 
  title, 
  description 
}) => (
  <Card className="w-full">
    <CardContent className="p-6">
      <div className="flex items-center space-x-3">
        <LoadingSpinner />
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);