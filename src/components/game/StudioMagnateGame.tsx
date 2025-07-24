import React, { useState } from 'react';
import { GameState, Studio, Project, Script, TalentPerson } from '@/types/game';
import { ScriptDevelopment } from './ScriptDevelopment';
import { CastingBoard } from './CastingBoard';
import { ProductionManagement } from './ProductionManagement';
import { DistributionDashboard } from './DistributionDashboard';
import { StudioDashboard } from './StudioDashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface StudioMagnateGameProps {
  onPhaseChange?: (phase: string) => void;
}

export const StudioMagnateGame: React.FC<StudioMagnateGameProps> = ({ onPhaseChange }) => {
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<GameState>(() => ({
    studio: {
      id: 'player-studio',
      name: 'Untitled Pictures',
      reputation: 50,
      budget: 10000000, // $10M starting budget
      founded: new Date().getFullYear(),
      specialties: ['drama']
    },
    currentYear: new Date().getFullYear(),
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['action', 'drama', 'comedy'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: []
    },
    eventQueue: []
  }));

  const [currentPhase, setCurrentPhase] = useState<'dashboard' | 'scripts' | 'casting' | 'production' | 'distribution'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handlePhaseChange = (phase: typeof currentPhase) => {
    setCurrentPhase(phase);
    onPhaseChange?.(phase);
  };

  const handleProjectCreate = (script: Script) => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: script.title,
      script,
      type: 'feature',
      currentPhase: 'development',
      budget: {
        total: script.budget,
        allocated: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
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
          end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        },
        principalPhotography: {
          start: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000)
        },
        postProduction: {
          start: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000)
        },
        release: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        milestones: []
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'Theatrical',
          type: 'theatrical',
          revenue: {
            type: 'box-office',
            studioShare: 50
          }
        },
        international: [],
        windows: [],
        marketingBudget: script.budget * 0.5
      },
      status: 'development',
      metrics: {}
    };

    setGameState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      studio: {
        ...prev.studio,
        budget: prev.studio.budget - script.budget * 0.1 // 10% development cost
      }
    }));

    setSelectedProject(newProject);
    toast({
      title: "Project Greenlit!",
      description: `"${script.title}" has entered development.`,
    });
  };

  const handleStudioUpdate = (updates: Partial<Studio>) => {
    setGameState(prev => ({
      ...prev,
      studio: { ...prev.studio, ...updates }
    }));
  };

  const handleAdvanceQuarter = () => {
    setGameState(prev => {
      const newQuarter = prev.currentQuarter === 4 ? 1 : prev.currentQuarter + 1;
      const newYear = prev.currentQuarter === 4 ? prev.currentYear + 1 : prev.currentYear;
      
      return {
        ...prev,
        currentQuarter: newQuarter,
        currentYear: newYear,
        studio: {
          ...prev.studio,
          budget: prev.studio.budget + 2000000 // Quarterly income
        }
      };
    });

    toast({
      title: "Time Advances",
      description: `Welcome to Q${gameState.currentQuarter === 4 ? 1 : gameState.currentQuarter + 1} ${gameState.currentQuarter === 4 ? gameState.currentYear + 1 : gameState.currentYear}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Studio Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold bg-gradient-golden bg-clip-text text-transparent">
                🎬 {gameState.studio.name}
              </div>
              <div className="text-sm text-muted-foreground">
                Q{gameState.currentQuarter} {gameState.currentYear}
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-muted-foreground">Budget:</span>{' '}
                <span className="font-mono text-primary">
                  ${(gameState.studio.budget / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Reputation:</span>{' '}
                <span className="font-mono text-accent">
                  {gameState.studio.reputation}/100
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAdvanceQuarter}
                className="border-primary/20 hover:border-primary/40"
              >
                Advance Quarter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-6">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: 'Studio Dashboard', icon: '🏢' },
              { id: 'scripts', label: 'Script Development', icon: '📝' },
              { id: 'casting', label: 'Casting Board', icon: '🎭' },
              { id: 'production', label: 'Production', icon: '🎬' },
              { id: 'distribution', label: 'Distribution', icon: '📺' },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={currentPhase === tab.id ? 'default' : 'ghost'}
                className={`rounded-none border-b-2 ${
                  currentPhase === tab.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-transparent hover:border-primary/30'
                }`}
                onClick={() => handlePhaseChange(tab.id as typeof currentPhase)}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {currentPhase === 'dashboard' && (
          <StudioDashboard 
            gameState={gameState}
            onStudioUpdate={handleStudioUpdate}
            onProjectSelect={setSelectedProject}
          />
        )}
        
        {currentPhase === 'scripts' && (
          <ScriptDevelopment 
            gameState={gameState}
            onProjectCreate={handleProjectCreate}
            onScriptUpdate={(script) => {
              setGameState(prev => ({
                ...prev,
                scripts: prev.scripts.some(s => s.id === script.id)
                  ? prev.scripts.map(s => s.id === script.id ? script : s)
                  : [...prev.scripts, script]
              }));
            }}
          />
        )}
        
        {currentPhase === 'casting' && (
          <CastingBoard 
            gameState={gameState}
            selectedProject={selectedProject}
            onProjectUpdate={(project) => {
              setGameState(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.id === project.id ? project : p)
              }));
              setSelectedProject(project);
            }}
            onTalentHire={(talent) => {
              setGameState(prev => ({
                ...prev,
                talent: prev.talent.some(t => t.id === talent.id)
                  ? prev.talent.map(t => t.id === talent.id ? talent : t)
                  : [...prev.talent, talent]
              }));
            }}
          />
        )}
        
        {currentPhase === 'production' && (
          <ProductionManagement 
            gameState={gameState}
            selectedProject={selectedProject}
            onProjectUpdate={(project) => {
              setGameState(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.id === project.id ? project : p)
              }));
              setSelectedProject(project);
            }}
          />
        )}
        
        {currentPhase === 'distribution' && (
          <DistributionDashboard 
            gameState={gameState}
            onProjectUpdate={(project) => {
              setGameState(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.id === project.id ? project : p)
              }));
            }}
          />
        )}
      </div>
    </div>
  );
};