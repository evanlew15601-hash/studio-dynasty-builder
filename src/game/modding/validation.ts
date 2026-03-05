/**
 * Mod validation — Zod-based schema validation for mod manifests and patches.
 *
 * Validates mod bundles before they're applied to game state.
 * Invalid mods are disabled with error messages instead of corrupting state.
 */

import type { ModBundle, ModInfo, ModPatch } from '@/types/modding';
import { normalizeModBundle } from '@/utils/modding';

export interface ModValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** The sanitized/normalized bundle (safe to use even if some mods had issues) */
  bundle: ModBundle;
}

/**
 * Validate a mod manifest entry.
 */
function validateModInfo(mod: unknown, index: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!mod || typeof mod !== 'object') {
    errors.push(`Mod at index ${index}: not a valid object`);
    return { valid: false, errors };
  }

  const m = mod as Partial<ModInfo>;

  if (!m.id || typeof m.id !== 'string') {
    errors.push(`Mod at index ${index}: missing or invalid "id"`);
  }
  if (!m.name || typeof m.name !== 'string') {
    errors.push(`Mod at index ${index}: missing or invalid "name"`);
  }
  if (!m.version || typeof m.version !== 'string') {
    errors.push(`Mod at index ${index}: missing or invalid "version"`);
  }
  if (typeof m.enabled !== 'boolean') {
    errors.push(`Mod at index ${index}: "enabled" must be boolean`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a mod patch entry.
 */
function validatePatch(patch: unknown, index: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!patch || typeof patch !== 'object') {
    errors.push(`Patch at index ${index}: not a valid object`);
    return { valid: false, errors };
  }

  const p = patch as Partial<ModPatch>;

  if (!p.id || typeof p.id !== 'string') {
    errors.push(`Patch at index ${index}: missing "id"`);
  }
  if (!p.modId || typeof p.modId !== 'string') {
    errors.push(`Patch at index ${index}: missing "modId"`);
  }
  if (!p.entityType || typeof p.entityType !== 'string') {
    errors.push(`Patch at index ${index}: missing "entityType"`);
  }
  if (!p.op || !['insert', 'update', 'delete'].includes(p.op)) {
    errors.push(`Patch at index ${index}: invalid "op" (must be insert|update|delete)`);
  }
  if ((p.op === 'update' || p.op === 'delete') && !p.target) {
    errors.push(`Patch at index ${index}: "${p.op}" requires a "target"`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a complete mod bundle.
 * Returns a sanitized bundle with invalid entries removed.
 */
export function validateModBundle(raw: unknown): ModValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // First normalize to catch structural issues
  const bundle = normalizeModBundle(raw);

  // Validate individual mods
  const validModIds = new Set<string>();
  for (let i = 0; i < bundle.mods.length; i++) {
    const result = validateModInfo(bundle.mods[i], i);
    if (result.valid) {
      validModIds.add(bundle.mods[i].id);
    } else {
      errors.push(...result.errors);
    }
  }

  // Filter out patches referencing invalid mods
  const validPatches: ModPatch[] = [];
  for (let i = 0; i < bundle.patches.length; i++) {
    const result = validatePatch(bundle.patches[i], i);
    if (!result.valid) {
      errors.push(...result.errors);
      continue;
    }
    if (!validModIds.has(bundle.patches[i].modId)) {
      warnings.push(`Patch "${bundle.patches[i].id}" references unknown mod "${bundle.patches[i].modId}" — skipped`);
      continue;
    }
    validPatches.push(bundle.patches[i]);
  }

  // Check for duplicate mod ids
  const seenIds = new Set<string>();
  for (const mod of bundle.mods) {
    if (seenIds.has(mod.id)) {
      warnings.push(`Duplicate mod id "${mod.id}" — later entry wins`);
    }
    seenIds.add(mod.id);
  }

  const sanitized: ModBundle = {
    ...bundle,
    mods: bundle.mods.filter((m) => validModIds.has(m.id)),
    patches: validPatches,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bundle: sanitized,
  };
}

/**
 * Apply validated mods to game state.
 * Centralizes all mod application in one place.
 */
export { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
