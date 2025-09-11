import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { StreamingContract, StreamingProject } from '@/types/streamingTypes';
import { GameState, Project } from '@/types/game';
import { Monitor, DollarSign, Users, TrendingUp, Calendar, Award, AlertTriangle } from 'lucide-react';

interface StreamingContractSystemProps {
  gameState: GameState;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
  onUpdateBudget: (amount: number) => void;
}

const STREAMING_PLATFORMS = [
  {
    id: 'netflix',
    name: 'StreamFlix',
    color: 'bg-red-600',
    marketShare: 25,
    averageRate: 2500000,
    bonusMultiplier: 1.2
  },
  {
    id: 'amazon',
    name: 'Prime Stream',
    color: 'bg-blue-600',
    marketShare: 20,
    averageRate: 2200000,
    bonusMultiplier: 1.1
  },
  {
    id: 'hulu',
    name: 'StreamHub',
    color: 'bg-green-600',
    marketShare: 15,
    averageRate: 1800000,
    bonusMultiplier: 1.0
  },
  {
    id: 'disney',
    name: 'Magic Stream',
    color: 'bg-purple-600',
    marketShare: 18,
    averageRate: 2800000,
    bonusMultiplier: 1.3
  },
  {
    id: 'apple',
    name: 'Apple Stream',
    color: 'bg-gray-600',
    marketShare: 12,
    averageRate: 3200000,
    bonusMultiplier: 1.4
  },
  {
    id: 'hbo',
    name: 'Premium Stream',
    color: 'bg-indigo-600',
    marketShare: 10,
    averageRate: 3500000,
    bonusMultiplier: 1.5
  }
];

export const StreamingContractSystem: React.FC<StreamingContractSystemProps> = ({
  gameState,
  onProjectUpdate,
  onUpdateBudget
}) => {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  // Get TV projects ready for contracts
  const getEligibleTVProjects = () => {
    return gameState.projects.filter(p => 
      (p.type === 'series' || p.type === 'limited-series') &&
      p.status === 'released' &&
      !p.streamingContract
    );
  };

  // Get active contracts
  const getActiveContracts = () => {
    return gameState.projects.filter(p => 
      p.streamingContract && 
      p.streamingContract.status === 'active'
    );
  };

  const generateContract = (project: Project, platformId: string): StreamingContract => {
    const platform = STREAMING_PLATFORMS.find(p => p.id === platformId)!;
    const episodeCount = project.script?.estimatedRuntime ? 
      Math.ceil(project.script.estimatedRuntime / 45) : 10; // Default 10 episodes
    
    const baseRate = platform.averageRate;
    const qualityMultiplier = (project.script?.quality || 60) / 60;
    const genreMultiplier = ['action', 'sci-fi', 'fantasy'].includes(project.script?.genre || '') ? 1.2 : 1.0;
    
    const episodeRate = Math.floor(baseRate * qualityMultiplier * genreMultiplier);
    const upfrontPayment = episodeRate * episodeCount * 0.5; // 50% upfront
    
    const expectedViewers = Math.floor(platform.marketShare * 1000000 * qualityMultiplier);
    
    return {
      id: `contract-${Date.now()}`,
      platform: platformId as any,
      name: `${platform.name} - ${project.title}`,
      type: project.type as any,
      duration: 52, // 1 year
      startWeek: gameState.currentWeek,
      startYear: gameState.currentYear,
      endWeek: gameState.currentWeek,
      endYear: gameState.currentYear + 1,
      
      upfrontPayment,
      episodeRate,
      performanceBonus: [
        { viewershipThreshold: expectedViewers, bonusAmount: upfrontPayment * 0.2 },
        { viewershipThreshold: expectedViewers * 1.5, bonusAmount: upfrontPayment * 0.4 },
        { viewershipThreshold: expectedViewers * 2, bonusAmount: upfrontPayment * 0.6 }
      ],
      
      expectedViewers,
      expectedCompletionRate: 65,
      expectedSubscriberGrowth: Math.floor(expectedViewers * 0.05),
      
      status: 'active',
      performanceScore: 0,
      renewalOptions: {
        seasons: 2,
        priceIncrease: 15
      },
      
      penaltyClause: {
        minViewers: Math.floor(expectedViewers * 0.6),
        penaltyAmount: upfrontPayment * 0.3
      },
      exclusivityClause: platform.id !== 'hulu', // Only StreamHub allows non-exclusive
      marketingSupport: Math.floor(upfrontPayment * 0.2)
    };
  };

  const signContract = (project: Project, platformId: string) => {
    const contract = generateContract(project, platformId);
    
    onProjectUpdate(project.id, {
      streamingContract: contract,
      marketingCampaign: {
        ...project.marketingCampaign,
        budgetSpent: (project.marketingCampaign?.budgetSpent || 0) + contract.marketingSupport,
        buzz: (project.marketingCampaign?.buzz || 0) + 25 // Platform promotion bonus
      }
    });
    
    onUpdateBudget(contract.upfrontPayment);
    
    const platform = STREAMING_PLATFORMS.find(p => p.id === platformId)!;
    toast({
      title: "Contract Signed!",
      description: `Signed with ${platform.name} for $${(contract.upfrontPayment / 1000000).toFixed(1)}M upfront + performance bonuses`,
    });
    
    setSelectedProject(null);
    setSelectedPlatform('');
  };

  const evaluatePerformance = (project: Project) => {
    if (!project.streamingContract || !project.metrics?.streaming) return;
    
    const contract = project.streamingContract;
    const metrics = project.metrics.streaming;
    
    // Calculate performance score
    const viewershipScore = Math.min(100, (metrics.totalViews / contract.expectedViewers) * 100);
    const completionScore = Math.min(100, (metrics.completionRate / contract.expectedCompletionRate) * 100);
    const subscriberScore = Math.min(100, (metrics.subscriberGrowth / contract.expectedSubscriberGrowth) * 100);
    
    const performanceScore = (viewershipScore + completionScore + subscriberScore) / 3;
    
    // Check for bonuses
    let bonusEarned = 0;
    contract.performanceBonus.forEach(bonus => {
      if (metrics.totalViews >= bonus.viewershipThreshold) {
        bonusEarned = bonus.bonusAmount;
      }
    });
    
    // Check for penalties
    let penalty = 0;
    if (contract.penaltyClause && metrics.totalViews < contract.penaltyClause.minViewers) {
      penalty = contract.penaltyClause.penaltyAmount;
    }
    
    const updatedContract = {
      ...contract,
      performanceScore: Math.floor(performanceScore)
    };
    
    onProjectUpdate(project.id, {
      streamingContract: updatedContract
    });
    
    if (bonusEarned > 0) {
      onUpdateBudget(bonusEarned);
      toast({
        title: "Performance Bonus!",
        description: `Earned $${(bonusEarned / 1000000).toFixed(1)}M for exceeding viewership targets`,
      });
    }
    
    if (penalty > 0) {
      onUpdateBudget(-penalty);
      toast({
        title: "Contract Penalty",
        description: `Penalty of $${(penalty / 1000000).toFixed(1)}M for underperforming`,
        variant: "destructive"
      });
    }
  };

  const eligibleProjects = getEligibleTVProjects();
  const activeContracts = getActiveContracts();

  return (
    <div className="space-y-6">
      {/* Available Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Streaming Platform Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eligibleProjects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No TV shows ready for streaming contracts. Complete production and release first.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleProjects.map(project => (
                <Card key={project.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{project.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {project.script?.genre} • {project.type}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Quality: {project.script?.quality || 60}
                      </Badge>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          View Contract Offers
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Contract Offers - {project.title}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                          {STREAMING_PLATFORMS.map(platform => {
                            const contract = generateContract(project, platform.id);
                            
                            return (
                              <Card key={platform.id} className="border">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-3 h-3 rounded ${platform.color}`} />
                                    <h4 className="font-medium">{platform.name}</h4>
                                    <Badge variant="secondary" className="ml-auto">
                                      {platform.marketShare}% share
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span>Upfront Payment:</span>
                                      <span className="font-medium">
                                        ${(contract.upfrontPayment / 1000000).toFixed(1)}M
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Episode Rate:</span>
                                      <span className="font-medium">
                                        ${(contract.episodeRate! / 1000000).toFixed(1)}M
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Expected Viewers:</span>
                                      <span className="font-medium">
                                        {(contract.expectedViewers / 1000000).toFixed(1)}M
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Marketing Support:</span>
                                      <span className="font-medium">
                                        ${(contract.marketingSupport / 1000000).toFixed(1)}M
                                      </span>
                                    </div>
                                    {contract.exclusivityClause && (
                                      <Badge variant="outline" className="w-full justify-center">
                                        Exclusive Contract
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <Button 
                                    onClick={() => signContract(project, platform.id)}
                                    className="w-full mt-3"
                                    size="sm"
                                  >
                                    Sign Contract
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Contracts */}
      {activeContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Active Streaming Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeContracts.map(project => {
                const contract = project.streamingContract!;
                const platform = STREAMING_PLATFORMS.find(p => p.id === contract.platform)!;
                const metrics = project.metrics?.streaming;
                
                return (
                  <Card key={project.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{project.title}</h4>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${platform.color}`} />
                            <span className="text-sm text-muted-foreground">{platform.name}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={contract.performanceScore >= 80 ? "default" : 
                                  contract.performanceScore >= 60 ? "secondary" : "destructive"}
                        >
                          Performance: {contract.performanceScore}/100
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Viewers:</span>
                          <p className="font-medium">
                            {metrics ? `${(metrics.totalViews / 1000000).toFixed(1)}M` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Target: {(contract.expectedViewers / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completion:</span>
                          <p className="font-medium">
                            {metrics ? `${metrics.completionRate}%` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Target: {contract.expectedCompletionRate}%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subscriber Growth:</span>
                          <p className="font-medium">
                            {metrics ? `${(metrics.subscriberGrowth / 1000).toFixed(0)}K` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Target: {(contract.expectedSubscriberGrowth / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Earned:</span>
                          <p className="font-medium">
                            ${(contract.upfrontPayment / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-xs text-muted-foreground">
                            + Bonuses
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        <Button 
                          onClick={() => evaluatePerformance(project)}
                          variant="outline"
                          size="sm"
                        >
                          Evaluate Performance
                        </Button>
                        {contract.renewalOptions && contract.performanceScore >= 70 && (
                          <Badge variant="secondary">
                            Renewal Available
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};