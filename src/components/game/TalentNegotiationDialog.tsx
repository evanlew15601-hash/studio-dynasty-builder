import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Project, Studio, TalentPerson } from '@/types/game';
import {
  computeTalentAgentAsk,
  describeTalentInterest,
  defaultContractWeeksForRole,
  evaluateTalentOffer,
  type TalentOfferResponse,
  type TalentRequiredType,
} from '@/utils/talentNegotiation';

export interface TalentNegotiationDialogAccepted {
  interestScore: number;
  askWeeklyPay: number;
  weeklyPay: number;
  contractWeeks: number;
  contractScope: 'project' | 'multi-picture' | 'exclusive';
  sequelOptions: number;
  exclusivity: boolean;
  merchandising: boolean;
}

interface TalentNegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studio: Studio;
  project: Project;
  talent: TalentPerson;
  roleLabel: string;
  requiredType: TalentRequiredType;
  importance?: string;
  currentWeek: number;
  currentYear: number;
  onAccepted: (result: TalentNegotiationDialogAccepted) => void;
  onRejected?: (result: Extract<TalentOfferResponse, { status: 'rejected' }>) => void;
}

export const TalentNegotiationDialog: React.FC<TalentNegotiationDialogProps> = (props) => {
  const {
    open,
    onOpenChange,
    studio,
    project,
    talent,
    roleLabel,
    requiredType,
    importance,
    currentWeek,
    currentYear,
    onAccepted,
    onRejected,
  } = props;

  const defaultWeeks = useMemo(
    () => defaultContractWeeksForRole(requiredType, importance),
    [requiredType, importance]
  );

  const [contractWeeks, setContractWeeks] = useState<number>(defaultWeeks);
  const [offerWeeklyPay, setOfferWeeklyPay] = useState<number>(0);
  const [contractScope, setContractScope] = useState<'project' | 'multi-picture' | 'exclusive'>('project');
  const [sequelOptions, setSequelOptions] = useState<number>(importance === 'lead' ? 1 : 0);
  const [exclusivity, setExclusivity] = useState<boolean>(requiredType === 'director' || importance === 'lead');
  const [merchandising, setMerchandising] = useState<boolean>(importance === 'lead');
  const [counter, setCounter] = useState<number | null>(null);

  const displayAsk = useMemo(() => {
    return computeTalentAgentAsk({
      talent,
      studio,
      project,
      requiredType,
      importance,
      contractWeeks,
      week: currentWeek,
      year: currentYear,
    });
  }, [talent, studio, project, requiredType, importance, contractWeeks, currentWeek, currentYear]);

  const interest = useMemo(() => describeTalentInterest(displayAsk.interestScore), [displayAsk.interestScore]);

  useEffect(() => {
    if (!open) return;
    setContractWeeks(defaultWeeks);
    setCounter(null);
    setContractScope('project');
    setSequelOptions(importance === 'lead' ? 1 : 0);
    setExclusivity(requiredType === 'director' || importance === 'lead');
    setMerchandising(importance === 'lead');

    const initialAsk = computeTalentAgentAsk({
      talent,
      studio,
      project,
      requiredType,
      importance,
      contractWeeks: defaultWeeks,
      week: currentWeek,
      year: currentYear,
    });

    setOfferWeeklyPay(initialAsk.askWeeklyPay);
  }, [open, talent.id, studio.id, project.id, requiredType, importance, defaultWeeks, currentWeek, currentYear]);

  const runwayWeeks = Math.min(4, contractWeeks);
  const runwayCost = offerWeeklyPay * runwayWeeks;

  const handleSubmitOffer = () => {
    const res = evaluateTalentOffer({
      talent,
      studio,
      project,
      requiredType,
      importance,
      offerWeeklyPay,
      contractWeeks,
      week: currentWeek,
      year: currentYear,
    });

    if (res.status === 'accepted') {
      onAccepted({ ...res, contractScope, sequelOptions, exclusivity, merchandising });
      onOpenChange(false);
      return;
    }

    if (res.status === 'counter') {
      setCounter(res.counterWeeklyPay);
      setOfferWeeklyPay(res.counterWeeklyPay);
      return;
    }

    onRejected?.(res);
    onOpenChange(false);
  };

  const disabledReason = displayAsk.blockedReason;
  const insufficientRunway = runwayCost > (studio.budget ?? 0);
  const submitDisabled = disabledReason === 'cooldown' || disabledReason === 'held' || insufficientRunway;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Negotiate Contract</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{talent.name}</div>
              <div className="text-sm text-muted-foreground">{roleLabel} • {talent.type}</div>
            </div>
            <Badge variant={interest.level === 'eager' || interest.level === 'interested' ? 'default' : interest.level === 'neutral' ? 'secondary' : 'destructive'}>
              {interest.label} ({displayAsk.interestScore})
            </Badge>
          </div>

          {disabledReason === 'cooldown' && (
            <div className="text-sm text-destructive">
              Their agent isn’t taking meetings with your studio right now.
            </div>
          )}
          {disabledReason === 'held' && (
            <div className="text-sm text-destructive">This talent is not currently available.</div>
          )}

          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agent ask</span>
              <span className="font-medium">${(displayAsk.askWeeklyPay / 1000).toFixed(0)}k/week</span>
            </div>
            {counter !== null && (
              <div className="text-sm">
                <span className="text-muted-foreground">Counter:</span>{' '}
                <span className="font-medium">${(counter / 1000).toFixed(0)}k/week</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Offer (weekly)</Label>
              <Input
                type="number"
                value={offerWeeklyPay}
                min={0}
                onChange={(e) => setOfferWeeklyPay(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              />
              <div className="text-xs text-muted-foreground">${(offerWeeklyPay / 1000).toFixed(0)}k/week</div>
            </div>
            <div className="space-y-1">
              <Label>Contract length (weeks)</Label>
              <Input
                type="number"
                value={contractWeeks}
                min={1}
                onChange={(e) => setContractWeeks(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
              <div className="text-xs text-muted-foreground">Suggested: {defaultWeeks}w</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contract type</Label>
              <Select value={contractScope} onValueChange={(value) => setContractScope(value as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Per Movie</SelectItem>
                  <SelectItem value="multi-picture">Multi-Picture Option</SelectItem>
                  <SelectItem value="exclusive">Studio Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sequel options</Label>
              <Input type="number" min={0} max={5} value={sequelOptions} onChange={(e) => setSequelOptions(Math.max(0, Math.min(5, Math.floor(Number(e.target.value) || 0))))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Button type="button" size="sm" variant={exclusivity ? 'default' : 'outline'} onClick={() => setExclusivity((v) => !v)}>
              {exclusivity ? 'Exclusive during shoot' : 'Non-exclusive'}
            </Button>
            <Button type="button" size="sm" variant={merchandising ? 'default' : 'outline'} onClick={() => setMerchandising((v) => !v)}>
              {merchandising ? 'Merchandising included' : 'No merchandising'}
            </Button>
          </div>

          <div className={`text-xs ${insufficientRunway ? 'text-destructive' : 'text-muted-foreground'}`}>
            Cash runway needed: ${(runwayCost / 1000000).toFixed(2)}M (first {runwayWeeks} weeks)
            {insufficientRunway ? ` • Studio budget: ${((studio.budget ?? 0) / 1000000).toFixed(2)}M` : ''}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Walk Away
            </Button>
            <Button onClick={handleSubmitOffer} disabled={submitDisabled}>
              Submit Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
