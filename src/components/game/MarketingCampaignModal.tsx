import React, { useState } from 'react';
import { Project, MarketingCampaign, MarketingStrategy, MarketingActivity } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingIcon, 
  DollarIcon, 
  UsersIcon, 
  CalendarIcon,
  PlayIcon,
  TvIcon,
  GlobeIcon
} from '@/components/ui/icons';

interface MarketingCampaignModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onCreateCampaign?: (strategy: MarketingStrategy, budget: number, duration: number) => void;
  studioBudget: number;
}

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({
  project,
  open,
  onClose,
  onCreateCampaign,
  studioBudget
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('traditional');
  const [budget, setBudget] = useState<string>('5000000'); // FIXED: Use string for controlled input
  const [duration, setDuration] = useState<string>('8'); // FIXED: Use string for controlled input

  if (!project) return null;

  const isTV = project.type === 'series' || project.type === 'limited-series';

  const marketingStrategies = isTV ? [
    {
      type: 'traditional',
      name: 'Network & Streaming Promos',
      description: 'On-air promos, episode teases, and platform homepage takeovers',
      cost: 'High',
      effectiveness: 'Broad + Timely',
      channels: ['On-Air Promos', 'Homepage Takeover', 'Pre-Roll on Platform', 'E-mail Blasts']
    },
    {
      type: 'digital',
      name: 'Social + Creator Push',
      description: 'ClipTok/PhotoGram reels, creator watch parties, meme/hashtag challenges',
      cost: 'Medium',
      effectiveness: 'Highly Targeted',
      channels: ['ClipTok', 'PhotoGram', 'ViewTube Shorts', 'Creators']
    },
    {
      type: 'grassroots',
      name: 'Fandom Activation',
      description: 'AMAs, subreddit takeovers, Discord server events, community screenings',
      cost: 'Low',
      effectiveness: 'Authentic',
      channels: ['Reddit AMA', 'Discord', 'Community Screenings', 'Fan Newsletters']
    },
    {
      type: 'premium',
      name: 'Upfronts & Press Tour',
      description: 'Talk shows, premiere event, critic screeners, festival showcases',
      cost: 'Very High',
      effectiveness: 'Prestige',
      channels: ['Talk Shows', 'Premiere Event', 'Critic Screeners', 'Festivals']
    }
  ] : [
    {
      type: 'traditional',
      name: 'Traditional Marketing',
      description: 'TV, radio, print advertising with broad reach',
      cost: 'High',
      effectiveness: 'Proven',
      channels: ['TV Commercials', 'Print Ads', 'Radio Spots', 'Billboards']
    },
    {
      type: 'digital',
      name: 'Digital First',
      description: 'Online-focused campaign with social media',
      cost: 'Medium',
      effectiveness: 'Targeted',
      channels: ['Social Media', 'ViewTube', 'Streaming Ads', 'Creator Partnerships']
    },
    {
      type: 'grassroots',
      name: 'Grassroots Campaign',
      description: 'Community-driven, word-of-mouth marketing',
      cost: 'Low',
      effectiveness: 'Authentic',
      channels: ['Film Festivals', 'Special Screenings', 'Fan Events', 'Media Tours']
    },
    {
      type: 'premium',
      name: 'Premium Experience',
      description: 'High-end events and exclusive access',
      cost: 'Very High',
      effectiveness: 'Prestige',
      channels: ['Red Carpet Events', 'Celebrity Endorsements', 'Luxury Partnerships', 'Private Screenings']
    }
  ];

  const marketingActivities = isTV ? [
    {
      type: 'season-trailer',
      name: 'Season Trailer',
      baseCost: 400000,
      duration: 2,
      impact: { buzzIncrease: 18, audienceReach: 35, criticalAttention: 8, industryAwareness: 15 }
    },
    {
      type: 'episode-promos',
      name: 'Episode Promo Spots',
      baseCost: 1200000,
      duration: 4,
      impact: { buzzIncrease: 22, audienceReach: 55, criticalAttention: 6, industryAwareness: 18 }
    },
    {
      type: 'upfronts',
      name: 'Upfronts Presentation',
      baseCost: 600000,
      duration: 1,
      impact: { buzzIncrease: 12, audienceReach: 20, criticalAttention: 20, industryAwareness: 35 }
    },
    {
      type: 'talk-shows',
      name: 'Talk Show Circuit',
      baseCost: 350000,
      duration: 2,
      impact: { buzzIncrease: 14, audienceReach: 25, criticalAttention: 22, industryAwareness: 25 }
    },
    {
      type: 'influencer-watch-party',
      name: 'Influencer Watch Party',
      baseCost: 500000,
      duration: 1,
      impact: { buzzIncrease: 20, audienceReach: 40, criticalAttention: 6, industryAwareness: 12 }
    },
    {
      type: 'homepage-takeover',
      name: 'Streaming Homepage Takeover',
      baseCost: 1000000,
      duration: 1,
      impact: { buzzIncrease: 24, audienceReach: 60, criticalAttention: 10, industryAwareness: 20 }
    }
  ] : [
    {
      type: 'trailer',
      name: 'Official Trailer',
      baseCost: 500000,
      duration: 2,
      impact: { buzzIncrease: 15, audienceReach: 30, criticalAttention: 10, industryAwareness: 20 }
    },
    {
      type: 'tv-spot',
      name: 'TV Commercial Campaign',
      baseCost: 2000000,
      duration: 4,
      impact: { buzzIncrease: 25, audienceReach: 50, criticalAttention: 5, industryAwareness: 15 }
    },
    {
      type: 'press-junket',
      name: 'Press Junket',
      baseCost: 300000,
      duration: 1,
      impact: { buzzIncrease: 10, audienceReach: 15, criticalAttention: 25, industryAwareness: 30 }
    },
    {
      type: 'test-screening',
      name: 'Test Screenings',
      baseCost: 150000,
      duration: 2,
      impact: { buzzIncrease: 8, audienceReach: 10, criticalAttention: 20, industryAwareness: 10 }
    },
    {
      type: 'social-campaign',
      name: 'Social Media Campaign',
      baseCost: 800000,
      duration: 6,
      impact: { buzzIncrease: 20, audienceReach: 40, criticalAttention: 8, industryAwareness: 12 }
    }
  ];

  const handleCreateCampaign = () => {
    const numBudget = parseInt(budget);
    const numDuration = parseInt(duration);
    
// Validate inputs
if (isNaN(numBudget) || numBudget < 0 || numBudget > studioBudget) {
  return; // Don't create if invalid
}
    
    if (isNaN(numDuration) || numDuration < 4 || numDuration > 16) {
      return; // Don't create if invalid
    }

    const strategy: MarketingStrategy = {
      type: selectedStrategy as any,
      channels: [],
      targeting: {
        demographic: ['General Audience'],
        psychographic: ['Entertainment Seekers'],
        geographic: ['Domestic'],
        platforms: ['All Platforms']
      }
    };

    onCreateCampaign?.(strategy, numBudget, numDuration);
    onClose();
  };

  const selectedStrategyData = marketingStrategies.find(s => s.type === selectedStrategy);
  const campaign = project.marketingCampaign;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrendingIcon className="w-6 h-6" />
            {project.title} - Marketing Campaign
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={campaign ? "management" : "setup"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Campaign Setup</TabsTrigger>
            <TabsTrigger value="management" disabled={!campaign}>Campaign Management</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketingStrategies.map((strategy) => (
                    <Card 
                      key={strategy.type}
                      className={`cursor-pointer transition-colors ${
                        selectedStrategy === strategy.type 
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedStrategy(strategy.type)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{strategy.name}</h4>
                            <Badge variant="outline">{strategy.cost}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {strategy.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {strategy.channels.map((channel) => (
                              <Badge key={channel} variant="secondary" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Marketing Budget</Label>
                    <Input
                      id="budget"
                      type="text"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="5000000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: ${(studioBudget / 1000000).toFixed(1)}M
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Campaign Duration (weeks)</Label>
                    <Input
                      id="duration"
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="8"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
<Button 
  onClick={handleCreateCampaign}
  disabled={parseInt(budget) > studioBudget || isNaN(parseInt(budget)) || parseInt(budget) < 0 || isNaN(parseInt(duration)) || parseInt(duration) < 4 || parseInt(duration) > 16}
>
  <PlayIcon className="w-4 h-4 mr-2" />
  Launch Campaign
</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            {campaign && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Campaign Progress
                      <Badge variant={campaign.weeksRemaining > 0 ? "default" : "secondary"}>
                        {campaign.weeksRemaining} weeks remaining
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {campaign.buzz.toFixed(0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Buzz Level</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ${(campaign.budgetSpent / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Spent of ${(campaign.budgetAllocated / 1000000).toFixed(1)}M
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {campaign.effectiveness.toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Effectiveness</div>
                      </div>
                    </div>

                    <Progress 
                      value={(campaign.duration - campaign.weeksRemaining) / campaign.duration * 100} 
                      className="h-3" 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Marketing Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {marketingActivities.map((activity) => (
                        <Card key={activity.type} className="cursor-pointer hover:bg-muted/50">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">{activity.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  ${(activity.baseCost / 1000000).toFixed(1)}M
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Buzz: +{activity.impact.buzzIncrease}</div>
                                <div>Reach: +{activity.impact.audienceReach}</div>
                                <div>Critics: +{activity.impact.criticalAttention}</div>
                                <div>Industry: +{activity.impact.industryAwareness}</div>
                              </div>
                              <Button 
                                size="sm" 
                                className="w-full"
                                disabled={true}
                              >
                                Managed in Campaign
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};