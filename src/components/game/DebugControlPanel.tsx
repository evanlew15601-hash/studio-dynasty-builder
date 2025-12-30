import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { TimeState } from './TimeSystem';
import { Clock, FastForward, DollarSign, Star, Settings2 } from 'lucide-react';

interface DebugControlPanelProps {
  time: TimeState;
  studioBudget: number;
  studioDebt: number;
  studioReputation: number;
  onAdvanceWeeks: (weeks: number) => void;
  onAdvanceToDate: (week: number, year: number) => void;
  onSetBudget: (budget: number) => void;
  onSetDebt: (debt: number) => void;
  onSetReputation: (reputation: number) => void;
}

export const DebugControlPanel: React.FC<DebugControlPanelProps> = ({
  time,
  studioBudget,
  studioDebt,
  studioReputation,
  onAdvanceWeeks,
  onAdvanceToDate,
  onSetBudget,
  onSetDebt,
  onSetReputation,
}) => {
  const [weeksInput, setWeeksInput] = useState(4);
  const [targetWeek, setTargetWeek] = useState(time.currentWeek);
  const [targetYear, setTargetYear] = useState(time.currentYear);
  const [budgetMillions, setBudgetMillions] = useState(
    Math.round(studioBudget / 1_000_000)
  );
  const [debtMillions, setDebtMillions] = useState(
    Math.round((studioDebt || 0) / 1_000_000)
  );
  const [reputation, setReputation] = useState(
    Math.round(studioReputation)
  );

  useEffect(() => {
    setTargetWeek(time.currentWeek);
    setTargetYear(time.currentYear);
  }, [time.currentWeek, time.currentYear]);

  useEffect(() => {
    setBudgetMillions(Math.round(studioBudget / 1_000_000));
  }, [studioBudget]);

  useEffect(() => {
    setDebtMillions(Math.round((studioDebt || 0) / 1_000_000));
  }, [studioDebt]);

  useEffect(() => {
    setReputation(Math.round(studioReputation));
  }, [studioReputation]);

  const handleAdvanceClick = (weeks: number) => {
    if (!Number.isFinite(weeks) || weeks <= 0) return;
    onAdvanceWeeks(Math.floor(weeks));
  };

  const handleAdvanceToTarget = () => {
    onAdvanceToDate(targetWeek, targetYear);
  };

  const handleBudgetApply = () => {
    const value = Number.isFinite(budgetMillions) ? budgetMillions : 0;
    onSetBudget(Math.max(0, value * 1_000_000));
  };

  const handleDebtApply = () => {
    const value = Number.isFinite(debtMillions) ? debtMillions : 0;
    onSetDebt(Math.max(0, value * 1_000_000));
  };

  const handleReputationApply = () => {
    const value = Number.isFinite(reputation) ? reputation : 0;
    onSetReputation(Math.max(0, Math.min(100, value)));
  };

  return (
    <Card className="card-premium border border-dashed border-primary/30 bg-background/80">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings2 size={16} className="text-primary" />
          Developer Debug Tools
          <Badge
            variant="outline"
            className="ml-2 text-[10px] uppercase tracking-wide"
          >
            Time &amp; State
          </Badge>
        </CardTitle>
        <div className="text-[11px] text-muted-foreground">
          Y{time.currentYear} • W{time.currentWeek} • Q{time.currentQuarter}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Time Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FastForward size={14} />
              Fast-forward weeks
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={260}
                value={weeksInput}
                onChange={(e) => setWeeksInput(Number(e.target.value) || 0)}
                className="h-8 w-20 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => handleAdvanceClick(weeksInput)}
              >
                Run
              </Button>
              <div className="flex flex-wrap gap-1">
                {[1, 4, 13, 26, 52].map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-[11px]"
                    onClick={() => handleAdvanceClick(w)}
                  >
                    +{w}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock size={14} />
              Jump to specific week
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={52}
                value={targetWeek}
                onChange={(e) => setTargetWeek(Number(e.target.value) || 1)}
                className="h-8 w-20 text-xs"
              />
              <Input
                type="number"
                value={targetYear}
                onChange={(e) =>
                  setTargetYear(Number(e.target.value) || time.currentYear)
                }
                className="h-8 w-24 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleAdvanceToTarget}
              >
                Advance to date
              </Button>
            </div>
          </div>
        </div>

        {/* Studio State Tweaks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign size={14} />
              Budget (M)
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={budgetMillions}
                onChange={(e) => setBudgetMillions(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleBudgetApply}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign size={14} />
              Debt (M)
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={debtMillions}
                onChange={(e) => setDebtMillions(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleDebtApply}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Star size={14} />
              Reputation
            </div>
            <div className="flex items-center gap-2">
              <Slider
                value={[reputation]}
                min={0}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(values) => setReputation(values[0] ?? 0)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={reputation}
                onChange={(e) => setReputation(Number(e.target.value) || 0)}
                className="h-8 w-16 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleReputationApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};