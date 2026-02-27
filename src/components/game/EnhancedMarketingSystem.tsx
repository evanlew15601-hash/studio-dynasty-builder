import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Project, GameState } from '@/types/game';
import { TrendingUp, Target, Zap, Users, Globe, Tv, Radio, Newspaper, Play, Monitor } from 'lucide-react';

interface EnhancedMarketingSystemProps {
  project: Project;
  gameState: GameState;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onUpdateBudget: (amount: number) => void;
}

interface MarketingCampaign {
  id: string;
  type: 'tv' | 'digital' | 'print' | 'radio' | 'outdoor' | 'premieres' | 'festival';
  name: string;
  description: string;
  baseCost: number;
  buzzMultiplier: number;
  audienceReach: number;
  icon: React.ComponentType<any>;
}

const getMarketingCampaigns = (projectType: string): MarketingCampaign[] => {
  const baseCampaigns: MarketingCampaign[] = [
    {
      id: 'digital',
      type: 'digital',
      name: 'Digital Advertising',
      description: 'Social media, streaming, and online video ads',
      baseCost: 0.10,
      buzzMultiplier: 1.5,
      audienceReach: 75,
      icon: Globe
    },
    {
      id: 'print',
      type: 'print',
      name: 'Print & Publications',
      description: 'Magazine spreads, newspaper ads, and industry publications',
      baseCost: 0.08,
      buzzMultiplier: 0.8,
      audienceReach: 45,
      icon: Newspaper
    },
    {
      id: 'radio',
      type: 'radio',
      name: 'Radio Campaign',
      description: 'Radio spots and podcast sponsorships',
      baseCost: 0.05,
      buzzMultiplier: 0.6,
      audienceReach: 35,
      icon: Radio
    },
    {
      id: 'outdoor',
      type: 'outdoor',
      name: 'Outdoor Advertising',
      description: 'Billboards, transit ads, and public displays',
      baseCost: 0.12,
      buzzMultiplier: 1.0,
      audienceReach: 60,
      icon: Target
    }
  ];

  // Add project-specific campaigns
  if (projectType === 'series' || projectType === 'limited-series') {
    baseCampaigns.unshift(
      {
        id: 'season-trailer',
        type: 'tv',
        name: 'Season Trailer Campaign',
        description: 'Cinematic season trailers and character teasers',
        baseCost: 0.15,
        buzzMultiplier: 2.2,
        audienceReach: 85,
        icon: Tv
      },
      {
        id: 'episode-promos',
        type: 'tv',
        name: 'Episode Promos',
        description: 'Weekly episode previews and "next time" spots',
        baseCost: 0.08,
        buzzMultiplier: 1.8,
        audienceReach: 70,
        icon: Play
      },
      {
        id: 'streaming-push',
        type: 'digital',
        name: 'Streaming Platform Push',
        description: 'Platform homepage features and algorithm boosts',
        baseCost: 0.25,
        buzzMultiplier: 3.0,
        audienceReach: 95,
        icon: Monitor
      },
      {
        id: 'binge-marketing',
        type: 'digital',
        name: 'Binge-Watch Campaign',
        description: 'Social media challenges and binge-watch promotions',
        baseCost: 0.12,
        buzzMultiplier: 2.5,
        audienceReach: 80,
        icon: Users
      }
    );
  } else {
    // Film campaigns
    baseCampaigns.unshift(
      {
        id: 'tv',
        type: 'tv',
        name: 'Television Campaign',
        description: 'Prime time TV spots and network partnerships',
        baseCost: 0.15,
        buzzMultiplier: 1.2,
        audienceReach: 85,
        icon: Tv
      },
      {
        id: 'premieres',
        type: 'premieres',
        name: 'Premieres & Events',
        description: 'Red carpet events, press screenings, and celebrity appearances',
        baseCost: 0.20,
        buzzMultiplier: 2.0,
        audienceReach: 95,
        icon: Users
      },
      {
        id: 'festival',
        type: 'festival',
        name: 'Festival Circuit',
        description: 'Film festival submissions and industry screenings',
        baseCost: 0.06,
        buzzMultiplier: 1.8,
        audienceReach: 30,
        icon: Zap
      }
    );
  }

  return baseCampaigns;
};

export const EnhancedMarketingSystem: React.FC<EnhancedMarketingSystemProps> = ({
  project,
  gameState,
  onUpdateProject,
  onUpdateBudget
}) => {
  const { toast } = useToast();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number>(50);
  const [duration, setDuration] = useState<number>(4);

  const availableCampaigns = getMarketingCampaigns(project.type);

  const calculateTotalCost = (): number => {
    const baseCost = selectedCampaigns.reduce((sum, campaignId) => {
      const campaign = availableCampaigns.find(c => c.id === campaignId);
      return sum + (campaign?.baseCost || 0);
    }, 0);
    
    const budgetMultiplier = Number(project.budget.total) || 10000000;
    const intensityMultiplier = intensity / 50; // 0.5x to 2x
    const durationMultiplier = duration / 4; // 0.25x to 2.5x
    
    return Math.floor(baseCost * budgetMultiplier * intensityMultiplier * durationMultiplier);
  };

  const calculateExpectedBuzz = (): number => {
    const campaignBuzz = selectedCampaigns.reduce((sum, campaignId) => {
      const campaign = availableCampaigns.find(c => c.id === campaignId);
      return sum + ((campaign?.buzzMultiplier || 0) * (campaign?.audienceReach || 0));
    }, 0);
    
    const intensityBonus = (intensity / 100) * 50; // 0-50 bonus
    const durationBonus = Math.min(duration * 5, 25); // Max 25 bonus
    const budgetBonus = Math.min((Number(project.budget.total) || 0) / 1000000, 25); // $1M = 1 point, max 25
    
    // Allow buzz to exceed 150 for TV shows with multiple campaign types
    const maxBuzz = (project.type === 'series' || project.type === 'limited-series') ? 250 : 150;
    return Math.min(maxBuzz, Math.floor(campaignBuzz + intensityBonus + durationBonus + budgetBonus));
  };

  const calculateAudienceReach = (): number => {
    const totalReach = selectedCampaigns.reduce((sum, campaignId) => {
      const campaign = availableCampaigns.find(c => c.id === campaignId);
      return Math.max(sum, campaign?.audienceReach || 0);
    }, 0);
    
    const intensityMultiplier = 0.5 + (Number(intensity) / 100);
    return Math.min(100, Math.floor(totalReach * intensityMultiplier));
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const launchCampaign = () => {
    const totalCost = calculateTotalCost();
    const expectedBuzz = calculateExpectedBuzz();
    
    if (totalCost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Campaign costs $${(totalCost / 1000000).toFixed(1)}M but you only have $${(gameState.studio.budget / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    if (selectedCampaigns.length === 0) {
      toast({
        title: "No Campaigns Selected",
        description: "Please select at least one marketing campaign to launch",
        variant: "destructive"
      });
      return;
    }

    // Update project buzz (higher limit for TV)
    const currentBuzz = project.marketingData?.currentBuzz || 0;
    const maxBuzz = (project.type === 'series' || project.type === 'limited-series') ? 250 : 150;
    const newBuzz = Math.min(maxBuzz, currentBuzz + expectedBuzz);
    
    onUpdateProject(project.id, {
      marketingData: {
        ...project.marketingData,
        currentBuzz: newBuzz,
        totalSpent: (project.marketingData?.totalSpent || 0) + totalCost,
        campaigns: [
          ...(project.marketingData?.campaigns || []),
          ...selectedCampaigns.map(id => ({
            type: id,
            cost: totalCost / selectedCampaigns.length,
            buzz: expectedBuzz / selectedCampaigns.length,
            week: gameState.currentWeek,
            year: gameState.currentYear
          }))
        ]
      },
      // Mark as ready for release planning when marketing is in place
      readyForRelease: true,
      status: 'ready-for-release',
      // If we were stuck in post-production awaiting manual marketing, advance the phase marker.
      currentPhase: (project.currentPhase === 'post-production' ? 'marketing' : project.currentPhase) as any,
      phaseDuration: -1,
    });

    // Deduct budget
    onUpdateBudget(-totalCost);
    
    // Reset form
    setSelectedCampaigns([]);
    setIntensity(50);
    setDuration(4);

    toast({
      title: "Campaign Launched!",
      description: `Spent $${(totalCost / 1000000).toFixed(1)}M, gained ${expectedBuzz} buzz points. Project ready for release planning.`,
    });
  };

  const currentBuzz = project.marketingData?.currentBuzz || 0;
  const totalSpent = project.marketingData?.totalSpent || 0;

  return (
    <div className="space-y-6">
      {/* Current Marketing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Marketing Status - {project.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Current Buzz</label>
              <div className="flex items-center gap-2">
                <Progress value={(currentBuzz / ((project.type === 'series' || project.type === 'limited-series') ? 250 : 150)) * 100} className="flex-1" />
                <Badge variant={currentBuzz > 150 ? "default" : currentBuzz > 100 ? "secondary" : "outline"}>
                  {currentBuzz}/{(project.type === 'series' || project.type === 'limited-series') ? 250 : 150}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Total Spent</label>
              <p className="text-lg font-semibold">${(totalSpent / 1000000).toFixed(1)}M</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Budget Available</label>
              <p className="text-lg font-semibold">${(gameState.studio.budget / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Marketing Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableCampaigns.map((campaign) => {
              const Icon = campaign.icon;
              const isSelected = selectedCampaigns.includes(campaign.id);
              const cost = Math.floor(campaign.baseCost * (Number(project.budget.total) || 10000000) * (Number(intensity) / 50) * (Number(duration) / 4));
              
              return (
                <Card 
                  key={campaign.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => toggleCampaign(campaign.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <h4 className="font-medium">{campaign.name}</h4>
                      </div>
                      <Badge variant="outline">
                        ${(cost / 1000000).toFixed(1)}M
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{campaign.description}</p>
                    <div className="flex justify-between text-xs">
                      <span>Reach: {campaign.audienceReach}%</span>
                      <span>Buzz: {campaign.buzzMultiplier}x</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Configuration */}
      {selectedCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium">Marketing Intensity: {intensity}%</label>
              <Slider
                value={[intensity]}
                onValueChange={([value]) => setIntensity(value)}
                min={25}
                max={200}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher intensity increases cost and effectiveness
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Campaign Duration: {duration} weeks</label>
              <Slider
                value={[duration]}
                onValueChange={([value]) => setDuration(value)}
                min={1}
                max={12}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Longer campaigns build more sustained buzz
              </p>
            </div>

            {/* Campaign Summary */}
            <div className="border rounded-lg p-4 bg-accent/20">
              <h4 className="font-medium mb-2">Campaign Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Cost:</span>
                  <p className="font-medium">${(calculateTotalCost() / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Buzz:</span>
                  <p className="font-medium">+{calculateExpectedBuzz()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Audience Reach:</span>
                  <p className="font-medium">{calculateAudienceReach()}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{duration} weeks</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={launchCampaign}
              className="w-full"
              size="lg"
              disabled={calculateTotalCost() > gameState.studio.budget}
            >
              Launch Marketing Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};