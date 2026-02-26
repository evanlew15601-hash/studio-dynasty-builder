import type { Script, ScriptCharacter } from '@/types/game';

export function hasExplicitScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  return Array.isArray(script?.characters);
}

export function hasNonEmptyScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  // Treat excluded roles as non-participating: a script with only excluded characters is effectively empty.
  return Array.isArray(script?.characters) && script.characters.some(c => !c.excluded);
}

export function shouldUseLegacyCastFallback(script?: Script): boolean {
  // Canonical rule:
  // - If script.characters exists and has at least one active (non-excluded) role: script is the source of truth
  // - Only fallback to legacy cast arrays when script.characters is missing/empty-or-all-excluded
  return !hasNonEmptyScriptCharacters(script);
}
