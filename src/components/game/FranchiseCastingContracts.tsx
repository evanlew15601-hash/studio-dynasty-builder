import React, { useMemo, useState } from 'react';
import type { Franchise, FranchiseCastingContract, FranchiseCharacterState, GameState, TalentPerson } from '@/types/game';
import { ensureFranchiseCharacterStates } from '@/utils/franchiseCharacters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, XCircle, RefreshCw } from 'lucide-react';

interface FranchiseCastingContractsProps {
  franchise: Franchise;
  gameState: GameState;
  onUpdateFranchise: (franchiseId: string, updates: Partial<Franchise>) => void;
  onSpendBudget?: (amount: number, reason?: string) => boolean;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
}

function absWeek(week: number, year: number): number {
  return (year * 52) + week;
}

function absToWeekYear(abs: number): { week: number; year: number } {
  const year = Math.floor((abs - 1) / 52);
  const week = ((abs - 1) % 52) + 1;
  return { week, year };
}

function estimateSignatureContractCost(talent: TalentPerson, termYears: number, sequelOptions: number): number {
  const years = Math.max(1, Math.min(10, Math.floor(termYears)));
  const options = Math.max(0, Math.min(10, Math.floor(sequelOptions)));

  // Simple model: small percent of market value per year, plus per-option premium.
  const signing = talent.marketValue * 0.06 * years;
  const optionPremium = talent.marketValue * 0.02 * options;
  return Math.round(signing + optionPremium);
}

type ContractDisplay = {
  contract?: FranchiseCastingContract;
  effectiveStatus: 'none' | FranchiseCastingContract['status'];
  weeksRemaining?: number;
};

function getContractDisplay(contract: FranchiseCastingContract | undefined, currentAbs: number): ContractDisplay {
  if (!contract) return { effectiveStatus: 'none' };

  const endAbs = absWeek(contract.endWeek, contract.endYear);
  const expired = currentAbs > endAbs;

  const effectiveStatus = contract.status === 'active' && expired
    ? 'expired'
    : contract.status;

  const weeksRemaining = effectiveStatus === 'active'
    ? Math.max(0, endAbs - currentAbs + 1)
    : 0;

  return { contract, effectiveStatus, weeksRemaining };
}

export const FranchiseCastingContracts: React.FC<FranchiseCastingContractsProps> = ({
  franchise,
  gameState,
  onUpdateFranchise,
  onSpendBudget,
  triggerVariant = 'outline',
  triggerSize = 'sm'
}) => {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FranchiseCharacterState | null>(null);

  const [talentId, setTalentId] = useState<string>('');
  const [termYears, setTermYears] = useState<number>(3);
  const [sequelOptions, setSequelOptions] = useState<number>(1);

  const currentAbs = absWeek(gameState.currentWeek, gameState.currentYear);

  const actorPool = useMemo(() => {
    return [...gameState.talent]
      .filter(t => t.type === 'actor' && t.contractStatus !== 'retired')
      .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
  }, [gameState.talent]);

  const characterStates = useMemo(() => {
    return ensureFranchiseCharacterStates(franchise, gameState)
      .filter(c => c.requiredType !== 'director');
  }, [franchise, gameState]);

  const selectedTalent = useMemo(() => {
    return talentId ? gameState.talent.find(t => t.id === talentId) : undefined;
  }, [talentId, gameState.talent]);

  const estimatedCost = selectedTalent
    ? estimateSignatureContractCost(selectedTalent, termYears, sequelOptions)
    : 0;

  const openEditor = (state: FranchiseCharacterState) => {
    setEditing(state);

    const existing = state.signatureContract;
    const defaultTalentId = existing?.talentId || state.signatureTalentId || '';

    setTalentId(defaultTalentId);
    setTermYears(3);
    setSequelOptions(existing?.sequelOptions ?? 1);
  };

  const closeEditor = () => {
    setEditing(null);
    setTalentId('');
  };

  const saveContract = () => {
    if (!editing) return;

    if (!talentId) {
      toast({
        title: 'Select Talent',
        description: 'Pick an actor to attach as signature cast.',
        variant: 'destructive',
      });
      return;
    }

    const talent = gameState.talent.find(t => t.id === talentId);
    if (!talent) return;

    const cost = estimateSignatureContractCost(talent, termYears, sequelOptions);

    if (onSpendBudget) {
      const ok = onSpendBudget(cost, `Signature contract: ${franchise.title} • ${editing.name}`);
      if (!ok) return;
    } else if (cost > gameState.studio.budget) {
      toast({
        title: 'Insufficient Budget',
        description: `Need $${(cost / 1000000).toFixed(1)}M to sign this contract.`,
        variant: 'destructive',
      });
      return;
    }

    const startAbs = currentAbs;
    const endAbs = startAbs + (Math.max(1, Math.floor(termYears)) * 52) - 1;
    const end = absToWeekYear(endAbs);

    const contract: FranchiseCastingContract = {
      talentId,
      startWeek: gameState.currentWeek,
      startYear: gameState.currentYear,
      endWeek: end.week,
      endYear: end.year,
      sequelOptions: Math.max(0, Math.floor(sequelOptions)),
      status: 'active',
      cost,
    };

    const nextStates = characterStates.map(s => {
      if (s.franchiseCharacterId !== editing.franchiseCharacterId) return s;
      return {
        ...s,
        signatureTalentId: talentId,
        signatureContract: contract,
      };
    });

    onUpdateFranchise(franchise.id, { characterStates: nextStates });

    toast({
      title: 'Contract Signed',
      description: `${talent.name} is now signature cast for ${editing.name} (through Y${contract.endYear}W${contract.endWeek}).`,
    });

    closeEditor();
  };

  const terminateContract = (state: FranchiseCharacterState) => {
    const existing = state.signatureContract;
    if (!existing) return;

    const nextStates = characterStates.map(s => {
      if (s.franchiseCharacterId !== state.franchiseCharacterId) return s;
      return {
        ...s,
        signatureTalentId: undefined,
        signatureContract: {
          ...existing,
          status: 'terminated',
          terminatedWeek: gameState.currentWeek,
          terminatedYear: gameState.currentYear,
        },
      };
    });

    onUpdateFranchise(franchise.id, { characterStates: nextStates });

    toast({
      title: 'Contract Terminated',
      description: `${state.name} is no longer locked to signature casting.`,
    });
  };

  const statusBadge = (status: ContractDisplay['effectiveStatus']) => {
    if (status === 'active') return <Badge>Active</Badge>;
    if (status === 'expired') return <Badge variant="secondary">Expired</Badge>;
    if (status === 'terminated') return <Badge variant="destructive">Terminated</Badge>;
    return <Badge variant="outline">None</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <UserCheck className="h-4 w-4 mr-2" />
          Casting Contracts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Franchise Casting Contracts — {franchise.title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Lock an actor as signature cast per character. Contracts expire and must be renewed.
          </div>
          <div className="font-medium">
            Studio Budget: ${(gameState.studio.budget / 1000000).toFixed(1)}M
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Character</TableHead>
              <TableHead>Signature Cast</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Term / Options</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {characterStates.map((state) => {
              const display = getContractDisplay(state.signatureContract, currentAbs);
              const contractTalentId = display.contract?.talentId;
              const talent = contractTalentId
                ? gameState.talent.find(t => t.id === contractTalentId)
                : (state.signatureTalentId ? gameState.talent.find(t => t.id === state.signatureTalentId) : undefined);

              return (
                <TableRow key={state.franchiseCharacterId}>
                  <TableCell>
                    <div className="font-medium">{state.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{state.importance}</div>
                  </TableCell>
                  <TableCell>
                    {talent ? (
                      <div>
                        <div className="font-medium">{talent.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${(talent.marketValue / 1000000).toFixed(1)}M • Rep {Math.round(talent.reputation)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusBadge(display.effectiveStatus)}
                      {display.effectiveStatus === 'active' && typeof display.weeksRemaining === 'number' && (
                        <span className="text-xs text-muted-foreground">
                          {display.weeksRemaining}w left
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {display.contract ? (
                      <div className="text-sm">
                        <div>
                          Ends: Y{display.contract.endYear}W{display.contract.endWeek}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {display.contract.sequelOptions} sequel option{display.contract.sequelOptions === 1 ? '' : 's'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(state)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {display.contract ? 'Renew' : 'Sign'}
                      </Button>
                      {display.contract && display.effectiveStatus === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => terminateContract(state)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Terminate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Dialog open={!!editing} onOpenChange={(v) => !v && closeEditor()}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editing?.signatureContract ? 'Renew Contract' : 'Sign Contract'}
                {editing ? ` — ${editing.name}` : ''}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Talent</Label>
                <Select value={talentId} onValueChange={setTalentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select actor" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {actorPool.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} (${(t.marketValue / 1000000).toFixed(1)}M • Rep {Math.round(t.reputation)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="term">Term (years)</Label>
                  <Input
                    id="term"
                    type="number"
                    min={1}
                    max={10}
                    value={termYears}
                    onChange={(e) => setTermYears(parseInt(e.target.value || '1', 10))}
                  />
                </div>
                <div>
                  <Label htmlFor="options">Sequel options</Label>
                  <Input
                    id="options"
                    type="number"
                    min={0}
                    max={10}
                    value={sequelOptions}
                    onChange={(e) => setSequelOptions(parseInt(e.target.value || '0', 10))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded border p-3 text-sm">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-medium">${(estimatedCost / 1000000).toFixed(1)}M</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveContract} className="flex-1" disabled={!talentId}>
                  Confirm
                </Button>
                <Button variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
