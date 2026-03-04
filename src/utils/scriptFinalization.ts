import { GameState, Script, ScriptCharacter, Gender } from '@/types/game';
import { importRolesForScript } from '@/utils/roleImport';
import { stablePick } from '@/utils/stablePick';

export type ScriptFinalizationIssueLevel = 'error' | 'warning';

export interface ScriptFinalizationIssue {
  level: ScriptFinalizationIssueLevel;
  message: string;
}

export interface ScriptFinalizationReport {
  canFinalize: boolean;
  canGreenlight: boolean;
  issues: ScriptFinalizationIssue[];
  fixesApplied: string[];
}

function nextId(existing: ScriptCharacter[], base: string): string {
  if (!existing.some(c => c.id === base)) return base;
  let i = 2;
  while (existing.some(c => c.id === `${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function ensureRequiredType(chars: ScriptCharacter[]): ScriptCharacter[] {
  return chars.map(c => {
    if (c.requiredType) return c;
    if (c.importance === 'crew') return { ...c, requiredType: 'director' };
    return { ...c, requiredType: 'actor' };
  });
}

function ensureDirector(chars: ScriptCharacter[], fixesApplied: string[]): ScriptCharacter[] {
  if (chars.some(c => c.requiredType === 'director')) return chars;
  fixesApplied.push('Added a Director role');
  return [
    ...chars,
    {
      id: nextId(chars, 'director'),
      name: 'Director',
      importance: 'crew',
      requiredType: 'director',
      description: 'Film director',
      locked: true,
    },
  ];
}

function ensureRoleGenders(chars: ScriptCharacter[], fixesApplied?: string[]): ScriptCharacter[] {
  let changed = false;

  const updated = chars.map(c => {
    const requiredType = c.requiredType || (c.importance === 'crew' ? 'director' : 'actor');
    if (requiredType !== 'director' && !c.requiredGender) {
      changed = true;
      return {
        ...c,
        requiredType: 'actor',
        requiredGender: stablePick<Gender>(['Male', 'Female'], `${c.id || c.name}|gender`),
      };
    }

    return {
      ...c,
      requiredType,
    };
  });

  if (changed && fixesApplied) fixesApplied.push('Assigned genders to actor roles');
  return updated;
}

function ensureLeadActor(chars: ScriptCharacter[], fixesApplied: string[]): ScriptCharacter[] {
  const hasLead = chars.some(c => c.requiredType !== 'director' && c.importance === 'lead');
  if (hasLead) return chars;
  fixesApplied.push('Added a Lead role');
  return [
    ...chars,
    {
      id: nextId(chars, 'lead'),
      name: 'Lead',
      importance: 'lead',
      requiredType: 'actor',
      requiredGender: stablePick<Gender>(['Male', 'Female'], `${nextId(chars, 'lead')}|gender`),
      description: 'Primary protagonist',
    },
  ];
}

function ensureMinor(chars: ScriptCharacter[], fixesApplied: string[]): ScriptCharacter[] {
  const hasMinor = chars.some(c => c.importance === 'minor');
  if (hasMinor) return chars;
  fixesApplied.push('Added a Minor/Cameo role');
  return [
    ...chars,
    {
      id: nextId(chars, 'cameo'),
      name: 'Cameo Appearance',
      importance: 'minor',
      requiredType: 'actor',
      requiredGender: stablePick<Gender>(['Male', 'Female'], `${nextId(chars, 'cameo')}|gender`),
      description: 'Short cameo role',
      ageRange: [25, 80],
    },
  ];
}

function validateScriptBasics(script: Script): ScriptFinalizationIssue[] {
  const issues: ScriptFinalizationIssue[] = [];

  if (!script.title || script.title.trim().length === 0) {
    issues.push({ level: 'error', message: 'Title is required.' });
  }

  if (!script.logline || script.logline.trim().length === 0) {
    issues.push({ level: 'error', message: 'Logline is required.' });
  }

  if (!Number.isFinite(script.pages) || script.pages < 20) {
    issues.push({ level: 'warning', message: 'Pages looks low; consider 80-130 pages for a feature.' });
  }

  if (!Number.isFinite(script.budget) || script.budget <= 0) {
    issues.push({ level: 'error', message: 'Budget must be > 0.' });
  }

  return issues;
}

function validateRoles(chars: ScriptCharacter[]): ScriptFinalizationIssue[] {
  const issues: ScriptFinalizationIssue[] = [];

  if (chars.length === 0) {
    issues.push({ level: 'error', message: 'At least one role is required.' });
    return issues;
  }

  if (!chars.some(c => c.requiredType === 'director')) {
    issues.push({ level: 'error', message: 'Missing Director role.' });
  }

  if (!chars.some(c => c.requiredType !== 'director' && c.importance === 'lead')) {
    issues.push({ level: 'error', message: 'Missing Lead role.' });
  }

  if (!chars.some(c => c.importance === 'minor')) {
    issues.push({ level: 'warning', message: 'No minor/cameo roles; adding at least one improves casting depth.' });
  }

  const missingGender = chars.filter(c => c.requiredType !== 'director' && !c.requiredGender);
  if (missingGender.length > 0) {
    issues.push({ level: 'error', message: 'All actor roles must have a required gender.' });
  }

  return issues;
}

export function finalizeScriptForSave(input: Script, gameState: GameState): Script {
  let characters = [...(input.characters || [])];

  if ((input.sourceType === 'franchise' && input.franchiseId) || (input.sourceType === 'public-domain' && input.publicDomainId)) {
    characters = importRolesForScript({ ...input, characters }, gameState);
  }

  characters = ensureRequiredType(characters);
  characters = ensureRoleGenders(characters);

  return {
    ...input,
    characters,
  };
}

export function finalizeScriptForGreenlight(input: Script, gameState: GameState): { script: Script; report: ScriptFinalizationReport } {
  const fixesApplied: string[] = [];

  // Start from existing roles.
  let characters = [...(input.characters || [])];

  // If this is a franchise or public domain script, import/merge curated roles.
  if ((input.sourceType === 'franchise' && input.franchiseId) || (input.sourceType === 'public-domain' && input.publicDomainId)) {
    const beforeCount = characters.length;
    characters = importRolesForScript({ ...input, characters }, gameState);
    if (characters.length !== beforeCount) {
      fixesApplied.push('Imported roles from source IP');
    }
  }

  characters = ensureRequiredType(characters);
  characters = ensureRoleGenders(characters, fixesApplied);
  characters = ensureDirector(characters, fixesApplied);
  characters = ensureLeadActor(characters, fixesApplied);
  characters = ensureMinor(characters, fixesApplied);

  const issues = [...validateScriptBasics(input), ...validateRoles(characters)];
  const hasBlocking = issues.some(i => i.level === 'error');

  const script: Script = {
    ...input,
    characters,
    // Only force final when it's actually valid
    developmentStage: hasBlocking ? input.developmentStage : 'final',
  };

  return {
    script,
    report: {
      canFinalize: !hasBlocking,
      canGreenlight: !hasBlocking && script.developmentStage === 'final',
      issues,
      fixesApplied,
    },
  };
}

export function getScriptGreenlightReport(script: Script, gameState: GameState): ScriptFinalizationReport {
  const { report } = finalizeScriptForGreenlight(script, gameState);
  // For the dashboard card we don't want to mutate stage; readiness also requires stage already being final.
  return {
    ...report,
    canGreenlight: report.canFinalize && script.developmentStage === 'final',
  };
}
