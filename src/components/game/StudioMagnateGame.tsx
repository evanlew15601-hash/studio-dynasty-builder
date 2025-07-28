import React, { useState } from 'react';
import { GameState, Studio, Project, Script, TalentPerson, BoxOfficeWeek, BoxOfficeRelease, Genre } from '@/types/game';
import { ScriptDevelopment } from './ScriptDevelopment';
import { CastingBoard } from './CastingBoard';
import { ProductionManagement } from './ProductionManagement';
import { DistributionDashboard } from './DistributionDashboard';
import { MarketingReleaseManagement } from './MarketingReleaseManagement';
import { PostTheatricalManagement } from './PostTheatricalManagement';
import { StudioDashboard } from './StudioDashboard';
import { StudioStats } from './StudioStats';
import { TimeSystem, TimeState } from './TimeSystem';
import { BoxOfficeSystem } from './BoxOfficeSystem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  StudioIcon, 
  ScriptIcon, 
  CastingIcon, 
  ProductionIcon, 
  DistributionIcon,
  MarketingIcon,
  BudgetIcon,
  ReputationIcon,
  ClapperboardIcon,
  BarChartIcon
} from '@/components/ui/icons';

interface StudioMagnateGameProps {
  onPhaseChange?: (phase: string) => void;
}

export const StudioMagnateGame: React.FC<StudioMagnateGameProps> = ({ onPhaseChange }) => {
  const { toast } = useToast();
  
  const getPhaseWeeks = (phase: string): number => {
    switch (phase) {
      case 'development': return 8;
      case 'pre-production': return 6;
      case 'production': return 12;
      case 'post-production': return 16;
      case 'marketing': return 4;
      case 'release': return 2;
      case 'distribution': return 8;
      default: return 1;
    }
  };
  
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
    eventQueue: [],
    boxOfficeHistory: []
  }));

  const [currentPhase, setCurrentPhase] = useState<'dashboard' | 'scripts' | 'casting' | 'production' | 'marketing' | 'distribution' | 'stats'>('dashboard');
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
      phaseDuration: getPhaseWeeks('development'),
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 25, // Script exists but needs polish
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 80, // Need 80% to advance
        issues: []
      },
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

  const processWeeklyProjectEffects = (projects: Project[], timeState: TimeState): Project[] => {
    console.log(`=== WEEKLY PROJECT PROCESSING START ===`);
    console.log(`Time State:`, timeState);
    console.log(`Number of projects:`, projects.length);
    
    const results = projects.map((project, index) => {
      console.log(`[${index}] Processing project: ${project.title}`);
      console.log(`  Status: ${project.status}, Phase: ${project.currentPhase}`);
      console.log(`  Release Week: ${project.releaseWeek}, Release Year: ${project.releaseYear}`);
      console.log(`  In Theaters: ${project.metrics?.inTheaters}`);
      
      let updatedProject = { ...project };

      // Handle development progress for development phase
      if (project.currentPhase === 'development') {
        updatedProject = processDevelopmentProgress(project, timeState.currentWeek);
      }
      
      // COMPLETELY REWRITTEN BOX OFFICE SYSTEM
      if (project.status === 'released') {
        console.log(`  → Processing box office for ${project.title}`);
        console.log(`    Before processing - inTheaters: ${updatedProject.metrics?.inTheaters}, boxOffice: ${updatedProject.metrics?.boxOfficeTotal}`);
        
        updatedProject = BoxOfficeSystem.processWeeklyRevenue(
          updatedProject, 
          timeState.currentWeek, 
          timeState.currentYear
        );
        
        console.log(`    After processing - inTheaters: ${updatedProject.metrics?.inTheaters}, boxOffice: ${updatedProject.metrics?.boxOfficeTotal}`);
      }

      // Process marketing campaign activities
      if (updatedProject.marketingCampaign) {
        const updatedActivities = updatedProject.marketingCampaign.activities.map(activity => ({
          ...activity,
          weeksRemaining: Math.max(0, activity.weeksRemaining - 1),
          status: activity.weeksRemaining <= 1 ? 'completed' as const : activity.status
        }));

        updatedProject = {
          ...updatedProject,
          marketingCampaign: {
            ...updatedProject.marketingCampaign,
            activities: updatedActivities,
            weeksRemaining: Math.max(0, updatedProject.marketingCampaign.weeksRemaining - 1)
          }
        };
      }

      // Process post-theatrical releases
      if (updatedProject.postTheatricalReleases) {
        const updatedReleases = updatedProject.postTheatricalReleases.map(release => {
          if (release.status === 'active') {
            const newWeeksActive = release.weeksActive + 1;
            const newRevenue = release.revenue + release.weeklyRevenue;
            
            let newStatus: 'planned' | 'active' | 'declining' | 'ended' = release.status;
            if (newWeeksActive >= 52) newStatus = 'declining';
            else if (newWeeksActive >= 104) newStatus = 'ended';
            
            return {
              ...release,
              weeksActive: newWeeksActive,
              revenue: newRevenue,
              status: newStatus
            };
          }
          return release;
        });

        updatedProject = {
          ...updatedProject,
          postTheatricalReleases: updatedReleases
        };
      }

      // ROBUST TIMER SYSTEM - Process phase timers
      if (updatedProject.phaseDuration !== undefined && updatedProject.phaseDuration > 0) {
        const newPhaseDuration = updatedProject.phaseDuration - 1;
        
        if (newPhaseDuration === 0) {
          const nextPhase = getNextPhase(updatedProject.currentPhase);
          const nextDuration = getPhaseWeeks(nextPhase);
          
          updatedProject = {
            ...updatedProject,
            currentPhase: nextPhase,
            phaseDuration: nextDuration,
            status: nextPhase === 'distribution' ? 'released' : nextPhase as any
          };

          // FIXED: Films release 4 weeks in the future
          if (nextPhase === 'distribution') {
            const releaseWeek = timeState.currentWeek + 4; // 1 month later
            const releaseYear = releaseWeek > 52 ? timeState.currentYear + 1 : timeState.currentYear;
            const adjustedReleaseWeek = releaseWeek > 52 ? releaseWeek - 52 : releaseWeek;
            
            console.log(`  → Scheduling release for ${updatedProject.title} at Week ${adjustedReleaseWeek}, Year ${releaseYear}`);
            updatedProject = BoxOfficeSystem.initializeRelease(
              updatedProject,
              adjustedReleaseWeek,
              releaseYear
            );
            console.log(`    Release scheduled - inTheaters: ${updatedProject.metrics?.inTheaters}`);
          }
          
          toast({
            title: "Phase Complete!",
            description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}`,
          });
        } else {
          updatedProject = {
            ...updatedProject,
            phaseDuration: newPhaseDuration
          };
        }
      }

      console.log(`[${index}] Final result: ${updatedProject.title} - Phase: ${updatedProject.currentPhase}, Duration: ${updatedProject.phaseDuration}, InTheaters: ${updatedProject.metrics?.inTheaters}`);
      return updatedProject;
    });
    
    console.log(`=== WEEKLY PROJECT PROCESSING END ===`);
    return results;
  };
  
  const processWeeklyTalentEffects = (talent: TalentPerson[], currentWeek: number): TalentPerson[] => {
    return talent.map(person => {
      // Process contract expiry
      if (person.currentContractWeeks && person.currentContractWeeks > 0) {
        const newContractWeeks = person.currentContractWeeks - 1;
        
        if (newContractWeeks === 0) {
          return {
            ...person,
            contractStatus: 'available',
            currentContractWeeks: 0,
            weeklyOverhead: 0
          };
        }
        
        return {
          ...person,
          currentContractWeeks: newContractWeeks
        };
      }
      
      return person;
    });
  };
  
  const processWeeklyStudioEffects = (studio: Studio, projects: Project[], talent: TalentPerson[]): Studio => {
    // Calculate weekly income/expenses
    const projectIncome = projects
      .filter(p => p.status === 'released')
      .reduce((sum, p) => sum + (p.metrics.boxOfficeTotal || 0) * 0.02, 0); // 2% weekly residuals
      
    const talentOverhead = talent
      .reduce((sum, t) => sum + (t.weeklyOverhead || 0), 0);
      
    const operationalCosts = Math.max(50000, studio.budget * 0.001); // Base overhead
    
    // Apply penalties for idle studio
    const activeProjects = projects.filter(p => 
      p.status === 'development' || 
      p.status === 'production' || 
      p.status === 'pre-production'
    );
    
    const idlePenalty = activeProjects.length === 0 ? studio.reputation * 0.1 : 0;
    
    const netChange = projectIncome - talentOverhead - operationalCosts - idlePenalty;
    
    return {
      ...studio,
      budget: Math.max(0, studio.budget + netChange),
      reputation: Math.max(0, Math.min(100, studio.reputation - (idlePenalty > 0 ? 1 : 0)))
    };
  };
  
  const getNextPhase = (currentPhase: string): any => {
    switch (currentPhase) {
      case 'development': return 'pre-production';
      case 'pre-production': return 'production';
      case 'production': return 'post-production';
      case 'post-production': return 'marketing';
      case 'marketing': return 'release';
      case 'release': return 'distribution';
      default: return currentPhase;
    }
  };

  const processDevelopmentProgress = (project: Project, currentWeek: number): Project => {
    const progress = project.developmentProgress;
    
    // Weekly automatic progress based on budget and talent
    let weeklyIncrease = 5; // Base progress per week
    
    // Boost progress if talent attached
    if (project.cast.length > 0) weeklyIncrease += 3;
    if (project.crew.some(c => gameState.talent.find(t => t.id === c.talentId)?.type === 'director')) {
      weeklyIncrease += 5;
    }
    
    // Random development issues
    const newIssues = [...progress.issues];
    if (Math.random() < 0.1) { // 10% chance each week
      const issueTypes = ['budget', 'creative', 'talent', 'location', 'legal'];
      const randomType = issueTypes[Math.floor(Math.random() * issueTypes.length)] as any;
      
      newIssues.push({
        id: `issue-${Date.now()}`,
        type: randomType,
        description: getIssueDescription(randomType),
        severity: Math.random() < 0.3 ? 'high' : 'medium',
        weeksToResolve: Math.floor(Math.random() * 4) + 1,
        cost: Math.random() < 0.5 ? Math.floor(Math.random() * 100000) + 50000 : undefined,
        ignored: false,
        ignoredWeeks: 0,
        consequences: []
      });
    }
    
    // Process existing issues and apply consequences for ignored ones
    const processedIssues = newIssues.map(issue => {
      let updatedIssue = { ...issue };
      
      // Check if issue has been ignored for too long
      if (issue.ignored && issue.ignoredWeeks! > 0) {
        updatedIssue.ignoredWeeks = issue.ignoredWeeks! + 1;
        
        // Apply escalating consequences
        if (updatedIssue.ignoredWeeks >= 2) {
          const consequences = generateIssueConsequences(issue);
          updatedIssue.consequences = [...(issue.consequences || []), ...consequences];
        }
      } else {
        updatedIssue.weeksToResolve = Math.max(0, issue.weeksToResolve - 1);
      }
      
      return updatedIssue;
    }).filter(issue => issue.weeksToResolve > 0 || issue.ignored);
    
    const newProgress = {
      ...progress,
      scriptCompletion: Math.min(100, progress.scriptCompletion + weeklyIncrease),
      budgetApproval: project.cast.length > 0 ? Math.min(100, progress.budgetApproval + weeklyIncrease) : progress.budgetApproval,
      talentAttached: project.cast.length > 0 ? Math.min(100, progress.talentAttached + 10) : progress.talentAttached,
      locationSecured: Math.min(100, progress.locationSecured + weeklyIncrease),
      issues: processedIssues
    };
    
    // Don't auto-advance based on progress - only time-based advancement
    return {
      ...project,
      developmentProgress: newProgress,
      // Process marketing activities if they exist
      ...(project.marketingCampaign ? {
        marketingCampaign: {
          ...project.marketingCampaign,
          activities: project.marketingCampaign.activities.map(activity => ({
            ...activity,
            weeksRemaining: Math.max(0, activity.weeksRemaining - 1),
            status: activity.weeksRemaining <= 1 ? 'completed' as const : activity.status
          }))
        }
      } : {})
    };
  };
  
  const getIssueDescription = (type: string): string => {
    const descriptions = {
      budget: 'Studio executives questioning budget allocation',
      creative: 'Script revisions needed for marketability',
      talent: 'Key talent availability conflicts',
      location: 'Permit issues with primary shooting location',
      legal: 'Rights clearance complications'
    };
    return descriptions[type as keyof typeof descriptions] || 'Development complications';
  };
  
  const generateIssueConsequences = (issue: any): any[] => {
    const consequences = [];
    
    switch (issue.type) {
      case 'budget':
        consequences.push({
          type: 'budget-overrun',
          severity: issue.severity === 'high' ? 8 : 5,
          description: 'Budget overrun due to unresolved financial issues',
          budgetImpact: issue.cost ? issue.cost * 1.5 : 100000
        });
        break;
      case 'creative':
        consequences.push({
          type: 'quality-drop',
          severity: issue.severity === 'high' ? 7 : 4,
          description: 'Project quality degraded due to unresolved creative issues',
          qualityImpact: -10
        });
        break;
      case 'talent':
        consequences.push({
          type: 'talent-dissatisfaction',
          severity: issue.severity === 'high' ? 9 : 6,
          description: 'Talent relationship damaged due to ignored conflicts',
          reputationImpact: -5
        });
        break;
      case 'location':
        consequences.push({
          type: 'schedule-delay',
          severity: issue.severity === 'high' ? 8 : 5,
          description: 'Production delayed due to location complications',
          scheduleImpact: 2
        });
        break;
      case 'legal':
        consequences.push({
          type: 'budget-overrun',
          severity: 9,
          description: 'Legal fees and settlements due to ignored legal issues',
          budgetImpact: issue.cost ? issue.cost * 2 : 200000,
          reputationImpact: -3
        });
        break;
    }
    
    return consequences;
  };

  const getAverageProgress = (progress: any): number => {
    return (progress.scriptCompletion + progress.budgetApproval + progress.talentAttached + progress.locationSecured) / 4;
  };
  
  // REMOVED OLD BOX OFFICE FUNCTIONS - Now using BoxOfficeSystem class

  const processWeeklyMarketEffects = (conditions: GameState['marketConditions'], week: number): GameState['marketConditions'] => {
    const newConditions = { ...conditions };
    
    // Market trends shift every 4-8 weeks
    if (week % Math.floor(Math.random() * 5 + 4) === 0) {
      const allGenres: Genre[] = ['action', 'drama', 'comedy', 'horror', 'sci-fi', 'romance', 'thriller', 'fantasy'];
      const shuffled = allGenres.sort(() => 0.5 - Math.random());
      newConditions.trendingGenres = shuffled.slice(0, 3);
      
      toast({
        title: "Market Shift",
        description: `${newConditions.trendingGenres[0]} is now the hottest genre!`,
      });
    }
    
    // Economic climate changes every 12-20 weeks
    if (week % Math.floor(Math.random() * 9 + 12) === 0) {
      const climates = ['boom', 'stable', 'recession'];
      const currentIndex = climates.indexOf(conditions.economicClimate);
      
      // More likely to stay stable or shift gradually
      const random = Math.random();
      if (random < 0.4) {
        // Stay the same
      } else if (random < 0.7) {
        // Shift toward stability
        newConditions.economicClimate = 'stable';
      } else {
        // Random shift
        newConditions.economicClimate = climates[Math.floor(Math.random() * climates.length)] as any;
      }
      
      if (newConditions.economicClimate !== conditions.economicClimate) {
        toast({
          title: "Economic Shift",
          description: `Industry climate is now ${newConditions.economicClimate}`,
        });
      }
    }
    
    return newConditions;
  };

  const handleAdvanceWeek = () => {
    setGameState(prev => {
      // COMPLETELY REWRITTEN TIME SYSTEM
      const newTimeState = TimeSystem.advanceWeek({
        currentWeek: prev.currentWeek,
        currentYear: prev.currentYear,
        currentQuarter: prev.currentQuarter
      });
      
      // Process all weekly effects with new time system
      const updatedProjects = processWeeklyProjectEffects(prev.projects, newTimeState);
      const updatedTalent = processWeeklyTalentEffects(prev.talent, prev.currentWeek);
      const updatedStudio = processWeeklyStudioEffects(prev.studio, updatedProjects, updatedTalent);
      const updatedMarketConditions = processWeeklyMarketEffects(prev.marketConditions, newTimeState.currentWeek);
      
      // Update box office history
      const boxOfficeWeek = processWeeklyBoxOffice(updatedProjects, newTimeState.currentWeek, newTimeState.currentYear);
      const updatedHistory = [...prev.boxOfficeHistory];
      if (boxOfficeWeek.releases.length > 0) {
        updatedHistory.push(boxOfficeWeek);
      }
      
      const newState = {
        ...prev,
        currentWeek: newTimeState.currentWeek,
        currentYear: newTimeState.currentYear,
        currentQuarter: newTimeState.currentQuarter,
        projects: updatedProjects,
        talent: updatedTalent,
        studio: updatedStudio,
        marketConditions: updatedMarketConditions,
        boxOfficeHistory: updatedHistory.slice(-52) // Keep last year
      };

      // Toast notification after state update
      setTimeout(() => {
        toast({
          title: "New Week",
          description: `Week ${newTimeState.currentWeek}, ${newTimeState.currentYear}`,
        });
      }, 100);

      return newState;
    });
  };
  
  
  const processWeeklyBoxOffice = (projects: Project[], week: number, year: number): BoxOfficeWeek => {
    const releases = projects
      .filter(p => p.status === 'released' && p.metrics.inTheaters)
      .map(project => {
        const weeksSinceRelease = TimeSystem.calculateWeeksSince(
          project.releaseWeek!, 
          project.releaseYear!, 
          week, 
          year
        );
        
        if (weeksSinceRelease > 0 && weeksSinceRelease <= 18) {
          return {
            projectId: project.id,
            title: project.title,
            studio: gameState.studio.name,
            weeklyRevenue: 0, // Will be calculated by BoxOfficeSystem
            totalRevenue: project.metrics.boxOfficeTotal || 0,
            theaters: project.metrics.theaterCount || 0,
            weekInRelease: weeksSinceRelease
          };
        }
        return null;
      })
      .filter(Boolean) as BoxOfficeRelease[];
    
    return {
      week,
      year,
      releases,
      totalRevenue: releases.reduce((sum, release) => sum + release.totalRevenue, 0)
    };
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
              { id: 'marketing', label: 'Marketing & Release', IconComponent: MarketingIcon },
              { id: 'distribution', label: 'Post-Theatrical', IconComponent: DistributionIcon },
              { id: 'stats', label: 'Statistics', IconComponent: BarChartIcon },
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
            onPhaseChange={handlePhaseChange}
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
        
        {currentPhase === 'marketing' && (
          <MarketingReleaseManagement 
            gameState={gameState}
            onProjectUpdate={(project, marketingCost) => {
              setGameState(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.id === project.id ? project : p),
                // FIXED: Deduct marketing costs from studio budget
                studio: marketingCost ? {
                  ...prev.studio,
                  budget: prev.studio.budget - marketingCost
                } : prev.studio
              }));
            }}
            onMarketingCampaignCreate={(project, strategy, budget, duration) => {
              // Check if campaign already exists
              if (project.marketingCampaign && project.marketingCampaign.weeksRemaining > 0) {
                toast({
                  title: "Campaign Already Active",
                  description: "Complete the current campaign before starting a new one",
                  variant: "destructive"
                });
                return;
              }

              // Validate budget
              if (budget > gameState.studio.budget) {
                toast({
                  title: "Insufficient Budget",
                  description: "Not enough studio budget for this campaign",
                  variant: "destructive"
                });
                return;
              }

              // Deduct budget from studio
              const updatedStudio = {
                ...gameState.studio,
                budget: gameState.studio.budget - budget
              };

              // Create marketing campaign
              const newCampaign = {
                id: `campaign-${Date.now()}`,
                strategy,
                budgetAllocated: budget,
                budgetSpent: 0,
                duration,
                weeksRemaining: duration,
                activities: [],
                buzz: 20, // Base buzz from launching campaign
                targetAudience: strategy.targeting.demographic,
                effectiveness: 60 // Base effectiveness
              };

              const updatedProject = {
                ...project,
                marketingCampaign: newCampaign
              };

              setGameState(prev => ({
                ...prev,
                studio: updatedStudio,
                projects: prev.projects.map(p => 
                  p.id === project.id ? updatedProject : p
                )
              }));

              toast({
                title: "Marketing Campaign Launched!",
                description: `${strategy.type} campaign started with $${(budget / 1000000).toFixed(1)}M budget`,
              });
            }}
          />
        )}
        
        {currentPhase === 'distribution' && (
          <PostTheatricalManagement 
            gameState={gameState}
            onProjectUpdate={(project) => {
              setGameState(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.id === project.id ? project : p)
              }));
            }}
          />
        )}
        {currentPhase === 'stats' && (
          <StudioStats gameState={gameState} />
        )}
      </div>
    </div>
  );
};