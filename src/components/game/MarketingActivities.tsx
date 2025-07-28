import React, { useState } from 'react';
import { Project, MarketingActivity } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  PlayIcon, 
  TvIcon,
  UsersIcon,
  CameraIcon,
  TrendingIcon,
  DollarIcon,
  CalendarIcon,
  CheckIcon
} from '@/components/ui/icons';

interface MarketingActivitiesProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  studioBudget: number;
}

const MARKETING_ACTIVITIES = [
  {
    type: 'trailer',
    name: 'Release Trailer',
    description: 'Create and release an official trailer',
    baseCost: 500000,
    duration: 1,
    requirements: ['Marketing campaign must be active'],
    effects: {
      buzzIncrease: 15,
      audienceReach: 25,
      criticalAttention: 10,
      socialMedia: 20
    },
    icon: PlayIcon
  },
  {
    type: 'tv-spot',
    name: 'TV Commercial Campaign',
    description: 'Prime time television advertising blitz',
    baseCost: 2000000,
    duration: 2,
    requirements: ['Trailer must be released first'],
    effects: {
      buzzIncrease: 25,
      audienceReach: 45,
      criticalAttention: 5,
      socialMedia: 15
    },
    icon: TvIcon
  },
  {
    type: 'press-junket',
    name: 'Press Junket & Interviews',
    description: 'Talent interviews with major media outlets',
    baseCost: 750000,
    duration: 1,
    requirements: ['Major cast members available'],
    effects: {
      buzzIncrease: 12,
      audienceReach: 20,
      criticalAttention: 30,
      socialMedia: 18
    },
    icon: UsersIcon
  },
  {
    type: 'test-screening',
    name: 'Test Screenings',
    description: 'Preview screenings for focus groups',
    baseCost: 300000,
    duration: 1,
    requirements: ['Film must be completed'],
    effects: {
      buzzIncrease: 8,
      audienceReach: 15,
      criticalAttention: 25,
      socialMedia: 10
    },
    icon: CameraIcon
  },
  {
    type: 'social-campaign',
    name: 'Social Media Blitz',
    description: 'Comprehensive digital marketing campaign',
    baseCost: 1200000,
    duration: 3,
    requirements: ['Marketing campaign active'],
    effects: {
      buzzIncrease: 20,
      audienceReach: 35,
      criticalAttention: 8,
      socialMedia: 40
    },
    icon: TrendingIcon
  },
  {
    type: 'premiere',
    name: 'Red Carpet Premiere',
    description: 'Star-studded premiere event',
    baseCost: 1500000,
    duration: 1,
    requirements: ['Within 2 weeks of release'],
    effects: {
      buzzIncrease: 30,
      audienceReach: 20,
      criticalAttention: 35,
      socialMedia: 25
    },
    icon: CalendarIcon
  }
];

export const MarketingActivities: React.FC<MarketingActivitiesProps> = ({
  project,
  onProjectUpdate,
  studioBudget
}) => {
  const { toast } = useToast();
  const [activeActivities, setActiveActivities] = useState<MarketingActivity[]>(
    project.marketingCampaign?.activities || []
  );

  const calculateTotalBuzz = () => {
    return project.marketingCampaign?.buzz || 0;
  };

  const calculateActivityCost = (activity: any, projectBudget: number) => {
    // Scale cost based on project budget
    const scaleFactor = projectBudget / 50000000; // Base: 50M budget
    return Math.floor(activity.baseCost * Math.max(0.5, Math.min(2, scaleFactor)));
  };

  const canLaunchActivity = (activity: any) => {
    const cost = calculateActivityCost(activity, project.budget.total);
    
    // Check budget
    if (studioBudget < cost) return { canLaunch: false, reason: 'Insufficient studio budget' };
    
    // Check campaign budget
    const campaignBudget = project.marketingCampaign?.budgetAllocated || 0;
    const campaignSpent = project.marketingCampaign?.budgetSpent || 0;
    if (campaignBudget - campaignSpent < cost) {
      return { canLaunch: false, reason: 'Insufficient campaign budget' };
    }
    
    // Check if already launched
    const alreadyLaunched = activeActivities.some(a => a.type === activity.type);
    if (alreadyLaunched) return { canLaunch: false, reason: 'Already launched' };
    
    // Check specific requirements
    if (activity.type === 'tv-spot') {
      const hasTrailer = activeActivities.some(a => a.type === 'trailer');
      if (!hasTrailer) return { canLaunch: false, reason: 'Need trailer first' };
    }
    
    if (activity.type === 'premiere') {
      if (project.phaseDuration > 2) {
        return { canLaunch: false, reason: 'Too early for premiere' };
      }
    }
    
    return { canLaunch: true, reason: '' };
  };

  const launchActivity = (activity: any) => {
    const cost = calculateActivityCost(activity, project.budget.total);
    const { canLaunch, reason } = canLaunchActivity(activity);
    
    if (!canLaunch) {
      toast({
        title: "Cannot Launch Activity",
        description: reason,
        variant: "destructive"
      });
      return;
    }

    // Create new activity
    const newActivity: MarketingActivity = {
      id: `activity-${Date.now()}`,
      type: activity.type as any,
      name: activity.name,
      cost,
      duration: activity.duration,
      weeksRemaining: activity.duration,
      status: 'active',
      impact: activity.effects
    };

    // Update project with new activity and effects
    const updatedBuzz = Math.min(100, calculateTotalBuzz() + activity.effects.buzzIncrease);
    const updatedCampaign = {
      ...project.marketingCampaign!,
      activities: [...activeActivities, newActivity],
      buzz: updatedBuzz,
      budgetSpent: (project.marketingCampaign?.budgetSpent || 0) + cost
    };

    const updatedProject = {
      ...project,
      marketingCampaign: updatedCampaign
    };

    setActiveActivities([...activeActivities, newActivity]);
    onProjectUpdate(updatedProject);

    toast({
      title: "Marketing Activity Launched!",
      description: `${activity.name} launched successfully. Buzz increased by ${activity.effects.buzzIncrease}%`,
    });
  };

  const getActivityStatus = (activity: any) => {
    const launched = activeActivities.find(a => a.type === activity.type);
    if (launched) {
      return launched.status === 'completed' ? 'completed' : 'active';
    }
    return 'available';
  };

  const campaign = project.marketingCampaign;
  if (!campaign) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No marketing campaign active</p>
          <p className="text-sm text-muted-foreground mt-2">Launch a campaign first to access marketing activities</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <TrendingIcon className="w-6 h-6" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-2xl font-bold text-primary">{campaign.buzz}%</div>
              <div className="text-sm text-muted-foreground">Buzz Level</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5">
              <div className="text-2xl font-bold text-accent">
                ${((campaign.budgetSpent) / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-muted-foreground">Spent</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5">
              <div className="text-2xl font-bold text-secondary-foreground">
                ${((campaign.budgetAllocated - campaign.budgetSpent) / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-success/10 to-success/5">
              <div className="text-2xl font-bold text-success">{campaign.weeksRemaining}</div>
              <div className="text-sm text-muted-foreground">Weeks Left</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Campaign Progress</span>
              <span>{campaign.duration - campaign.weeksRemaining}/{campaign.duration} weeks</span>
            </div>
            <Progress value={(campaign.duration - campaign.weeksRemaining) / campaign.duration * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Active Activities */}
      {activeActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Marketing Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {activeActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-card border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CheckIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{activity.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${(activity.cost / 1000000).toFixed(1)}M • 
                        {activity.status === 'active' ? ` ${activity.weeksRemaining} weeks remaining` : ' Completed'}
                      </div>
                    </div>
                  </div>
                  <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                    {activity.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MARKETING_ACTIVITIES.map(activity => {
              const cost = calculateActivityCost(activity, project.budget.total);
              const status = getActivityStatus(activity);
              const { canLaunch, reason } = canLaunchActivity(activity);
              const IconComponent = activity.icon;

              return (
                <Card 
                  key={activity.type}
                  className={`relative transition-all duration-200 ${
                    status === 'completed' ? 'opacity-60 bg-success/5' :
                    status === 'active' ? 'border-primary/50 bg-primary/5' :
                    canLaunch ? 'hover:border-primary/30 hover:shadow-lg cursor-pointer' :
                    'opacity-60'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        status === 'completed' ? 'bg-success/20' :
                        status === 'active' ? 'bg-primary/20' :
                        'bg-muted/20'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          status === 'completed' ? 'text-success' :
                          status === 'active' ? 'text-primary' :
                          'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{activity.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium">${(cost / 1000000).toFixed(1)}M</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{activity.duration} week{activity.duration > 1 ? 's' : ''}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Effects:</div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>Buzz: +{activity.effects.buzzIncrease}%</div>
                          <div>Reach: +{activity.effects.audienceReach}%</div>
                          <div>Critics: +{activity.effects.criticalAttention}%</div>
                          <div>Social: +{activity.effects.socialMedia}%</div>
                        </div>
                      </div>

                      <Separator />

                      <Button
                        onClick={() => launchActivity(activity)}
                        disabled={!canLaunch || status !== 'available'}
                        className="w-full"
                        variant={status === 'completed' ? 'outline' : 
                                status === 'active' ? 'secondary' : 'default'}
                      >
                        {status === 'completed' ? (
                          <>
                            <CheckIcon className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : status === 'active' ? (
                          'In Progress...'
                        ) : canLaunch ? (
                          <>
                            <DollarIcon className="w-4 h-4 mr-2" />
                            Launch Activity
                          </>
                        ) : (
                          reason
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};