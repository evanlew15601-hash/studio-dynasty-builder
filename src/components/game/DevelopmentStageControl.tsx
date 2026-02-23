import React from 'react';
import type { Script } from '@/types/game';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

export const SCRIPT_STAGE_ORDER: Script['developmentStage'][] = [
  'concept',
  'treatment',
  'first-draft',
  'polish',
  'final',
];

export const SCRIPT_STAGE_LABEL: Record<Script['developmentStage'], string> = {
  concept: 'Concept',
  treatment: 'Treatment',
  'first-draft': 'First Draft',
  polish: 'Polish',
  final: 'Final',
};

export const SCRIPT_STAGE_DESCRIPTION: Record<Script['developmentStage'], string> = {
  concept: 'Define the core idea: title, logline, tone, target audience, and a rough budget.',
  treatment: 'Expand the story into a prose summary. Clarify protagonist, stakes, and ending.',
  'first-draft': 'Turn the treatment into scenes and dialogue. Quantity over perfection.',
  polish: 'Tighten pacing, strengthen character arcs, and refine dialogue/scene clarity.',
  final: 'Lock the script for production. Finalized scripts can be greenlit.',
};

export type StageGate = {
  allowed: boolean;
  reason?: string;
};

interface DevelopmentStageControlProps {
  value: Script['developmentStage'];
  onValueChange: (next: Script['developmentStage']) => void;
  gate?: (stage: Script['developmentStage']) => StageGate;
  className?: string;
}

export const DevelopmentStageControl: React.FC<DevelopmentStageControlProps> = ({
  value,
  onValueChange,
  gate,
  className,
}) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix ToggleGroup returns '' when clicking the selected item.
        if (!next) return;
        onValueChange(next as Script['developmentStage']);
      }}
      className={cn('flex flex-wrap justify-start gap-2', className)}
    >
      {SCRIPT_STAGE_ORDER.map((stage) => {
        const g = gate?.(stage) || { allowed: true };
        const item = (
          <ToggleGroupItem
            key={stage}
            value={stage}
            aria-label={SCRIPT_STAGE_LABEL[stage]}
            // Don't use the `disabled` prop because the shadcn/radix styles apply
            // `pointer-events: none`, which prevents tooltips/toasts on blocked stages.
            aria-disabled={!g.allowed}
            className={cn(
              'h-9 rounded-md px-3 text-sm',
              value === stage && 'ring-1 ring-primary/30',
              !g.allowed && 'opacity-70 cursor-not-allowed'
            )}
          >
            <span className="flex items-center gap-2">
              {!g.allowed && <Lock className="h-3.5 w-3.5" />}
              {SCRIPT_STAGE_LABEL[stage]}
            </span>
          </ToggleGroupItem>
        );

        if (g.allowed || !g.reason) return item;

        return (
          <Tooltip key={stage}>
            <TooltipTrigger asChild>{item}</TooltipTrigger>
            <TooltipContent className="max-w-xs">{g.reason}</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
};
