import type { Script, ScriptCharacter } from '@/types/game';

export function hasExplicitScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  return Array.isArray(script?.characters);
}

export function hasNonEmptyScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  return Array.isArray(script?.characters) && script.characters.length > 0;
}

export function hasActiveScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  return Array.isArray(script?.characters) && script.characters.some(c => !c.excluded);
}

export function shouldUseLegacyCastFallback(script?: Script): boolean {
  // Canonical rule:
  // - If script.characters is present and non-empty: treat it as the source of truth (even if all roles are excluded)
  // - Only fallback to legacy cast arrays when script.characters is missing or empty
  return !hasNonEmptyScriptCharacters(script);
}
