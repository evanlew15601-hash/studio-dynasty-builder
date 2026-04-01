import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, DollarSign, Film, Award, Lock } from 'lucide-react';
import { Achievement } from '@/hooks/useAchievements';

const getAchievementIcon = (icon: Achievement['icon'], size = 20) => {
  switch (icon) {
    case 'dollar':
      return <DollarSign size={size} />;
    case 'film':
      return <Film size={size} />;
    case 'star':
      return <Star size={size} />;
    case 'award':
      return <Award size={size} />;
    case 'trophy':
    default:
      return <Trophy size={size} />;
  }
};

interface AchievementsPanelProps {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  achievements,
  unlockedCount,
  totalCount
}) => {
  const getAchievementsByCategory = (category: Achievement['category']) =>
    achievements.filter(a => a.category === category);

  const categories: Achievement['category'][] = ['financial', 'creative', 'reputation', 'milestone', 'special'];

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Trophy className="mr-2" size={20} />
            Achievements
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {unlockedCount}/{totalCount}
            </Badge>
            <div className="w-24">
              <Progress value={(unlockedCount / totalCount) * 100} />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="financial" className="gap-1">
              <DollarSign size={14} />
              <span className="sr-only">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="creative" className="gap-1">
              <Star size={14} />
              <span className="sr-only">Creative</span>
            </TabsTrigger>
            <TabsTrigger value="reputation" className="gap-1">
              <Award size={14} />
              <span className="sr-only">Reputation</span>
            </TabsTrigger>
            <TabsTrigger value="milestone" className="gap-1">
              <Film size={14} />
              <span className="sr-only">Milestone</span>
            </TabsTrigger>
            <TabsTrigger value="special" className="gap-1">
              <Trophy size={14} />
              <span className="sr-only">Special</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-3 mt-4">
            {achievements.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </TabsContent>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="space-y-3 mt-4">
              {getAchievementsByCategory(category).map(achievement => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  return (
    <div className={`p-3 rounded-lg border transition-all duration-200 ${
      achievement.unlocked 
        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800/30'
        : 'bg-muted/50 border-muted-foreground/20'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`mt-0.5 ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'} ${achievement.unlocked ? 'grayscale-0' : 'grayscale'}`}>
            {achievement.unlocked ? getAchievementIcon(achievement.icon) : <Lock size={20} className="mt-0.5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className={`font-semibold ${achievement.unlocked ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                {achievement.title}
              </h4>
              <Badge variant="outline" className="text-xs">
                {achievement.category}
              </Badge>
            </div>
            <p className={`text-sm ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
              {achievement.description}
            </p>
            {achievement.reward && achievement.unlocked && (
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  Reward:
                </Badge>
                {achievement.reward.reputation && (
                  <Badge variant="outline" className="text-xs">
                    +{achievement.reward.reputation} Rep
                  </Badge>
                )}
                {achievement.reward.budget && (
                  <Badge variant="outline" className="text-xs">
                    +${(achievement.reward.budget / 1000000).toFixed(0)}M
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        {achievement.unlocked && achievement.unlockedAt && (
          <div className="text-xs text-muted-foreground">
            {achievement.unlockedAt.toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};