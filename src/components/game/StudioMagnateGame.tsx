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
import { 
  StudioIcon, 
  ScriptIcon, 
  CastingIcon, 
  ProductionIcon, 
  DistributionIcon,
  BudgetIcon,
  ReputationIcon,
  ClapperboardIcon
} from '@/components/ui/icons';

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
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [
      // Sample talent pool
      {
        id: 'talent-1',
        name: 'Alexandra Sterling',
        type: 'actor',
        age: 28,
        experience: 5,
        reputation: 75,
        marketValue: 2500000,
        contractStatus: 'available',
        genres: ['drama', 'thriller'],
        awards: ['Golden Globe'],
        traits: ['Method Actor', 'Media Darling'],
        agent: 'CAA',
        availability: { start: new Date(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      },
      {
        id: 'talent-2',
        name: 'Marcus Chen',
        type: 'director',
        age: 45,
        experience: 15,
        reputation: 85,
        marketValue: 5000000,
        contractStatus: 'available',
        genres: ['action', 'sci-fi'],
        awards: ['Emmy', 'Directors Guild'],
        traits: ['Visionary', 'Budget Conscious'],
        agent: 'WME',
        availability: { start: new Date(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      },
      {
        id: 'talent-3',
        name: 'Isabella Rodriguez',
        type: 'actor',
        age: 35,
        experience: 12,
        reputation: 80,
        marketValue: 4000000,
        contractStatus: 'available',
        genres: ['comedy', 'drama'],
        awards: ['SAG Award', 'Critics Choice'],
        traits: ['Versatile', 'Box Office Draw'],
        agent: 'UTA',
        availability: { start: new Date(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      }
    ],
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

  const handleAdvanceWeek = () => {
    setGameState(prev => {
      const newWeek = prev.currentWeek === 52 ? 1 : prev.currentWeek + 1;
      const newYear = prev.currentWeek === 52 ? prev.currentYear + 1 : prev.currentYear;
      const newQuarter = Math.ceil(newWeek / 13);
      
      // Weekly income based on reputation and ongoing projects
      const weeklyIncome = 200000 + (prev.studio.reputation * 10000) + (prev.projects.length * 50000);
      
      return {
        ...prev,
        currentWeek: newWeek,
        currentQuarter: newQuarter,
        currentYear: newYear,
        studio: {
          ...prev.studio,
          budget: prev.studio.budget + weeklyIncome
        }
      };
    });

    toast({
      title: "New Week",
      description: `Week ${gameState.currentWeek === 52 ? 1 : gameState.currentWeek + 1}, ${gameState.currentWeek === 52 ? gameState.currentYear + 1 : gameState.currentYear}`,
    });
  };

  return (
    <div className="min-h-screen bg-background font-studio">
      {/* Studio Header */}
      <div className="border-b border-border/50 card-premium backdrop-blur-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-golden shadow-golden animate-glow">
                  <ClapperboardIcon className="text-primary-foreground" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold studio-title bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {gameState.studio.name}
                  </div>
                  <div className="text-sm text-muted-foreground studio-mono">
                    Week {gameState.currentWeek}, Q{gameState.currentQuarter} {gameState.currentYear} • Est. {gameState.studio.founded}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <BudgetIcon className="text-primary" size={16} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Budget:</span>{' '}
                  <span className="studio-mono font-semibold text-primary">
                    ${(gameState.studio.budget / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <ReputationIcon className="text-accent" size={16} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Reputation:</span>{' '}
                  <span className="studio-mono font-semibold text-accent">
                    {gameState.studio.reputation}/100
                  </span>
                </div>
              </div>
              
              <Button 
                size="sm" 
                onClick={handleAdvanceWeek}
                className="btn-studio shadow-golden hover:animate-glow transition-all duration-300"
              >
                <BudgetIcon className="mr-2" size={16} />
                Advance Week
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-border/30 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: 'Studio Dashboard', IconComponent: StudioIcon },
              { id: 'scripts', label: 'Script Development', IconComponent: ScriptIcon },
              { id: 'casting', label: 'Casting Board', IconComponent: CastingIcon },
              { id: 'production', label: 'Production', IconComponent: ProductionIcon },
              { id: 'distribution', label: 'Distribution', IconComponent: DistributionIcon },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`rounded-none border-b-2 px-6 py-4 font-medium transition-all duration-300 ${
                  currentPhase === tab.id 
                    ? 'border-primary bg-gradient-to-t from-primary/20 to-primary/10 text-primary shadow-lg' 
                    : 'border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium'
                }`}
                onClick={() => handlePhaseChange(tab.id as typeof currentPhase)}
              >
                <tab.IconComponent className="mr-3" size={18} />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 animate-slide-up">
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