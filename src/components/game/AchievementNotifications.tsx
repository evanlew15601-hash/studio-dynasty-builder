import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Achievement } from '@/hooks/useAchievements';
import { Trophy, X, Star, DollarSign } from 'lucide-react';

interface AchievementNotificationProps {
  achievement: Achievement;
  onDismiss: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onDismiss
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000); // Auto-dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 animate-slide-in-right shadow-lg border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-2xl animate-bounce">
              {achievement.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy size={16} className="text-amber-600" />
                <h4 className="font-semibold text-amber-700 dark:text-amber-300">
                  Achievement Unlocked!
                </h4>
              </div>
              <h5 className="font-medium text-foreground mb-1">
                {achievement.title}
              </h5>
              <p className="text-sm text-muted-foreground">
                {achievement.description}
              </p>
              {achievement.reward && (
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Reward:
                  </Badge>
                  {achievement.reward.reputation && (
                    <Badge variant="outline" className="text-xs">
                      <Star size={12} className="mr-1" />
                      +{achievement.reward.reputation} Rep
                    </Badge>
                  )}
                  {achievement.reward.budget && (
                    <Badge variant="outline" className="text-xs">
                      <DollarSign size={12} className="mr-1" />
                      +${(achievement.reward.budget / 1000000).toFixed(1)}M
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-700"
          >
            <X size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface AchievementNotificationsProps {
  achievements: Achievement[];
  onDismiss: (achievementId: string) => void;
}

export const AchievementNotifications: React.FC<AchievementNotificationsProps> = ({
  achievements,
  onDismiss
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {achievements.map((achievement, index) => (
        <div
          key={achievement.id}
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          <AchievementNotification
            achievement={achievement}
            onDismiss={() => onDismiss(achievement.id)}
          />
        </div>
      ))}
    </div>
  );
};