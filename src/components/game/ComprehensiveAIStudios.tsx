import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GameState, TalentPerson, Project } from '@/types/game';
import { Building, Film, Users, TrendingUp, Calendar, Star } from 'lucide-react';

interface AIStudio {
  id: string;
  name: string;
  reputation: number;
  budget: number;
  specialty: string[];
  genrePreference: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  activeProjects: AIProject[];
  completedProjects: AIProject[];
  strategy: {
    targetBudget: { min: number; max: number };
    releaseFrequency: number; // projects per year
    talentStrategy: 'established' | 'emerging' | 'mixed';
  };
}

interface AIProject {
  id: string;
  studioId: string;
  studioName: string;
  title: string;
  genre: string;
  budget: number;
  status: 'development' | 'production' | 'post-production' | 'marketing' | 'released';
  developmentWeek: number;
  developmentYear: number;
  releaseWeek?: number;
  releaseYear?: number;
  cast: Array<{
    talentId: string;
    role: string;
    salary: number;
  }>;
  performance?: {
    boxOffice: number;
    criticsScore: number;
    audienceScore: number;
    awards: string[];
  };
  marketingBudget: number;
  phase: {
    current: string;
    duration: number;
    weeksRemaining: number;
  };
}

interface ComprehensiveAIStudiosProps {
  gameState: GameState;
  onTalentCommitmentChange?: (talentId: string, busy: boolean, project?: string) => void;
}

export const ComprehensiveAIStudios: React.FC<ComprehensiveAIStudiosProps> = ({
  gameState,
  onTalentCommitmentChange
}) => {
  const [aiStudios, setAIStudios] = useState<AIStudio[]>([]);
  const [viewMode, setViewMode] = useState<'studios' | 'projects' | 'talent'>('studios');

  useEffect(() => {
    if (aiStudios.length === 0) {
      initializeAIStudios();
    }
  }, []);

  useEffect(() => {
    processWeeklyAIActivity();
  }, [gameState.currentWeek, gameState.currentYear]);

  const initializeAIStudios = () => {
    const studioTemplates = [
      {
        name: 'Paramount Pictures',
        reputation: 85,
        budget: 150000000,
        specialty: ['blockbuster', 'franchise'],
        genrePreference: ['action', 'adventure', 'sci-fi'],
        riskTolerance: 'moderate' as const,
        strategy: {
          targetBudget: { min: 80000000, max: 200000000 },
          releaseFrequency: 8,
          talentStrategy: 'established' as const
        }
      },
      {
        name: 'A24',
        reputation: 78,
        budget: 50000000,
        specialty: ['indie', 'prestige'],
        genrePreference: ['drama', 'horror', 'thriller'],
        riskTolerance: 'aggressive' as const,
        strategy: {
          targetBudget: { min: 2000000, max: 25000000 },
          releaseFrequency: 12,
          talentStrategy: 'emerging' as const
        }
      },
      {
        name: 'Netflix Studios',
        reputation: 72,
        budget: 300000000,
        specialty: ['streaming', 'volume'],
        genrePreference: ['comedy', 'drama', 'action', 'romance'],
        riskTolerance: 'aggressive' as const,
        strategy: {
          targetBudget: { min: 20000000, max: 150000000 },
          releaseFrequency: 15,
          talentStrategy: 'mixed' as const
        }
      },
      {
        name: 'Blumhouse Productions',
        reputation: 70,
        budget: 40000000,
        specialty: ['horror', 'low-budget'],
        genrePreference: ['horror', 'thriller', 'supernatural'],
        riskTolerance: 'conservative' as const,
        strategy: {
          targetBudget: { min: 3000000, max: 15000000 },
          releaseFrequency: 10,
          talentStrategy: 'emerging' as const
        }
      },
      {
        name: 'Searchlight Pictures',
        reputation: 82,
        budget: 80000000,
        specialty: ['prestige', 'awards'],
        genrePreference: ['drama', 'biography', 'historical'],
        riskTolerance: 'moderate' as const,
        strategy: {
          targetBudget: { min: 15000000, max: 60000000 },
          releaseFrequency: 6,
          talentStrategy: 'established' as const
        }
      }
    ];

    const initializedStudios: AIStudio[] = studioTemplates.map((template, index) => ({
      ...template,
      id: `ai-studio-${index + 1}`,
      activeProjects: [],
      completedProjects: []
    }));

    setAIStudios(initializedStudios);
    console.log(`🤖 Initialized ${initializedStudios.length} AI Studios`);
  };

  const processWeeklyAIActivity = () => {
    if (aiStudios.length === 0) return;

    setAIStudios(prev => prev.map(studio => {
      let updatedStudio = { ...studio };

      // Process existing projects
      updatedStudio.activeProjects = studio.activeProjects.map(project => 
        processProjectWeekly(project, studio)
      );

      // Check for completed projects
      const completedThisWeek = updatedStudio.activeProjects.filter(p => p.status === 'released');
      updatedStudio.completedProjects = [...studio.completedProjects, ...completedThisWeek];
      updatedStudio.activeProjects = updatedStudio.activeProjects.filter(p => p.status !== 'released');

      // Consider starting new projects
      if (shouldStartNewProject(studio)) {
        const newProject = generateAIProject(studio);
        if (newProject) {
          updatedStudio.activeProjects = [...updatedStudio.activeProjects, newProject];
          console.log(`🎬 ${studio.name} starts "${newProject.title}"`);
        }
      }

      return updatedStudio;
    }));
  };

  const processProjectWeekly = (project: AIProject, studio: AIStudio): AIProject => {
    if (project.phase.weeksRemaining <= 0) {
      return advanceProjectPhase(project, studio);
    }

    return {
      ...project,
      phase: {
        ...project.phase,
        weeksRemaining: project.phase.weeksRemaining - 1
      }
    };
  };

  const advanceProjectPhase = (project: AIProject, studio: AIStudio): AIProject => {
    const phaseProgression = {
      'development': 'production',
      'production': 'post-production',
      'post-production': 'marketing',
      'marketing': 'released'
    };

    const nextPhase = phaseProgression[project.phase.current as keyof typeof phaseProgression];
    
    if (nextPhase === 'released') {
      // Release the project
      const releaseProject = {
        ...project,
        status: 'released' as const,
        releaseWeek: gameState.currentWeek,
        releaseYear: gameState.currentYear,
        performance: generateProjectPerformance(project, studio),
        phase: {
          current: 'released',
          duration: 0,
          weeksRemaining: 0
        }
      };

      // Release talent commitments
      project.cast.forEach(castMember => {
        onTalentCommitmentChange?.(castMember.talentId, false);
      });

      console.log(`🎭 AI RELEASE: "${project.title}" by ${studio.name}`);
      return releaseProject;
    }

    // Advance to next phase
    const phaseDurations = {
      'production': 8 + Math.floor(Math.random() * 6), // 8-13 weeks
      'post-production': 6 + Math.floor(Math.random() * 8), // 6-13 weeks
      'marketing': 4 + Math.floor(Math.random() * 4) // 4-7 weeks
    };

    return {
      ...project,
      status: nextPhase as any,
      phase: {
        current: nextPhase,
        duration: phaseDurations[nextPhase as keyof typeof phaseDurations] || 4,
        weeksRemaining: phaseDurations[nextPhase as keyof typeof phaseDurations] || 4
      }
    };
  };

  const shouldStartNewProject = (studio: AIStudio): boolean => {
    const activeProjectCount = studio.activeProjects.length;
    const maxConcurrentProjects = studio.strategy.releaseFrequency / 8; // Rough estimate
    
    if (activeProjectCount >= maxConcurrentProjects) return false;
    
    // Random chance based on studio strategy
    const baseChance = 0.15; // 15% chance per week
    const adjustedChance = baseChance * (studio.riskTolerance === 'aggressive' ? 1.5 : 
                                        studio.riskTolerance === 'conservative' ? 0.7 : 1.0);
    
    return Math.random() < adjustedChance;
  };

  const generateAIProject = (studio: AIStudio): AIProject | null => {
    // Select genre based on studio preference
    const genre = studio.genrePreference[Math.floor(Math.random() * studio.genrePreference.length)] as any;
    
    // Generate budget within studio range
    const { min, max } = studio.strategy.targetBudget;
    const budget = Math.floor(Math.random() * (max - min)) + min;
    
    // Generate title
    const title = generateProjectTitle(genre);
    
    // Try to cast talent
    const cast = castTalentForProject(studio, genre, budget);
    
    if (cast.length === 0) {
      console.log(`❌ ${studio.name} couldn't cast "${title}" - no available talent`);
      return null; // Can't make the project without talent
    }

    const project: AIProject = {
      id: `ai-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studioId: studio.id,
      studioName: studio.name,
      title,
      genre,
      budget,
      status: 'development',
      developmentWeek: gameState.currentWeek,
      developmentYear: gameState.currentYear,
      cast,
      marketingBudget: budget * 0.3,
      phase: {
        current: 'development',
        duration: 3 + Math.floor(Math.random() * 4), // 3-6 weeks
        weeksRemaining: 3 + Math.floor(Math.random() * 4)
      }
    };

    // Mark talent as busy
    cast.forEach(castMember => {
      onTalentCommitmentChange?.(castMember.talentId, true, project.title);
    });

    return project;
  };

  const generateProjectTitle = (genre: string): string => {
    const titleTemplates = {
      action: ['Operation', 'Strike', 'Code', 'The Last', 'Dark', 'Final'],
      drama: ['The', 'A', 'Finding', 'The Story of', 'Between', 'Under'],
      horror: ['The', 'Night of', 'House of', 'Blood', 'The Curse of', 'Dark'],
      comedy: ['The', 'My', 'Crazy', 'The Great', 'Super', 'Big'],
      romance: ['Love', 'The', 'Finding', 'A', 'Sweet', 'Forever'],
      thriller: ['The', 'Dead', 'Silent', 'Final', 'The Secret', 'Hidden'],
      'sci-fi': ['The', 'Star', 'Quantum', 'The Future', 'Neo', 'Cyber']
    };

    const suffixes = {
      action: ['Force', 'Mission', 'Warrior', 'Strike', 'Protocol', 'Rising'],
      drama: ['Journey', 'Story', 'Life', 'Heart', 'Dreams', 'Truth'],
      horror: ['Terror', 'Nightmare', 'Darkness', 'Evil', 'Fear', 'Death'],
      comedy: ['Adventures', 'Show', 'Story', 'Life', 'Times', 'Movie'],
      romance: ['Story', 'Affair', 'Heart', 'Kiss', 'Dreams', 'Wedding'],
      thriller: ['Game', 'Truth', 'Conspiracy', 'Identity', 'Hunt', 'Code'],
      'sci-fi': ['Wars', 'Future', 'Matrix', 'Prime', 'Genesis', 'Nexus']
    };

    const prefix = titleTemplates[genre as keyof typeof titleTemplates] || titleTemplates.drama;
    const suffix = suffixes[genre as keyof typeof suffixes] || suffixes.drama;
    
    return `${prefix[Math.floor(Math.random() * prefix.length)]} ${suffix[Math.floor(Math.random() * suffix.length)]}`;
  };

  const castTalentForProject = (studio: AIStudio, genre: string, budget: number): AIProject['cast'] => {
    const availableTalent = gameState.talent.filter(talent => {
      // Check if talent is already busy with another AI project
      return !aiStudios.some(s => 
        s.activeProjects.some(p => 
          p.cast.some(c => c.talentId === talent.id)
        )
      );
    });

    if (availableTalent.length === 0) return [];

    // Select talent based on studio strategy and budget
    const targetTalentCount = budget > 50000000 ? 3 : budget > 20000000 ? 2 : 1;
    const cast: AIProject['cast'] = [];

    // Prefer talent that matches genre
    const genreMatchingTalent = availableTalent.filter(t => 
      t.genres.includes(genre as any) || (t.specialties && t.specialties.includes(genre as any))
    );

    const talentPool = genreMatchingTalent.length > 0 ? genreMatchingTalent : availableTalent;

    for (let i = 0; i < Math.min(targetTalentCount, talentPool.length); i++) {
      const talent = talentPool[Math.floor(Math.random() * talentPool.length)];
      
      // Remove from pool to avoid duplicates
      const index = talentPool.indexOf(talent);
      talentPool.splice(index, 1);

      const salary = calculateTalentSalary(talent, budget);
      
      cast.push({
        talentId: talent.id,
        role: i === 0 ? 'Lead Actor' : i === 1 ? 'Supporting Actor' : 'Director',
        salary
      });
    }

    return cast;
  };

  const calculateTalentSalary = (talent: TalentPerson, projectBudget: number): number => {
    const baseSalary = talent.marketValue || (talent.reputation * 50000);
    const budgetMultiplier = Math.min(2.0, projectBudget / 50000000);
    return Math.floor(baseSalary * budgetMultiplier);
  };

  const generateProjectPerformance = (project: AIProject, studio: AIStudio) => {
    const budgetScore = Math.min(100, project.budget / 1000000);
    const studioScore = studio.reputation;
    const castScore = project.cast.reduce((sum, c) => {
      const talent = gameState.talent.find(t => t.id === c.talentId);
      return sum + (talent?.reputation || 50);
    }, 0) / project.cast.length;

    const baseScore = (budgetScore + studioScore + castScore) / 3;
    const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2 multiplier

    const boxOfficeMultiplier = 0.5 + (Math.random() * 2.0); // 0.5x to 2.5x budget
    const boxOffice = project.budget * boxOfficeMultiplier * randomFactor;

    return {
      boxOffice: Math.floor(boxOffice),
      criticsScore: Math.max(20, Math.min(95, Math.floor(baseScore * randomFactor))),
      audienceScore: Math.max(25, Math.min(95, Math.floor((baseScore + 10) * randomFactor))),
      awards: boxOffice > project.budget * 1.5 && Math.random() < 0.3 ? ['Nomination'] : []
    };
  };

  const getAllAIProjects = (): AIProject[] => {
    return aiStudios.reduce((all, studio) => [
      ...all, 
      ...studio.activeProjects,
      ...studio.completedProjects
    ], [] as AIProject[]);
  };

  const getProjectsInProduction = (): AIProject[] => {
    return getAllAIProjects().filter(p => 
      p.status === 'production' || p.status === 'post-production'
    );
  };

  const getReleasedProjects = (): AIProject[] => {
    return getAllAIProjects().filter(p => p.status === 'released');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AI Studio Competition
          </h2>
          <p className="text-muted-foreground">Monitor industry competitors and market dynamics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'studios' ? 'default' : 'outline'}
            onClick={() => setViewMode('studios')}
          >
            Studios
          </Button>
          <Button
            variant={viewMode === 'projects' ? 'default' : 'outline'}
            onClick={() => setViewMode('projects')}
          >
            Projects
          </Button>
          <Button
            variant={viewMode === 'talent' ? 'default' : 'outline'}
            onClick={() => setViewMode('talent')}
          >
            Talent Pool
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{aiStudios.length}</div>
              <p className="text-sm text-muted-foreground">Competing Studios</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getProjectsInProduction().length}</div>
              <p className="text-sm text-muted-foreground">In Production</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{getReleasedProjects().length}</div>
              <p className="text-sm text-muted-foreground">Released This Year</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {gameState.talent.filter(t => 
                  aiStudios.some(s => s.activeProjects.some(p => p.cast.some(c => c.talentId === t.id)))
                ).length}
              </div>
              <p className="text-sm text-muted-foreground">Busy Talent</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ${Math.round(getAllAIProjects().reduce((sum, p) => sum + p.budget, 0) / 1000000)}M
              </div>
              <p className="text-sm text-muted-foreground">Total Investment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Studios View */}
      {viewMode === 'studios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiStudios.map(studio => (
            <Card key={studio.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {studio.name}
                </CardTitle>
                <div className="flex gap-2">
                      <Badge variant="outline">Rep: {Math.round(studio.reputation)}</Badge>
                  <Badge variant="secondary">{studio.riskTolerance}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Budget:</span>
                    <span>${(studio.budget / 1000000).toFixed(0)}M</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Active Projects:</span>
                    <span>{studio.activeProjects.length}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span>{studio.completedProjects.length}</span>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-1">Specialties:</div>
                    <div className="flex flex-wrap gap-1">
                      {studio.specialty.map(spec => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-1">Preferred Genres:</div>
                    <div className="flex flex-wrap gap-1">
                      {studio.genrePreference.map(genre => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Projects View */}
      {viewMode === 'projects' && (
        <div className="space-y-4">
          {getAllAIProjects().slice(-20).reverse().map(project => (
            <Card key={project.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{project.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {project.studioName} • {project.genre} • ${(project.budget / 1000000).toFixed(0)}M
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      project.status === 'released' ? 'default' :
                      project.status === 'production' ? 'secondary' : 'outline'
                    }>
                      {project.status}
                    </Badge>
                    {project.status !== 'released' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {project.phase.weeksRemaining} weeks remaining
                      </div>
                    )}
                  </div>
                </div>
                
                {project.status !== 'released' && (
                  <Progress 
                    value={((project.phase.duration - project.phase.weeksRemaining) / project.phase.duration) * 100} 
                    className="mb-3"
                  />
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>Cast: {project.cast.length}</div>
                  {project.performance && (
                    <>
                      <div>BO: ${(project.performance.boxOffice / 1000000).toFixed(1)}M</div>
                      <div>Critics: {project.performance.criticsScore}</div>
                      <div>Audience: {project.performance.audienceScore}</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Talent Pool View */}
      {viewMode === 'talent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.talent.slice(0, 20).map(talent => {
            const busyProject = getAllAIProjects().find(p => 
              p.status !== 'released' && p.cast.some(c => c.talentId === talent.id)
            );
            
            return (
              <Card key={talent.id} className={busyProject ? 'opacity-75' : ''}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{talent.name}</h4>
                      <p className="text-sm text-muted-foreground">{talent.type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span className="text-sm">{talent.reputation}</span>
                    </div>
                  </div>
                  
                  {busyProject ? (
                    <div className="space-y-2">
                      <Badge variant="secondary">Busy</Badge>
                      <div className="text-xs text-muted-foreground">
                        Working on "{busyProject.title}" ({busyProject.studioName})
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                  
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {talent.specialties.slice(0, 2).map(spec => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};