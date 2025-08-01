import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TalentPerson, ChemistryEvent } from '@/types/game';
import { Heart, Zap, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TalentChemistrySystemProps {
  talent: TalentPerson[];
  chemistryEvents: ChemistryEvent[];
  currentWeek: number;
  currentYear: number;
  onCreateChemistryEvent?: (event: ChemistryEvent) => void;
}

export const TalentChemistrySystem: React.FC<TalentChemistrySystemProps> = ({
  talent,
  chemistryEvents,
  currentWeek,
  currentYear,
  onCreateChemistryEvent
}) => {
  const [selectedTalent1, setSelectedTalent1] = useState<TalentPerson | null>(null);
  const [selectedTalent2, setSelectedTalent2] = useState<TalentPerson | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'relationships' | 'events'>('matrix');

  const getChemistryScore = (talent1Id: string, talent2Id: string): number => {
    const talent1 = talent.find(t => t.id === talent1Id);
    const talent2 = talent.find(t => t.id === talent2Id);
    
    if (!talent1 || !talent2) return 0;
    
    // Check direct chemistry storage
    const directChemistry = talent1.chemistry?.[talent2Id] ?? 0;
    if (directChemistry !== 0) return directChemistry;
    
    // Calculate base chemistry from events
    const relevantEvents = chemistryEvents.filter(event => 
      (event.talent1Id === talent1Id && event.talent2Id === talent2Id) ||
      (event.talent1Id === talent2Id && event.talent2Id === talent1Id)
    );
    
    let score = 0;
    relevantEvents.forEach(event => {
      if (event.interactionType === 'positive') score += event.magnitude;
      else if (event.interactionType === 'negative') score -= event.magnitude;
    });
    
    // Add base compatibility factors
    const ageCompatibility = Math.max(0, 20 - Math.abs(talent1.age - talent2.age));
    const genreCompatibility = talent1.genres.filter(g => talent2.genres.includes(g)).length * 5;
    const experienceCompatibility = Math.max(0, 10 - Math.abs(talent1.experience - talent2.experience) / 2);
    
    score += ageCompatibility + genreCompatibility + experienceCompatibility;
    
    return Math.max(-100, Math.min(100, score));
  };

  const getChemistryLevel = (score: number): { level: string; color: string; icon: any; effect: string } => {
    if (score >= 70) return { 
      level: 'Incredible Chemistry', 
      color: 'bg-pink-500', 
      icon: Heart, 
      effect: '+25% performance when working together' 
    };
    if (score >= 40) return { 
      level: 'Great Chemistry', 
      color: 'bg-green-500', 
      icon: TrendingUp, 
      effect: '+15% performance when working together' 
    };
    if (score >= 10) return { 
      level: 'Good Chemistry', 
      color: 'bg-blue-500', 
      icon: Users, 
      effect: '+5% performance when working together' 
    };
    if (score >= -10) return { 
      level: 'Neutral', 
      color: 'bg-gray-500', 
      icon: Minus, 
      effect: 'No chemistry impact' 
    };
    if (score >= -40) return { 
      level: 'Poor Chemistry', 
      color: 'bg-orange-500', 
      icon: TrendingDown, 
      effect: '-10% performance when working together' 
    };
    return { 
      level: 'Hostile', 
      color: 'bg-red-500', 
      icon: Zap, 
      effect: '-20% performance, conflict risk' 
    };
  };

  const getBestChemistryPairs = () => {
    const pairs: Array<{ talent1: TalentPerson; talent2: TalentPerson; score: number }> = [];
    
    for (let i = 0; i < talent.length; i++) {
      for (let j = i + 1; j < talent.length; j++) {
        const score = getChemistryScore(talent[i].id, talent[j].id);
        if (score > 20) {
          pairs.push({ talent1: talent[i], talent2: talent[j], score });
        }
      }
    }
    
    return pairs.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  const getWorstChemistryPairs = () => {
    const pairs: Array<{ talent1: TalentPerson; talent2: TalentPerson; score: number }> = [];
    
    for (let i = 0; i < talent.length; i++) {
      for (let j = i + 1; j < talent.length; j++) {
        const score = getChemistryScore(talent[i].id, talent[j].id);
        if (score < -10) {
          pairs.push({ talent1: talent[i], talent2: talent[j], score });
        }
      }
    }
    
    return pairs.sort((a, b) => a.score - b.score).slice(0, 10);
  };

  const renderChemistryMatrix = () => {
    const displayTalent = talent.slice(0, 8); // Show first 8 for readability
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border text-left">Talent</th>
              {displayTalent.map(t => (
                <th key={t.id} className="p-2 border text-center min-w-20">
                  <div className="text-xs truncate">{t.name.split(' ')[0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayTalent.map(talent1 => (
              <tr key={talent1.id}>
                <td className="p-2 border font-medium">
                  <div className="text-sm truncate">{talent1.name}</div>
                </td>
                {displayTalent.map(talent2 => {
                  if (talent1.id === talent2.id) {
                    return <td key={talent2.id} className="p-2 border bg-gray-100"></td>;
                  }
                  
                  const score = getChemistryScore(talent1.id, talent2.id);
                  const chemistry = getChemistryLevel(score);
                  
                  return (
                    <td key={talent2.id} className="p-2 border text-center">
                      <div 
                        className={`w-8 h-8 rounded-full ${chemistry.color} text-white text-xs flex items-center justify-center mx-auto cursor-pointer`}
                        title={`${chemistry.level}: ${score}`}
                        onClick={() => {
                          setSelectedTalent1(talent1);
                          setSelectedTalent2(talent2);
                        }}
                      >
                        {score > 0 ? '+' : ''}{score}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Talent Chemistry & Relationships
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'matrix' ? 'default' : 'outline'}
              onClick={() => setViewMode('matrix')}
            >
              Chemistry Matrix
            </Button>
            <Button
              variant={viewMode === 'relationships' ? 'default' : 'outline'}
              onClick={() => setViewMode('relationships')}
            >
              Best/Worst Pairs
            </Button>
            <Button
              variant={viewMode === 'events' ? 'default' : 'outline'}
              onClick={() => setViewMode('events')}
            >
              Recent Events
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <Card>
          <CardHeader>
            <CardTitle>Chemistry Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChemistryMatrix()}
            <p className="text-sm text-muted-foreground mt-4">
              Click on chemistry scores to view detailed relationship information.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Relationships View */}
      {viewMode === 'relationships' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Best Chemistry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Best Chemistry Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getBestChemistryPairs().map((pair, index) => {
                  const chemistry = getChemistryLevel(pair.score);
                  const Icon = chemistry.icon;
                  return (
                    <div key={`${pair.talent1.id}-${pair.talent2.id}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {pair.talent1.name} & {pair.talent2.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{chemistry.effect}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={chemistry.color + ' text-white'}>
                          <Icon className="h-3 w-3 mr-1" />
                          {pair.score}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Worst Chemistry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Problematic Relationships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getWorstChemistryPairs().map((pair, index) => {
                  const chemistry = getChemistryLevel(pair.score);
                  const Icon = chemistry.icon;
                  return (
                    <div key={`${pair.talent1.id}-${pair.talent2.id}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {pair.talent1.name} & {pair.talent2.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{chemistry.effect}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={chemistry.color + ' text-white'}>
                          <Icon className="h-3 w-3 mr-1" />
                          {pair.score}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events View */}
      {viewMode === 'events' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Chemistry Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chemistryEvents.slice(-10).reverse().map(event => {
                const talent1 = talent.find(t => t.id === event.talent1Id);
                const talent2 = talent.find(t => t.id === event.talent2Id);
                
                if (!talent1 || !talent2) return null;
                
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">
                        {talent1.name} & {talent2.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Week {event.week}, {event.year}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        event.interactionType === 'positive' ? 'default' : 
                        event.interactionType === 'negative' ? 'destructive' : 'secondary'
                      }
                    >
                      {event.interactionType === 'positive' ? '+' : event.interactionType === 'negative' ? '-' : ''}
                      {event.magnitude}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed View for Selected Pair */}
      {selectedTalent1 && selectedTalent2 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {selectedTalent1.name} & {selectedTalent2.name} - Detailed Chemistry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Chemistry Analysis</h4>
                <div className="space-y-2">
                  <p className="text-sm">
                    Overall Score: <span className="font-medium">
                      {getChemistryScore(selectedTalent1.id, selectedTalent2.id)}
                    </span>
                  </p>
                  <p className="text-sm">
                    Age Compatibility: {Math.max(0, 20 - Math.abs(selectedTalent1.age - selectedTalent2.age))}
                  </p>
                  <p className="text-sm">
                    Genre Overlap: {selectedTalent1.genres.filter(g => selectedTalent2.genres.includes(g)).length} shared genres
                  </p>
                  <p className="text-sm">
                    Experience Gap: {Math.abs(selectedTalent1.experience - selectedTalent2.experience)} years
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Working Together</h4>
                <div className="space-y-2">
                  {getChemistryLevel(getChemistryScore(selectedTalent1.id, selectedTalent2.id)).effect}
                </div>
              </div>
            </div>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => {
                setSelectedTalent1(null);
                setSelectedTalent2(null);
              }}
            >
              Close Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};