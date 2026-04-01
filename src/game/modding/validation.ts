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
 *
 * Intentionally forgiving: missing name/version/enabled become warnings and are filled by normalization.
 */
function validateModInfo(mod: unknown, index: number): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mod || typeof mod !== 'object') {
    errors.push(`Mod at index ${index}: not a valid object`);
    return { valid: false, errors, warnings };
  }

  const m = mod as Partial<ModInfo>;

  if (!m.id || typeof m.id !== 'string') {
    errors.push(`Mod at index ${index}: missing or invalid "id"`);
  }
  if (!m.name || typeof m.name !== 'string') {
    warnings.push(`Mod "${m.id ?? `#${index}`}" is missing "name" — defaulted`);
  }
  if (!m.version || typeof m.version !== 'string') {
    warnings.push(`Mod "${m.id ?? `#${index}`}" is missing "version" — defaulted`);
  }
  if (typeof m.enabled !== 'boolean') {
    warnings.push(`Mod "${m.id ?? `#${index}`}" is missing "enabled" — defaulted to true`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a mod patch entry.
 *
 * Also forgiving: missing "id" is a warning (normalization will generate one).
 */
function validatePatch(patch: unknown, index: number): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!patch || typeof patch !== 'object') {
    errors.push(`Patch at index ${index}: not a valid object`);
    return { valid: false, errors, warnings };
  }

  const p = patch as Partial<ModPatch>;

  if (!p.id || typeof p.id !== 'string') {
    warnings.push(`Patch at index ${index}: missing "id" — will be generated`);
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

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a complete mod bundle.
 * Returns a sanitized bundle with invalid entries removed.
 */
export function validateModBundle(raw: unknown): ModValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Normalize first to guarantee a safe bundle shape for consumers.
  const bundle = normalizeModBundle(raw);

  // Validate raw entries (so we can report useful errors even if normalization drops them).
  const rawCandidate = raw && typeof raw === 'object' ? (raw as any) : {};
  const rawMods: unknown[] = Array.isArray(rawCandidate.mods) ? rawCandidate.mods.filter(Boolean) : [];
  const rawPatches: unknown[] = Array.isArray(rawCandidate.patches) ? rawCandidate.patches.filter(Boolean) : [];

  for (let i = 0; i < rawMods.length; i++) {
    const result = validateModInfo(rawMods[i], i);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  for (let i = 0; i < rawPatches.length; i++) {
    const result = validatePatch(rawPatches[i], i);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  // Build a valid mod id set based on the normalized mods list.
  const validModIds = new Set<string>();
  for (let i = 0; i < bundle.mods.length; i++) {
    const result = validateModInfo(bundle.mods[i], i);
    if (result.valid) {
      validModIds.add(bundle.mods[i].id);
    } else {
      errors.push(...result.errors);
    }
  }

  // Filter out patches referencing unknown mods.
  const validPatches: ModPatch[] = [];
  for (let i = 0; i < bundle.patches.length; i++) {
    const result = validatePatch(bundle.patches[i], i);
    if (!result.valid) {
      // Errors/warnings for this entry were already emitted from the raw validation pass.
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
