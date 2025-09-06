import React, { useState } from 'react';
import { GameState, Project, Script } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TVShowDevelopment } from './TVShowDevelopment';
import { TVProductionManagement } from './TVProductionManagement';
import { AITelevisionStudios } from './AITelevisionStudios';
import { 
  Tv, 
  Monitor,
  TrendingUp,
  Building
} from 'lucide-react';

interface ComprehensiveTelevisionSystemProps {
  gameState: GameState;
  onUpdateBudget: (amount: number) => void;
  onGameStateUpdate: (updates: Partial<GameState>) => void;
  onTalentCommitmentChange?: (talentId: string, busy: boolean, project?: string) => void;
}

export const ComprehensiveTelevisionSystem: React.FC<ComprehensiveTelevisionSystemProps> = ({
  gameState,
  onUpdateBudget,
  onGameStateUpdate,
  onTalentCommitmentChange
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleTVProjectCreate = (script: Script) => {
    // Create TV project properly integrated with the game system
    const newProject: Project = {
      id: `tv-project-${Date.now()}`,
      title: script.title,
      script: script,
      type: 'series',
      currentPhase: 'development',
      budget: {
        total: script.budget * 13, // Season budget (13 episodes)
        allocated: {
          aboveTheLine: script.budget * 13 * 0.3,
          belowTheLine: script.budget * 13 * 0.4,
          postProduction: script.budget * 13 * 0.15,
          marketing: script.budget * 13 * 0.1,
          distribution: script.budget * 13 * 0.03,
          contingency: script.budget * 13 * 0.02
        },
        spent: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        }
      },
      cast: [],
      crew: [],
      timeline: {
        preProduction: {
          start: new Date(),
          end: new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000) // 6 weeks
        },
        principalPhotography: {
          start: new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 18 * 7 * 24 * 60 * 60 * 1000) // 12 weeks
        },
        postProduction: {
          start: new Date(Date.now() + 18 * 7 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 26 * 7 * 24 * 60 * 60 * 1000) // 8 weeks
        },
        release: new Date(Date.now() + 30 * 7 * 24 * 60 * 60 * 1000), // 30 weeks total
        milestones: []
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'streaming',
          type: 'streaming',
          revenue: {
            type: 'subscription-share',
            studioShare: 60
          }
        },
        international: [],
        windows: [],
        marketingBudget: script.budget * 13 * 0.1
      },
      status: 'development',
      metrics: {},
      phaseDuration: 8, // 8 weeks in development
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 80,
        issues: []
      },
      castingConfirmed: false
    };

    // Deduct development budget (10% of total season budget)
    const developmentCost = newProject.budget.total * 0.1;
    
    if (gameState.studio.budget < developmentCost) {
      return; // Error handling done in TVShowDevelopment
    }

    const updatedProjects = [...gameState.projects, newProject];
    const updatedBudget = gameState.studio.budget - developmentCost;

    onGameStateUpdate({
      projects: updatedProjects,
      studio: { ...gameState.studio, budget: updatedBudget }
    });

    // Also update budget via the prop
    onUpdateBudget(-developmentCost);
  };

  const handleTVProjectUpdate = (updatedProject: Project) => {
    const updatedProjects = gameState.projects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    );

    onGameStateUpdate({
      projects: updatedProjects
    });
  };

  const handleTVScriptUpdate = (script: Script) => {
    const updatedScripts = gameState.scripts.some(s => s.id === script.id)
      ? gameState.scripts.map(s => s.id === script.id ? script : s)
      : [...gameState.scripts, script];

    onGameStateUpdate({
      scripts: updatedScripts
    });
  };

  // Get TV-specific projects for selection
  const tvProjects = gameState.projects.filter(p => 
    p.type === 'series' || p.type === 'limited-series'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold studio-title bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Television & Streaming
          </h1>
          <p className="text-muted-foreground mt-2">Develop and produce episodic content for television and streaming platforms</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">TV Projects</p>
            <p className="text-2xl font-bold">{tvProjects.length}</p>
          </div>
          <Tv className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      {/* TV Development Tabs */}
      <Tabs defaultValue="development" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="development" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Script Development
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Tv className="h-4 w-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="competition" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            AI Studios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="development">
          <TVShowDevelopment
            gameState={gameState}
            onProjectCreate={handleTVProjectCreate}
            onScriptUpdate={handleTVScriptUpdate}
          />
        </TabsContent>

        <TabsContent value="production">
          <TVProductionManagement
            gameState={gameState}
            selectedProject={selectedProject}
            onProjectUpdate={handleTVProjectUpdate}
          />
        </TabsContent>

        <TabsContent value="competition">
          <AITelevisionStudios
            gameState={gameState}
            onGameStateUpdate={onGameStateUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};