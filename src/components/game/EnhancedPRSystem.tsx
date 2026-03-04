import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GameState, Studio } from '@/types/game';
import { Megaphone, Timer, TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';

interface PRCampaign {
  id: string;
  name: string;
  type: 'reputation_boost' | 'damage_control' | 'project_hype' | 'crisis_response' | 'awards_push';
  description: string;
  cost: number;
  duration: number; // weeks
  startWeek: number;
  startYear: number;
  endWeek: number;
  endYear: number;
  status: 'active' | 'completed' | 'cancelled';
  effectiveness: number; // 0-100
  targetImpact: {
    reputation: number;
    buzz: number;
    prestige: number;
  };
  actualImpact: {
    reputation: number;
    buzz: number;
    prestige: number;
  };
  weeklyResults: Array<{
    week: number;
    year: number;
    reputationGain: number;
    buzzGain: number;
    cost: number;
  }>;
}

interface CrisisEvent {
  id: string;
  type: 'scandal' | 'flop' | 'controversy' | 'leak' | 'lawsuit';
  title: string;
  description: string;
  severity: number; // 1-10
  week: number;
  year: number;
  reputationImpact: number;
  status: 'active' | 'resolved' | 'escalating';
  resolutionOptions: Array<{
    action: string;
    cost: number;
    effectiveness: number;
    risk: number;
  }>;
}

interface EnhancedPRSystemProps {
  gameState: GameState;
  onReputationUpdate: (change: number, reason: string) => void;
  onBudgetUpdate: (cost: number, reason: string) => void;
}

export const EnhancedPRSystem: React.FC<EnhancedPRSystemProps> = ({
  gameState,
  onReputationUpdate,
  onBudgetUpdate
}) => {
  const { toast } = useToast();
  const [activeCampaigns, setActiveCampaigns] = useState<PRCampaign[]>([]);
  const [activeCrises, setActiveCrises] = useState<CrisisEvent[]>([]);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'reputation_boost' as PRCampaign['type'],
    description: '',
    duration: 4,
    budget: 1000000
  });

  useEffect(() => {
    processWeeklyPR();
    checkForCrises();
  }, [gameState.currentWeek, gameState.currentYear]);

  const processWeeklyPR = () => {
    setActiveCampaigns(prev => {
      return prev.map(campaign => {
        if (campaign.status !== 'active') return campaign;
        
        // Check if campaign should end
        const currentAbsoluteWeek = gameState.currentYear * 52 + gameState.currentWeek;
        const endAbsoluteWeek = campaign.endYear * 52 + campaign.endWeek;
        
        if (currentAbsoluteWeek >= endAbsoluteWeek) {
          console.log(`PR Campaign "${campaign.name}" completed`);
          toast({
            title: "PR Campaign Complete",
            description: `"${campaign.name}" has finished. Total reputation gain: +${campaign.actualImpact.reputation.toFixed(1)}`,
          });
          return { ...campaign, status: 'completed' as const };
        }
        
        // Apply weekly effects
        const weeklyImpact = calculateWeeklyPRImpact(campaign);
        
        // Update studio reputation
        onReputationUpdate(weeklyImpact.reputation, `PR Campaign: ${campaign.name}`);
        
        // Record weekly cost
        const weeklyCost = campaign.cost / campaign.duration;
        onBudgetUpdate(weeklyCost, `PR Campaign: ${campaign.name}`);
        
        // Update campaign tracking
        const updatedCampaign = {
          ...campaign,
          actualImpact: {
            reputation: campaign.actualImpact.reputation + weeklyImpact.reputation,
            buzz: campaign.actualImpact.buzz + weeklyImpact.buzz,
            prestige: campaign.actualImpact.prestige + weeklyImpact.prestige
          },
          weeklyResults: [
            ...campaign.weeklyResults,
            {
              week: gameState.currentWeek,
              year: gameState.currentYear,
              reputationGain: weeklyImpact.reputation,
              buzzGain: weeklyImpact.buzz,
              cost: weeklyCost
            }
          ]
        };
        
        console.log(`PR Weekly Impact: ${campaign.name} +${weeklyImpact.reputation.toFixed(1)} reputation`);
        return updatedCampaign;
      });
    });
  };

  const calculateWeeklyPRImpact = (campaign: PRCampaign) => {
    const baseEffectiveness = campaign.effectiveness / 100;
    const studioReputationMultiplier = 1 + ((gameState.studio.reputation - 50) / 100);
    
    // Different campaign types have different impact patterns
    const typeMultipliers = {
      reputation_boost: { reputation: 1.0, buzz: 0.5, prestige: 0.3 },
      damage_control: { reputation: 1.5, buzz: 0.8, prestige: 0.2 },
      project_hype: { reputation: 0.3, buzz: 1.5, prestige: 0.1 },
      crisis_response: { reputation: 2.0, buzz: 1.0, prestige: 0.5 },
      awards_push: { reputation: 0.4, buzz: 0.8, prestige: 1.5 }
    };
    
    const multiplier = typeMultipliers[campaign.type];
    const weeklyTarget = {
      reputation: campaign.targetImpact.reputation / campaign.duration,
      buzz: campaign.targetImpact.buzz / campaign.duration,
      prestige: campaign.targetImpact.prestige / campaign.duration
    };
    
    return {
      reputation: weeklyTarget.reputation * multiplier.reputation * baseEffectiveness * studioReputationMultiplier,
      buzz: weeklyTarget.buzz * multiplier.buzz * baseEffectiveness,
      prestige: weeklyTarget.prestige * multiplier.prestige * baseEffectiveness
    };
  };

  const checkForCrises = () => {
    // Random crisis generation (low probability)
    if (Math.random() < 0.02) { // 2% chance per week
      generateRandomCrisis();
    }
    
    // Project-based crises
    gameState.projects.forEach(project => {
      if (project.status === 'released' && project.metrics?.boxOfficeTotal) {
        const performance = project.metrics.boxOfficeTotal / project.budget.total;
        
        // Major flop creates crisis
        if (performance < 0.2 && Math.random() < 0.3) {
          generateProjectCrisis(project, 'flop');
        }
      }
    });
  };

  const generateRandomCrisis = () => {
    const crisisTypes = [
      {
        type: 'scandal' as const,
        title: 'Executive Scandal Emerges',
        description: 'Allegations surface regarding studio leadership conduct',
        severity: Math.floor(Math.random() * 4) + 3 // 3-6
      },
      {
        type: 'controversy' as const,
        title: 'Film Content Controversy',
        description: 'Critics and audiences debate controversial themes in recent release',
        severity: Math.floor(Math.random() * 3) + 2 // 2-4
      },
      {
        type: 'leak' as const,
        title: 'Confidential Information Leaked',
        description: 'Internal studio documents surface online',
        severity: Math.floor(Math.random() * 3) + 2 // 2-4
      }
    ];
    
    const crisis = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
    const reputationImpact = -(crisis.severity * 3);
    
    const newCrisis: CrisisEvent = {
      id: `crisis-${Date.now()}`,
      ...crisis,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      reputationImpact,
      status: 'active',
      resolutionOptions: generateResolutionOptions(crisis.type, crisis.severity)
    };
    
    setActiveCrises(prev => [...prev, newCrisis]);
    onReputationUpdate(reputationImpact, `Crisis: ${crisis.title}`);
    
    toast({
      title: "Crisis Situation",
      description: crisis.title,
      variant: "destructive"
    });
  };

  const generateProjectCrisis = (project: any, type: 'flop') => {
    const newCrisis: CrisisEvent = {
      id: `crisis-${Date.now()}`,
      type: 'flop',
      title: `"${project.title}" Box Office Disaster`,
      description: `The film's poor performance raises questions about studio decision-making`,
      severity: 5,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      reputationImpact: -10,
      status: 'active',
      resolutionOptions: generateResolutionOptions('flop', 5)
    };
    
    setActiveCrises(prev => [...prev, newCrisis]);
    onReputationUpdate(-10, `Box Office Flop: ${project.title}`);
  };

  const generateResolutionOptions = (type: CrisisEvent['type'], severity: number) => {
    const baseOptions = {
      scandal: [
        { action: 'Issue Public Apology', cost: 500000, effectiveness: 60, risk: 20 },
        { action: 'Hire Crisis PR Firm', cost: 2000000, effectiveness: 80, risk: 10 },
        { action: 'Legal Counter-Offensive', cost: 3000000, effectiveness: 70, risk: 40 },
        { action: 'Stay Silent', cost: 0, effectiveness: 20, risk: 60 }
      ],
      flop: [
        { action: 'Blame Market Conditions', cost: 200000, effectiveness: 30, risk: 30 },
        { action: 'Focus on Awards Campaign', cost: 1500000, effectiveness: 50, risk: 20 },
        { action: 'Announce Director\'s Cut', cost: 800000, effectiveness: 40, risk: 25 },
        { action: 'Accept Responsibility', cost: 100000, effectiveness: 60, risk: 10 }
      ],
      controversy: [
        { action: 'Defend Artistic Vision', cost: 300000, effectiveness: 50, risk: 35 },
        { action: 'Issue Clarification', cost: 150000, effectiveness: 40, risk: 20 },
        { action: 'Edit Controversial Content', cost: 1000000, effectiveness: 70, risk: 30 }
      ],
      leak: [
        { action: 'Investigate Security Breach', cost: 800000, effectiveness: 60, risk: 15 },
        { action: 'Damage Control Campaign', cost: 1200000, effectiveness: 55, risk: 20 },
        { action: 'Downplay Significance', cost: 200000, effectiveness: 30, risk: 40 }
      ],
      lawsuit: [
        { action: 'Settle Out of Court', cost: 5000000, effectiveness: 80, risk: 5 },
        { action: 'Fight in Court', cost: 2000000, effectiveness: 60, risk: 50 },
        { action: 'Negotiate Settlement', cost: 3000000, effectiveness: 70, risk: 25 }
      ]
    };
    
    return baseOptions[type] || baseOptions.scandal;
  };

  const createPRCampaign = () => {
    const campaign: PRCampaign = {
      id: `pr-${Date.now()}`,
      name: campaignForm.name,
      type: campaignForm.type,
      description: campaignForm.description,
      cost: campaignForm.budget,
      duration: campaignForm.duration,
      startWeek: gameState.currentWeek,
      startYear: gameState.currentYear,
      endWeek: gameState.currentWeek + campaignForm.duration,
      endYear: gameState.currentYear,
      status: 'active',
      effectiveness: calculateCampaignEffectiveness(),
      targetImpact: calculateTargetImpact(),
      actualImpact: { reputation: 0, buzz: 0, prestige: 0 },
      weeklyResults: []
    };
    
    // Handle year overflow
    if (campaign.endWeek > 52) {
      campaign.endWeek -= 52;
      campaign.endYear += 1;
    }
    
    setActiveCampaigns(prev => [...prev, campaign]);
    setShowCreateCampaign(false);
    
    // Reset form
    setCampaignForm({
      name: '',
      type: 'reputation_boost',
      description: '',
      duration: 4,
      budget: 1000000
    });
    
    toast({
      title: "PR Campaign Launched",
      description: `"${campaign.name}" is now active for ${campaign.duration} weeks`,
    });
  };

  const calculateCampaignEffectiveness = (): number => {
    const budgetMultiplier = Math.min(2.0, campaignForm.budget / 1000000); // More money = more effective
    const reputationMultiplier = Math.max(0.5, gameState.studio.reputation / 100); // Better reputation = more effective
    const baseEffectiveness = 50;
    
    return Math.min(95, baseEffectiveness * budgetMultiplier * reputationMultiplier);
  };

  const calculateTargetImpact = () => {
    const effectiveness = calculateCampaignEffectiveness() / 100;
    const budgetScale = campaignForm.budget / 1000000;
    
    const typeTargets = {
      reputation_boost: { reputation: 8, buzz: 4, prestige: 2 },
      damage_control: { reputation: 12, buzz: 6, prestige: 1 },
      project_hype: { reputation: 2, buzz: 15, prestige: 1 },
      crisis_response: { reputation: 15, buzz: 8, prestige: 3 },
      awards_push: { reputation: 3, buzz: 6, prestige: 12 }
    };
    
    const targets = typeTargets[campaignForm.type];
    
    return {
      reputation: targets.reputation * effectiveness * budgetScale,
      buzz: targets.buzz * effectiveness * budgetScale,
      prestige: targets.prestige * effectiveness * budgetScale
    };
  };

  const resolveCrisis = (crisisId: string, optionIndex: number) => {
    const crisis = activeCrises.find(c => c.id === crisisId);
    if (!crisis) return;
    
    const option = crisis.resolutionOptions[optionIndex];
    
    // Apply cost
    onBudgetUpdate(option.cost, `Crisis Resolution: ${option.action}`);
    
    // Calculate outcome based on effectiveness and risk
    const success = Math.random() < (option.effectiveness / 100);
    const reputationRecovery = success ? 
      Math.abs(crisis.reputationImpact) * (option.effectiveness / 100) :
      Math.abs(crisis.reputationImpact) * 0.2; // Minimal recovery on failure
    
    onReputationUpdate(reputationRecovery, `Crisis Resolution: ${option.action}`);
    
    // Update crisis status
    setActiveCrises(prev => prev.map(c => 
      c.id === crisisId ? { ...c, status: 'resolved' as const } : c
    ));
    
    toast({
      title: success ? "Crisis Resolved" : "Partial Resolution",
      description: `${option.action}: +${reputationRecovery.toFixed(1)} reputation`,
      variant: success ? "default" : "destructive"
    });
  };

  const getActiveCampaignCount = () => activeCampaigns.filter(c => c.status === 'active').length;
  const getWeeklyPRCost = () => activeCampaigns
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.cost / c.duration), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Public Relations
          </h2>
          <p className="text-muted-foreground">Manage reputation and handle crises</p>
        </div>
        <Button onClick={() => setShowCreateCampaign(true)}>
          <Megaphone className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getActiveCampaignCount()}</div>
              <p className="text-sm text-muted-foreground">Active Campaigns</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{activeCrises.filter(c => c.status === 'active').length}</div>
              <p className="text-sm text-muted-foreground">Active Crises</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${(getWeeklyPRCost() / 1000).toFixed(0)}K</div>
              <p className="text-sm text-muted-foreground">Weekly Cost</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(gameState.studio.reputation)}</div>
              <p className="text-sm text-muted-foreground">Reputation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Crises */}
      {activeCrises.filter(c => c.status === 'active').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Active Crises ({activeCrises.filter(c => c.status === 'active').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCrises.filter(c => c.status === 'active').map(crisis => (
                <div key={crisis.id} className="bg-white p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-red-700">{crisis.title}</h4>
                      <p className="text-sm text-gray-600">{crisis.description}</p>
                    </div>
                    <Badge variant="destructive">Severity {crisis.severity}/10</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-medium">Resolution Options:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {crisis.resolutionOptions.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => resolveCrisis(crisis.id, index)}
                          className="justify-start text-left h-auto p-2"
                          disabled={gameState.studio.budget < option.cost}
                        >
                          <div>
                            <div className="font-medium">{option.action}</div>
                            <div className="text-xs text-muted-foreground">
                              ${(option.cost / 1000).toFixed(0)}K • {option.effectiveness}% effective • {option.risk}% risk
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Campaigns */}
      {activeCampaigns.filter(c => c.status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Active PR Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCampaigns.filter(c => c.status === 'active').map(campaign => {
                const weeksRemaining = campaign.endWeek - gameState.currentWeek;
                const progress = ((campaign.duration - weeksRemaining) / campaign.duration) * 100;
                
                return (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{campaign.name}</h4>
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge>{campaign.type.replace('_', ' ')}</Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {weeksRemaining} weeks remaining
                        </div>
                      </div>
                    </div>
                    
                    <Progress value={progress} className="mb-3" />
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Effectiveness</div>
                        <div className="text-muted-foreground">{campaign.effectiveness.toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="font-medium">Weekly Cost</div>
                        <div className="text-muted-foreground">${(campaign.cost / campaign.duration / 1000).toFixed(0)}K</div>
                      </div>
                      <div>
                        <div className="font-medium">Reputation Gain</div>
                        <div className="text-green-600">+{campaign.actualImpact.reputation.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Create PR Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name..."
              />
            </div>
            
            <div>
              <Label htmlFor="campaign-type">Campaign Type</Label>
              <Select
                value={campaignForm.type}
                onValueChange={(value) => setCampaignForm(prev => ({ ...prev, type: value as PRCampaign['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reputation_boost">Reputation Boost</SelectItem>
                  <SelectItem value="damage_control">Damage Control</SelectItem>
                  <SelectItem value="project_hype">Project Hype</SelectItem>
                  <SelectItem value="crisis_response">Crisis Response</SelectItem>
                  <SelectItem value="awards_push">Awards Push</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="campaign-description">Description</Label>
              <Textarea
                id="campaign-description"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the campaign strategy..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaign-duration">Duration (weeks)</Label>
                <Input
                  id="campaign-duration"
                  type="number"
                  min="1"
                  max="12"
                  value={campaignForm.duration}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 4 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="campaign-budget">Budget</Label>
                <Input
                  id="campaign-budget"
                  type="number"
                  min="100000"
                  step="100000"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, budget: parseInt(e.target.value) || 1000000 }))}
                />
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded">
              <div className="text-sm font-medium mb-2">Projected Impact:</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>Reputation: +{calculateTargetImpact().reputation.toFixed(1)}</div>
                <div>Buzz: +{calculateTargetImpact().buzz.toFixed(1)}</div>
                <div>Prestige: +{calculateTargetImpact().prestige.toFixed(1)}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Effectiveness: {calculateCampaignEffectiveness().toFixed(0)}%
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createPRCampaign}
                disabled={!campaignForm.name || gameState.studio.budget < campaignForm.budget}
              >
                Launch Campaign (${(campaignForm.budget / 1000).toFixed(0)}K)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign History */}
      {activeCampaigns.filter(c => c.status === 'completed').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaign Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCampaigns.filter(c => c.status === 'completed').slice(-5).map(campaign => (
                <div key={campaign.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground">{campaign.type.replace('_', ' ')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600">+{campaign.actualImpact.reputation.toFixed(1)} reputation</div>
                    <div className="text-sm text-muted-foreground">${(campaign.cost / 1000).toFixed(0)}K spent</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};