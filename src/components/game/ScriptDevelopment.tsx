import React, { useState } from 'react';
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

interface ScriptDevelopmentProps {
  gameState: GameState;
  onProjectCreate: (script: Script) => void;
  onScriptUpdate: (script: Script) => void;
}

export const ScriptDevelopment: React.FC<ScriptDevelopmentProps> = ({
  gameState,
  onProjectCreate,
  onScriptUpdate,
}) => {
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newScript, setNewScript] = useState<Partial<Script>>({
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
  });

  const genres: Genre[] = [
    'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
    'romance', 'sci-fi', 'fantasy', 'documentary', 'animation',
    'musical', 'western', 'war', 'biography', 'crime', 'mystery',
    'superhero', 'family', 'sports', 'historical'
  ];

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
      id: `script-${Date.now()}`,
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
      }
    };

    onScriptUpdate(script);
    setIsCreating(false);
    setNewScript({});
    
    toast({
      title: "Script Created",
      description: `"${script.title}" has been added to your development slate.`,
    });
  };

  const handleGreenlightScript = (script: Script) => {
    if (gameState.studio.budget < script.budget * 0.1) {
      toast({
        title: "Insufficient Budget",
        description: "You need at least 10% of the production budget for development.",
        variant: "destructive"
      });
      return;
    }

    onProjectCreate(script);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Script Development</h2>
          <p className="text-muted-foreground">Create, refine, and greenlight your next productions</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-gradient-golden hover:opacity-90"
        >
          <span className="mr-2">✏️</span>
          New Script
        </Button>
      </div>

      {/* Script Creation Modal */}
      {isCreating && (
        <Card className="border-primary/20 shadow-studio">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">📝</span>
              Script Development Workshop
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

            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateScript}
                className="bg-gradient-golden hover:opacity-90"
              >
                Create Script
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
              {gameState.scripts.map((script) => (
                <Card 
                  key={script.id} 
                  className="border-border hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base truncate">{script.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{script.genre}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {script.developmentStage}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {script.logline}
                      </p>
                      
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
                      </div>

                      <div className="pt-2">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleGreenlightScript(script)}
                          disabled={gameState.studio.budget < script.budget * 0.1}
                        >
                          <span className="mr-2">🎬</span>
                          Greenlight Project
                        </Button>
                      </div>
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