import React, { useState } from 'react';
import { GameState, Script, Genre } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tv, Plus, BookOpen, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TVShowDevelopmentProps {
  gameState: GameState;
  onUpdateBudget: (amount: number) => void;
  onGameStateUpdate: (updates: Partial<GameState>) => void;
}

export const TVShowDevelopment: React.FC<TVShowDevelopmentProps> = ({
  gameState,
  onUpdateBudget,
  onGameStateUpdate
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newScript, setNewScript] = useState<Partial<Script>>({
    title: '',
    genre: 'drama',
    logline: '',
    writer: gameState.studio.name + ' Writers',
    pages: 60,
    quality: 50,
    budget: 5000000,
    developmentStage: 'concept',
    targetAudience: 'general',
    estimatedRuntime: 45,
    themes: ['relationships', 'conflict'],
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

  const createTVScript = () => {
    if (!newScript.title || !newScript.logline) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and logline",
        variant: "destructive"
      });
      return;
    }

    const script: Script = {
      id: `tv-script-${Date.now()}`,
      title: newScript.title!,
      genre: newScript.genre as Genre,
      logline: newScript.logline!,
      writer: newScript.writer!,
      pages: newScript.pages!,
      quality: newScript.quality!,
      budget: newScript.budget!,
      developmentStage: 'concept',
      targetAudience: newScript.targetAudience!,
      estimatedRuntime: newScript.estimatedRuntime!,
      themes: newScript.themes!,
      characteristics: newScript.characteristics!,
      sourceType: 'original'
    };

    const developmentCost = 50000; // Base development cost

    if (gameState.studio.budget < developmentCost) {
      toast({
        title: "Insufficient Budget",
        description: "Not enough budget to start script development",
        variant: "destructive"
      });
      return;
    }

    const updatedScripts = [...gameState.scripts, script];
    const updatedBudget = gameState.studio.budget - developmentCost;

    onGameStateUpdate({
      scripts: updatedScripts,
      studio: { ...gameState.studio, budget: updatedBudget }
    });

    toast({
      title: "Script Created",
      description: `"${script.title}" has entered development`,
    });

    setIsCreating(false);
    setNewScript({
      title: '',
      genre: 'drama',
      logline: '',
      writer: gameState.studio.name + ' Writers',
      pages: 60,
      quality: 50,
      budget: 5000000,
      developmentStage: 'concept',
      targetAudience: 'general',
      estimatedRuntime: 45,
      themes: ['relationships', 'conflict'],
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
  };

  const advanceDevelopment = (script: Script) => {
    const stages = ['concept', 'treatment', 'first-draft', 'polish', 'final'];
    const currentIndex = stages.indexOf(script.developmentStage);
    
    if (currentIndex === stages.length - 1) {
      toast({
        title: "Development Complete",
        description: "This script is already at final stage",
      });
      return;
    }

    const nextStage = stages[currentIndex + 1] as Script['developmentStage'];
    const cost = (currentIndex + 1) * 25000; // Increasing cost per stage

    if (gameState.studio.budget < cost) {
      toast({
        title: "Insufficient Budget",
        description: `Need $${cost.toLocaleString()} to advance development`,
        variant: "destructive"
      });
      return;
    }

    const updatedScripts = gameState.scripts.map(s => 
      s.id === script.id 
        ? { ...s, developmentStage: nextStage, quality: Math.min(100, s.quality + 10) }
        : s
    );

    const updatedBudget = gameState.studio.budget - cost;

    onGameStateUpdate({
      scripts: updatedScripts,
      studio: { ...gameState.studio, budget: updatedBudget }
    });

    toast({
      title: "Development Advanced",
      description: `"${script.title}" moved to ${nextStage.replace('-', ' ')} stage`,
    });
  };

  const developmentScripts = gameState.scripts?.filter(s => s.developmentStage !== 'final') || [];
  const readyScripts = gameState.scripts?.filter(s => s.developmentStage === 'final') || [];

  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create TV Show Script
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={newScript.title || ''}
              onChange={(e) => setNewScript(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter show title"
            />
          </div>

          <div>
            <Label htmlFor="genre">Genre</Label>
            <Select
              value={newScript.genre}
              onValueChange={(value) => setNewScript(prev => ({ ...prev, genre: value as Genre }))}
            >
              <SelectTrigger>
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
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="logline">Logline</Label>
            <Textarea
              id="logline"
              value={newScript.logline || ''}
              onChange={(e) => setNewScript(prev => ({ ...prev, logline: e.target.value }))}
              placeholder="Brief description of the show concept"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="budget">Season Budget</Label>
            <Input
              id="budget"
              type="number"
              value={newScript.budget || 0}
              onChange={(e) => setNewScript(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
              placeholder="5000000"
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={createTVScript}>
              Create Script ($50K)
            </Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">TV Show Development</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New TV Script
        </Button>
      </div>

      {/* Scripts in Development */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Scripts in Development
          </CardTitle>
        </CardHeader>
        <CardContent>
          {developmentScripts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No scripts currently in development
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {developmentScripts.map((script) => (
                <Card key={script.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{script.title}</h3>
                      <Badge variant="outline">
                        {script.developmentStage.replace('-', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Quality</span>
                        <span>{script.quality}%</span>
                      </div>
                      <Progress value={script.quality} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>Genre: {script.genre}</div>
                      <div>Budget: ${(script.budget / 1000000).toFixed(1)}M</div>
                    </div>

                    <Button 
                      onClick={() => advanceDevelopment(script)}
                      size="sm"
                      className="w-full"
                    >
                      Advance Development
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ready for Production */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Ready for Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readyScripts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No scripts ready for production yet
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyScripts.map((script) => (
                <Card key={script.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{script.title}</h3>
                      <Badge variant="default">Ready</Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Genre: {script.genre}</div>
                      <div>Quality: {script.quality}%</div>
                      <div>Budget: ${(script.budget / 1000000).toFixed(1)}M</div>
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