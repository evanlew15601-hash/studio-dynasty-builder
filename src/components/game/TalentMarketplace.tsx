// Enhanced Talent Market with AI Studio Integration
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AIStudioManager, TalentCommitment } from './AIStudioManager';
import { TalentPerson } from '@/types/game';
import { Calendar, Clock, Star, Film, DollarSign, User } from 'lucide-react';
import { useUiStore } from '@/game/uiStore';

interface TalentMarketplaceProps {
  talent: TalentPerson[];
  currentWeek: number;
  currentYear: number;
  onCastTalent?: (talentId: string, role: string) => void;
}

export const TalentMarketplace: React.FC<TalentMarketplaceProps> = ({
  talent,
  currentWeek,
  currentYear,
  onCastTalent
}) => {
  const openTalentProfile = useUiStore((s) => s.openTalentProfile);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [commitments, setCommitments] = useState<TalentCommitment[]>([]);

  // **CHECKPOINT 2 TEST**: Load talent commitments
  useEffect(() => {
    const allCommitments = AIStudioManager.getAllCommitments();
    setCommitments(allCommitments);
  }, [currentWeek, currentYear]);

  // **CHECKPOINT 2 TEST**: Filter talent by availability
  const getFilteredTalent = () => {
    let filtered = [...talent];

    // Filter by role if specified
    if (selectedRole !== 'all') {
      filtered = filtered.filter(t => 
        (t.specialties as string[])?.includes(selectedRole) || 
        (t.specialties as string[])?.some(s => s.toLowerCase().includes(selectedRole.toLowerCase()))
      );
    }

    // Filter by availability if requested
    if (showAvailableOnly) {
      filtered = filtered.filter(t => {
        const commitment = AIStudioManager.getTalentCommitment(t.id, currentWeek, currentYear);
        return !commitment;
      });
    }

    return filtered;
  };

  // **CHECKPOINT 2 TEST**: Get talent's current status
  const getTalentStatus = (talentId: string) => {
    const commitment = AIStudioManager.getTalentCommitment(talentId, currentWeek, currentYear);
    
    if (!commitment) {
      return {
        status: 'available',
        message: 'Available for casting',
        color: 'green'
      };
    }

    const currentAbsWeek = (currentYear * 52) + currentWeek;
    const weeksRemaining = Math.max(0, commitment.endAbsWeek - currentAbsWeek);
    return {
      status: 'busy',
      message: `Filming "${commitment.studio}" (${weeksRemaining} weeks remaining)`,
      color: 'red',
      commitment
    };
  };

  // **CHECKPOINT 2 TEST**: Get talent's recent filmography
  const getTalentFilmography = (talentId: string) => {
    return AIStudioManager.getTalentFilmography(talentId);
  };

  const filteredTalent = getFilteredTalent();

  return (
    <div className="space-y-6">
      {/* **CHECKPOINT 2 TEST**: Market controls */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2" size={20} />
            Talent Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                checked={showAvailableOnly}
                onCheckedChange={setShowAvailableOnly}
                id="available-only"
              />
              <label htmlFor="available-only" className="text-sm">
                Show available only
              </label>
            </div>
            
            <select 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Roles</option>
              <option value="director">Directors</option>
              <option value="actor">Actors</option>
              <option value="actress">Actresses</option>
              <option value="writer">Writers</option>
              <option value="producer">Producers</option>
            </select>

            <div className="text-sm text-muted-foreground">
              Showing {filteredTalent.length} of {talent.length} talent
            </div>
          </div>
        </CardContent>
      </Card>

      {/* **CHECKPOINT 2 TEST**: Talent grid with availability status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTalent.map(person => {
          const status = getTalentStatus(person.id);
          const filmography = getTalentFilmography(person.id);
          
          return (
            <Card key={person.id} className={`card-premium ${status.status === 'busy' ? 'opacity-75' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{person.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star size={14} />
                        <span>{Math.round(person.reputation)}/100</span>
                      </div>
                  </div>
                  
                  <Badge 
                    variant={status.status === 'available' ? 'default' : 'secondary'}
                    className={status.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  >
                    {status.status === 'available' ? 'Available' : 'Busy'}
                  </Badge>
                </div>

                {/* Current status */}
                <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{status.message}</span>
                  </div>
                  
                  {status.commitment && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Role: {status.commitment.role} • ${status.commitment.weeklyPay}k/week
                    </div>
                  )}
                </div>

                {/* Recent filmography */}
                {filmography.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Recent Films:</div>
                    <div className="space-y-1">
                      {filmography.slice(-2).map(film => (
                        <div key={film.id} className="text-xs p-1 bg-muted/30 rounded">
                          <div className="font-medium">{film.title}</div>
                          <div className="text-muted-foreground">
                            {film.studioName} • ${( (film.performance?.boxOffice || 0) / 1000000).toFixed(0)}M
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specialties */}
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {person.specialties?.slice(0, 3).map(specialty => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <Button 
                  size="sm" 
                  variant={status.status === 'available' ? 'default' : 'outline'}
                  disabled={status.status === 'busy'}
                  onClick={() => onCastTalent?.(person.id, 'Lead Actor')}
                  className="w-full"
                >
                  {status.status === 'available' ? 'Cast in Project' : 'Unavailable'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* **CHECKPOINT 2 TEST**: System status for debugging */}
      {import.meta.env.DEV && (
        <Card className="card-premium border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              AI Studio System Status (Debug)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-semibold">Active AI Films</div>
                <div className="text-muted-foreground">
                  {AIStudioManager.getAllAIFilms().filter(f => f.status !== 'released').length}
                </div>
              </div>
              <div>
                <div className="font-semibold">Released AI Films</div>
                <div className="text-muted-foreground">
                  {AIStudioManager.getAllAIFilms().filter(f => f.status === 'released').length}
                </div>
              </div>
              <div>
                <div className="font-semibold">Active Commitments</div>
                <div className="text-muted-foreground">
                  {commitments.filter(c => {
                    const absWeek = currentYear * 52 + currentWeek;
                    return absWeek >= c.startAbsWeek && absWeek <= c.endAbsWeek;
                  }).length}
                </div>
              </div>
              <div>
                <div className="font-semibold">Available Talent</div>
                <div className="text-muted-foreground">
                  {talent.filter(t => !AIStudioManager.getTalentCommitment(t.id, currentWeek, currentYear)).length}/{talent.length}
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('AI Films:', AIStudioManager.getAllAIFilms());
                  console.log('Commitments:', AIStudioManager.getAllCommitments());
                }}
              >
                Log AI System Data
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  AIStudioManager.resetAISystem();
                  setCommitments([]);
                }}
              >
                Reset AI System
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};