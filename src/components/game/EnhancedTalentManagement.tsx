import React, { useState } from 'react';
import type { GameState, TalentPerson } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Star, Users, TrendingUp, Clock, DollarSign, Search } from 'lucide-react';

interface EnhancedTalentManagementProps {
  gameState?: GameState;
  onTalentUpdate?: (talentId: string, updates: Partial<TalentPerson>) => void;
  onContractTalent?: (talent: TalentPerson, terms: any) => void;
}

export const EnhancedTalentManagement: React.FC<EnhancedTalentManagementProps> = ({
  gameState: propGameState,
  onTalentUpdate: propOnTalentUpdate,
  onContractTalent: propOnContractTalent
}) => {
  const storeGameState = useGameStore((s) => s.game);
  const updateTalent = useGameStore((s) => s.updateTalent);

  const gameState = propGameState ?? storeGameState;
  const onTalentUpdate = propOnTalentUpdate ?? ((id: string, updates: Partial<TalentPerson>) => updateTalent(id, updates));
  const onContractTalent = propOnContractTalent ?? (() => {});
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'actor' | 'director'>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'busy'>('all');
  const [sortBy, setSortBy] = useState<'reputation' | 'marketValue' | 'name'>('reputation');

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading talent...</div>;
  }

  // Get all talent with current project status
  const getEnhancedTalentList = () => {
    return gameState.talent.map(talent => {
      // Check if talent is currently busy
      const isBusy = gameState.projects.some(project => 
        project.cast?.some(cast => cast.talentId === talent.id) &&
        ['development', 'pre-production', 'production', 'post-production'].includes(project.status)
      );

      // Get current project if busy
      const currentProject = isBusy ? gameState.projects.find(project => 
        project.cast?.some(cast => cast.talentId === talent.id) &&
        ['development', 'pre-production', 'production', 'post-production'].includes(project.status)
      ) : null;

      // Check if under contract with studio
      const contract = (gameState.studio as any).contractedTalent?.find((c: any) => c.talentId === talent.id);
      
      // Calculate burnout and reputation trends
      const burnoutLevel = (talent as any).burnoutLevel || 0;
      const recentProjects = (talent as any).recentProjects || [];
      const isOverworked = recentProjects.length > 3 || burnoutLevel > 70;

      return {
        ...talent,
        isBusy,
        currentProject,
        contract,
        burnoutLevel,
        isOverworked,
        recentProjects
      };
    });
  };

  // Filter and sort talent
  const getFilteredTalent = () => {
    let filtered = getEnhancedTalentList();

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(talent => 
        talent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        talent.genres.some(genre => genre.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(talent => talent.type === filterType);
    }

    // Apply availability filter
    if (filterAvailability === 'available') {
      filtered = filtered.filter(talent => !talent.isBusy);
    } else if (filterAvailability === 'busy') {
      filtered = filtered.filter(talent => talent.isBusy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation - a.reputation;
        case 'marketValue':
          return b.marketValue - a.marketValue;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 80) return 'text-green-600';
    if (reputation >= 60) return 'text-yellow-600';
    if (reputation >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBurnoutColor = (burnout: number) => {
    if (burnout >= 80) return 'text-red-600';
    if (burnout >= 60) return 'text-orange-600';
    if (burnout >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const offerContract = (talent: TalentPerson) => {
    const baseCost = talent.marketValue * 1.2; // 20% premium for exclusive contract
    
    if (baseCost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: `Cannot afford to contract ${talent.name} - need $${(baseCost / 1000000).toFixed(1)}M`,
        variant: "destructive"
      });
      return;
    }

    const contractTerms = {
      duration: 24, // 2 years
      exclusivity: true,
      cost: baseCost,
      bonusClause: 'Performance-based bonus',
      creativeControl: 3
    };

    onContractTalent(talent, contractTerms);
    
    toast({
      title: "Contract Offered",
      description: `Offered exclusive contract to ${talent.name}`,
    });
  };

  const enhanceTalentReputation = (talent: TalentPerson, cost: number) => {
    if (cost > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: "Cannot afford reputation enhancement",
        variant: "destructive"
      });
      return;
    }

    const reputationBoost = Math.floor(cost / 100000); // $100K per reputation point
    
    onTalentUpdate(talent.id, {
      reputation: Math.min(100, talent.reputation + reputationBoost)
    });

    toast({
      title: "Reputation Enhanced",
      description: `${talent.name}'s reputation increased by ${reputationBoost} points`,
    });
  };

  const filteredTalent = getFilteredTalent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Talent Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Manage relationships with actors and directors, track availability, and build long-term partnerships.
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search talent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="actor">Actors</SelectItem>
                <SelectItem value="director">Directors</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterAvailability} onValueChange={(value: any) => setFilterAvailability(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Talent</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Currently Busy</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reputation">Reputation</SelectItem>
                <SelectItem value="marketValue">Market Value</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Talent Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{gameState.talent.length}</div>
            <div className="text-sm text-muted-foreground">Total Talent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredTalent.filter(t => !t.isBusy).length}
            </div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredTalent.filter(t => t.isBusy).length}
            </div>
            <div className="text-sm text-muted-foreground">Currently Busy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(gameState.studio as any).contractedTalent?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Under Contract</div>
          </CardContent>
        </Card>
      </div>

      {/* Talent List */}
      <div className="grid gap-4">
        {filteredTalent.map(talent => (
          <Card key={talent.id} className={`transition-all ${talent.isBusy ? 'opacity-75' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{talent.name}</h3>
                    <Badge variant={talent.type === 'actor' ? 'default' : 'secondary'}>
                      {talent.type}
                    </Badge>
                    {talent.contract && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Under Contract
                      </Badge>
                    )}
                    {talent.isBusy && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Busy
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Reputation</div>
                      <div className={`font-medium ${getReputationColor(talent.reputation)}`}>
                        {talent.reputation}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Market Value</div>
                      <div className="font-medium">
                        ${(talent.marketValue / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Experience</div>
                      <div className="font-medium">{talent.experience} years</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Burnout</div>
                      <div className={`font-medium ${getBurnoutColor(talent.burnoutLevel)}`}>
                        {talent.burnoutLevel}/100
                      </div>
                    </div>
                  </div>

                  {talent.currentProject && (
                    <div className="mt-3 p-2 rounded bg-muted/50">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Currently working on:</span>
                        <span className="font-medium ml-1">"{talent.currentProject.title}"</span>
                        <span className="text-muted-foreground ml-1">({talent.currentProject.status})</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="text-sm text-muted-foreground mb-1">Specialties:</div>
                    <div className="flex flex-wrap gap-1">
                      {talent.genres.slice(0, 3).map(genre => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {!talent.contract && !talent.isBusy && (
                    <Button
                      size="sm"
                      onClick={() => offerContract(talent)}
                      disabled={talent.marketValue * 1.2 > gameState.studio.budget}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Contract
                    </Button>
                  )}
                  
                  {talent.reputation < 90 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => enhanceTalentReputation(talent, 500000)}
                      disabled={500000 > gameState.studio.budget}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Enhance ($500K)
                    </Button>
                  )}
                </div>
              </div>

              {talent.burnoutLevel > 60 && (
                <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      High burnout level - consider giving this talent a break between projects
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTalent.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Talent Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or filters to find talent.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};