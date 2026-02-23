import React, { useEffect, useMemo, useState } from 'react';

import type {
  GameState,
  Genre,
  Script,
  ScriptCharacteristics,
  ScriptCoverage,
  ScriptCoverageRevisionType,
} from '@/types/game';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScriptIcon } from '@/components/ui/icons';
import {
  DevelopmentStageControl,
  SCRIPT_STAGE_DESCRIPTION,
  SCRIPT_STAGE_LABEL,
} from './DevelopmentStageControl';
import { ScriptCoveragePanel } from './ScriptCoveragePanel';
import { ScriptCharacterManager, ScriptCharacter } from './ScriptCharacterManager';
import {
  createDefaultScriptCoverage,
  ensureScriptCoverageData,
  getStageChecklistProgress,
} from '@/utils/scriptCoverage';
import {
  finalizeScriptForGreenlight,
  finalizeScriptForSave,
  getScriptGreenlightReport,
} from '@/utils/scriptFinalization';
import { importRolesForScript } from '@/utils/roleImport';

interface ScriptDevelopmentProps {
  gameState: GameState;
  selectedFranchise?: string | null;
  selectedPublicDomain?: string | null;
  onProjectCreate: (script: Script) => void;
  onScriptUpdate: (script: Script) => void;
  /** Optional callback for spending studio budget on script development actions. */
  onSpendBudget?: (amount: number) => void;
}

const DEFAULT_CHARACTERISTICS: ScriptCharacteristics = {
  tone: 'balanced',
  pacing: 'steady',
  dialogue: 'naturalistic',
  visualStyle: 'realistic',
  commercialAppeal: 5,
  criticalPotential: 5,
  cgiIntensity: 'minimal',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampQuality = (value: number) => clamp(Math.round(value), 0, 100);
const clampTen = (value: number) => clamp(Math.round(value), 1, 10);

const REVISION_EFFECTS: Record<
  ScriptCoverageRevisionType,
  { label: string; cost: number; qualityDelta: number; commercialDelta: number; criticalDelta: number }
> = {
  coverage_requested: { label: 'Coverage requested', cost: 25_000, qualityDelta: 0, commercialDelta: 0, criticalDelta: 0 },
  coverage_received: { label: 'Coverage received', cost: 0, qualityDelta: 0, commercialDelta: 0, criticalDelta: 0 },
  minor_revision: { label: 'Minor revision', cost: 50_000, qualityDelta: 2, commercialDelta: 0, criticalDelta: 0 },
  major_revision: { label: 'Major revision', cost: 150_000, qualityDelta: 5, commercialDelta: 1, criticalDelta: 0 },
  polish_pass: { label: 'Polish pass', cost: 90_000, qualityDelta: 3, commercialDelta: 0, criticalDelta: 1 },
  table_read: { label: 'Table read', cost: 80_000, qualityDelta: 2, commercialDelta: 1, criticalDelta: 0 },
  notes_applied: { label: 'Notes applied', cost: 40_000, qualityDelta: 1, commercialDelta: 0, criticalDelta: 0 },
};

function getCoverageGateForFinal(coverage: ScriptCoverage | undefined | null): { allowed: boolean; reason?: string } {
  const cov = ensureScriptCoverageData(coverage);
  const polish = getStageChecklistProgress(cov, 'polish').percent;
  const final = getStageChecklistProgress(cov, 'final').percent;

  if (polish >= 75 && final >= 75) return { allowed: true };
  return {
    allowed: false,
    reason: `Coverage checklists incomplete (Polish ${polish}%, Final ${final}%).`,
  };
}

function applyRevisionToScript(
  script: Script,
  type: ScriptCoverageRevisionType
): Script {
  const effect = REVISION_EFFECTS[type];

  return {
    ...script,
    quality: clampQuality(script.quality + effect.qualityDelta),
    characteristics: {
      ...script.characteristics,
      commercialAppeal: clampTen(script.characteristics.commercialAppeal + effect.commercialDelta),
      criticalPotential: clampTen(script.characteristics.criticalPotential + effect.criticalDelta),
    },
  };
}

export const ScriptDevelopment: React.FC<ScriptDevelopmentProps> = ({
  gameState,
  selectedFranchise,
  selectedPublicDomain,
  onProjectCreate,
  onScriptUpdate,
  onSpendBudget,
}) => {
  const { toast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [draftId, setDraftId] = useState(() => `script-${Date.now()}`);

  const [draft, setDraft] = useState<Partial<Script>>({});
  const [draftCoverage, setDraftCoverage] = useState<ScriptCoverage>(() => createDefaultScriptCoverage());
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);

  const [coverageScriptId, setCoverageScriptId] = useState<string | null>(null);

  const initialDraft = useMemo(() => {
    const franchise = selectedFranchise ? gameState.franchises.find((f) => f.id === selectedFranchise) : null;
    const publicDomain = selectedPublicDomain
      ? gameState.publicDomainIPs.find((ip) => ip.id === selectedPublicDomain)
      : null;

    if (franchise) {
      return {
        title: `${franchise.title} Entry`,
        genre: (franchise.genre?.[0] as Genre) || 'drama',
        logline: franchise.description || 'A new installment in a beloved franchise.',
        sourceType: 'franchise' as const,
        franchiseId: franchise.id,
      };
    }

    if (publicDomain) {
      return {
        title: `${publicDomain.name} Adaptation`,
        genre: 'drama' as Genre,
        logline: `An adaptation of ${publicDomain.name}.`,
        sourceType: 'public-domain' as const,
        publicDomainId: publicDomain.id,
      };
    }

    return {
      title: '',
      genre: 'drama' as Genre,
      logline: '',
      sourceType: 'original' as const,
    };
  }, [gameState.franchises, gameState.publicDomainIPs, selectedFranchise, selectedPublicDomain]);

  useEffect(() => {
    if (!isCreating) return;
    // When opening the modal, seed the form.
    setDraft((prev) => ({
      ...initialDraft,
      // Preserve explicit edits if they already exist.
      ...prev,
      developmentStage: (prev.developmentStage as Script['developmentStage']) || 'concept',
      budget: prev.budget || 5_000_000,
      quality: prev.quality ?? 50,
      characteristics: (prev.characteristics as ScriptCharacteristics) || DEFAULT_CHARACTERISTICS,
      pages: prev.pages || 120,
      targetAudience: prev.targetAudience || 'general',
      estimatedRuntime: prev.estimatedRuntime || 120,
      themes: prev.themes || [],
    }));
    setDraftCoverage((prev) => (prev ? prev : createDefaultScriptCoverage()));
  }, [initialDraft, isCreating]);

  useEffect(() => {
    if (!isCreating) return;
    if (editingScript) return;
    if (scriptCharacters.length > 0) return;

    const sourceType = (draft.sourceType || initialDraft.sourceType) as Script['sourceType'];
    const franchiseId = (draft.franchiseId || (initialDraft as any).franchiseId) as string | undefined;
    const publicDomainId = (draft.publicDomainId || (initialDraft as any).publicDomainId) as string | undefined;

    if (sourceType !== 'franchise' && sourceType !== 'public-domain') return;

    const tempScript = {
      ...buildScriptFromDraft(),
      sourceType,
      franchiseId,
      publicDomainId,
      characters: [],
    };

    const imported = importRolesForScript(tempScript, gameState);
    if (!imported || imported.length === 0) return;

    setScriptCharacters(
      imported.map((c) => ({
        ...c,
        screenTimeMinutes:
          c.importance === 'lead' ? 60 : c.importance === 'supporting' ? 25 : c.importance === 'minor' ? 5 : 0,
      }))
    );
  }, [draft.franchiseId, draft.publicDomainId, draft.sourceType, editingScript, gameState, initialDraft, isCreating, scriptCharacters.length]);

  const coverageScript = coverageScriptId
    ? gameState.scripts.find((s) => s.id === coverageScriptId) || null
    : null;

  const buildScriptFromDraft = (): Script => {
    const stage = (draft.developmentStage as Script['developmentStage']) || 'concept';

    return {
      id: editingScript?.id || draft.id || draftId,
      title: draft.title || '',
      genre: (draft.genre as Genre) || 'drama',
      logline: draft.logline || '',
      writer: draft.writer || 'In-house',
      pages: draft.pages || 120,
      quality: draft.quality ?? 50,
      budget: draft.budget || 5_000_000,
      developmentStage: stage,
      themes: draft.themes || [],
      targetAudience: (draft.targetAudience as any) || 'general',
      estimatedRuntime: draft.estimatedRuntime || 120,
      characteristics: (draft.characteristics as ScriptCharacteristics) || DEFAULT_CHARACTERISTICS,
      coverage: ensureScriptCoverageData(draftCoverage),
      characters: scriptCharacters.length
        ? scriptCharacters.map(({ screenTimeMinutes, ...c }) => c)
        : editingScript?.characters || draft.characters || [],
      sourceType: (draft.sourceType as any) || 'original',
      franchiseId: draft.franchiseId as any,
      publicDomainId: draft.publicDomainId as any,
    };
  };

  const finalizationPreview = useMemo(() => {
    if (!isCreating) return null;
    try {
      const { report } = finalizeScriptForGreenlight(buildScriptFromDraft(), gameState);
      return report;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreating, draft, draftCoverage, gameState]);

  const canSpend = (cost: number) => gameState.studio.budget >= cost;

  const trySpendBudget = (cost: number, label: string): boolean => {
    if (cost <= 0) return true;
    if (!canSpend(cost)) {
      toast({
        title: 'Insufficient Budget',
        description: 'Need $' + (cost / 1000).toFixed(0) + 'k for ' + label + '.',
        variant: 'destructive',
      });
      return false;
    }

    onSpendBudget?.(cost);
    return true;
  };

  const handleSaveScript = () => {
    const base = buildScriptFromDraft();

    if (base.developmentStage === 'final') {
      const coverageGate = getCoverageGateForFinal(base.coverage);
      if (!coverageGate.allowed) {
        toast({
          title: 'Coverage Incomplete',
          description: coverageGate.reason,
          variant: 'destructive',
        });
        return;
      }

      const { script: finalized, report } = finalizeScriptForGreenlight(base, gameState);
      if (!report.canFinalize) {
        toast({
          title: 'Cannot Finalize',
          description: report.issues.filter((i) => i.level === 'error').map((i) => i.message).join(' '),
          variant: 'destructive',
        });
        // Drop back to polish, so player can keep iterating.
        setDraft((prev) => ({ ...prev, developmentStage: 'polish' }));
        return;
      }

      onScriptUpdate(finalized);

      toast({
        title: 'Script Finalized',
        description:
          report.fixesApplied.length > 0
            ? `${finalized.title}: ${report.fixesApplied.join(', ')}`
            : `${finalized.title} is ready for greenlight.`,
      });
    } else {
      const script = finalizeScriptForSave(base, gameState);
      onScriptUpdate(script);

      toast({
        title: editingScript ? 'Script Updated' : 'Script Created',
        description: script.title ? `Saved ${script.title}.` : undefined,
      });
    }

    setIsCreating(false);
    setEditingScript(null);
    setDraft({});
    setDraftCoverage(createDefaultScriptCoverage());
    setScriptCharacters([]);
    setDraftId(`script-${Date.now()}`);
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setDraft({
      ...script,
      characteristics: { ...script.characteristics },
    });
    setDraftCoverage(ensureScriptCoverageData(script.coverage));
    setScriptCharacters(
      (script.characters || []).map((c) => ({
        ...c,
        screenTimeMinutes:
          c.importance === 'lead' ? 60 : c.importance === 'supporting' ? 25 : c.importance === 'minor' ? 5 : 0,
      }))
    );
    setIsCreating(true);
  };

  const handleGreenlightScript = (script: Script) => {
    const coverageGate = getCoverageGateForFinal(script.coverage);
    if (!coverageGate.allowed) {
      toast({
        title: 'Coverage Incomplete',
        description: coverageGate.reason,
        variant: 'destructive',
      });
      return;
    }

    const { script: finalized, report } = finalizeScriptForGreenlight(script, gameState);

    if (!report.canFinalize) {
      toast({
        title: 'Cannot Greenlight',
        description: report.issues.filter((i) => i.level === 'error').map((i) => i.message).join(' '),
        variant: 'destructive',
      });
      return;
    }

    onScriptUpdate(finalized);
    onProjectCreate(finalized);
  };

  const handleFinalizeScript = (script: Script) => {
    const coverageGate = getCoverageGateForFinal(script.coverage);
    if (!coverageGate.allowed) {
      toast({
        title: 'Coverage Incomplete',
        description: coverageGate.reason,
        variant: 'destructive',
      });
      return;
    }

    const { script: finalized, report } = finalizeScriptForGreenlight(script, gameState);

    if (!report.canFinalize) {
      toast({
        title: 'Cannot Finalize',
        description: report.issues.filter((i) => i.level === 'error').map((i) => i.message).join(' '),
        variant: 'destructive',
      });
      return;
    }

    onScriptUpdate(finalized);

    toast({
      title: 'Script Finalized',
      description:
        report.fixesApplied.length > 0
          ? `${finalized.title}: ${report.fixesApplied.join(', ')}`
          : `${finalized.title} is ready for greenlight.`,
    });
  };

  const availableScripts = useMemo(
    () => gameState.scripts.filter((s) => !gameState.projects.some((p) => p.script.id === s.id)),
    [gameState.projects, gameState.scripts]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Script Development</h2>
        <Button
          onClick={() => {
            setEditingScript(null);
            setDraft({});
            setDraftCoverage(createDefaultScriptCoverage());
            setScriptCharacters([]);
            setDraftId(`script-${Date.now()}`);
            setIsCreating(true);
          }}
        >
          <ScriptIcon className="mr-2" size={16} />
          New Script
        </Button>
      </div>

      <Dialog
        open={isCreating}
        onOpenChange={(open) => {
          setIsCreating(open);
          if (!open) {
            setEditingScript(null);
            setDraft({});
            setDraftCoverage(createDefaultScriptCoverage());
            setScriptCharacters([]);
            setDraftId(`script-${Date.now()}`);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingScript ? 'Edit Script' : 'New Script'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={draft.title || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="writer">Writer</Label>
                <Input
                  id="writer"
                  value={draft.writer || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, writer: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="logline">Logline</Label>
                <Textarea
                  id="logline"
                  value={draft.logline || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, logline: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Development Stage</Label>
                <Badge variant="outline" className="text-xs">
                  {SCRIPT_STAGE_LABEL[(draft.developmentStage as Script['developmentStage']) || 'concept']}
                </Badge>
              </div>

              <DevelopmentStageControl
                value={(draft.developmentStage as Script['developmentStage']) || 'concept'}
                gate={(stage) => {
                  if (stage !== 'final') return { allowed: true };

                  const coverageGate = getCoverageGateForFinal(draftCoverage);
                  if (!coverageGate.allowed) return { allowed: false, reason: coverageGate.reason };

                  if (!finalizationPreview) return { allowed: true };
                  if (finalizationPreview.canFinalize) return { allowed: true };

                  const msg = finalizationPreview.issues
                    .filter((i) => i.level === 'error')
                    .map((i) => i.message)
                    .join(' ');
                  return { allowed: false, reason: msg || 'Fix required fields before finalizing.' };
                }}
                onValueChange={(next) => {
                  if (next === 'final') {
                    const coverageGate = getCoverageGateForFinal(draftCoverage);
                    if (!coverageGate.allowed) {
                      toast({
                        title: 'Coverage Incomplete',
                        description: coverageGate.reason,
                        variant: 'destructive',
                      });
                      return;
                    }

                    if (finalizationPreview && !finalizationPreview.canFinalize) {
                      toast({
                        title: 'Not Ready for Final',
                        description: finalizationPreview.issues
                          .filter((i) => i.level === 'error')
                          .map((i) => i.message)
                          .join(' '),
                        variant: 'destructive',
                      });
                      return;
                    }
                  }

                  setDraft((prev) => ({ ...prev, developmentStage: next }));
                }}
              />

              <p className="text-xs text-muted-foreground">
                {SCRIPT_STAGE_DESCRIPTION[(draft.developmentStage as Script['developmentStage']) || 'concept']}
              </p>
            </div>

            <div className="border-t pt-4">
              <ScriptCoveragePanel
                coverage={draftCoverage}
                onCoverageChange={setDraftCoverage}
                onRevisionAction={(nextCoverage, info) => {
                  const effect = REVISION_EFFECTS[info.type];
                  if (!trySpendBudget(effect.cost, effect.label)) return;

                  setDraftCoverage(nextCoverage);
                  setDraft((prev) => {
                    const quality = clampQuality((prev.quality ?? 50) + effect.qualityDelta);
                    const chars = (prev.characteristics as ScriptCharacteristics) || DEFAULT_CHARACTERISTICS;

                    return {
                      ...prev,
                      quality,
                      characteristics: {
                        ...chars,
                        commercialAppeal: clampTen(chars.commercialAppeal + effect.commercialDelta),
                        criticalPotential: clampTen(chars.criticalPotential + effect.criticalDelta),
                      },
                    };
                  });

                  toast({
                    title: effect.label,
                    description: effect.cost > 0 ? `Spent ${(effect.cost / 1000).toFixed(0)}k.` : undefined,
                  });
                }}
                defaultStage={((draft.developmentStage as Script['developmentStage']) || 'concept')}
              />
            </div>

            <div className="border-t pt-4">
              <ScriptCharacterManager
                characters={scriptCharacters}
                onCharactersChange={setScriptCharacters}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingScript(null);
                  setDraft({});
                  setDraftCoverage(createDefaultScriptCoverage());
                  setScriptCharacters([]);
                  setDraftId(`script-${Date.now()}`);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveScript}>
                <ScriptIcon className="mr-2" size={16} />
                {editingScript ? 'Save Changes' : 'Create Script'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Script Library</CardTitle>
        </CardHeader>
        <CardContent>
          {availableScripts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No scripts in development.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableScripts.map((script) => {
                const report = getScriptGreenlightReport(script, gameState);

                return (
                  <Card key={script.id} className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base truncate">{script.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {script.genre}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {script.developmentStage}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{script.logline}</p>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditScript(script)}>
                            ✏️ Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={report.canGreenlight ? 'default' : 'secondary'}
                            className="flex-1"
                            onClick={() => (report.canGreenlight ? handleGreenlightScript(script) : handleFinalizeScript(script))}
                          >
                            {report.canGreenlight ? 'Greenlight' : 'Finalize'}
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full"
                          onClick={() => setCoverageScriptId(script.id)}
                        >
                          📝 Coverage & Notes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(coverageScriptId)}
        onOpenChange={(open) => {
          if (!open) setCoverageScriptId(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Coverage & Notes{coverageScript ? `: ${coverageScript.title}` : ''}</DialogTitle>
          </DialogHeader>
          {coverageScript ? (
            <ScriptCoveragePanel
              coverage={ensureScriptCoverageData(coverageScript.coverage)}
              onCoverageChange={(next) => onScriptUpdate({ ...coverageScript, coverage: next })}
              onRevisionAction={(nextCoverage, info) => {
                const effect = REVISION_EFFECTS[info.type];
                if (!trySpendBudget(effect.cost, effect.label)) return;

                const nextScript = applyRevisionToScript(
                  {
                    ...coverageScript,
                    coverage: nextCoverage,
                  },
                  info.type
                );

                onScriptUpdate(nextScript);

                toast({
                  title: effect.label,
                  description: effect.cost > 0 ? `Spent $${(effect.cost / 1000).toFixed(0)}k.` : undefined,
                });
              }}
              defaultStage={coverageScript.developmentStage}
            />
          ) : (
            <div className="text-sm text-muted-foreground">No script selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
 + (effect.cost / 1000).toFixed(0) + 'k.' : undefined,
                  });
                }}
                defaultStage={((draft.developmentStage as Script['developmentStage']) || 'concept')}
              />
            </div>

            <div className="border-t pt-4">
              <ScriptCharacterManager
                characters={scriptCharacters}
                onCharactersChange={setScriptCharacters}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingScript(null);
                  setDraft({});
                  setDraftCoverage(createDefaultScriptCoverage());
                  setScriptCharacters([]);
                  setDraftId(`script-${Date.now()}`);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveScript}>
                <ScriptIcon className="mr-2" size={16} />
                {editingScript ? 'Save Changes' : 'Create Script'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Script Library</CardTitle>
        </CardHeader>
        <CardContent>
          {availableScripts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No scripts in development.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableScripts.map((script) => {
                const report = getScriptGreenlightReport(script, gameState);

                return (
                  <Card key={script.id} className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base truncate">{script.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {script.genre}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {script.developmentStage}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{script.logline}</p>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditScript(script)}>
                            ✏️ Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={report.canGreenlight ? 'default' : 'secondary'}
                            className="flex-1"
                            onClick={() => (report.canGreenlight ? handleGreenlightScript(script) : handleFinalizeScript(script))}
                          >
                            {report.canGreenlight ? 'Greenlight' : 'Finalize'}
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full"
                          onClick={() => setCoverageScriptId(script.id)}
                        >
                          📝 Coverage & Notes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(coverageScriptId)}
        onOpenChange={(open) => {
          if (!open) setCoverageScriptId(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Coverage & Notes{coverageScript ? `: ${coverageScript.title}` : ''}</DialogTitle>
          </DialogHeader>
          {coverageScript ? (
            <ScriptCoveragePanel
              coverage={ensureScriptCoverageData(coverageScript.coverage)}
              onCoverageChange={(next) => onScriptUpdate({ ...coverageScript, coverage: next })}
              onRevisionAction={(nextCoverage, info) => {
                const effect = REVISION_EFFECTS[info.type];
                if (!trySpendBudget(effect.cost, effect.label)) return;

                const nextScript = applyRevisionToScript(
                  {
                    ...coverageScript,
                    coverage: nextCoverage,
                  },
                  info.type
                );

                onScriptUpdate(nextScript);

                toast({
                  title: effect.label,
                  description: effect.cost > 0 ? `Spent $${(effect.cost / 1000).toFixed(0)}k.` : undefined,
                });
              }}
              defaultStage={coverageScript.developmentStage}
            />
          ) : (
            <div className="text-sm text-muted-foreground">No script selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
