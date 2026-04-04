// Enhanced Talent Market with AI Studio Integration
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,

} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AIStudioManager } from './AIStudioManager';
import type { TalentCommitment, TalentPerson } from '@/types/game';
import { Calendar, Clock, Star, Film, DollarSign, User } from 'lucide-react';
import { TalentPortrait } from '@/components/ui/talent-portrait';
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
  const mergeGameState = useGameStore((s) => s.mergeGameState);
  const shortlistedTalentIds = useGameStore((s) => s.game?.shortlistedTalentIds ?? []);
  const toggleShortlist = useGameStore((s) => s.toggleShortlist);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  const [selectedRole, setSelectedRole] = useState<string>('all');
  // commitments now memoized above
  const [resetAiConfirmOpen, setResetAiConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const TALENT_PER_PAGE = 20;

// **CHECKPOINT 2 FIXED**: Memoized commitments (fixes infinite re-render)
  const commitments = useMemo(() => AIStudioManager.getAllCommitments(), [currentWeek, currentYear]);

// **CHECKPOINT 2 FIXED**: Pure filtering logic (memoized)
  const getFilteredTalentLogic = useCallback((
    talentList: TalentPerson[],
    roleFilter: string,
    availableOnly: boolean,
    currentCommitments: TalentCommitment[],
    currWeek: number,
    currYear: number
  ) => {
    let filtered = [...talentList];

    // Filter by role if specified
    if (roleFilter !== 'all') {
      filtered = filtered.filter(t => 
        (t.specialties as string[])?.includes(roleFilter) || 
        (t.specialties as string[])?.some(s => s.toLowerCase().includes(roleFilter.toLowerCase()))
      );
    }

    // Filter by availability if requested
    if (availableOnly) {
      const currentAbsWeek = (currYear * 52) + currWeek;
      filtered = filtered.filter(t => {
        const commitment = currentCommitments.find(c => 
          c.talentId === t.id && currentAbsWeek >= c.startAbsWeek && currentAbsWeek <= c.endAbsWeek
        );
        return !commitment;
      });
    }

    return filtered;
  }, []);

  const filteredTalent = useMemo(() => 
    getFilteredTalentLogic(talent, selectedRole, showAvailableOnly, commitments, currentWeek, currentYear),
    [talent, selectedRole, showAvailableOnly, commitments, currentWeek, currentYear, getFilteredTalentLogic]
  );

// **CHECKPOINT 2 FIXED**: Memoized status (useCallback)
  const getTalentStatus = useCallback((talentId: string) => {
    const commitment = commitments.find(c => 
      c.talentId === talentId && 
      ((currentYear * 52) + currentWeek) >= c.startAbsWeek && 
      ((currentYear * 52) + currentWeek) <= c.endAbsWeek
    );
    
    if (!commitment) {
      return {
        status: 'available',
        message: 'Available for casting',
        color: 'green'
      } as const;
    }

    const currentAbsWeek = (currentYear * 52) + currentWeek;
    const weeksRemaining = Math.max(0, commitment.endAbsWeek - currentAbsWeek);
    return {
      status: 'busy' as const,
      message: `Filming "${commitment.studio}" (${weeksRemaining} weeks remaining)`,
      color: 'red' as const,
      commitment
    };
  }, [commitments, currentWeek, currentYear]);

// **CHECKPOINT 2 FIXED**: Memoized filmography (useCallback)
  const getTalentFilmography = useCallback((talentId: string) => {
    return AIStudioManager.getTalentFilmography(talentId);
  }, []);

  const paginatedTalent = useMemo(
    () => filteredTalent.slice(currentPage * TALENT_PER_PAGE, (currentPage + 1) * TALENT_PER_PAGE),
    [filteredTalent, currentPage]
  );

  return (
    <>
      <AlertDialog open={resetAiConfirmOpen} onOpenChange={setResetAiConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset AI system?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears AI studios, films, and talent commitments for this session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setResetAiConfirmOpen(false);
                AIStudioManager.resetAISystem();
                mergeGameState({ aiStudioState: AIStudioManager.snapshot() });
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              Showing {paginatedTalent.length} of {filteredTalent.length} talent (page {currentPage + 1})
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredTalent.length > TALENT_PER_PAGE && (
        <div className="flex items-center gap-2 justify-center pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {Math.ceil(filteredTalent.length / TALENT_PER_PAGE)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTalent.length / TALENT_PER_PAGE) - 1, p + 1))}
            disabled={currentPage === Math.ceil(filteredTalent.length / TALENT_PER_PAGE) - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* **CHECKPOINT 2 TEST**: Talent grid with availability status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedTalent.map(person => {
          const status = getTalentStatus(person.id);
          const filmography = getTalentFilmography(person.id);
          
          return (
            <Card key={person.id} className={`card-premium ${status.status === 'busy' ? 'opacity-75' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <TalentPortrait talent={person} size="sm" />
                    <div>
                      <button
                        type="button"
                        className="font-semibold hover:underline text-left"
                        onClick={() => openTalentProfile(person.id)}
                      >
                        {person.name}
                      </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star size={14} />
                      <span>{Math.round(person.reputation)}/100</span>
                    </div>
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

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openTalentProfile(person.id)}
                    className="flex-1"
                  >
                    <User size={14} className="mr-1" />
                    Profile
                  </Button>
                  {shortlistedTalentIds.includes(person.id) ? (
                    <Badge 
                      variant="default" 
                      className="flex-1 h-10 px-3 justify-center items-center text-xs font-medium bg-primary hover:bg-primary/90"
                      onClick={() => toggleShortlist(person.id)}
                    >
                      <Star size={14} className="mr-1" />
                      Shortlisted
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => toggleShortlist(person.id)}
                    >
                      <Star size={14} className="mr-1" />
                      Shortlist
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant={status.status === 'available' ? 'default' : 'outline'}
                    disabled={status.status === 'busy'}
                    onClick={() => onCastTalent?.(person.id, 'Lead Actor')}
                    className="flex-1"
                  >
                    {status.status === 'available' ? 'Cast' : 'Unavailable'}
                  </Button>
                </div>
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
                  {filteredTalent.length}/{talent.length}
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
                onClick={() => setResetAiConfirmOpen(true)}
              >
                Reset AI System
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
};