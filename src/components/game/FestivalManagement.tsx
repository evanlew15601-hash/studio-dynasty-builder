import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getFestivalById, getFestivalOptions } from '@/data/Festivals';
import { listAvailableFestivalIndieProjects, createPurchasePatch, runFestivalAuctionRounds } from '@/utils/festivalMarketplace';
import { FinancialEngine } from './FinancialEngine';
import type { Project } from '@/types/game';

export const FestivalManagement: React.FC = () => {
  const { game: gameState, rng, updateProject, spendStudioFunds, updateReputation } = useGameStore(
    useShallow((s) => ({
      game: s.game,
      rng: s.rng,
      updateProject: s.updateProject,
      spendStudioFunds: s.spendStudioFunds,
      updateReputation: s.updateReputation,
    }))
  );

  const { toast } = useToast();
  const festivalOptions = getFestivalOptions();
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>(festivalOptions[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [auctionPreview, setAuctionPreview] = useState<any | null>(null);

  const festival = getFestivalById(selectedFestivalId);

  const projects = useMemo(() => {
    if (!gameState || !selectedFestivalId) return [] as Project[];
    return listAvailableFestivalIndieProjects(gameState, selectedFestivalId);
  }, [gameState, selectedFestivalId]);

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const handleAuctionPreview = () => {
    if (!selected || !gameState) return;
    const preview = runFestivalAuctionRounds(gameState, selected, selectedFestivalId, bidAmount, 4, rng ?? undefined);
    setAuctionPreview(preview);
  };

  const handleAcquireProject = () => {
    if (!selected || !gameState) return;
    const roundsResult = auctionPreview ?? runFestivalAuctionRounds(gameState, selected, selectedFestivalId, bidAmount, 4, rng ?? undefined);
    if (!roundsResult.userWins) {
      toast({
        title: 'Outbid',
        description: `Rivals reached ${(roundsResult.finalHighest / 1000000).toFixed(2)}M. Minimum to win: ${(roundsResult.requiredToWin / 1000000).toFixed(2)}M.`,
        variant: 'destructive',
      });
      return;
    }

    const spend = spendStudioFunds(bidAmount);
    if (!spend.success) {
      toast({ title: 'Insufficient Funds', description: `Need ${(bidAmount / 1000000).toFixed(2)}M to acquire rights.`, variant: 'destructive' });
      return;
    }

    const patch = createPurchasePatch(selected, gameState.studio.id, gameState.studio.name, bidAmount, gameState.currentWeek, gameState.currentYear);
    updateProject(selected.id, patch as any);

    FinancialEngine.recordTransaction('expense', 'licensing', bidAmount, gameState.currentWeek, gameState.currentYear, `Acquired ${selected.title} at ${festival?.name || 'Festival'}`, selected.id);
    updateReputation(1);

    toast({ title: 'Acquired Rights', description: `You acquired ${selected.title} for ${(bidAmount / 1000000).toFixed(2)}M.` });
    setSelectedProjectId(null);
    setBidAmount(0);
    setAuctionPreview(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Festival Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Explore festival bidding, acquire indie festival projects, and track prestige-facing events from one dedicated page.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {festivalOptions.map((fest) => (
                  <Button
                    key={fest.id}
                    variant={selectedFestivalId === fest.id ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedFestivalId(fest.id);
                      setSelectedProjectId(null);
                      setBidAmount(0);
                      setAuctionPreview(null);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{fest.label}</div>
                      <div className="text-xs text-muted-foreground">Prestige {fest.prestige}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Festival</div>
                  <div className="font-semibold">{festival?.name || 'Select a Festival'}</div>
                </div>
                <Badge variant="outline">Prestige {festival?.prestige ?? '--'}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {festival?.awards?.length ? festival.awards.join(' • ') : 'No awards defined.'}
              </div>
              {festival?.schedule && (
                <div className="text-sm text-muted-foreground">When: {festival.schedule}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Available Indie Films</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No eligible festival indie films are available for this selection.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 border rounded-lg transition-all ${selectedProjectId === project.id ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'border-border/50 bg-background'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{project.title}</div>
                        <div className="text-xs text-muted-foreground">Genre: {project.script?.genre || 'Unknown'}</div>
                      </div>
                      <Button size="sm" variant={selectedProjectId === project.id ? 'default' : 'outline'} onClick={() => setSelectedProjectId(project.id)}>
                        {selectedProjectId === project.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      Budget: ${(project.budget?.total || 0) / 1000000}M • Release: Festival
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bid & Acquire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Select a festival project, enter your bid, preview rival behavior, then acquire rights if you win.
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Bid Amount</label>
                  <Input type="number" value={bidAmount || ''} onChange={(event) => setBidAmount(Number(event.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Button onClick={handleAuctionPreview} disabled={!selected || bidAmount <= 0}>
                    Preview Auction
                  </Button>
                  <Button onClick={handleAcquireProject} disabled={!selected || bidAmount <= 0}>
                    Bid & Purchase
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {auctionPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Auction Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auctionPreview.rounds.map((round: any) => (
                    <div key={round.round} className="rounded-lg border p-3 bg-muted/10">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Round {round.round}</span>
                        <span>${(round.highest / 1000000).toFixed(3)}M</span>
                      </div>
                      <div className="grid gap-2 mt-2 text-xs text-muted-foreground">
                        {round.rivalBids.map((bid: number, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span>Rival {index + 1}</span>
                            <span>${(bid / 1000000).toFixed(3)}M</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border p-3 bg-muted/5 text-sm">
                    <div className="flex justify-between">
                      <span>Final highest rival bid</span>
                      <span>${(auctionPreview.finalHighest / 1000000).toFixed(3)}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum to win</span>
                      <span>${(auctionPreview.requiredToWin / 1000000).toFixed(3)}M</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {auctionPreview.userWins ? 'Your current offer would win.' : 'Your current offer would be outbid.'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
