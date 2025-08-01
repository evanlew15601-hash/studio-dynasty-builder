import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock, Cpu } from 'lucide-react';
import { LoadingState } from '@/hooks/useLoading';

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

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <Card className="w-96 mx-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
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