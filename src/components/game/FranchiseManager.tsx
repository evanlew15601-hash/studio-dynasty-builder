import React, { useState } from 'react';
import { Franchise, PublicDomainIP, GameState } from '@/types/game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Crown, Clock, TrendingUp, BookOpen, Sparkles, DollarSign, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FranchiseManagerProps {
  gameState: GameState;
  onCreateProject: (franchiseId?: string, publicDomainId?: string, cost?: number) => void;
}

export const FranchiseManager: React.FC<FranchiseManagerProps> = ({
  gameState,
  onCreateProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Filter franchises
  const filteredFranchises = gameState.franchises.filter(franchise => {
    const matchesSearch = franchise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         franchise.franchiseTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGenre = selectedGenre === 'all' || franchise.genre.includes(selectedGenre as any);
    return matchesSearch && matchesGenre;
  });

  // Filter public domain IPs
  const filteredPublicDomain = gameState.publicDomainIPs.filter(ip => {
    const matchesSearch = ip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ip.coreElements.some(element => element.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGenre = selectedGenre === 'all' || ip.genreFlexibility.includes(selectedGenre as any);
    const matchesDomain = selectedDomain === 'all' || ip.domainType === selectedDomain;
    return matchesSearch && matchesGenre && matchesDomain;
  });

  const getFranchiseStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'dormant': return 'bg-yellow-500';
      case 'rebooted': return 'bg-blue-500';
      case 'retired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDomainTypeIcon = (domainType: string) => {
    switch (domainType) {
      case 'literature': return <BookOpen className="w-4 h-4" />;
      case 'mythology': return <Sparkles className="w-4 h-4" />;
      case 'folklore': return <Crown className="w-4 h-4" />;
      case 'historical': return <Clock className="w-4 h-4" />;
      case 'religious': return <Star className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Franchise & IP Management</h1>
          <p className="text-muted-foreground">
            Manage franchises and adapt public domain properties for your studio
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search franchises and IPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="drama">Drama</SelectItem>
                <SelectItem value="comedy">Comedy</SelectItem>
                <SelectItem value="horror">Horror</SelectItem>
                <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                <SelectItem value="fantasy">Fantasy</SelectItem>
                <SelectItem value="thriller">Thriller</SelectItem>
                <SelectItem value="romance">Romance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="literature">Literature</SelectItem>
                <SelectItem value="mythology">Mythology</SelectItem>
                <SelectItem value="folklore">Folklore</SelectItem>
                <SelectItem value="historical">Historical</SelectItem>
                <SelectItem value="religious">Religious</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="franchises" className="space-y-4">
        <TabsList>
          <TabsTrigger value="franchises">Franchises ({gameState.franchises.length})</TabsTrigger>
          <TabsTrigger value="public-domain">Public Domain ({gameState.publicDomainIPs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="franchises" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFranchises.map((franchise) => (
              <Card key={franchise.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{franchise.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {franchise.parodySource && `Inspired by ${franchise.parodySource}`}
                      </CardDescription>
                    </div>
                    <Badge className={`${getFranchiseStatusColor(franchise.status)} text-white`}>
                      {franchise.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Cultural Weight</span>
                      <span className="font-mono">{franchise.culturalWeight}/100</span>
                    </div>
                    <Progress value={franchise.culturalWeight} className="h-2" />
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm font-medium">License Cost</span>
                      </div>
                      <span className="text-lg font-bold">
                        ${(franchise.cost / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    {franchise.description && (
                      <div className="flex items-start space-x-2 mt-2">
                        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">{franchise.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Genres:</div>
                    <div className="flex flex-wrap gap-1">
                      {franchise.genre.map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Tags:</div>
                    <div className="flex flex-wrap gap-1">
                      {franchise.franchiseTags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {franchise.franchiseTags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{franchise.franchiseTags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Entries: {franchise.entries.length}</div>
                    <div>Since: {new Date(franchise.originDate).getFullYear()}</div>
                    {franchise.criticalFatigue && (
                      <div className="col-span-2">
                        Fatigue: {franchise.criticalFatigue}%
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => onCreateProject(franchise.id, undefined, franchise.cost)}
                    disabled={franchise.status === 'retired' || gameState.studio.budget < franchise.cost}
                    variant={gameState.studio.budget < franchise.cost ? 'secondary' : 'default'}
                  >
                    {gameState.studio.budget < franchise.cost
                      ? 'Insufficient Budget' 
                      : franchise.entries.length === 0 ? 'Start Franchise' : 'Create Sequel'
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="public-domain" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPublicDomain.map((ip) => (
              <Card key={ip.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getDomainTypeIcon(ip.domainType)}
                      <div>
                        <CardTitle className="text-lg">{ip.name}</CardTitle>
                        <CardDescription className="mt-1 capitalize">
                          {ip.domainType}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-mono">{ip.reputationScore}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Cultural Relevance</span>
                      <span className="font-mono">{ip.culturalRelevance || ip.reputationScore}/100</span>
                    </div>
                    <Progress value={ip.culturalRelevance || ip.reputationScore} className="h-2" />
                  </div>

                  {ip.adaptationFatigue && ip.adaptationFatigue > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Adaptation Fatigue</span>
                        <span className="font-mono text-orange-500">{ip.adaptationFatigue}/100</span>
                      </div>
                      <Progress value={ip.adaptationFatigue} className="h-2" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Available Genres:</div>
                    <div className="flex flex-wrap gap-1">
                      {ip.genreFlexibility.map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Core Elements:</div>
                    <div className="text-xs text-muted-foreground">
                      {ip.coreElements.slice(0, 3).join(', ')}
                      {ip.coreElements.length > 3 && '...'}
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm font-medium">Cost</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">FREE</span>
                    </div>
                    {ip.description && (
                      <div className="flex items-start space-x-2 mt-2">
                        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">{ip.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Previous adaptations: {ip.notableAdaptations.length}
                    {ip.lastAdaptationDate && (
                      <div className="mt-1">
                        Last adapted: {new Date(ip.lastAdaptationDate).getFullYear()}
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => onCreateProject(undefined, ip.id, ip.cost)}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Adapt Property
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};