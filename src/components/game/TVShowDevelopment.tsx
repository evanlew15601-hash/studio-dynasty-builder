import React, { useState, useEffect, useCallback } from 'react';
import { Script, Genre } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ScriptCharacterManager, ScriptCharacter } from './ScriptCharacterManager';
import { importRolesForScript } from '@/utils/roleImport';
import { finalizeScriptForGreenlight, finalizeScriptForSave, getScriptGreenlightReport } from '@/utils/scriptFinalization';
import { getScriptStageAdvanceQuote, formatScriptStage } from '@/utils/scriptProgression';
import { applyGovernanceImpact, getGreenlightGateReport } from '@/utils/studioGovernance';
import { computeFilmContentRating, contentRatingToSliderValue } from '@/utils/contentRating';
import { FinancialEngine } from './FinancialEngine';
import { ScriptIcon, ClapperboardIcon } from '@/components/ui/icons';
import { useGameStore } from '@/game/store';

type SpendFundsResult = { success: boolean; loanTaken?: number };

type SpendFundsFn = (amount: number, description: string) => SpendFundsResult;

interface TVShowDevelopmentProps {
  selectedFranchise?: string | null;
  selectedPublicDomain?: string | null;
  onProjectCreate: (script: Script) => void;
}

export const TVShowDevelopment: React.FC<TVShowDevelopmentProps> = ({
  selectedFranchise,
  selectedPublicDomain,
  onProjectCreate,
}) => {
  const gameState = useGameStore((s) => s.game);
  const mergeGameState = useGameStore((s) => s.mergeGameState);
  const spendStudioFunds = useGameStore((s) => s.spendStudioFunds);
  const upsertScript = useGameStore((s) => s.upsertScript);
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);

  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryGenre, setLibraryGenre] = useState<string>('all');
  const [libraryStage, setLibraryStage] = useState<string>('all');

  const stageOrder: Script['developmentStage'][] = ['concept', 'treatment', 'first-draft', 'polish', 'final'];

  const canAffordWriterFee = (amount: number): boolean => {
    if (!gameState) return false;
    const maxLoanCapacity = Math.max(0, 50000000 - (gameState.studio.debt || 0));
    const availableFunds = gameState.studio.budget + maxLoanCapacity;
    return amount <= availableFunds;
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return '\u0024' + (amount / 1_000_000).toFixed(2) + 'M';
    return '\u0024' + amount.toLocaleString();
  };

  const spendFunds: SpendFundsFn = (amount, description) => {
    if (!gameState) return { success: false };

    const result = spendStudioFunds(amount);
    if (!result.success) return result;

    FinancialEngine.recordTransaction(
      'expense',
      'talent',
      amount,
      gameState.currentWeek,
      gameState.currentYear,
      description
    );

    return result;
  };

  const handleAdvanceStage = (script: Script) => {
    const quote = getScriptStageAdvanceQuote(script);
    if (!quote) return;

    if (!canAffordWriterFee(quote.writerFee)) {
      toast({
        title: 'Insufficient Budget',
        description: `Need ${formatMoney(quote.writerFee)} to pay the writer for this stage.`,
        variant: 'destructive',
      });
      return;
    }

    if (!gameState) return;

    const writerName = script.writer?.trim().length ? script.writer.trim() : `${gameState.studio.name} Writing Team`;
    const stageName = `${formatScriptStage(quote.fromStage)} -> ${formatScriptStage(quote.toStage)}`;

    const spend = spendFunds(quote.writerFee, `Writer fee (${writerName}) - ${stageName}`);
    if (!spend.success) {
      toast({
        title: 'Insufficient Budget',
        description: `Need ${formatMoney(quote.writerFee)} to pay the writer for this stage.`,
        variant: 'destructive',
      });
      return;
    }

    const updated: Script = {
      ...script,
      developmentStage: quote.toStage,
      quality: Math.min(100, (script.quality || 0) + quote.qualityDelta),
    };

    upsertScript(updated);

    toast({
      title: 'TV Script Advanced',
      description: `${script.title} is now in ${formatScriptStage(quote.toStage)}. Paid ${formatMoney(quote.writerFee)} to ${writerName}.`,
    });

    if (spend.loanTaken && spend.loanTaken > 0) {
      toast({
        title: 'Loan Taken',
        description: `Borrowed ${formatMoney(spend.loanTaken)} to cover the writer fee.`,
      });
    }
  };

  const handleEditTVScript = (script: Script) => {
    if (!gameState) return;

    const shouldSeedRoles =
      (!script.characters || script.characters.length === 0) &&
      (script.sourceType === 'franchise' || script.sourceType === 'public-domain');

    const seededCharacters = shouldSeedRoles ? importRolesForScript(script, gameState) : (script.characters || []);

    // Persist the seeded roles so this script carries them forward.
    if (shouldSeedRoles && seededCharacters.length > 0) {
      upsertScript({ ...script, characters: seededCharacters });
    }

    setEditingScript(script);
    setNewScript({
      ...script,
    });
    setScriptCharacters(
      seededCharacters.map((c) => ({
        ...c,
        description: c.description || '',
        ageRange: (c.ageRange as [number, number]) || [20, 60],
        requiredType: c.requiredType || (c.importance === 'crew' ? 'director' : 'actor'),
        screenTimeMinutes:
          (c as any).screenTimeMinutes ??
          (c.importance === 'lead' ? 60 : c.importance === 'supporting' ? 25 : c.importance === 'minor' ? 5 : 0),
      }))
    );
    setIsCreating(true);
  };
  
  // Auto-fill script based on selected franchise or PD for TV shows
  const getInitialTVScript = useCallback((): Partial<Script> => {
    if (!gameState) {
      return {
        title: '',
        genre: 'drama',
        logline: '',
        writer: '',
        pages: 60,
        quality: 50,
        budget: 2000000,
        developmentStage: 'concept',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 45,
        characteristics: {
          tone: 'balanced',
          pacing: 'episodic',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
          content: { violence: 0, nudity: 0, language: 0, substance: 0 },
        }
      };
    }

    if (selectedFranchise) {
      const franchise = gameState.franchises.find(f => f.id === selectedFranchise);
      if (franchise) {
        return {
          title: `${franchise.title}: The Series`,
          genre: franchise.genre[0] || 'drama',
          logline: `${franchise.description || 'A continuation of the beloved franchise'} This TV adaptation explores the rich world in episodic format.`,
          writer: '',
          pages: 60, // TV pilot length
          quality: 50 + (franchise.culturalWeight * 0.3),
          budget: Math.max(2000000, franchise.culturalWeight * 200000), // Per episode budget
          developmentStage: 'concept',
          themes: franchise.franchiseTags.slice(0, 3),
          targetAudience: franchise.tone === 'light' ? 'family' : 'general',
          estimatedRuntime: 45, // Standard TV episode
          characteristics: {
            tone: franchise.tone === 'dark' ? 'dark' : franchise.tone === 'comedic' ? 'light' : 'balanced',
            pacing: 'episodic',
            dialogue: 'naturalistic',
            visualStyle: franchise.genre.includes('fantasy') || franchise.genre.includes('sci-fi') ? 'stylized' : 'realistic',
            commercialAppeal: Math.min(10, Math.round(franchise.culturalWeight / 10)),
            criticalPotential: Math.min(10, Math.round(franchise.averageRating || 5)),
            cgiIntensity: franchise.genre.includes('action') || franchise.genre.includes('sci-fi') || franchise.genre.includes('fantasy') ? 'heavy' : 'minimal'
          },
          sourceType: 'franchise',
          franchiseId: franchise.id
        };
      }
    }
    
    if (selectedPublicDomain) {
      const pd = gameState.publicDomainIPs.find(p => p.id === selectedPublicDomain);
      if (pd) {
        return {
          title: `${pd.name}: The Series`,
          genre: pd.genreFlexibility[0] || 'drama',
          logline: `${pd.description || 'A fresh adaptation of a timeless classic'} This TV adaptation brings serialized storytelling to the beloved property.`,
          writer: '',
          pages: 60,
          quality: 50 + (pd.reputationScore * 0.2),
          budget: Math.max(1500000, pd.reputationScore * 150000),
          developmentStage: 'concept',
          themes: pd.coreElements.slice(0, 3),
          targetAudience: pd.domainType === 'folklore' ? 'family' : 'general',
          estimatedRuntime: 45,
          characteristics: {
            tone: pd.domainType === 'religious' ? 'dramatic' : 'balanced',
            pacing: 'episodic',
            dialogue: pd.domainType === 'literature' ? 'philosophical' : 'naturalistic',
            visualStyle: pd.domainType === 'mythology' || pd.domainType === 'folklore' ? 'stylized' : 'realistic',
            commercialAppeal: Math.min(10, Math.round(pd.reputationScore / 10)),
            criticalPotential: Math.min(10, Math.round(pd.reputationScore / 8)),
            cgiIntensity: pd.domainType === 'mythology' ? 'heavy' : 'minimal'
          },
          sourceType: 'public-domain',
          publicDomainId: pd.id
        };
      }
    }
    
    // Default TV script
    return {
      title: '',
      genre: 'drama',
      logline: '',
      writer: '',
      pages: 60,
      quality: 50,
      budget: 2000000, // Per episode
      developmentStage: 'concept',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 45,
      characteristics: {
        tone: 'balanced',
        pacing: 'episodic',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal'
      }
    };
  }, [gameState, selectedFranchise, selectedPublicDomain]);

  const [newScript, setNewScript] = useState<Partial<Script>>({
    title: '',
    genre: 'drama',
    logline: '',
    writer: '',
    pages: 60,
    quality: 50,
    budget: 2000000,
    developmentStage: 'concept',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 45,
    characteristics: {
      tone: 'balanced',
      pacing: 'episodic',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    } as any,
  });

  const gameStateReady = !!gameState;

  useEffect(() => {
    if (!gameState) return;

    const initial = getInitialTVScript();
    setNewScript(initial);

    const tempScript: Script = {
      id: `temp-${Date.now()}`,
      title: initial.title || 'Temp',
      genre: (initial.genre as any) || 'drama',
      logline: initial.logline || '',
      writer: initial.writer || '',
      pages: initial.pages || 60,
      quality: initial.quality || 50,
      budget: initial.budget || 2000000,
      developmentStage: (initial.developmentStage as any) || 'concept',
      themes: initial.themes || [],
      targetAudience: (initial.targetAudience as any) || 'general',
      estimatedRuntime: initial.estimatedRuntime || 45,
      characteristics: (initial.characteristics as any) || { tone: 'balanced', pacing: 'episodic', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' },
      sourceType: (initial as any).sourceType,
      franchiseId: (initial as any).franchiseId,
      publicDomainId: (initial as any).publicDomainId,
      characters: []
    };

    if (tempScript.sourceType === 'franchise' || tempScript.sourceType === 'public-domain') {
      const imported = importRolesForScript(tempScript, gameState);
      const adapted = imported.map((c): ScriptCharacter => ({
        ...c,
        importance: c.importance as any,
        screenTimeMinutes: c.importance === 'lead' ? 60 : c.importance === 'supporting' ? 25 : c.importance === 'minor' ? 5 : 0,
        description: c.description || '',
        ageRange: c.ageRange || [20, 60],
        traits: c.traits || [],
      }));
      setScriptCharacters(adapted);
    } else {
      setScriptCharacters([]);
    }
  }, [selectedFranchise, selectedPublicDomain, gameStateReady, gameState, getInitialTVScript]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading TV show development...</div>;
  }

  const genres: Genre[] = [
    'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
    'romance', 'erotica', 'sci-fi', 'fantasy', 'documentary', 'animation',
    'musical', 'western', 'war', 'biography', 'crime', 'mystery',
    'superhero', 'family', 'sports', 'historical'
  ];

  const handleCreateTVScript = () => {
    if (!newScript.title || !newScript.logline) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and logline for your TV show.",
        variant: "destructive"
      });
      return;
    }

    const baseCharacteristics = newScript.characteristics || {
      tone: 'balanced',
      pacing: 'episodic',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    };

    const contentRating = computeFilmContentRating(baseCharacteristics.content, newScript.genre as Genre | undefined);

    const script: Script = {
      id: editingScript ? editingScript.id : `tv-script-${Date.now()}`,
      title: newScript.title!,
      genre: newScript.genre as Genre,
      subgenre: newScript.subgenre?.trim() || undefined,
      logline: newScript.logline!,
      writer: newScript.writer || `${gameState.studio.name} Writing Team`,
      pages: newScript.pages || 60,
      quality: newScript.quality || 50,
      budget: newScript.budget || 2000000,
      developmentStage: editingScript?.developmentStage || 'concept',
      themes: newScript.themes || [],
      targetAudience: newScript.targetAudience!,
      estimatedRuntime: newScript.estimatedRuntime || 45,
      characteristics: {
        ...baseCharacteristics,
        pacing: 'episodic',
        content: {
          violence: baseCharacteristics.content?.violence ?? 0,
          nudity: baseCharacteristics.content?.nudity ?? 0,
          language: baseCharacteristics.content?.language ?? 0,
          substance: baseCharacteristics.content?.substance ?? 0,
        },
        contentRating,
      },
      // Strip UI-only fields before persisting to game state
      characters: scriptCharacters.map(({ screenTimeMinutes, ...c }) => c),
      sourceType: newScript.sourceType || 'original',
      franchiseId: newScript.franchiseId,
      publicDomainId: newScript.publicDomainId
    };

    const finalized = finalizeScriptForSave(script, gameState);

    upsertScript(finalized);
    setIsCreating(false);
    setEditingScript(null);
    
    // Reset form to default state
    setNewScript(getInitialTVScript());
    setScriptCharacters([]);
    
    toast({
      title: editingScript ? "TV Script Updated" : "TV Script Created",
      description: editingScript
        ? `"${finalized.title}" has been updated. Continue refining or greenlight when ready.`
        : `"${finalized.title}" has been added to your development slate with ${(finalized.characters || []).length} character roles.`,
    });
  };

  const handleRunFinalChecks = (script: Script) => {
    if (script.developmentStage !== 'final') {
      toast({
        title: 'Not Ready',
        description: 'Advance the script to Final stage before running final checks.',
        variant: 'destructive',
      });
      return;
    }

    const { script: finalized, report } = finalizeScriptForGreenlight(script, gameState);
    upsertScript(finalized);

    if (!report.canFinalize) {
      toast({
        title: 'Cannot Finalize',
        description: report.issues.filter(i => i.level === 'error').map(i => i.message).join(' '),
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Final Checks Complete',
      description: report.fixesApplied.length > 0
        ? `${finalized.title}: ${report.fixesApplied.join(', ')}`
        : `${finalized.title} is ready for greenlight.`,
    });
  };

  const handleGreenlightTVScript = (script: Script) => {
    // Enforce script refinement gate — same as film scripts
    if (script.developmentStage !== 'final') {
      toast({
        title: 'Script Not Ready',
        description: 'Advance the TV script to Final stage before greenlighting.',
        variant: 'destructive',
      });
      return;
    }

    const report = getScriptGreenlightReport(script, gameState);
    if (!report.canFinalize) {
      toast({
        title: 'Script Not Ready',
        description: report.issues.filter(i => i.level === 'error').map(i => i.message).join(' '),
        variant: 'destructive',
      });
      return;
    }

    // Assume a standard 13-episode season when checking budget so this matches project creation
    const assumedEpisodeCount = 13;
    const seasonBudget = script.budget * assumedEpisodeCount;

    if (gameState.studio.budget < seasonBudget * 0.1) {
      toast({
        title: 'Insufficient Budget',
        description: 'You need at least 10% of the estimated season budget for development.',
        variant: 'destructive',
      });
      return;
    }

    const gate = getGreenlightGateReport({ state: gameState, script, kind: 'tv', episodeCount: assumedEpisodeCount });

    if (!gate.canGreenlight) {
      if (gate.canOverride && gate.impactIfOverride) {
        toast({
          title: 'Approval Needed',
          description: gate.reasons.join(' '),
          action: (
            <ToastAction
              altText="Override board approval"
              onClick={() => {
                mergeGameState({
                  governance: applyGovernanceImpact(gameState.governance, gate.impactIfOverride!),
                });

                onProjectCreate(script);

                toast({
                  title: 'Greenlit (Override)',
                  description: `"${script.title}" moved to Development phase. The board is unhappy.`,
                });
              }}
            >
              Override
            </ToastAction>
          ),
        });
        return;
      }

      toast({
        title: 'Cannot Greenlight Project',
        description: gate.reasons.join(' '),
        variant: 'destructive',
      });
      return;
    }

    if (gate.severity === 'warn' && gate.impactIfProceed) {
      mergeGameState({
        governance: applyGovernanceImpact(gameState.governance, gate.impactIfProceed),
      });
    }

    // Let the core game system create the actual TV project from this script
    onProjectCreate(script);

    toast({
      title: gate.severity === 'warn' ? 'TV Greenlit (Board Pushback)' : 'TV Script Greenlit!',
      description: `"${script.title}" moved to Development phase. Assign cast and crew to proceed to Pre-Production.`,
    });
  };

  // Filter TV scripts (could be marked by type or other criteria)
  const availableTVScripts = gameState.scripts.filter(script => 
    !gameState.projects.some(project => project.script.id === script.id) &&
    (script.characteristics.pacing === 'episodic' || script.estimatedRuntime <= 60) // TV-like characteristics
  );

  const filteredAvailableTVScripts = availableTVScripts.filter((script) => {
    if (libraryGenre !== 'all' && script.genre !== libraryGenre) return false;
    if (libraryStage !== 'all' && script.developmentStage !== libraryStage) return false;

    const q = librarySearch.trim().toLowerCase();
    if (!q) return true;

    return (
      script.title.toLowerCase().includes(q) ||
      script.logline.toLowerCase().includes(q) ||
      (script.subgenre || '').toLowerCase().includes(q)
    );
  });

  const draftRating = computeFilmContentRating(newScript.characteristics?.content, newScript.genre as Genre | undefined);

  return (
    <div className="space-y-6">
      {/* Context banner for pre-selected franchise / IP */}
      {(selectedFranchise || selectedPublicDomain) && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
          <div className="text-sm text-blue-800">
            {selectedFranchise && (() => {
              const franchise = gameState.franchises.find(f => f.id === selectedFranchise);
              if (!franchise) return null;
              const projects = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
              const filmCount = projects.filter(p => p.type !== 'series' && p.type !== 'limited-series').length;
              const tvCount = projects.filter(p => p.type === 'series' || p.type === 'limited-series').length;
              const totalBoxOffice = projects.reduce((sum, p) => sum + (p.metrics?.boxOfficeTotal || 0), 0);
              const totalStreamingViews = projects.reduce((sum, p) => sum + (p.metrics?.streaming?.totalViews || 0), 0);
              return (
                <>
                  <span className="font-semibold">Franchise:</span> {franchise.title}{' '}
                  <span className="ml-2 text-xs text-blue-900">
                    ({filmCount} films, {tvCount} TV projects · ${(
                      totalBoxOffice / 1_000_000
                    ).toFixed(1)}
                    M box office · {(totalStreamingViews / 1_000_000).toFixed(1)}M streams)
                  </span>
                </>
              );
            })()}
            {!selectedFranchise && selectedPublicDomain && (() => {
              const pd = gameState.publicDomainIPs.find(p => p.id === selectedPublicDomain);
              if (!pd) return null;
              return (
                <>
                  <span className="font-semibold">Public Domain IP:</span> {pd.name}{' '}
                  <span className="ml-2 text-xs text-blue-900">
                    ({pd.domainType}, reputation {pd.reputationScore}/100)
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="text-3xl font-bold studio-title bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TV Show Development
          </h2>
          <p className="text-muted-foreground mt-2">Create, refine, and greenlight your television productions</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="btn-studio animate-glow"
        >
          <ScriptIcon className="mr-2" size={18} />
          New TV Script
        </Button>
      </div>

      {/* TV Script Creation Modal */}
      {isCreating && (
        <Card className="card-golden animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 mr-3">
                <ScriptIcon className="text-primary" size={20} />
              </div>
              TV Script Development Workshop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Show Title</Label>
                  <Input
                    id="title"
                    value={newScript.title || ''}
                    onChange={(e) => setNewScript(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter your TV show title"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select
                    value={newScript.genre}
                    onValueChange={(value) => setNewScript(prev => ({ ...prev, genre: value as Genre }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre.charAt(0).toUpperCase() + genre.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subgenre">Subgenre (optional)</Label>
                  <Input
                    id="subgenre"
                    value={newScript.subgenre || ''}
                    onChange={(e) => setNewScript(prev => ({ ...prev, subgenre: e.target.value }))}
                    placeholder="e.g. workplace sitcom, noir, space opera"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="logline">Show Concept</Label>
                  <Textarea
                    id="logline"
                    value={newScript.logline || ''}
                    onChange={(e) => setNewScript(prev => ({ ...prev, logline: e.target.value }))}
                    placeholder="Describe your TV show concept and what makes it unique..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="runtime">Episode Runtime (minutes)</Label>
                  <Input
                    id="runtime"
                    type="number"
                    value={newScript.estimatedRuntime || 45}
                    onChange={(e) => setNewScript(prev => ({ ...prev, estimatedRuntime: parseInt(e.target.value) }))}
                    min={15}
                    max={90}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="budget">Per Episode Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={newScript.budget || 2000000}
                    onChange={(e) => setNewScript(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                    min={100000}
                    max={20000000}
                    step={100000}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ${((newScript.budget || 2000000) / 1000000).toFixed(1)}M per episode
                  </p>
                </div>

                <div>
                  <Label>Target Audience</Label>
                  <Select
                    value={newScript.targetAudience}
                    onValueChange={(value) => setNewScript(prev => ({ ...prev, targetAudience: value as any }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="general">General Audience</SelectItem>
                      <SelectItem value="teen">Teen</SelectItem>
                      <SelectItem value="mature">Mature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Commercial Appeal ({newScript.characteristics?.commercialAppeal || 5}/10)</Label>
                  <Slider
                    value={[newScript.characteristics?.commercialAppeal || 5]}
                    onValueChange={([value]) => setNewScript(prev => ({
                      ...prev,
                      characteristics: { ...prev.characteristics!, commercialAppeal: value }
                    }))}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Niche</span>
                    <span>Mainstream Hit</span>
                  </div>
                </div>

                <div>
                  <Label>Critical Potential ({newScript.characteristics?.criticalPotential || 5}/10)</Label>
                  <Slider
                    value={[newScript.characteristics?.criticalPotential || 5]}
                    onValueChange={([value]) => setNewScript(prev => ({
                      ...prev,
                      characteristics: { ...prev.characteristics!, criticalPotential: value }
                    }))}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Popcorn TV</span>
                    <span>Awards Bait</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Content</Label>
                    <Badge variant="outline" className="font-mono">
                      {draftRating.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Violence</Label>
                    <Slider
                      value={[newScript.characteristics?.content?.violence ?? 0]}
                      onValueChange={([value]) => setNewScript(prev => ({
                        ...prev,
                        characteristics: {
                          ...prev.characteristics!,
                          content: { ...(prev.characteristics?.content ?? {}), violence: value }
                        }
                      }))}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nudity</Label>
                    <Slider
                      value={[newScript.characteristics?.content?.nudity ?? 0]}
                      onValueChange={([value]) => setNewScript(prev => ({
                        ...prev,
                        characteristics: {
                          ...prev.characteristics!,
                          content: { ...(prev.characteristics?.content ?? {}), nudity: value }
                        }
                      }))}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Language</Label>
                    <Slider
                      value={[newScript.characteristics?.content?.language ?? 0]}
                      onValueChange={([value]) => setNewScript(prev => ({
                        ...prev,
                        characteristics: {
                          ...prev.characteristics!,
                          content: { ...(prev.characteristics?.content ?? {}), language: value }
                        }
                      }))}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Substance</Label>
                    <Slider
                      value={[newScript.characteristics?.content?.substance ?? 0]}
                      onValueChange={([value]) => setNewScript(prev => ({
                        ...prev,
                        characteristics: {
                          ...prev.characteristics!,
                          content: { ...(prev.characteristics?.content ?? {}), substance: value }
                        }
                      }))}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="pt-1">
                    <Slider
                      value={[contentRatingToSliderValue(draftRating.label)]}
                      min={0}
                      max={4}
                      step={1}
                      disabled
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>G</span>
                      <span>PG</span>
                      <span>PG-13</span>
                      <span>R</span>
                      <span>NC-17</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Development Stage */}
            <div className="border-t pt-4">
              <Label>Development Stage</Label>
              <Select
                value={editingScript?.developmentStage || newScript.developmentStage || 'concept'}
                disabled
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOrder.map(stage => (
                    <SelectItem key={stage} value={stage} className="capitalize">
                      {stage.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Advance stages from the TV Script Library (pays writer fees).
              </p>
            </div>

            {/* Character Manager */}
            <div className="border-t pt-6">
              <ScriptCharacterManager
                characters={scriptCharacters}
                onCharactersChange={setScriptCharacters}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingScript(null);
                  setScriptCharacters([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTVScript}
                className="btn-studio animate-glow"
              >
                <ScriptIcon className="mr-2" size={16} />
                {editingScript ? 'Update TV Script' : 'Create TV Script'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TV Scripts Library */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center">
              <ClapperboardIcon className="mr-2" size={18} />
              TV Script Library
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search title, logline, subgenre..."
                className="h-9 w-[240px]"
              />
              <Select value={libraryGenre} onValueChange={setLibraryGenre}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {genres.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={libraryStage} onValueChange={setLibraryStage}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="first-draft">First Draft</SelectItem>
                  <SelectItem value="polish">Polish</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {availableTVScripts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClapperboardIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" size={48} />
              <p>No TV scripts in development</p>
              <p className="text-sm">Create your first TV script to begin building your slate</p>
            </div>
          ) : filteredAvailableTVScripts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No TV scripts match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailableTVScripts.map((script) => {
                const stageIndex = stageOrder.indexOf(script.developmentStage || 'concept');
                const stageProgress = ((stageIndex + 1) / stageOrder.length) * 100;
                const greenlightReport = getScriptGreenlightReport(script, gameState);
                const isFinalized = script.developmentStage === 'final' && greenlightReport.canFinalize;
                const stageQuote = getScriptStageAdvanceQuote(script);
                const canAdvanceStage = !!stageQuote && canAffordWriterFee(stageQuote.writerFee);

                const assumedEpisodeCount = 13;
                const canAffordGreenlight = gameState.studio.budget >= (script.budget * assumedEpisodeCount) * 0.1;
                const gate = getGreenlightGateReport({ state: gameState, script, kind: 'tv', episodeCount: assumedEpisodeCount });
                const canGreenlight = isFinalized && canAffordGreenlight && gate.canGreenlight;
                const hasBoardPushback = isFinalized && canAffordGreenlight && gate.severity === 'warn';

                return (
                <Card 
                  key={script.id} 
                  className="border-border hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base truncate">{script.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{script.genre}</Badge>
                      {script.subgenre && (
                        <Badge variant="outline" className="text-xs">
                          {script.subgenre}
                        </Badge>
                      )}
                      <Badge variant={isFinalized ? 'default' : 'secondary'} className="text-xs capitalize">
                        {(script.developmentStage || 'concept').replace('-', ' ')}
                      </Badge>
                      {script.developmentStage === 'final' && !greenlightReport.canFinalize && (
                        <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                          Needs Checks
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {script.estimatedRuntime}min
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {script.logline}
                      </p>

                      {/* Development Stage Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Script Stage</span>
                          <span className="capitalize">{(script.developmentStage || 'concept').replace('-', ' ')}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                            className="bg-primary rounded-full h-1.5 transition-all" 
                            style={{ width: `${stageProgress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per Episode:</span>
                          <span className="font-mono">${(script.budget / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Commercial:</span>
                          <span>{script.characteristics.commercialAppeal}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Critical:</span>
                          <span>{script.characteristics.criticalPotential}/10</span>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditTVScript(script)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          className={`flex-1 ${!canGreenlight ? 'opacity-90' : ''}`}
                          variant={canGreenlight ? 'default' : 'secondary'}
                          onClick={() => {
                            if (stageQuote) {
                              handleAdvanceStage(script);
                              return;
                            }

                            if (isFinalized) {
                              handleGreenlightTVScript(script);
                              return;
                            }

                            handleRunFinalChecks(script);
                          }}
                          disabled={stageQuote ? !canAdvanceStage : false}
                          title={
                            canGreenlight
                              ? hasBoardPushback
                                ? gate.reasons.join(' ')
                                : ''
                              : stageQuote
                                ? !canAdvanceStage
                                  ? 'Insufficient funds to pay the writer'
                                  : `Pay ${formatMoney(stageQuote.writerFee)} to advance`
                                : isFinalized
                                  ? !canAffordGreenlight
                                    ? 'Insufficient funds to greenlight'
                                    : gate.reasons.join(' ')
                                  : greenlightReport.issues.filter(i => i.level === 'error').map(i => i.message).join(' ')
                          }
                        >
                          <ClapperboardIcon className="w-4 h-4 mr-1" />
                          {canGreenlight
                            ? hasBoardPushback
                              ? 'Greenlight (Pushback)'
                              : 'Greenlight'
                            : stageQuote
                              ? `Advance (${formatScriptStage(stageQuote.toStage)})`
                              : isFinalized
                                ? !canAffordGreenlight
                                  ? 'Financing Needed'
                                  : 'Approval Needed'
                                : 'Final Checks'}
                        </Button>
                      </div>
                      {hasBoardPushback && (
                        <p className="text-xs text-muted-foreground text-center">
                          {gate.reasons.join(' ')}
                        </p>
                      )}
                      {!canGreenlight && (
                        <p className="text-xs text-muted-foreground text-center">
                          {stageQuote
                            ? `Pay ${formatMoney(stageQuote.writerFee)} to advance to ${formatScriptStage(stageQuote.toStage)}`
                            : isFinalized
                              ? !canAffordGreenlight
                                ? 'Secure financing to greenlight'
                                : gate.reasons.join(' ')
                              : 'Advance stages and run final checks before greenlighting'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};