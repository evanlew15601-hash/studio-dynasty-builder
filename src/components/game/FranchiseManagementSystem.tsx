import React, { useState } from 'react';
import { GameState, Franchise, ScriptCharacter } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Crown, Star, Users, Plus, Zap } from 'lucide-react';

interface FranchiseManagementSystemProps {
  gameState: GameState;
  onCreateFranchise: (franchise: Franchise) => void;
  onUpdateFranchise: (franchiseId: string, updates: Partial<Franchise>) => void;
}

export const FranchiseManagementSystem: React.FC<FranchiseManagementSystemProps> = ({
  gameState,
  onCreateFranchise,
  onUpdateFranchise
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newFranchise, setNewFranchise] = useState({
    title: '',
    description: '',
    genre: [] as string[],
    tone: 'light' as const,
    culturalWeight: 50,
    cost: 0
  });

  const ownedFranchises = gameState.franchises.filter(f => f.creatorStudioId === gameState.studio.id);

  const createFranchise = () => {
    if (!newFranchise.title) {
      toast({
        title: "Missing Information",
        description: "Franchise title is required",
        variant: "destructive"
      });
      return;
    }

    const cost = Math.floor(newFranchise.culturalWeight * 100000); // Cost based on cultural weight
    
    if (cost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford to create franchise - need $${(cost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    const franchise: Franchise = {
      id: `franchise-${Date.now()}`,
      title: newFranchise.title,
      description: newFranchise.description,
      originDate: new Date().toISOString().split('T')[0],
      creatorStudioId: gameState.studio.id,
      genre: newFranchise.genre as any,
      tone: newFranchise.tone,
      entries: [],
      status: 'active',
      franchiseTags: [],
      culturalWeight: newFranchise.culturalWeight,
      cost: 0 // Original franchise costs nothing to use once created
    };

    onCreateFranchise(franchise);
    
    toast({
      title: "Franchise Created",
      description: `${franchise.title} franchise established`,
    });

    setIsCreating(false);
    setNewFranchise({
      title: '',
      description: '',
      genre: [],
      tone: 'light',
      culturalWeight: 50,
      cost: 0
    });
  };

  const getFranchiseValue = (franchise: Franchise) => {
    const entries = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
    const totalBoxOffice = entries.reduce(
      (sum, p) => sum + (p.metrics?.boxOfficeTotal || 0),
      0
    );
    const totalStreamingViews = entries.reduce(
      (sum, p) => sum + (p.metrics?.streaming?.totalViews || 0),
      0
    );
    const avgRating =
      entries.length > 0
        ? entries.reduce(
            (sum, p) =>
              sum +
              ((p.metrics?.criticsScore || 0) + (p.metrics?.audienceScore || 0)) / 2,
            0
          ) / entries.length
        : 0;

    return {
      entries: entries.length,
      totalBoxOffice,
      totalStreamingViews,
      avgRating
    };
  };

  const getCharacterPopularity = (characterId: string) => {
    // Find projects where this character appeared
    const appearances = gameState.projects.filter(p => 
      p.script.characters?.some(c => !c.excluded && c.franchiseCharacterId === characterId)
    );
    
    if (appearances.length === 0) return 0;
    
    const avgPerformance = appearances.reduce((sum, p) => {
      const boxOfficeScore = Math.min(100, (p.metrics?.boxOfficeTotal || 0) / (p.budget.total * 2) * 50);
      const criticsScore = (p.metrics?.criticsScore || 50);
      const audienceScore = (p.metrics?.audienceScore || 50);
      return sum + (boxOfficeScore + criticsScore + audienceScore) / 3;
    }, 0) / appearances.length;
    
    return Math.round(avgPerformance);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Franchise Management
            </div>
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Franchise
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Create and manage your own franchises, establish iconic characters, and build lasting intellectual properties.
          </div>
        </CardContent>
      </Card>

      {/* Create Franchise Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Franchise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="franchise-title">Franchise Title</Label>
              <Input
                id="franchise-title"
                value={newFranchise.title}
                onChange={(e) => setNewFranchise(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter franchise name..."
              />
            </div>
            
            <div>
              <Label htmlFor="franchise-description">Description</Label>
              <Textarea
                id="franchise-description"
                value={newFranchise.description}
                onChange={(e) => setNewFranchise(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the franchise concept..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tone</Label>
                <Select value={newFranchise.tone} onValueChange={(value) => setNewFranchise(prev => ({ ...prev, tone: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="pulpy">Pulpy</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="comedic">Comedic</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Cultural Impact ({newFranchise.culturalWeight})</Label>
                <Input
                  type="range"
                  min="10"
                  max="100"
                  value={newFranchise.culturalWeight}
                  onChange={(e) => setNewFranchise(prev => ({ ...prev, culturalWeight: parseInt(e.target.value) }))}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Cost: ${(newFranchise.culturalWeight * 100000 / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createFranchise}>
                Create Franchise (${(newFranchise.culturalWeight * 100000 / 1000000).toFixed(1)}M)
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owned Franchises */}
      <div className="grid gap-4">
        {ownedFranchises.map(franchise => {
          const value = getFranchiseValue(franchise);
          const characters = gameState.projects
            .filter(p => p.script.franchiseId === franchise.id)
            .flatMap(p => p.script.characters || [])
            .filter(c => c.franchiseCharacterId && !c.excluded)
            .reduce((acc, char) => {
              if (!acc.find(existing => existing.franchiseCharacterId === char.franchiseCharacterId)) {
                acc.push(char);
              }
              return acc;
            }, [] as ScriptCharacter[]);

          return (
            <Card key={franchise.id} className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      {franchise.title}
                      <Badge variant="outline" className="capitalize">
                        {franchise.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {franchise.description}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    Owned
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Projects</div>
                    <div className="text-xl font-bold">{value.entries}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Box Office</div>
                    <div className="text-xl font-bold">${(value.totalBoxOffice / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Streaming Views</div>
                    <div className="text-xl font-bold">
                      {(value.totalStreamingViews / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Avg Rating</div>
                    <div className="text-xl font-bold">{value.avgRating.toFixed(1)}%</div>
                  </div>
                </div>

                {/* Franchise Characters */}
                {characters.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Franchise Characters
                    </h4>
                    <div className="grid gap-2">
                      {characters.map(character => {
                        const popularity = getCharacterPopularity(character.franchiseCharacterId!);
                        const assignedTalent = character.assignedTalentId 
                          ? gameState.talent.find(t => t.id === character.assignedTalentId)
                          : null;
                        
                        return (
                          <div key={character.franchiseCharacterId} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              {character.importance === 'lead' && <Crown className="h-4 w-4 text-yellow-500" />}
                              {character.importance === 'supporting' && <Star className="h-4 w-4 text-blue-500" />}
                              <div>
                                <div className="font-medium">{character.name}</div>
                                {assignedTalent && (
                                  <div className="text-sm text-muted-foreground">
                                    Played by {assignedTalent.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={popularity >= 70 ? "default" : popularity >= 40 ? "secondary" : "outline"}>
                                {popularity}% Popular
                              </Badge>
                              {assignedTalent && (
                                <Badge variant="outline" className="text-xs">
                                  Under Contract
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ownedFranchises.length === 0 && !isCreating && (
        <Card>
          <CardContent className="text-center py-8">
            <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Franchises Owned</h3>
            <p className="text-muted-foreground mb-4">
              Create your own franchise to build lasting intellectual properties and iconic characters
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Franchise
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};