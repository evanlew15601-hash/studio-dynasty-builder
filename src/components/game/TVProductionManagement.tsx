import React, { useState } from 'react';
import { GameState, TalentPerson, Project, Script } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Camera, Edit, Users, Star, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TVProductionManagementProps {
  gameState: GameState;
  onUpdateBudget: (amount: number) => void;
  onGameStateUpdate: (updates: Partial<GameState>) => void;
}

export const TVProductionManagement: React.FC<TVProductionManagementProps> = ({
  gameState,
  onUpdateBudget,
  onGameStateUpdate
}) => {
  const { toast } = useToast();

  const getTVProjects = (): Project[] => {
    return gameState.projects?.filter(p =>
      p.type === 'series' || p.type === 'limited-series'
    ) || [];
  };

  const getReadyTVScripts = (): Script[] => {
    const projectScriptIds = getTVProjects().map(p => p.script.id);
    return gameState.scripts?.filter(s => 
      s.developmentStage === 'final' && 
      !projectScriptIds.includes(s.id)
    ) || [];
  };

  const startProduction = (script: Script) => {
    if (gameState.studio.budget < script.budget) {
      toast({
        title: "Insufficient Budget",
        description: "Not enough budget to start this TV production",
        variant: "destructive"
      });
      return;
    }

    // Create minimal project that satisfies interface
    const newProject: Project = {
      id: `tv-${Date.now()}`,
      title: script.title,
      script: script,
      type: 'series' as const,
      currentPhase: 'pre-production' as const,
      budget: {
        total: script.budget,
        allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
        spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
        overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }
      },
      cast: [],
      crew: [],
      timeline: {
        preProduction: { start: new Date(), end: new Date() },
        principalPhotography: { start: new Date(), end: new Date() },
        postProduction: { start: new Date(), end: new Date() },
        release: new Date(),
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
        marketingBudget: script.budget * 0.1
      },
      status: 'pre-production' as const,
      metrics: {},
      phaseDuration: 8,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 80,
        issues: []
      }
    };

    const updatedProjects = [...gameState.projects, newProject];
    const updatedBudget = gameState.studio.budget - script.budget;

    onGameStateUpdate({
      projects: updatedProjects,
      studio: { ...gameState.studio, budget: updatedBudget }
    });

    toast({
      title: "Production Started",
      description: `"${script.title}" has entered pre-production`,
    });
  };

  const tvProjects = getTVProjects();
  const readyScripts = getReadyTVScripts();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>TV Productions ({tvProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tvProjects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No TV productions currently in progress
            </p>
          ) : (
            <div className="space-y-4">
              {tvProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{project.title}</h3>
                    <div className="text-sm text-muted-foreground">
                      {project.script.genre} • ${(project.budget?.total || project.script.budget) / 1000000}M
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ready to Produce ({readyScripts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {readyScripts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No TV scripts ready for production
            </p>
          ) : (
            <div className="space-y-4">
              {readyScripts.map((script) => (
                <Card key={script.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{script.title}</h3>
                        <div className="text-sm text-muted-foreground">
                          {script.genre} • ${script.budget / 1000000}M
                        </div>
                      </div>
                      <Button 
                        onClick={() => startProduction(script)}
                        disabled={gameState.studio.budget < script.budget}
                        size="sm"
                      >
                        Start Production
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};