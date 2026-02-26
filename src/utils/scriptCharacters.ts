import type { Script, ScriptCharacter } from '@/types/game';

export function hasExplicitScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  return Array.isArray(script?.characters);
}

export function hasNonEmptyScriptCharacters(script?: Script): script is Script & { characters: ScriptCharacter[] } {
  return Array.isArray(script?.characters) && script.characters.length > 0;
}

export function shouldUseLegacyCastFallback(script?: Script): boolean {
  // Canonical rule:
  // - If script.characters exists and is non-empty: script is the source of truth
  // - Only fallback to legacy cast arrays when script.characters is missing/empty
  return !hasNonEmptyScriptCharacters(script);
}
