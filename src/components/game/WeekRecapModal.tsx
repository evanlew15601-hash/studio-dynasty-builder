import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TickRecapCard, TickReport } from '@/types/tickReport';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, ChevronDown, Clock, DollarSign, Film, Minus, TrendingDown, TrendingUp, Trophy, Users, Newspaper } from 'lucide-react';

type Tone = 'positive' | 'negative' | 'neutral';

export interface WeekRecapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TickReport | null;
}

const formatSignedNumber = (value: number) => {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
};

const formatMoneyDelta = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value);

  const formatNumber = (amount: number) => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
    return amount.toFixed(0);
  };

  return `${sign}\u0024${formatNumber(abs)}`;
};

const toneChipClass = (tone: Tone) => {
  if (tone === 'positive') return 'border-green-200 bg-green-50 text-green-800';
  if (tone === 'negative') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-border/70 bg-muted/40 text-foreground';
};

const toneCardClass = (tone: Tone | undefined) => {
  if (tone === 'positive') return 'border-l-4 border-l-green-500';
  if (tone === 'negative') return 'border-l-4 border-l-red-500';
  return '';
};

function toneForRecap(card: TickRecapCard): Tone {
  if (card.severity === 'good') return 'positive';
  if (card.severity === 'bad') return 'negative';
  return 'neutral';
}

function typeLabel(card: TickRecapCard): string {
  switch (card.type) {
    case 'financial':
      return 'Finance';
    case 'release':
      return 'Release';
    case 'award':
      return 'Awards';
    case 'talent':
      return 'Talent';
    case 'media':
      return 'Media';
    case 'market':
      return 'Market';
    case 'system':
    default:
      return 'System';
  }
}

function typeIcon(card: TickRecapCard) {
  switch (card.type) {
    case 'financial':
      return DollarSign;
    case 'release':
      return Film;
    case 'award':
      return Trophy;
    case 'talent':
      return Users;
    case 'media':
      return Newspaper;
    case 'market':
      return TrendingUp;
    case 'system':
    default:
      return Clock;
  }
}

export const WeekRecapModal: React.FC<WeekRecapModalProps> = ({ open, onOpenChange, report }) => {
  const [timingsOpen, setTimingsOpen] = useState(false);

  const summary = report?.summary;

  const totalTimingsMs = useMemo(() => {
    if (!report?.systems?.length) return 0;
    return report.systems.reduce((sum, t) => sum + (t.ms || 0), 0);
  }, [report?.systems]);

  const budgetTone: Tone =
    typeof summary?.budgetDelta === 'number'
      ? summary.budgetDelta > 0
        ? 'positive'
        : summary.budgetDelta < 0
          ? 'negative'
          : 'neutral'
      : 'neutral';

  const reputationTone: Tone =
    typeof summary?.reputationDelta === 'number'
      ? summary.reputationDelta > 0
        ? 'positive'
        : summary.reputationDelta < 0
          ? 'negative'
          : 'neutral'
      : 'neutral';

  const BudgetDeltaIcon =
    typeof summary?.budgetDelta === 'number'
      ? summary.budgetDelta > 0
        ? TrendingUp
        : summary.budgetDelta < 0
          ? TrendingDown
          : Minus
      : null;

  const ReputationDeltaIcon =
    typeof summary?.reputationDelta === 'number'
      ? summary.reputationDelta > 0
        ? TrendingUp
        : summary.reputationDelta < 0
          ? TrendingDown
          : Minus
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {report ? `Week ${report.week}, Year ${report.year} Recap` : 'Week Recap'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0">
          <div className="flex flex-wrap gap-2">
            {typeof summary?.budgetDelta === 'number' && (
              <Badge variant="outline" className={cn('gap-1.5', toneChipClass(budgetTone))}>
                <DollarSign className="h-3.5 w-3.5" />
                Budget {formatMoneyDelta(summary.budgetDelta)}
                {BudgetDeltaIcon && <BudgetDeltaIcon className="ml-0.5 h-3.5 w-3.5" />}
              </Badge>
            )}

            {typeof summary?.reputationDelta === 'number' && (
              <Badge variant="outline" className={cn('gap-1.5', toneChipClass(reputationTone))}>
                {ReputationDeltaIcon && <ReputationDeltaIcon className="h-3.5 w-3.5" />}
                Reputation {formatSignedNumber(summary.reputationDelta)}
              </Badge>
            )}

            {typeof summary?.newReleases === 'number' && (
              <Badge variant="outline" className={cn('gap-1.5', toneChipClass('neutral'))}>
                <Film className="h-3.5 w-3.5" />
                Releases {summary.newReleases}
              </Badge>
            )}

            {typeof summary?.awardsWon === 'number' && (
              <Badge variant="outline" className={cn('gap-1.5', toneChipClass('neutral'))}>
                <Trophy className="h-3.5 w-3.5" />
                Awards {summary.awardsWon}
              </Badge>
            )}

            {typeof report?.totalMs === 'number' && (
              <Badge variant="outline" className={cn('gap-1.5', toneChipClass('neutral'))}>
                <Clock className="h-3.5 w-3.5" />
                {Math.round(report.totalMs)}ms
              </Badge>
            )}
          </div>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            <div className="space-y-4 pb-2">
              {!report ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-sm text-muted-foreground">No recap available yet.</div>
                  </CardContent>
                </Card>
              ) : report.recap.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-sm text-muted-foreground">No recap items for this week.</div>
                  </CardContent>
                </Card>
              ) : (
                report.recap.map((card, idx) => {
                  const tone = toneForRecap(card);
                  const TypeIcon = typeIcon(card);

                  return (
                    <Card key={`${card.type}:${idx}`} className={cn(toneCardClass(tone))}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <Badge variant="outline" className="mt-0.5 text-xs">
                              {typeLabel(card)}
                            </Badge>
                            <TypeIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="leading-tight truncate">{card.title}</div>
                              <div className="mt-1 text-sm font-normal text-muted-foreground whitespace-pre-wrap">{card.body}</div>
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  );
                })
              )}

              {report?.systems && report.systems.length > 0 && (
                <Collapsible open={timingsOpen} onOpenChange={setTimingsOpen}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          System Timings
                          <Badge variant="outline" className="ml-1 text-xs">
                            {totalTimingsMs.toFixed(0)}ms
                          </Badge>
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            {timingsOpen ? 'Hide' : 'Show'}
                            <ChevronDown className={cn('h-4 w-4 transition-transform', timingsOpen && 'rotate-180')} />
                          </Button>
                        </CollapsibleTrigger>
                      </CardTitle>
                    </CardHeader>

                    <CollapsibleContent>
                      <Separator />
                      <CardContent className="pt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>System</TableHead>
                              <TableHead className="w-[140px] text-right">Time</TableHead>
                              <TableHead className="w-[140px] text-right">Share</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.systems.map((row) => {
                              const share = totalTimingsMs > 0 ? (row.ms / totalTimingsMs) * 100 : 0;
                              const note = row.warnings?.[0] ?? row.highlights?.[0];
                              return (
                                <TableRow key={row.id}>
                                  <TableCell>
                                    <div className="font-medium">{row.label}</div>
                                    {note && <div className="text-xs text-muted-foreground">{note}</div>}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">{row.ms.toFixed(1)}ms</TableCell>
                                  <TableCell className="text-right font-mono">{share.toFixed(1)}%</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right font-mono">{totalTimingsMs.toFixed(1)}ms</TableCell>
                              <TableCell className="text-right font-mono">100.0%</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
