import React, { useState, useEffect } from 'react';
import { GameState, Script, Genre, ScriptCharacteristics } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScriptCharacterManager, ScriptCharacter } from './ScriptCharacterManager';
import { importRolesForScript } from '@/utils/roleImport';
import { finalizeScriptForSave } from '@/utils/scriptFinalization';
import { ScriptIcon, BudgetIcon, AwardIcon, ClapperboardIcon } from '@/components/ui/icons';

interface TVShowDevelopmentProps {
  gameState: GameState;
  selectedFranchise?: string | null;
  selectedPublicDomain?: string | null;
  onProjectCreate: (script: Script) => void;
  onScriptUpdate: (script: Script) => void;
}

export const TVShowDevelopment: React.FC<TVShowDevelopmentProps> = ({
  gameState,
  selectedFranchise,
  selectedPublicDomain,
  onProjectCreate,
  onScriptUpdate,
}) => {
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);

  const stageOrder: Script['developmentStage'][] = ['concept', 'treatment', 'first-draft', 'polish', 'final'];

  const handleEditTVScript = (script: Script) => {
    const shouldSeedRoles =
      (!script.characters || script.characters.length === 0) &&
      (script.sourceType === 'franchise' || script.sourceType === 'public-domain' || script.sourceType === 'adaptation');

    const seededCharacters = shouldSeedRoles ? importRolesForScript(script, gameState) : (script.characters || []);

    // Persist the seeded roles so this script carries them forward.
    if (shouldSeedRoles && seededCharacters.length > 0) {
      onScriptUpdate({ ...script, characters: seededCharacters });
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
  const getInitialTVScript = (): Partial<Script> => {
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
  };

  const [newScript, setNewScript] = useState<Partial<Script>>(getInitialTVScript());

  useEffect(() => {
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

    if (tempScript.sourceType === 'franchise' || tempScript.sourceType === 'public-domain' || tempScript.sourceType === 'adaptation') {
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
  }, [selectedFranchise, selectedPublicDomain]);

  const handleCreateTVScript = () => {
    if (!newScript.title || !newScript.logline) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and logline for your TV show.",
        variant: "destructive"
      });
      return;
    }

    const script: Script = {
      id: editingScript ? editingScript.id : `tv-script-${Date.now()}`,
      title: newScript.title!,
      genre: newScript.genre as Genre,
      logline: newScript.logline!,
      writer: newScript.writer || `${gameState.studio.name} Writing Team`,
      pages: newScript.pages || 60,
      quality: newScript.quality || 50,
      budget: newScript.budget || 2000000,
      developmentStage: newScript.developmentStage || 'concept',
      themes: newScript.themes || [],
      targetAudience: newScript.targetAudience!,
      estimatedRuntime: newScript.estimatedRuntime || 45,
      characteristics: {
        tone: newScript.characteristics?.tone || 'balanced',
        pacing: 'episodic',
        dialogue: newScript.characteristics?.dialogue || 'naturalistic',
        visualStyle: newScript.characteristics?.visualStyle || 'realistic',
        commercialAppeal: newScript.characteristics?.commercialAppeal || 5,
        criticalPotential: newScript.characteristics?.criticalPotential || 5,
        cgiIntensity: newScript.characteristics?.cgiIntensity || 'minimal'
      },
      // Persist roles as part of the script (includes optional screenTimeMinutes)
      characters: scriptCharacters,
      sourceType: newScript.sourceType || 'original',
      franchiseId: newScript.franchiseId,
      publicDomainId: newScript.publicDomainId
    };

    const finalized = finalizeScriptForSave(script, gameState);

    onScriptUpdate(finalized);
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

  const handleGreenlightTVScript = (script: Script) => {
    // Enforce script refinement gate — same as film scripts
    if (script.developmentStage !== 'final') {
      toast({
        title: "Script Not Ready",
        description: "Refine the TV script to 'Final' stage before greenlighting. Edit the script to advance its stage.",
        variant: "destructive"
      });
      return;
    }

    // Assume a standard 13-episode season when checking budget so this matches project creation
    const assumedEpisodeCount = 13;
    const seasonBudget = script.budget * assumedEpisodeCount;

    if (gameState.studio.budget < seasonBudget * 0.1) {
      toast({
        title: "Insufficient Budget",
        description: "You need at least 10% of the estimated season budget for development.",
        variant: "destructive"
      });
      return;
    }

    // Let the core game system create the actual TV project from this script
    onProjectCreate(script);
    
    toast({
      title: "TV Script Greenlit!",
      description: `"${script.title}" moved to Development phase. Assign cast and crew to proceed to Pre-Production.`,
    });
  };

  // Filter TV scripts (could be marked by type or other criteria)
  const availableTVScripts = gameState.scripts.filter(script => 
    !gameState.projects.some(project => project.script.id === script.id) &&
    (script.characteristics.pacing === 'episodic' || script.estimatedRuntime <= 60) // TV-like characteristics
  );

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
                      <SelectItem value="drama">Drama</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <span>Emmy Bait</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Development Stage (for editing) */}
            {editingScript && (
              <div className="border-t pt-4">
                <Label>Development Stage</Label>
                <Select 
                  value={newScript.developmentStage || 'concept'} 
                  onValueChange={(value) => setNewScript(prev => ({ ...prev, developmentStage: value as Script['developmentStage'] }))}
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
                  Scripts must reach "Final" stage before they can be greenlit into production.
                </p>
              </div>
            )}

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
          <CardTitle className="flex items-center">
            <span className="mr-2">📺</span>
            TV Script Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableTVScripts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">📺</div>
              <p>No TV scripts in development</p>
              <p className="text-sm">Create your first TV script to begin building your slate</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTVScripts.map((script) => {
                const stageIndex = stageOrder.indexOf(script.developmentStage || 'concept');
                const stageProgress = ((stageIndex + 1) / stageOrder.length) * 100;
                const isReadyToGreenlight = script.developmentStage === 'final';

                return (
                <Card 
                  key={script.id} 
                  className="border-border hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base truncate">{script.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{script.genre}</Badge>
                      <Badge variant={isReadyToGreenlight ? 'default' : 'secondary'} className="text-xs capitalize">
                        {(script.developmentStage || 'concept').replace('-', ' ')}
                      </Badge>
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
                          ✏️ Edit
                        </Button>
                        <Button 
                          size="sm" 
                          className={`flex-1 ${!isReadyToGreenlight ? 'opacity-60' : ''}`}
                          onClick={() => handleGreenlightTVScript(script)}
                          disabled={gameState.studio.budget < script.budget * 0.1}
                          title={!isReadyToGreenlight ? 'Refine the script to "final" stage before greenlighting' : ''}
                        >
                          <ClapperboardIcon className="w-4 h-4 mr-1" />
                          {isReadyToGreenlight ? 'Greenlight' : 'Not Ready'}
                        </Button>
                      </div>
                      {!isReadyToGreenlight && (
                        <p className="text-xs text-muted-foreground text-center">
                          Edit and advance to "final" stage to greenlight
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