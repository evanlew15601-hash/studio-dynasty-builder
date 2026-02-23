import type {
  Script,
  ScriptCoverage,
  ScriptCoverageChecklistItem,
  ScriptCoverageRevisionType,
  ScriptRevisionAction,
  ScriptStageCoverage,
} from '@/types/game';

const STAGE_ORDER: Script['developmentStage'][] = [
  'concept',
  'treatment',
  'first-draft',
  'polish',
  'final',
];

const DEFAULT_CHECKLIST: Record<Script['developmentStage'], string[]> = {
  concept: ['Title + logline locked', 'Genre selected', 'Tone + target audience decided', 'Rough budget set'],
  treatment: ['Beat outline complete', 'Protagonist/stakes clarified', 'Ending resolved', 'Key set pieces listed'],
  'first-draft': ['Full draft complete', 'Scene headings consistent', 'Dialogue pass complete', 'Character arcs readable'],
  polish: ['Pacing tightened', 'Continuity checked', 'Budget realism pass', 'Dialogue sharpened'],
  final: ['Proofread + formatting pass', 'Notes addressed', 'Production-ready lock', 'Greenlight packet prepared'],
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function defaultChecklistForStage(stage: Script['developmentStage']): ScriptCoverageChecklistItem[] {
  return DEFAULT_CHECKLIST[stage].map((label, idx) => ({
    id: `${stage}-${slugify(label)}-${idx + 1}`,
    label,
    completed: false,
  }));
}

export function createDefaultScriptCoverage(now: number = Date.now()): ScriptCoverage {
  const stages = {} as Record<Script['developmentStage'], ScriptStageCoverage>;

  for (const stage of STAGE_ORDER) {
    stages[stage] = {
      notes: '',
      checklist: defaultChecklistForStage(stage),
      lastUpdatedAt: now,
    };
  }

  return {
    version: 1,
    stages,
    revisionActions: [],
  };
}

export function ensureScriptCoverageData(input?: ScriptCoverage | null): ScriptCoverage {
  const existing = input || undefined;
  const defaults = createDefaultScriptCoverage(existing?.stages?.concept?.lastUpdatedAt || Date.now());

  if (!existing) return defaults;

  const stages = {} as Record<Script['developmentStage'], ScriptStageCoverage>;

  for (const stage of STAGE_ORDER) {
    const defaultStage = defaults.stages[stage];
    const existingStage = existing.stages?.[stage];

    const existingChecklistById = new Map(
      (existingStage?.checklist || []).map((item) => [item.id, item] as const)
    );

    stages[stage] = {
      notes: existingStage?.notes ?? '',
      checklist: defaultStage.checklist.map((item) => ({
        ...item,
        completed: existingChecklistById.get(item.id)?.completed ?? false,
      })),
      lastUpdatedAt:
        existingStage?.lastUpdatedAt ?? (existingStage ? Date.now() : defaultStage.lastUpdatedAt),
    };
  }

  return {
    version: existing.version || 1,
    stages,
    revisionActions: existing.revisionActions ? [...existing.revisionActions] : [],
  };
}

export function ensureScriptCoverage(script: Script): Script {
  const coverage = ensureScriptCoverageData(script.coverage);
  if (script.coverage) return { ...script, coverage };
  return { ...script, coverage };
}

export function getStageChecklistProgress(
  input: ScriptCoverage | undefined | null,
  stage: Script['developmentStage']
): { completed: number; total: number; percent: number } {
  const coverage = ensureScriptCoverageData(input);
  const checklist = coverage.stages[stage]?.checklist || [];
  const total = checklist.length;
  const completed = checklist.filter((i) => i.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export function toggleChecklistItem(
  input: ScriptCoverage,
  stage: Script['developmentStage'],
  itemId: string,
  now: number = Date.now()
): ScriptCoverage {
  const coverage = ensureScriptCoverageData(input);
  const stageCoverage = coverage.stages[stage];

  return {
    ...coverage,
    stages: {
      ...coverage.stages,
      [stage]: {
        ...stageCoverage,
        lastUpdatedAt: now,
        checklist: stageCoverage.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      },
    },
  };
}

export function updateStageNotes(
  input: ScriptCoverage,
  stage: Script['developmentStage'],
  notes: string,
  now: number = Date.now()
): ScriptCoverage {
  const coverage = ensureScriptCoverageData(input);

  return {
    ...coverage,
    stages: {
      ...coverage.stages,
      [stage]: {
        ...coverage.stages[stage],
        notes,
        lastUpdatedAt: now,
      },
    },
  };
}

export function addRevisionAction(
  input: ScriptCoverage,
  stage: Script['developmentStage'],
  type: ScriptCoverageRevisionType,
  note?: string,
  now: number = Date.now()
): ScriptCoverage {
  const coverage = ensureScriptCoverageData(input);

  const action: ScriptRevisionAction = {
    id: `rev-${now}-${stage}-${type}-${coverage.revisionActions.length + 1}`,
    stage,
    type,
    note: note?.trim() ? note.trim() : undefined,
    createdAt: now,
  };

  return {
    ...coverage,
    revisionActions: [...coverage.revisionActions, action],
  };
}

export function formatRevisionActionLabel(type: ScriptCoverageRevisionType): string {
  switch (type) {
    case 'coverage_requested':
      return 'Coverage requested';
    case 'coverage_received':
      return 'Coverage received';
    case 'minor_revision':
      return 'Minor revision';
    case 'major_revision':
      return 'Major revision';
    case 'polish_pass':
      return 'Polish pass';
    case 'table_read':
      return 'Table read';
    case 'notes_applied':
      return 'Notes applied';
    default:
      return type;
  }
}
