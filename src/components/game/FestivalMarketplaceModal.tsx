import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/game/store';
import { listAvailableFestivalIndieProjects, createPurchasePatch, runFestivalAuctionRounds } from '@/utils/festivalMarketplace';
import { getFestivalById } from '@/data/Festivals';
import { FinancialEngine } from './FinancialEngine';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  festivalId?: string;
}

export const FestivalMarketplaceModal: React.FC<Props> = ({ open, onOpenChange, festivalId }) => {
  const { game: gameState, rng, updateProject, updateBudget, spendStudioFunds, updateStudio, updateReputation } = useGameStore((s) => ({
    game: s.game,
    rng: s.rng,
    updateProject: s.updateProject,
    updateBudget: s.updateBudget,
    spendStudioFunds: s.spendStudioFunds,
    updateStudio: s.updateStudio,
    updateReputation: s.updateReputation,
  }));

  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [auctionPreview, setAuctionPreview] = useState<any | null>(null);

  const festival = getFestivalById(festivalId);

  const projects = useMemo(() => {
    if (!gameState) return [] as any[];
    return listAvailableFestivalIndieProjects(gameState, festivalId);
  }, [gameState, festivalId]);

  const selected = projects.find((p) => p.id === selectedProjectId) || null;

  const handlePreview = () => {
    if (!selected || !gameState) return;
    const preview = runFestivalAuctionRounds(gameState, selected, festivalId, bidAmount, 4, rng ?? undefined);
    setAuctionPreview(preview as any);
  };

  const handlePurchase = () => {
    if (!selected || !gameState) return;
    const week = gameState.currentWeek;
    const year = gameState.currentYear;

    // If we have a preview, prefer its result to avoid re-simulating mismatch
    const roundsResult = auctionPreview ?? runFestivalAuctionRounds(gameState, selected, festivalId, bidAmount, 4, rng ?? undefined);
    if (!roundsResult.userWins) {
      toast({
        title: 'Outbid',
        description: `Rivals reached ${(roundsResult.finalHighest / 1000000).toFixed(2)}M. Minimum to win: ${(roundsResult.requiredToWin / 1000000).toFixed(2)}M.`,
        variant: 'destructive',
      });
      return;
    }

    // Attempt to spend funds
    const spend = spendStudioFunds(bidAmount);
    if (!spend.success) {
      toast({ title: 'Insufficient Funds', description: `Need ${(bidAmount / 1000000).toFixed(2)}M to acquire rights.`, variant: 'destructive' });
      return;
    }

    // Apply project patch
    const patch = createPurchasePatch(selected, gameState.studio.id, bidAmount, week, year);
    updateProject(selected.id, patch as any);

    // Record transaction
    FinancialEngine.recordTransaction('expense', 'licensing', bidAmount, week, year, `Acquired ${selected.title} at ${festival?.name || 'Festival'}`, selected.id);

    // Small reputation bump for successful acquisitions
    updateStudio({});
    updateReputation(1);

    toast({ title: 'Acquired Rights', description: `You acquired ${selected.title} for ${(bidAmount / 1000000).toFixed(2)}M` });
    setSelectedProjectId(null);
    setBidAmount(0);
    setAuctionPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{festival?.name || 'Festival Marketplace'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Indie Films</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No indie films available at this festival.</p>
              ) : (
                <div className="grid gap-3">
                  {projects.map((p) => (
                    <div key={p.id} className={`p-3 border rounded ${selectedProjectId === p.id ? 'ring-2 ring-primary' : ''}`}>
                      <div className="flex justify-between">
                        <div>
                          <div className="font-semibold">{p.title}</div>
                          <div className="text-xs text-muted-foreground">Genre: {p.script?.genre || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">Budget: ${(p.budget?.total || 0) / 1000000}M</div>
                          <div className="text-xs text-muted-foreground">Release: Festival</div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" onClick={() => setSelectedProjectId(p.id)} variant={selectedProjectId === p.id ? 'default' : 'outline'}>
                          {selectedProjectId === p.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>Bid & Acquire — {selected.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Offer Amount (USD)</label>
                    <Input type="number" value={String(bidAmount || '')} onChange={(e) => setBidAmount(Number(e.target.value) || 0)} />
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col gap-2">
                      <Button onClick={handlePreview} disabled={bidAmount <= 0}>Preview Auction</Button>
                      <Button onClick={handlePurchase} disabled={bidAmount <= 0}>Bid & Purchase</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {auctionPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Auction Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auctionPreview.rounds.map((r: any) => (
                    <div key={r.round} className="p-2 border rounded">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Round {r.round}</div>
                        <div className="text-sm text-muted-foreground">Top: ${(r.highest / 1000000).toFixed(3)}M</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {r.rivalBids.map((b: number, i: number) => (
                          <div key={i} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 h-2 rounded" style={{ width: `${Math.min(100, (b / Math.max(1, auctionPreview.finalHighest)) * 100)}%` }} />
                              <div className="ml-2">${(b / 1000000).toFixed(3)}M</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <div className="text-sm">Final highest: ${(auctionPreview.finalHighest / 1000000).toFixed(3)}M</div>
                    <div className="text-sm">Minimum to win: ${(auctionPreview.requiredToWin / 1000000).toFixed(3)}M</div>
                    <div className="text-sm">You {auctionPreview.userWins ? 'would win' : 'would be outbid'} with your current offer.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FestivalMarketplaceModal;
