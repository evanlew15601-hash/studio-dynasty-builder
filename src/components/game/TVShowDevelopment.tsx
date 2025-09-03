import React, { useState } from 'react';
import { GameState, TalentPerson } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Tv, 
  FileText, 
  DollarSign, 
  Calendar, 
  Users,
  Star,
  Award,
  TrendingUp
} from 'lucide-react';

export interface TVShowScript {
  id: string;
  title: string;
  genre: string;
  format: 'sitcom' | 'drama' | 'reality' | 'documentary' | 'news' | 'variety' | 'game-show' | 'sports' | 'limited-series' | 'anthology';
  logline: string;
  writer: string;
  pages: number; // Total season pages
  quality: number; // 0-100
  budget: {
    perEpisode: number;
    totalSeason: number;
  };
  developmentStage: 'concept' | 'outline' | 'pilot-script' | 'series-bible' | 'ready-for-production';
  themes: string[];
  targetAudience: 'children' | 'family' | 'general' | 'adult';
  episodeCount: number;
  estimatedRuntime: number; // per episode in minutes
  characteristics: {
    tone: 'light' | 'dark' | 'balanced' | 'dramatic' | 'comedic';
    pacing: 'slow' | 'steady' | 'fast-paced';
    dialogue: 'naturalistic' | 'stylized' | 'philosophical' | 'witty';
    visualStyle: 'realistic' | 'stylized' | 'cinematic' | 'intimate';
    commercialAppeal: number; // 1-10
    criticalPotential: number; // 1-10
    productionComplexity: 'minimal' | 'moderate' | 'complex' | 'elaborate';
  };
  network?: string;
  createdWeek: number;
  createdYear: number;
  studioId: string;
  castingRequirements: {
    leadRoles: number;
    supportingRoles: number;
    recurringRoles: number;
  };
  franchiseId?: string;
  sourceType?: 'original' | 'franchise' | 'adaptation' | 'remake';
}

interface TVShowDevelopmentProps {
  gameState: GameState;
  selectedFranchise?: string | null;
  onTVShowCreate: (script: TVShowScript) => void;
  onTVShowUpdate: (script: TVShowScript) => void;
}

export const TVShowDevelopment: React.FC<TVShowDevelopmentProps> = ({
  gameState,
  selectedFranchise,
  onTVShowCreate,
  onTVShowUpdate,
}) => {
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTVShow, setNewTVShow] = useState<Partial<TVShowScript>>({
    title: '',
    genre: 'drama',
    format: 'drama',
    logline: '',
    writer: '',
    pages: 600, // ~50 pages per episode, 12 episodes
    quality: 50,
    budget: { perEpisode: 1000000, totalSeason: 12000000 },
    developmentStage: 'concept',
    themes: [],
    targetAudience: 'general',
    episodeCount: 12,
    estimatedRuntime: 45,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      productionComplexity: 'moderate'
    },
    castingRequirements: {
      leadRoles: 2,
      supportingRoles: 4,
      recurringRoles: 6
    },
    sourceType: 'original'
  });

  // Auto-fill script based on selected franchise
  const getInitialTVShow = (): Partial<TVShowScript> => {
    if (selectedFranchise) {
      const franchise = gameState.franchises.find(f => f.id === selectedFranchise);
      if (franchise) {
        const episodeCount = franchise.genre.includes('comedy') ? 22 : 12;
        return {
          title: `${franchise.title}: The Series`,
          genre: franchise.genre[0] || 'drama',
          format: franchise.genre.includes('comedy') ? 'sitcom' : 'drama',
          logline: `${franchise.description || 'A continuation of the beloved franchise'} This series explores deeper character development across multiple episodes.`,
          writer: '',
          pages: episodeCount * 50,
          quality: 50 + (franchise.culturalWeight * 0.3),
          budget: { 
            perEpisode: Math.max(500000, franchise.culturalWeight * 50000),
            totalSeason: Math.max(500000, franchise.culturalWeight * 50000) * episodeCount
          },
          developmentStage: 'concept',
          themes: franchise.franchiseTags.slice(0, 3),
          targetAudience: franchise.tone === 'light' ? 'family' : 'general',
          episodeCount: episodeCount,
          estimatedRuntime: franchise.genre.includes('comedy') ? 22 : 45,
          characteristics: {
            tone: franchise.tone === 'dark' ? 'dark' : franchise.tone === 'comedic' ? 'light' : 'balanced',
            pacing: franchise.genre.includes('action') ? 'fast-paced' : 'steady',
            dialogue: 'naturalistic',
            visualStyle: franchise.genre.includes('fantasy') || franchise.genre.includes('sci-fi') ? 'stylized' : 'realistic',
            commercialAppeal: Math.min(10, Math.round(franchise.culturalWeight / 10)),
            criticalPotential: Math.min(10, Math.round(franchise.averageRating || 5)),
            productionComplexity: franchise.genre.includes('action') || franchise.genre.includes('sci-fi') ? 'complex' : 'moderate'
          },
          sourceType: 'franchise',
          franchiseId: franchise.id,
          castingRequirements: {
            leadRoles: 2,
            supportingRoles: franchise.genre.includes('drama') ? 6 : 4,
            recurringRoles: 8
          }
        };
      }
    }
    
    return newTVShow;
  };

  const getDevelopmentCost = (stage: string): number => {
    switch (stage) {
      case 'concept': return 50000;
      case 'outline': return 100000;
      case 'pilot-script': return 250000;
      case 'series-bible': return 500000;
      case 'ready-for-production': return 1000000;
      default: return 0;
    }
  };

  const canAffordDevelopment = (stage: string): boolean => {
    return gameState.studio.budget >= getDevelopmentCost(stage);
  };

  const advanceDevelopmentStage = (script: TVShowScript) => {
    const stages = ['concept', 'outline', 'pilot-script', 'series-bible', 'ready-for-production'];
    const currentIndex = stages.indexOf(script.developmentStage);
    
    if (currentIndex >= stages.length - 1) {
      toast({
        title: "Development Complete",
        description: `"${script.title}" is ready for production`,
        variant: "default"
      });
      return;
    }

    const nextStage = stages[currentIndex + 1] as TVShowScript['developmentStage'];
    const cost = getDevelopmentCost(nextStage);

    if (!canAffordDevelopment(nextStage)) {
      toast({
        title: "Insufficient Budget",
        description: `Need $${(cost / 1000000).toFixed(1)}M to advance to ${nextStage.replace('-', ' ')}`,
        variant: "destructive"
      });
      return;
    }

    const updatedScript: TVShowScript = {
      ...script,
      developmentStage: nextStage,
      quality: Math.min(100, script.quality + Math.random() * 10 + 5), // Improve quality
    };

    // Deduct development cost
    const updatedGameState = {
      ...gameState,
      studio: {
        ...gameState.studio,
        budget: gameState.studio.budget - cost
      }
    };

    onTVShowUpdate(updatedScript);

    toast({
      title: "Development Advanced",
      description: `"${script.title}" advanced to ${nextStage.replace('-', ' ')} stage`,
    });
  };

  const createTVShow = () => {
    if (!newTVShow.title || !newTVShow.writer) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and writer",
        variant: "destructive"
      });
      return;
    }

    const conceptCost = getDevelopmentCost('concept');
    if (gameState.studio.budget < conceptCost) {
      toast({
        title: "Insufficient Budget",
        description: `Need $${(conceptCost / 1000).toFixed(0)}K to start TV show development`,
        variant: "destructive"
      });
      return;
    }

    const script: TVShowScript = {
      id: `tv-script-${Date.now()}`,
      title: newTVShow.title!,
      genre: newTVShow.genre || 'drama',
      format: newTVShow.format || 'drama',
      logline: newTVShow.logline || '',
      writer: newTVShow.writer!,
      pages: newTVShow.pages || 600,
      quality: newTVShow.quality || 50,
      budget: newTVShow.budget || { perEpisode: 1000000, totalSeason: 12000000 },
      developmentStage: 'concept',
      themes: newTVShow.themes || [],
      targetAudience: newTVShow.targetAudience || 'general',
      episodeCount: newTVShow.episodeCount || 12,
      estimatedRuntime: newTVShow.estimatedRuntime || 45,
      characteristics: newTVShow.characteristics || {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 5,
        criticalPotential: 5,
        productionComplexity: 'moderate'
      },
      createdWeek: gameState.currentWeek,
      createdYear: gameState.currentYear,
      studioId: gameState.studio.id,
      castingRequirements: newTVShow.castingRequirements || {
        leadRoles: 2,
        supportingRoles: 4,
        recurringRoles: 6
      },
      franchiseId: newTVShow.franchiseId,
      sourceType: newTVShow.sourceType || 'original'
    };

    onTVShowCreate(script);

    toast({
      title: "TV Show Created",
      description: `"${script.title}" is now in development`,
    });

    setIsCreating(false);
    setNewTVShow(getInitialTVShow());
  };

  const getDevelopmentScripts = () => {
    return gameState.tvScripts?.filter(s => s.developmentStage !== 'ready-for-production') || [];
  };

  const getReadyForProduction = () => {
    return gameState.tvScripts?.filter(s => s.developmentStage === 'ready-for-production') || [];
  };

  const developmentScripts = getDevelopmentScripts();
  const readyScripts = getReadyForProduction();

  if (isCreating) {
    const initialScript = getInitialTVShow();
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Create New TV Show
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Show Title</Label>
              <Input
                id="title"
                value={newTVShow.title || initialScript.title || ''}
                onChange={(e) => setNewTVShow(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter show title..."
              />
            </div>
            <div>
              <Label htmlFor="writer">Writer/Creator</Label>
              <Input
                id="writer"
                value={newTVShow.writer || ''}
                onChange={(e) => setNewTVShow(prev => ({ ...prev, writer: e.target.value }))}
                placeholder="Enter writer name..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logline">Logline</Label>
            <Textarea
              id="logline"
              value={newTVShow.logline || initialScript.logline || ''}
              onChange={(e) => setNewTVShow(prev => ({ ...prev, logline: e.target.value }))}
              placeholder="One-line description of the show..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Select 
                value={newTVShow.genre || initialScript.genre || 'drama'} 
                onValueChange={(value) => setNewTVShow(prev => ({ ...prev, genre: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drama">Drama</SelectItem>
                  <SelectItem value="comedy">Comedy</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                  <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="reality">Reality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="format">Format</Label>
              <Select 
                value={newTVShow.format || initialScript.format || 'drama'} 
                onValueChange={(value) => setNewTVShow(prev => ({ ...prev, format: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drama">Drama Series</SelectItem>
                  <SelectItem value="sitcom">Sitcom</SelectItem>
                  <SelectItem value="limited-series">Limited Series</SelectItem>
                  <SelectItem value="anthology">Anthology</SelectItem>
                  <SelectItem value="reality">Reality</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="variety">Variety</SelectItem>
                  <SelectItem value="game-show">Game Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target-audience">Target Audience</Label>
              <Select 
                value={newTVShow.targetAudience || initialScript.targetAudience || 'general'} 
                onValueChange={(value) => setNewTVShow(prev => ({ ...prev, targetAudience: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="children">Children</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="episode-count">Episodes per Season</Label>
              <Input
                id="episode-count"
                type="number"
                value={newTVShow.episodeCount || initialScript.episodeCount || 12}
                onChange={(e) => setNewTVShow(prev => ({ ...prev, episodeCount: parseInt(e.target.value) || 12 }))}
                min="6"
                max="24"
              />
            </div>
            <div>
              <Label htmlFor="runtime">Runtime (minutes)</Label>
              <Input
                id="runtime"
                type="number"
                value={newTVShow.estimatedRuntime || initialScript.estimatedRuntime || 45}
                onChange={(e) => setNewTVShow(prev => ({ ...prev, estimatedRuntime: parseInt(e.target.value) || 45 }))}
                min="20"
                max="90"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Budget per Episode: ${((newTVShow.budget?.perEpisode || 1000000) / 1000000).toFixed(1)}M</Label>
            <Slider
              value={[newTVShow.budget?.perEpisode || 1000000]}
              onValueChange={([value]) => setNewTVShow(prev => ({ 
                ...prev, 
                budget: { 
                  perEpisode: value, 
                  totalSeason: value * (prev.episodeCount || 12) 
                } 
              }))}
              min={100000}
              max={10000000}
              step={100000}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Total Season Budget: ${((newTVShow.budget?.totalSeason || 12000000) / 1000000).toFixed(1)}M
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={createTVShow} className="flex-1">
              <Tv className="h-4 w-4 mr-2" />
              Create Show (${(getDevelopmentCost('concept') / 1000).toFixed(0)}K)
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TV Show Development
          </h2>
          <p className="text-muted-foreground">Develop television shows from concept to production-ready</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Tv className="h-4 w-4 mr-2" />
          New TV Show
        </Button>
      </div>

      {/* Development Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* In Development */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              In Development ({developmentScripts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {developmentScripts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No shows in development</p>
            ) : (
              developmentScripts.map(script => (
                <Card key={script.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{script.title}</h3>
                      <p className="text-sm text-muted-foreground">{script.genre} • {script.format}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {script.developmentStage.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Quality</span>
                      <span>{script.quality.toFixed(0)}%</span>
                    </div>
                        <Progress value={script.quality} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Episodes: </span>
                      <span>{script.episodeCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Runtime: </span>
                      <span>{script.estimatedRuntime}min</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Per Episode: </span>
                      <span>${(script.budget.perEpisode / 1000000).toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Season: </span>
                      <span>${(script.budget.totalSeason / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => advanceDevelopmentStage(script)}
                    disabled={!canAffordDevelopment(script.developmentStage)}
                    size="sm"
                    className="w-full"
                  >
                    Advance Development (${(getDevelopmentCost(script.developmentStage) / 1000).toFixed(0)}K)
                  </Button>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ready for Production */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Ready for Production ({readyScripts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readyScripts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No shows ready for production</p>
            ) : (
              readyScripts.map(script => (
                <Card key={script.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{script.title}</h3>
                      <p className="text-sm text-muted-foreground">{script.genre} • {script.format}</p>
                    </div>
                    <Badge className="ml-2">Ready</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Quality: </span>
                      <span>{script.quality.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Episodes: </span>
                      <span>{script.episodeCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Commercial: </span>
                      <span>{script.characteristics.commercialAppeal}/10</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Critical: </span>
                      <span>{script.characteristics.criticalPotential}/10</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                    <Badge variant="outline" className="text-center justify-center py-1">
                      {script.characteristics.tone}
                    </Badge>
                    <Badge variant="outline" className="text-center justify-center py-1">
                      {script.characteristics.pacing}
                    </Badge>
                    <Badge variant="outline" className="text-center justify-center py-1">
                      {script.characteristics.productionComplexity}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {script.logline}
                  </p>

                  <Button size="sm" className="w-full">
                    Start Production
                  </Button>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};