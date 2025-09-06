import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { GameState } from '@/types/game';
import { TVShowDevelopment } from './TVShowDevelopment';
import { TVProductionManagement } from './TVProductionManagement';
import { AITelevisionStudios } from './AITelevisionStudios';
import { 
  Tv, 
  Monitor,
  TrendingUp,
  Building,
  Play,
  Users,
  Star,
  Plus,
  Wifi,
  Radio
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TVShow {
  id: string;
  title: string;
  genre: string;
  format: 'sitcom' | 'drama' | 'reality' | 'documentary' | 'news' | 'variety' | 'game-show' | 'sports';
  network: string;
  studioId: string;
  status: 'development' | 'production' | 'airing' | 'hiatus' | 'cancelled' | 'completed';
  seasons: TVSeason[];
  currentSeason?: number;
  totalEpisodes: number;
  budget: {
    perEpisode: number;
    total: number;
  };
  cast: Array<{
    talentId: string;
    role: string;
    salary: number;
    episodes: number;
  }>;
  ratings: {
    viewers: number; // millions
    demographics: Record<string, number>;
    criticsScore?: number;
  };
  startDate: { week: number; year: number };
  endDate?: { week: number; year: number };
}

interface TVSeason {
  id: string;
  seasonNumber: number;
  episodeCount: number;
  status: 'development' | 'production' | 'airing' | 'completed';
  budget: number;
  airDate?: { week: number; year: number };
  ratings?: {
    premiere: number;
    average: number;
    finale: number;
  };
}

interface StreamingService {
  id: string;
  name: string;
  type: 'streaming' | 'cable' | 'broadcast';
  subscribers: number; // millions
  monthlyPrice?: number;
  originalContent: boolean;
  budget: number;
  shows: string[]; // show IDs
  studioId?: string; // if owned by a studio
}

interface ComprehensiveTelevisionSystemProps {
  gameState: GameState;
  onUpdateBudget: (amount: number) => void;
  onGameStateUpdate: (updates: Partial<GameState>) => void;
  onTalentCommitmentChange?: (talentId: string, busy: boolean, project?: string) => void;
}

export const ComprehensiveTelevisionSystem: React.FC<ComprehensiveTelevisionSystemProps> = ({
  gameState,
  onUpdateBudget,
  onGameStateUpdate,
  onTalentCommitmentChange
}) => {
  const { toast } = useToast();
  const [shows, setShows] = useState<TVShow[]>([]);
  const [streamingServices, setStreamingServices] = useState<StreamingService[]>([]);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [newShow, setNewShow] = useState<Partial<TVShow>>({
    title: '',
    genre: 'drama',
    format: 'drama',
    network: '',
    budget: { perEpisode: 1000000, total: 13000000 },
    cast: []
  });
  const [viewMode, setViewMode] = useState<'shows' | 'networks' | 'market'>('shows');

  useEffect(() => {
    initializeTelevisionMarket();
  }, []);

  useEffect(() => {
    processWeeklyTVActivity();
  }, [gameState.currentWeek, gameState.currentYear]);

  const initializeTelevisionMarket = () => {
    // Initialize major networks and streaming services
    const initialServices: StreamingService[] = [
      {
        id: 'netflix',
        name: 'Netflix',
        type: 'streaming',
        subscribers: 230,
        monthlyPrice: 15.99,
        originalContent: true,
        budget: 15000000000, // $15B content budget
        shows: []
      },
      {
        id: 'hbo-max',
        name: 'HBO Max',
        type: 'streaming',
        subscribers: 90,
        monthlyPrice: 14.99,
        originalContent: true,
        budget: 3000000000, // $3B content budget
        shows: []
      },
      {
        id: 'disney-plus',
        name: 'Disney+',
        type: 'streaming',
        subscribers: 150,
        monthlyPrice: 7.99,
        originalContent: true,
        budget: 8000000000, // $8B content budget
        shows: []
      },
      {
        id: 'amazon-prime',
        name: 'Amazon Prime Video',
        type: 'streaming',
        subscribers: 175,
        monthlyPrice: 8.99,
        originalContent: true,
        budget: 7000000000, // $7B content budget
        shows: []
      },
      {
        id: 'nbc',
        name: 'NBC',
        type: 'broadcast',
        subscribers: 0, // Broadcast doesn't have subscribers
        originalContent: true,
        budget: 2000000000, // $2B content budget
        shows: []
      },
      {
        id: 'abc',
        name: 'ABC',
        type: 'broadcast',
        subscribers: 0,
        originalContent: true,
        budget: 1800000000,
        shows: []
      },
      {
        id: 'cbs',
        name: 'CBS',
        type: 'broadcast',
        subscribers: 0,
        originalContent: true,
        budget: 1600000000,
        shows: []
      },
      {
        id: 'hbo',
        name: 'HBO',
        type: 'cable',
        subscribers: 45,
        monthlyPrice: 14.99,
        originalContent: true,
        budget: 2500000000,
        shows: []
      }
    ];

    setStreamingServices(initialServices);
    console.log('📺 Initialized Television Market with', initialServices.length, 'networks');
  };

  const processWeeklyTVActivity = () => {
    setShows(prev => prev.map(show => {
      if (show.status === 'production' || show.status === 'airing') {
        return processShowWeekly(show);
      }
      return show;
    }));
  };

  const processShowWeekly = (show: TVShow): TVShow => {
    // Simulate TV show progress (simplified)
    if (show.status === 'production' && Math.random() < 0.1) {
      // 10% chance per week to move to airing
      return {
        ...show,
        status: 'airing',
        ratings: {
          ...show.ratings,
          viewers: Math.random() * 10 + 1, // 1-11M viewers
          demographics: {
            '18-49': Math.random() * 5 + 1
          }
        }
      };
    }

    if (show.status === 'airing' && Math.random() < 0.05) {
      // 5% chance per week to complete season
      const currentSeason = show.seasons[show.seasons.length - 1];
      if (currentSeason) {
        return {
          ...show,
          status: 'hiatus',
          seasons: show.seasons.map((season, index) => 
            index === show.seasons.length - 1
              ? { ...season, status: 'completed' }
              : season
          )
        };
      }
    }

    return show;
  };

  const createTVShow = () => {
    if (!newShow.title || !newShow.network) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const totalBudget = (newShow.budget?.total || 13000000);
    if (totalBudget > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Need $${(totalBudget / 1000000).toFixed(1)}M to develop TV show`,
        variant: "destructive"
      });
      return;
    }

    const show: TVShow = {
      id: `tv-show-${Date.now()}`,
      title: newShow.title!,
      genre: newShow.genre || 'drama',
      format: newShow.format || 'drama',
      network: newShow.network!,
      studioId: gameState.studio.id,
      status: 'development',
      seasons: [{
        id: `season-1-${Date.now()}`,
        seasonNumber: 1,
        episodeCount: 13,
        status: 'development',
        budget: totalBudget
      }],
      currentSeason: 1,
      totalEpisodes: 0,
      budget: newShow.budget!,
      cast: [],
      ratings: {
        viewers: 0,
        demographics: {}
      },
      startDate: {
        week: gameState.currentWeek,
        year: gameState.currentYear
      }
    };

    setShows(prev => [...prev, show]);
    onUpdateBudget(-totalBudget);

    toast({
      title: "TV Show Created",
      description: `"${show.title}" is now in development for ${show.network}`,
    });

    setIsCreatingShow(false);
    setNewShow({
      title: '',
      genre: 'drama',
      format: 'drama',
      network: '',
      budget: { perEpisode: 1000000, total: 13000000 },
      cast: []
    });
  };

  const castTalentForShow = (showId: string, talentId: string, role: string) => {
    const talent = gameState.talent.find(t => t.id === talentId);
    if (!talent) return;

    const salary = talent.marketValue * 0.6; // TV typically pays less than films

    setShows(prev => prev.map(show => 
      show.id === showId
        ? {
            ...show,
            cast: [...show.cast, {
              talentId,
              role,
              salary,
              episodes: 13
            }]
          }
        : show
    ));

    onTalentCommitmentChange?.(talentId, true, `TV: ${role}`);

    toast({
      title: `${talent.name} Cast`,
      description: `Added to the show as ${role}`,
    });
  };

  const getAvailableTalent = () => {
    return gameState.talent.filter(talent => 
      !shows.some(show => 
        show.cast.some(castMember => castMember.talentId === talent.id)
      )
    );
  };

  const getMarketStats = () => {
    const totalShows = shows.length;
    const airingShows = shows.filter(s => s.status === 'airing').length;
    const totalViewers = shows.reduce((sum, show) => sum + (show.ratings.viewers || 0), 0);
    const averageRating = totalViewers / Math.max(airingShows, 1);

    return { totalShows, airingShows, totalViewers, averageRating };
  };

  const marketStats = getMarketStats();
  const availableTalent = getAvailableTalent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Television & Streaming
          </h2>
          <p className="text-muted-foreground">Create and manage TV shows across networks and streaming platforms</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'shows' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('shows')}
          >
            <Tv className="h-4 w-4 mr-2" />
            Shows
          </Button>
          <Button
            variant={viewMode === 'networks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('networks')}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Networks
          </Button>
          <Button
            variant={viewMode === 'market' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('market')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Market
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Shows</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.totalShows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Currently Airing</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.airingShows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Total Viewers</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.totalViewers.toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.averageRating.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Show Dialog */}
      <Dialog open={isCreatingShow} onOpenChange={setIsCreatingShow}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create TV Show
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New TV Show</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Show Title</Label>
                <Input
                  value={newShow.title || ''}
                  onChange={(e) => setNewShow(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter show title..."
                />
              </div>
              <div>
                <Label>Network/Platform</Label>
                <Select value={newShow.network} onValueChange={(value) => setNewShow(prev => ({ ...prev, network: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network..." />
                  </SelectTrigger>
                  <SelectContent>
                    {streamingServices.map(service => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name} ({service.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Genre</Label>
                <Select value={newShow.genre} onValueChange={(value) => setNewShow(prev => ({ ...prev, genre: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="reality">Reality</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={newShow.format} onValueChange={(value) => setNewShow(prev => ({ ...prev, format: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drama">Drama Series</SelectItem>
                    <SelectItem value="sitcom">Sitcom</SelectItem>
                    <SelectItem value="reality">Reality Show</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="variety">Variety Show</SelectItem>
                    <SelectItem value="game-show">Game Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget per Episode</Label>
                <Input
                  type="number"
                  value={newShow.budget?.perEpisode || 1000000}
                  onChange={(e) => setNewShow(prev => ({
                    ...prev,
                    budget: {
                      ...prev.budget!,
                      perEpisode: parseInt(e.target.value),
                      total: parseInt(e.target.value) * 13
                    }
                  }))}
                />
              </div>
              <div>
                <Label>Total Season Budget</Label>
                <Input
                  type="number"
                  value={newShow.budget?.total || 13000000}
                  onChange={(e) => setNewShow(prev => ({
                    ...prev,
                    budget: {
                      ...prev.budget!,
                      total: parseInt(e.target.value),
                      perEpisode: parseInt(e.target.value) / 13
                    }
                  }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingShow(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createTVShow}
                disabled={(newShow.budget?.total || 0) > gameState.studio.budget}
              >
                Create Show (${((newShow.budget?.total || 0) / 1000000).toFixed(1)}M)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content based on view mode */}
      {viewMode === 'shows' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your TV Shows</h3>
          {shows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Tv className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No TV Shows Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first TV show to enter the television market
                </p>
                <Button onClick={() => setIsCreatingShow(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create TV Show
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {shows.map(show => (
                <Card key={show.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Tv className="h-5 w-5" />
                          {show.title}
                          <Badge variant={
                            show.status === 'airing' ? 'default' :
                            show.status === 'production' ? 'secondary' :
                            'outline'
                          }>
                            {show.status}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {show.network} • {show.genre} • Season {show.currentSeason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {show.ratings.viewers.toFixed(1)}M viewers
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${(show.budget.total / 1000000).toFixed(1)}M budget
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cast Members:</span>
                        <span className="text-sm font-medium">{show.cast.length}</span>
                      </div>
                      
                      {show.cast.length > 0 && (
                        <div className="space-y-2">
                          {show.cast.slice(0, 3).map(castMember => {
                            const talent = gameState.talent.find(t => t.id === castMember.talentId);
                            return (
                              <div key={castMember.talentId} className="flex items-center justify-between text-sm">
                                <span>{talent?.name || 'Unknown'}</span>
                                <span className="text-muted-foreground">{castMember.role}</span>
                              </div>
                            );
                          })}
                          {show.cast.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{show.cast.length - 3} more cast members
                            </p>
                          )}
                        </div>
                      )}

                      {availableTalent.length > 0 && show.cast.length < 5 && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground mb-2">Add cast member:</p>
                          <div className="flex gap-2 flex-wrap">
                            {availableTalent.slice(0, 3).map(talent => (
                              <Button
                                key={talent.id}
                                size="sm"
                                variant="outline"
                                onClick={() => castTalentForShow(show.id, talent.id, talent.type === 'director' ? 'Executive Producer' : 'Series Regular')}
                              >
                                {talent.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'networks' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Networks & Streaming Services</h3>
          <div className="grid gap-4">
            {streamingServices.map(service => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {service.type === 'streaming' ? <Wifi className="h-5 w-5" /> :
                         service.type === 'cable' ? <Monitor className="h-5 w-5" /> :
                         <Radio className="h-5 w-5" />}
                        {service.name}
                        <Badge variant="outline">{service.type}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {service.subscribers > 0 && `${service.subscribers}M subscribers`}
                        {service.monthlyPrice && ` • $${service.monthlyPrice}/month`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${(service.budget / 1000000000).toFixed(1)}B budget
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {service.shows.length} shows
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {service.originalContent ? 'Produces original content' : 'Licensed content only'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'market' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Television Market Analysis</h3>
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Share by Platform Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Streaming Services</span>
                    <span className="font-medium">
                      {streamingServices.filter(s => s.type === 'streaming').length} platforms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Broadcast Networks</span>
                    <span className="font-medium">
                      {streamingServices.filter(s => s.type === 'broadcast').length} networks
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cable Networks</span>
                    <span className="font-medium">
                      {streamingServices.filter(s => s.type === 'cable').length} networks
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Streaming Services by Subscribers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {streamingServices
                    .filter(s => s.subscribers > 0)
                    .sort((a, b) => b.subscribers - a.subscribers)
                    .map(service => (
                      <div key={service.id} className="flex justify-between items-center">
                        <span>{service.name}</span>
                        <span className="font-medium">{service.subscribers}M</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};