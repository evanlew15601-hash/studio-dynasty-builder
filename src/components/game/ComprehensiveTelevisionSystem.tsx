import React, { useState, useEffect } from 'react';
import { GameState, Project, Script } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TVShowDevelopment } from './TVShowDevelopment';
import { TVProductionManagement } from './TVProductionManagement';
import { AITelevisionStudios } from './AITelevisionStudios';
import { MarketingReleaseManagement } from './MarketingReleaseManagement';
import { EpisodeTrackingSystem } from './EpisodeTrackingSystem';
import { StreamingAnalyticsDashboard } from './StreamingAnalyticsDashboard';
import { StreamingContractSystem } from './StreamingContractSystem';
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
  onCreateTVProject: (script: Script) => void;
  selectedFranchise?: string | null;
  selectedPublicDomain?: string | null;
}

export const ComprehensiveTelevisionSystem: React.FC<ComprehensiveTelevisionSystemProps> = ({
  gameState,
  onUpdateBudget,
  onGameStateUpdate,
  onTalentCommitmentChange,
  onCreateTVProject,
  selectedFranchise,
  selectedPublicDomain
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="development" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Script Development
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Tv className="h-4 w-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Marketing &amp; Release
          </TabsTrigger>
          <TabsTrigger value="episodes" className="flex items-center gap-2">
            <Tv className="h-4 w-4" />
            Episodes &amp; Ratings
          </TabsTrigger>
          <TabsTrigger value="streaming" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Streaming Deals
          </TabsTrigger>
          {import.meta.env.DEV && (
            <TabsTrigger value="competition" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              AI Studios
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="development">
          <TVShowDevelopment
            gameState={gameState}
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onProjectCreate={onCreateTVProject}
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

        <TabsContent value="marketing">
          <MarketingReleaseManagement
            gameState={gameState}
            projectTypeFilter="tv"
            onProjectUpdate={(project, marketingCost) => {
              handleTVProjectUpdate(project);
              if (marketingCost) {
                onUpdateBudget(-marketingCost);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="episodes">
          <div className="space-y-6">
            <EpisodeTrackingSystem
              gameState={gameState}
              onProjectUpdate={(projectId, updates) => {
                const project = gameState.projects.find(p => p.id === projectId);
                if (!project) return;
                handleTVProjectUpdate({ ...project, ...updates });
              }}
            />
            <StreamingAnalyticsDashboard gameState={gameState} />
          </div>
        </TabsContent>

        <TabsContent value="streaming">
          <StreamingContractSystem
            gameState={gameState}
            onProjectUpdate={(projectId, updates) => {
              const project = gameState.projects.find(p => p.id === projectId);
              if (!project) return;
              handleTVProjectUpdate({ ...project, ...updates });
            }}
            onUpdateBudget={onUpdateBudget}
          />
        </TabsContent>

        {import.meta.env.DEV && (
          <TabsContent value="competition">
            <AITelevisionStudios
              gameState={gameState}
              onGameStateUpdate={onGameStateUpdate}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};