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
import { ScriptIcon, BudgetIcon, AwardIcon, ClapperboardIcon } from '@/components/ui/icons';

interface ScriptDevelopmentProps {
  gameState: GameState;
  selectedFranchise?: string | null;
  selectedPublicDomain?: string | null;
  onProjectCreate: (script: Script) => void;
  onScriptUpdate: (script: Script) => void;
}

export const ScriptDevelopment: React.FC<ScriptDevelopmentProps> = ({
  gameState,
  selectedFranchise,
  selectedPublicDomain,
  onProjectCreate,
  onScriptUpdate,
}) => {
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  
  // Auto-fill script based on selected franchise or PD
  const getInitialScript = (): Partial<Script> => {
    if (selectedFranchise) {
      const franchise = gameState.franchises.find(f => f.id === selectedFranchise);
      if (franchise) {
return {
          title: `${franchise.title}${franchise.entries.length > 0 ? ` ${franchise.entries.length + 1}` : ''}`,
          genre: franchise.genre[0] || 'drama',
          logline: `${franchise.description || 'A continuation of the beloved franchise'} This installment explores new depths while honoring the legacy that fans love.`,
          writer: '',
          pages: 120,
          quality: 50 + (franchise.culturalWeight * 0.3), // Higher for prestigious franchises
          budget: Math.max(5000000, franchise.culturalWeight * 500000), // Budget scales with cultural weight
          developmentStage: 'concept',
          themes: franchise.franchiseTags.slice(0, 3),
          targetAudience: franchise.tone === 'light' ? 'family' : 'general',
          estimatedRuntime: franchise.genre.includes('fantasy') ? 150 : 120,
          characteristics: {
            tone: franchise.tone === 'dark' ? 'dark' : franchise.tone === 'comedic' ? 'light' : 'balanced',
            pacing: franchise.genre.includes('action') ? 'fast-paced' : 'steady',
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
          title: `${pd.name}: A New Vision`,
          genre: pd.genreFlexibility[0] || 'drama',
          logline: `${pd.description || 'A fresh adaptation of a timeless classic'} This modern interpretation brings new relevance to the beloved story.`,
          writer: '',
          pages: 120,
          quality: 50 + (pd.reputationScore * 0.2), // Higher for well-known properties
          budget: Math.max(3000000, pd.reputationScore * 200000), // Lower budget since it's free IP
          developmentStage: 'concept',
          themes: pd.coreElements.slice(0, 3),
          targetAudience: pd.domainType === 'folklore' ? 'family' : 'general',
          estimatedRuntime: pd.domainType === 'mythology' ? 140 : 120,
          characteristics: {
            tone: pd.domainType === 'religious' ? 'dramatic' : 'balanced',
            pacing: 'steady',
            dialogue: pd.domainType === 'literature' ? 'philosophical' : 'naturalistic',
            visualStyle: pd.domainType === 'mythology' || pd.domainType === 'folklore' ? 'stylized' : 'realistic',
            commercialAppeal: Math.min(10, Math.round(pd.reputationScore / 10)),
            criticalPotential: Math.min(10, Math.round(pd.reputationScore / 8)), // Prestige from adaptation
            cgiIntensity: pd.domainType === 'mythology' ? 'heavy' : 'minimal'
          },
          sourceType: 'public-domain',
          publicDomainId: pd.id
        };
      }
    }
    
    // Default script
    return {
      title: '',
      genre: 'drama',
      logline: '',
      writer: '',
      pages: 120,
      quality: 50,
      budget: 5000000,
      developmentStage: 'concept',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 120,
      characteristics: {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal'
      }
    };
  };
  
  const [newScript, setNewScript] = useState<Partial<Script>>(getInitialScript());

  // Update script when franchise/PD selection changes and pre-populate roles
  useEffect(() => {
    const next = getInitialScript();
    setNewScript(next);
    // If a source is selected, auto-import curated characters into the creation form
    const tempScript: Script = {
      id: `temp-${Date.now()}`,
      title: next.title || 'Temp',
      genre: next.genre as any || 'drama',
      logline: next.logline || '',
      writer: next.writer || '',
      pages: next.pages || 120,
      quality: next.quality || 50,
      budget: next.budget || 5000000,
      developmentStage: (next.developmentStage as any) || 'concept',
      themes: next.themes || [],
      targetAudience: (next.targetAudience as any) || 'general',
      estimatedRuntime: next.estimatedRuntime || 120,
      characteristics: next.characteristics as any || { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' },
      sourceType: (next as any).sourceType,
      franchiseId: (next as any).franchiseId,
      publicDomainId: (next as any).publicDomainId,
      characters: []
    };
    if (tempScript.sourceType === 'franchise' || tempScript.sourceType === 'public-domain') {
      const imported = importRolesForScript(tempScript, gameState);
      const adapted = imported.map((c): ScriptCharacter => ({
        id: c.id,
        name: c.name,
        importance: c.importance === 'crew' ? 'supporting' : (c.importance as any),
        screenTimeMinutes: c.importance === 'lead' ? 60 : c.importance === 'supporting' ? 25 : 0,
        description: c.description || '',
        ageRange: (c.ageRange as [number, number]) || [25, 45],
        requiredTraits: [],
        requiredType: c.requiredType,
      }));
      setScriptCharacters(adapted);
    } else {
      setScriptCharacters([]);
    }
  }, [selectedFranchise, selectedPublicDomain]);

  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);

  const genres: Genre[] = [
    'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
    'romance', 'sci-fi', 'fantasy', 'documentary', 'animation',
    'musical', 'western', 'war', 'biography', 'crime', 'mystery',
    'superhero', 'family', 'sports', 'historical'
  ];

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setNewScript({ ...script });
    setScriptCharacters(script.characters?.map(c => ({
      id: c.id,
      name: c.name,
      importance: c.importance === 'crew' ? 'supporting' : c.importance as any,
      screenTimeMinutes: c.importance === 'lead' ? 60 : 25,
      description: c.description || '',
      ageRange: (c.ageRange as [number, number]) || [25, 45],
      requiredTraits: [],
      requiredType: c.requiredType,
    })) || []);
    setIsCreating(true);
  };

  const handleCreateScript = () => {
    if (!newScript.title || !newScript.logline) {
      toast({
        title: "Incomplete Script",
        description: "Please provide at least a title and logline.",
        variant: "destructive"
      });
      return;
    }

    const script: Script = {
      id: editingScript?.id || `script-${Date.now()}`,
      title: newScript.title!,
      genre: newScript.genre!,
      logline: newScript.logline!,
      writer: newScript.writer || 'In-house',
      pages: newScript.pages || 120,
      quality: newScript.quality || 50,
      budget: newScript.budget || 5000000,
      developmentStage: newScript.developmentStage || 'concept',
      themes: newScript.themes || [],
      targetAudience: newScript.targetAudience || 'general',
      estimatedRuntime: newScript.estimatedRuntime || 120,
      characteristics: newScript.characteristics || {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal'
      },
      characters: scriptCharacters,
      sourceType: newScript.sourceType as any,
      franchiseId: newScript.franchiseId as any,
      publicDomainId: newScript.publicDomainId as any,
    };

    onScriptUpdate(script);
    setIsCreating(false);
    setEditingScript(null);
    
    // Reset form to default state
    setNewScript(getInitialScript());
    setScriptCharacters([]);
    
    toast({
      title: editingScript ? "Script Updated" : "Script Created",
      description: editingScript
        ? `"${script.title}" has been updated. Continue refining or greenlight when ready.`
        : `"${script.title}" has been added to your development slate with ${scriptCharacters.length} character roles.`,
    });
  };

  const handleGreenlightScript = (script: Script) => {
    if (script.developmentStage !== 'final') {
      toast({
        title: "Script Not Ready",
        description: "Refine the script to 'Final' stage before greenlighting. Edit the script to advance its stage.",
        variant: "destructive"
      });
      return;
    }

    if (gameState.studio.budget < script.budget * 0.1) {
      toast({
        title: "Insufficient Budget",
        description: "You need at least 10% of the production budget for development.",
        variant: "destructive"
      });
      return;
    }

    // Create project with proper workflow phase
    const project = {
      ...script,
      currentPhase: 'development',
      status: 'in-development',
      castingConfirmed: false
    };

    onProjectCreate(project);
    
    toast({
      title: "Script Greenlit!",
      description: `"${script.title}" moved to Development phase. Assign cast and crew to proceed to Pre-Production.`,
    });
  };

  // Filter out scripts that are already greenlit as projects
  const availableScripts = gameState.scripts.filter(script => 
    !gameState.projects.some(project => project.script.id === script.id)
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
            Script Development
          </h2>
          <p className="text-muted-foreground mt-2">Create, refine, and greenlight your next productions</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="btn-studio animate-glow"
        >
          <ScriptIcon className="mr-2" size={18} />
          New Script
        </Button>
      </div>

      {/* Script Creation Modal */}
      {isCreating && (
        <Card className="card-golden animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center font-studio">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 mr-3">
                <ScriptIcon className="text-primary" size={20} />
              </div>
              {editingScript ? `Editing: ${editingScript.title}` : 'Script Development Workshop'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={newScript.title || ''}
                    onChange={(e) => setNewScript(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter the title of your film..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="logline">Logline</Label>
                  <Textarea
                    id="logline"
                    value={newScript.logline || ''}
                    onChange={(e) => setNewScript(prev => ({ ...prev, logline: e.target.value }))}
                    placeholder="A one-sentence summary of your story..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="writer">Writer</Label>
                  <Input
                    id="writer"
                    value={newScript.writer || ''}
                    onChange={(e) => setNewScript(prev => ({ ...prev, writer: e.target.value }))}
                    placeholder="Screenwriter name..."
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
                  <Label htmlFor="stage">Development Stage</Label>
                  <Select
                    value={newScript.developmentStage || 'concept'}
                    onValueChange={(value) => setNewScript(prev => ({ ...prev, developmentStage: value as Script['developmentStage'] }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concept">Concept</SelectItem>
                      <SelectItem value="treatment">Treatment</SelectItem>
                      <SelectItem value="first-draft">First Draft</SelectItem>
                      <SelectItem value="polish">Polish</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scripts must reach "Final" stage to be greenlit
                  </p>
                </div>
              </div>

              {/* Script Characteristics */}
              <div className="space-y-4">
                <div>
                  <Label>Estimated Budget</Label>
                  <div className="mt-2">
                    <Slider
                      value={[newScript.budget || 5000000]}
                      onValueChange={([value]) => setNewScript(prev => ({ ...prev, budget: value }))}
                      min={1000000}
                      max={200000000}
                      step={1000000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>$1M</span>
                      <span className="font-mono">${((newScript.budget || 5000000) / 1000000).toFixed(0)}M</span>
                      <span>$200M</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Commercial Appeal</Label>
                  <div className="mt-2">
                    <Slider
                      value={[newScript.characteristics?.commercialAppeal || 5]}
                      onValueChange={([value]) => setNewScript(prev => ({
                        ...prev,
                        characteristics: { ...prev.characteristics!, commercialAppeal: value }
                      }))}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Niche</span>
                      <span>Mainstream</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Critical Potential</Label>
                  <div className="mt-2">
                    <Slider
                      value={[newScript.characteristics?.criticalPotential || 5]}
                      onValueChange={([value]) => setNewScript(prev => ({
                        ...prev,
                        characteristics: { ...prev.characteristics!, criticalPotential: value }
                      }))}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Popcorn</span>
                      <span>Awards Bait</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Visual Style</Label>
                  <Select
                    value={newScript.characteristics?.visualStyle}
                    onValueChange={(value) => setNewScript(prev => ({
                      ...prev,
                      characteristics: { ...prev.characteristics!, visualStyle: value as any }
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="stylized">Stylized</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                onClick={handleCreateScript}
                className="btn-studio animate-glow"
              >
                <ScriptIcon className="mr-2" size={16} />
                {editingScript ? 'Save Changes' : 'Create Script'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scripts Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📚</span>
            Script Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameState.scripts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">📄</div>
              <p>No scripts in development</p>
              <p className="text-sm">Create your first script to begin building your slate</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableScripts.map((script) => {
                const stageOrder = ['concept', 'treatment', 'first-draft', 'polish', 'final'];
                const stageIndex = stageOrder.indexOf(script.developmentStage);
                const stageProgress = ((stageIndex + 1) / stageOrder.length) * 100;
                const isReadyToGreenlight = script.developmentStage === 'final';

                return (
                <Card 
                  key={script.id} 
                  className={`border-border hover:border-primary/40 transition-colors ${isReadyToGreenlight ? 'ring-1 ring-primary/30' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base truncate">{script.title}</CardTitle>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <Badge variant="outline">{script.genre}</Badge>
                      <Badge 
                        variant={isReadyToGreenlight ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {script.developmentStage}
                      </Badge>
                      {script.sourceType === 'franchise' && (
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">Franchise</Badge>
                      )}
                      {script.sourceType === 'public-domain' && (
                        <Badge variant="outline" className="text-xs border-accent/40 text-accent">Public Domain</Badge>
                      )}
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
                          <span>{stageOrder[stageIndex]?.replace('-', ' ')}</span>
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
                          <span className="text-muted-foreground">Budget:</span>
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
                        {script.characters && script.characters.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Roles:</span>
                            <span>{script.characters.length} characters</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditScript(script)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button 
                          size="sm" 
                          className={`flex-1 ${!isReadyToGreenlight ? 'opacity-60' : ''}`}
                          onClick={() => handleGreenlightScript(script)}
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