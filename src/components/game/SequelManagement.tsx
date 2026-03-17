import React, { useState } from 'react';
import { Project, Franchise, Script } from '@/types/game';
import { isTalentAvailable } from '@/utils/talentAvailability';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Crown, Film, Users, TrendingUp, Plus, ArrowRight, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SequelManagementProps {
  onProjectCreate: (script: Script) => void;
  onCreateFranchise?: (franchise: Franchise) => void;
}

interface SequelPlan {
  originalProjectId: string;
  title: string;
  description: string;
  budget: number;
  timeline: number; // weeks
  returningCast: {
    characterId: string;
    talentId: string;
    confirmed: boolean;
    negotiationStatus: 'pending' | 'accepted' | 'declined' | 'renegotiating';
  }[];
  sequelNumber: number;
  marketingHook: string;
}

export const SequelManagement: React.FC<SequelManagementProps> = ({
  onProjectCreate,
  onCreateFranchise
}) => {
  const gameState = useGameStore((s) => s.game);
  const replaceProject = useGameStore((s) => s.replaceProject);
  const appendFranchiseEntry = useGameStore((s) => s.appendFranchiseEntry);
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sequelPlan, setSequelPlan] = useState<SequelPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading sequel planning...</div>;
  }

  // Get projects eligible for sequels - REMOVED SUCCESS RESTRICTIONS
  const getSequelEligibleProjects = () => {
    return gameState.projects.filter(project => project.status === 'released');
  };

  // Get existing sequels for a project
  const getExistingSequels = (originalProject: Project) => {
    if (!originalProject.script?.franchiseId) return [];
    
    return gameState.projects.filter(p => 
      p.script?.franchiseId === originalProject.script?.franchiseId &&
      p.id !== originalProject.id
    ).sort((a, b) => (a.franchisePosition || 0) - (b.franchisePosition || 0));
  };

  // Calculate sequel potential and metrics
  const getSequelMetrics = (project: Project) => {
    const boxOffice = project.metrics?.boxOfficeTotal || 0;
    const budget = project.budget.total;
    const profitability = ((boxOffice - budget) / budget) * 100;
    const criticsScore = project.metrics?.criticsScore || 0;
    const audienceScore = project.metrics?.audienceScore || 0;
    
    // Sequel demand calculation
    const demandFactors = {
      profitability: Math.min(100, profitability * 2), // Cap at 100
      criticalReception: criticsScore,
      audienceReception: audienceScore,
      culturalImpact: Math.min(100, (boxOffice / 100000000) * 20), // $100M = 20 points
      franchisePotential: project.script?.franchiseId ? 20 : 0
    };
    
    const sequelDemand = Object.values(demandFactors).reduce((sum, val) => sum + val, 0) / 5;
    
    // Optimal sequel timing (weeks since release)
    const weeksSinceRelease = gameState.currentWeek - (project.releaseWeek || 0) + 
                             (gameState.currentYear - (project.releaseYear || 0)) * 52;
    
    const optimalTiming = weeksSinceRelease >= 52 && weeksSinceRelease <= 156; // 1-3 years
    
    return {
      sequelDemand: Math.round(sequelDemand),
      profitability: Math.round(profitability),
      weeksSinceRelease,
      optimalTiming,
      estimatedBudget: Math.round(budget * (1.2 + (profitability / 500))), // 20% increase + profit factor
      estimatedBoxOffice: Math.round(boxOffice * (0.8 + (sequelDemand / 200))) // Typically lower but demand helps
    };
  };

  // Start sequel development
  const startSequelDevelopment = (originalProject: Project) => {
    const existingSequels = getExistingSequels(originalProject);
    const sequelNumber = existingSequels.length + 2; // +2 because original is "1"
    const metrics = getSequelMetrics(originalProject);
    
    // Get returning cast from original
    const returningCast = (originalProject.script?.characters || [])
      .filter(char => char.assignedTalentId && char.importance !== 'minor')
      .map(char => ({
        characterId: char.id,
        talentId: char.assignedTalentId!,
        confirmed: false,
        negotiationStatus: 'pending' as const
      }));
    
    const plan: SequelPlan = {
      originalProjectId: originalProject.id,
      title: `${originalProject.title} ${sequelNumber > 2 ? sequelNumber : 'II'}`,
      description: `The highly anticipated sequel to the successful "${originalProject.title}"`,
      budget: metrics.estimatedBudget,
      timeline: 32, // 32 weeks standard development
      returningCast,
      sequelNumber,
      marketingHook: generateMarketingHook(originalProject, sequelNumber)
    };
    
    setSequelPlan(plan);
    setSelectedProject(originalProject);
    setIsCreating(true);
  };

  const generateMarketingHook = (originalProject: Project, sequelNumber: number): string => {
    const hooks = [
      `The story continues...`,
      `${sequelNumber === 2 ? 'The saga expands' : 'The epic conclusion'}`,
      `Bigger, bolder, more explosive`,
      `The next chapter in the ${originalProject.title} universe`,
      `Everything you loved, taken further`
    ];
    
    return hooks[Math.floor(Math.random() * hooks.length)];
  };

  // Negotiate with returning cast member
  const negotiateWithCast = (characterId: string, talentId: string) => {
    if (!sequelPlan) return;
    
    const talent = gameState.talent.find(t => t.id === talentId);
    if (!talent) return;
    
    // Simple negotiation simulation
    const originalCharacter = selectedProject?.script?.characters?.find(c => c.id === characterId);
    const sequelSuccess = Math.random();
    
    let status: 'accepted' | 'declined' | 'renegotiating' = 'accepted';
    
    // Factors affecting negotiation
    if (talent.reputation > 80 && Math.random() < 0.3) {
      status = 'renegotiating'; // High-profile talent wants better terms
    } else if (sequelSuccess < 0.15) {
      status = 'declined'; // 15% chance of declining
    }
    
    setSequelPlan(prev => prev ? {
      ...prev,
      returningCast: prev.returningCast.map(cast => 
        cast.characterId === characterId && cast.talentId === talentId
          ? { ...cast, negotiationStatus: status, confirmed: status === 'accepted' }
          : cast
      )
    } : null);
    
    toast({
      title: `${talent.name} ${status === 'accepted' ? 'Accepts' : status === 'declined' ? 'Declines' : 'Wants to Renegotiate'}`,
      description: status === 'accepted' 
        ? `Ready to return as ${originalCharacter?.name}`
        : status === 'declined'
        ? 'Will not be returning for the sequel'
        : 'Seeking better terms for sequel participation',
      variant: status === 'declined' ? 'destructive' : 'default'
    });
  };

  // Create the sequel script and project
  const createSequel = () => {
    if (!sequelPlan || !selectedProject) return;
    
    // Check budget
    if (sequelPlan.budget > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Need $${(sequelPlan.budget / 1000000).toFixed(1)}M to develop sequel`,
        variant: "destructive"
      });
      return;
    }
    
    // Ensure franchise exists or create one
    let franchiseId = selectedProject.script?.franchiseId;
    if (!franchiseId) {
      const expectedTitle = `${selectedProject.title} Universe`;

      const existing = gameState.franchises.find((f) =>
        f.creatorStudioId === gameState.studio.id &&
        (f.title === expectedTitle || (f.entries || []).includes(selectedProject.id))
      );

      if (existing) {
        franchiseId = existing.id;
        appendFranchiseEntry(existing.id, selectedProject.id);
      } else {
        // Create franchise from successful original
        franchiseId = `franchise-${selectedProject.id}-${Date.now()}`;
        const newFranchise: Franchise = {
          id: franchiseId,
          title: expectedTitle,
          description: `Franchise based on the successful film "${selectedProject.title}"`,
          originDate: new Date().toISOString().split('T')[0],
          creatorStudioId: gameState.studio.id,
          genre: selectedProject.script?.genre ? [selectedProject.script.genre] : ['action'],
          tone: 'light', // Convert to valid franchise tone
          entries: [selectedProject.id],
          status: 'active',
          franchiseTags: ['sequel-ready', 'successful'],
          culturalWeight: Math.min(90, 50 + ((selectedProject.metrics?.criticsScore || 0) / 2)),
          cost: 0
        };
        
        // Add franchise to game state and update original project if callback provided
        onCreateFranchise?.(newFranchise);
      }

      // Update original project to include franchise connection
      const updatedOriginalProject = {
        ...selectedProject,
        script: {
          ...selectedProject.script!,
          franchiseId
        },
        franchisePosition: 1
      };
      replaceProject(updatedOriginalProject);
    }
    
    const sequelScript: Script = {
      id: `script-sequel-${Date.now()}`,
      title: sequelPlan.title,
      genre: selectedProject.script?.genre || 'action',
      logline: sequelPlan.description,
      writer: selectedProject.script?.writer || 'Studio Writer',
      pages: 120,
      quality: Math.max(60, (selectedProject.script?.quality || 70) - 5), // Slight quality penalty
      budget: sequelPlan.budget,
      developmentStage: 'concept',
      themes: selectedProject.script?.themes || ['adventure', 'friendship'],
      targetAudience: selectedProject.script?.targetAudience || 'general',
      estimatedRuntime: (selectedProject.script?.estimatedRuntime || 120) + 10, // Slightly longer
      characteristics: {
        tone: selectedProject.script?.characteristics?.tone || 'balanced',
        pacing: 'fast-paced',
        dialogue: selectedProject.script?.characteristics?.dialogue || 'naturalistic',
        visualStyle: selectedProject.script?.characteristics?.visualStyle || 'realistic',
        commercialAppeal: Math.min(10, (selectedProject.script?.characteristics?.commercialAppeal || 6) + 1),
        criticalPotential: Math.max(1, (selectedProject.script?.characteristics?.criticalPotential || 5) - 1),
        cgiIntensity: 'moderate'
      },
      characters: (selectedProject.script?.characters || []).map(char => ({
        ...char,
        id: `sequel-char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        // Keep assigned talent if they're confirmed for sequel
        assignedTalentId: sequelPlan.returningCast.find(cast => 
          cast.characterId === char.id && cast.confirmed
        )?.talentId || undefined,
        // Update character for sequel context
        description: `${char.description} (returning character)`
      })),
      franchiseId,
      sourceType: 'franchise'
    };
    
    onProjectCreate(sequelScript);
    
    toast({
      title: "Sequel In Development",
      description: `"${sequelPlan.title}" has entered development with ${sequelPlan.returningCast.filter(c => c.confirmed).length} returning cast members`,
    });
    
    setIsCreating(false);
    setSequelPlan(null);
    setSelectedProject(null);
  };

  const eligibleProjects = getSequelEligibleProjects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Sequel Management
            <Badge variant="outline">
              {eligibleProjects.length} Eligible Films
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Develop sequels to successful films. Profitable franchises with returning cast create audience anticipation and box office success.
          </p>
        </CardContent>
      </Card>

      {/* Sequel Development Dialog */}
      {isCreating && sequelPlan && selectedProject && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle>Developing: {sequelPlan.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Sequel Title</Label>
                <Input
                  value={sequelPlan.title}
                  onChange={(e) => setSequelPlan(prev => prev ? {...prev, title: e.target.value} : null)}
                />
              </div>
              <div>
                <Label>Budget Estimate</Label>
                <Input
                  type="number"
                  value={sequelPlan.budget}
                  onChange={(e) => setSequelPlan(prev => prev ? {...prev, budget: parseInt(e.target.value)} : null)}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={sequelPlan.description}
                onChange={(e) => setSequelPlan(prev => prev ? {...prev, description: e.target.value} : null)}
              />
            </div>

            <div>
              <Label>Marketing Hook</Label>
              <Input
                value={sequelPlan.marketingHook}
                onChange={(e) => setSequelPlan(prev => prev ? {...prev, marketingHook: e.target.value} : null)}
              />
            </div>

            {/* Returning Cast Negotiations */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Returning Cast ({sequelPlan.returningCast.filter(c => c.confirmed).length}/{sequelPlan.returningCast.length} confirmed)
              </h4>
              
              <div className="space-y-3">
                {sequelPlan.returningCast.map(cast => {
                  const talent = gameState.talent.find(t => t.id === cast.talentId);
                  const character = selectedProject.script?.characters?.find(c => c.id === cast.characterId);
                  
                  if (!talent || !character) return null;
                  
                  return (
                    <div key={`${cast.characterId}-${cast.talentId}`} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{talent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            as {character.name} • ${(talent.marketValue / 1000000).toFixed(1)}M value
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          cast.negotiationStatus === 'accepted' ? 'default' :
                          cast.negotiationStatus === 'declined' ? 'destructive' :
                          cast.negotiationStatus === 'renegotiating' ? 'secondary' : 'outline'
                        }>
                          {cast.negotiationStatus}
                        </Badge>
                        
                        {cast.negotiationStatus === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => negotiateWithCast(cast.characterId, cast.talentId)}
                          >
                            Negotiate
                          </Button>
                        )}
                        
                        {cast.negotiationStatus === 'renegotiating' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => negotiateWithCast(cast.characterId, cast.talentId)}
                          >
                            Renegotiate
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={createSequel}
                disabled={sequelPlan.budget > gameState.studio.budget}
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Development (${(sequelPlan.budget / 1000000).toFixed(1)}M)
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eligible Projects for Sequels */}
      <div className="grid gap-4">
        {eligibleProjects.map(project => {
          const metrics = getSequelMetrics(project);
          const existingSequels = getExistingSequels(project);
          
          return (
            <Card key={project.id} className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      {project.title}
                      {project.script?.franchiseId && (
                        <Badge variant="outline">Franchise</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      ${((project.metrics?.boxOfficeTotal || 0) / 1000000).toFixed(1)}M box office • 
                      {metrics.profitability}% profit • 
                      {metrics.weeksSinceRelease} weeks since release
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={metrics.optimalTiming ? "default" : "outline"}>
                      {metrics.optimalTiming ? 'Optimal Timing' : 'Consider Timing'}
                    </Badge>
                    <div className="text-right text-sm">
                      <div className="font-medium">Sequel Demand: {metrics.sequelDemand}%</div>
                      <div className="text-muted-foreground">Est. Budget: ${(metrics.estimatedBudget / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Cast Available:</span>
                      <span className="ml-1 font-medium">
                        {(project.script?.characters || []).filter(c => {
                          if (!c.assignedTalentId) return false;
                          const t = gameState.talent.find(x => x.id === c.assignedTalentId);
                          return !!t && isTalentAvailable(gameState, t);
                        }).length}/{(project.script?.characters || []).filter(c => c.assignedTalentId).length}
                      </span>
                    </div>
                    
                    {existingSequels.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Existing Sequels:</span>
                        <span className="ml-1 font-medium">{existingSequels.length}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => startSequelDevelopment(project)}
                    disabled={metrics.estimatedBudget > gameState.studio.budget}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Develop Sequel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Eligible Projects */}
      {eligibleProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Film className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Films Ready for Sequels</h3>
            <p className="text-muted-foreground">
              Create successful films (1.3x+ box office return, 55+ critic or 60+ audience score) to unlock sequel opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};