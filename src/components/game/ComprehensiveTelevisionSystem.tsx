import React from 'react';
import { Script } from '@/types/game';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/game/store';
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
  onCreateTVProject: (script: Script) => void;
  selectedFranchise?: string | null;
  selectedPublicDomain?: string | null;
}

export const ComprehensiveTelevisionSystem: React.FC<ComprehensiveTelevisionSystemProps> = ({
  onCreateTVProject,
  selectedFranchise,
  selectedPublicDomain
}) => {
  const gameState = useGameStore((s) => s.game);
  const mergeGameState = useGameStore((s) => s.mergeGameState);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const updateProject = useGameStore((s) => s.updateProject);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading television systems...</div>;
  }

  

  

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
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onProjectCreate={onCreateTVProject}
          />
        </TabsContent>

        <TabsContent value="production">
          <TVProductionManagement />
        </TabsContent>

        <TabsContent value="marketing">
          <MarketingReleaseManagement
            projectTypeFilter="tv"
          />
        </TabsContent>

        <TabsContent value="episodes">
          <div className="space-y-6">
            <EpisodeTrackingSystem />
            <StreamingAnalyticsDashboard />
          </div>
        </TabsContent>

        <TabsContent value="streaming">
          <StreamingContractSystem
            onProjectUpdate={(projectId, updates) => updateProject(projectId, updates)}
            onUpdateBudget={updateBudget}
          />
        </TabsContent>

        {import.meta.env.DEV && (
          <TabsContent value="competition">
            <AITelevisionStudios
              gameState={gameState}
              onGameStateUpdate={mergeGameState}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};