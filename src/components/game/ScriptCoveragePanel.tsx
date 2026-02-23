import React, { useEffect, useId, useMemo, useState } from 'react';
import type { Script, ScriptCoverage, ScriptCoverageRevisionType } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SCRIPT_STAGE_LABEL, SCRIPT_STAGE_ORDER } from './DevelopmentStageControl';
import {
  addRevisionAction,
  ensureScriptCoverageData,
  formatRevisionActionLabel,
  getStageChecklistProgress,
  toggleChecklistItem,
  updateStageNotes,
} from '@/utils/scriptCoverage';

interface ScriptCoveragePanelProps {
  coverage: ScriptCoverage;
  onCoverageChange: (next: ScriptCoverage) => void;
  /**
   * If provided, revision actions will be delegated to the parent (so it can also update script stats/budget).
   * In that case the panel will NOT call onCoverageChange for revision actions.
   */
  onRevisionAction?: (nextCoverage: ScriptCoverage, info: { stage: Script['developmentStage']; type: ScriptCoverageRevisionType; note?: string }) => void;
  defaultStage?: Script['developmentStage'];
  showStageTabs?: boolean;
  showRevisionActions?: boolean;
}

const REVISION_ACTIONS: Array<{ type: ScriptCoverageRevisionType; label: string }> = [
  { type: 'coverage_requested', label: 'Coverage requested' },
  { type: 'coverage_received', label: 'Coverage received' },
  { type: 'minor_revision', label: 'Minor revision' },
  { type: 'major_revision', label: 'Major revision' },
  { type: 'polish_pass', label: 'Polish pass' },
  { type: 'table_read', label: 'Table read' },
  { type: 'notes_applied', label: 'Notes applied' },
];

export const ScriptCoveragePanel: React.FC<ScriptCoveragePanelProps> = ({
  coverage,
  onCoverageChange,
  onRevisionAction,
  defaultStage,
  showStageTabs = true,
  showRevisionActions = true,
}) => {
  const normalized = useMemo(() => ensureScriptCoverageData(coverage), [coverage]);
  const uid = useId();

  const [activeStage, setActiveStage] = useState<Script['developmentStage']>(defaultStage || 'concept');
  const [newActionType, setNewActionType] = useState<ScriptCoverageRevisionType>('coverage_received');
  const [newActionNote, setNewActionNote] = useState('');

  useEffect(() => {
    if (!defaultStage) return;
    setActiveStage(defaultStage);
  }, [defaultStage]);

  const stageCoverage = normalized.stages[activeStage];
  const stageProgress = getStageChecklistProgress(normalized, activeStage);

  const recentActions = [...normalized.revisionActions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Coverage & Notes</h3>
            <Badge variant={stageProgress.percent >= 100 ? 'default' : 'secondary'} className="text-xs">
              {stageProgress.completed}/{stageProgress.total} ({stageProgress.percent}%)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Track stage checklists, reader notes, and revision actions.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Stage readiness</span>
          <span className="font-mono">{stageProgress.percent}%</span>
        </div>
        <Progress value={stageProgress.percent} className="h-2" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{SCRIPT_STAGE_LABEL[activeStage]} checklist</Label>
        <div className="space-y-2">
          {stageCoverage.checklist.map((item) => {
            const checkboxId = `${uid}-${activeStage}-${item.id}`;

            return (
              <div key={item.id} className="flex items-start gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={item.completed}
                  onCheckedChange={() =>
                    onCoverageChange(toggleChecklistItem(normalized, activeStage, item.id))
                  }
                />
                <Label
                  htmlFor={checkboxId}
                  className={`text-sm leading-snug ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                >
                  {item.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-coverage-notes`} className="text-sm">
          Stage notes
        </Label>
        <Textarea
          id={`${uid}-coverage-notes`}
          value={stageCoverage.notes}
          onChange={(e) => onCoverageChange(updateStageNotes(normalized, activeStage, e.target.value))}
          rows={4}
          placeholder="Reader notes, internal feedback, what to tackle next..."
        />
      </div>

      {showRevisionActions && (
        <>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Revision actions</Label>
              <Badge variant="outline" className="text-xs">
                {normalized.revisionActions.length} total
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-1">
                <Select
                  value={newActionType}
                  onValueChange={(value) => setNewActionType(value as ScriptCoverageRevisionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVISION_ACTIONS.map((action) => (
                      <SelectItem key={action.type} value={action.type}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Input
                  value={newActionNote}
                  onChange={(e) => setNewActionNote(e.target.value)}
                  placeholder="Optional note (e.g., " + "'Cut subplot, tighten act 2'" + ")"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const note = newActionNote?.trim() ? newActionNote.trim() : undefined;
                    const nextCoverage = addRevisionAction(normalized, activeStage, newActionType, note);

                    if (onRevisionAction) {
                      onRevisionAction(nextCoverage, { stage: activeStage, type: newActionType, note });
                    } else {
                      onCoverageChange(nextCoverage);
                    }

                    setNewActionNote('');
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {recentActions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Recent</p>
                <div className="space-y-2">
                  {recentActions.map((action) => (
                    <div key={action.id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">
                          {formatRevisionActionLabel(action.type)}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({SCRIPT_STAGE_LABEL[action.stage]})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(action.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {action.note && (
                        <div className="text-xs text-muted-foreground mt-1">{action.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (!showStageTabs) {
    return content;
  }

  return (
    <Tabs value={activeStage} onValueChange={(v) => setActiveStage(v as Script['developmentStage'])}>
      <TabsList className="flex flex-wrap justify-start gap-1 h-auto">
        {SCRIPT_STAGE_ORDER.map((stage) => (
          <TabsTrigger key={stage} value={stage} className="h-8 px-2 text-xs">
            {SCRIPT_STAGE_LABEL[stage]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={activeStage}>{content}</TabsContent>
    </Tabs>
  );
};
