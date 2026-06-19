import type { GameState, Script, ScriptCharacter, Gender, FranchiseCharacterLibraryEntry } from '@/types/game';
import { FranchiseCharacterDef, getEffectiveFranchiseCharacterDB } from '@/data/FranchiseCharacterDB';
import { RoleDatabase } from '@/data/RoleDatabase';
import { getEffectiveParodyCharacterNameMap } from '@/data/ParodyCharacterNames';
import { stablePick } from '@/utils/stablePick';
import { getRoleRequiredType } from '@/utils/scriptRoles';
import { namedCharacterForRole } from '@/utils/franchiseContinuity';

function toScriptCharacter(def: FranchiseCharacterDef, franchiseId?: string, parodySource?: string): ScriptCharacter {
  // Prefer recognizable names from parody source mapping when available
  let resolvedName = def.name;
  if (parodySource) {
    const map = getEffectiveParodyCharacterNameMap()[parodySource];
    if (map) {
      resolvedName = map.byCharacterId?.[def.character_id] || map.byTemplateId?.[def.role_template_id] || def.name;
    }
  }
  return {
    id: def.character_id,
    name: resolvedName,
    description: def.description,
    importance: def.importance,
    traits: def.traits,
    requiredType: def.requiredType,
    ageRange: def.ageRange,
    franchiseId,
    franchiseCharacterId: def.character_id,
    roleTemplateId: def.role_template_id,
    locked: true,
  };
}

function toScriptCharacterFromLibrary(entry: FranchiseCharacterLibraryEntry, franchiseId: string): ScriptCharacter {
  return {
    id: entry.characterId,
    name: entry.name,
    description: entry.description,
    importance: entry.narrativeImportance === 'lead' ? 'lead' : entry.narrativeImportance === 'supporting' || entry.narrativeImportance === 'recurring' ? 'supporting' : 'minor',
    traits: entry.traits,
    relationships: entry.relationships,
    requiredType: 'actor',
    ageRange: entry.ageRange,
    requiredGender: entry.gender,
    franchiseId,
    franchiseCharacterId: entry.characterId,
    locked: entry.narrativeImportance !== 'minor' && entry.narrativeImportance !== 'cameo',
  };
}

function applyLibraryContinuity(incoming: ScriptCharacter, entry?: FranchiseCharacterLibraryEntry): ScriptCharacter {
  if (!entry) return incoming;

  return {
    ...incoming,
    name: entry.name || incoming.name,
    description: entry.description || incoming.description,
    traits: entry.traits || incoming.traits,
    relationships: entry.relationships || incoming.relationships,
    ageRange: entry.ageRange || incoming.ageRange,
    requiredGender: entry.gender || incoming.requiredGender,
    locked: entry.narrativeImportance !== 'minor' && entry.narrativeImportance !== 'cameo',
  };
}

function ensureDirector(chars: ScriptCharacter[]) {
  if (!chars.some(c => c.requiredType === 'director')) {
    chars.push({
      id: 'director',
      name: 'Director',
      importance: 'crew',
      requiredType: 'director',
      description: 'Film director',
      locked: true,
    });
  }
}

function mergeWithOverrides(existing: ScriptCharacter | undefined, incoming: ScriptCharacter): ScriptCharacter {
  if (!existing) return incoming;

  const overrides = existing.localOverrides || {};
  const preferExisting = !existing.locked;
  const locked = incoming.locked ?? existing.locked;

  return {
    ...incoming,
    id: existing.id || incoming.id,
    name: overrides.name || (preferExisting ? existing.name : undefined) || incoming.name,
    description: overrides.description || (preferExisting ? existing.description : undefined) || incoming.description,
    traits: overrides.traits || (preferExisting ? existing.traits : undefined) || incoming.traits,
    ageRange: overrides.ageRange || (preferExisting ? existing.ageRange : undefined) || incoming.ageRange,
    requiredGender: overrides.requiredGender || (preferExisting ? existing.requiredGender : undefined) || incoming.requiredGender,
    requiredRace: overrides.requiredRace || (preferExisting ? existing.requiredRace : undefined) || incoming.requiredRace,
    requiredNationality: overrides.requiredNationality || (preferExisting ? existing.requiredNationality : undefined) || incoming.requiredNationality,
    assignedTalentId: existing.assignedTalentId,
    locked,
    franchiseId: incoming.franchiseId,
    franchiseCharacterId: incoming.franchiseCharacterId,
    roleTemplateId: incoming.roleTemplateId,
    localOverrides: overrides,
  };
}

export function importRolesForScript(script: Script, gameState: GameState): ScriptCharacter[] {
  const existing = script.characters || [];
  const characters: ScriptCharacter[] = [];

  if (script.sourceType === 'franchise' && script.franchiseId) {
    const franchise = gameState.franchises.find(f => f.id === script.franchiseId);
    const characterDb = getEffectiveFranchiseCharacterDB();
    const dbKey = script.franchiseId;
    let defs = characterDb[dbKey];
    if (!defs && franchise?.parodySource) {
      defs = characterDb[franchise.parodySource];
    }

    const activeLibrary = franchise?.characterLibrary?.filter((c) => c.status === 'active') || [];
    const libraryById = new Map(activeLibrary.map((entry) => [entry.characterId, entry]));
    const importedCharacterIds = new Set<string>();

    if (defs && defs.length > 0) {
      for (const def of defs) {
        const libraryEntry = libraryById.get(def.character_id);
        if (franchise?.characterLibrary?.some((entry) => entry.characterId === def.character_id && entry.status !== 'active')) continue;

        const incoming = applyLibraryContinuity(toScriptCharacter(def, script.franchiseId, franchise?.parodySource), libraryEntry);
        importedCharacterIds.add(def.character_id);
        const match = existing.find(c => c.franchiseCharacterId === def.character_id || (c.name === incoming.name && c.requiredType === def.requiredType));
        if (!match) {
          characters.push(incoming);
        } else {
          characters.push(mergeWithOverrides(match, incoming));
        }
      }

      for (const entry of activeLibrary) {
        if (importedCharacterIds.has(entry.characterId)) continue;
        const incoming = toScriptCharacterFromLibrary(entry, script.franchiseId);
        const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
        if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
      }
    } else {
      const library = activeLibrary;
      if (library.length > 0) {
        library.forEach((entry) => {
          const incoming = toScriptCharacterFromLibrary(entry, script.franchiseId);
          const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
          if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
        });
      }
      // Fallback to curated role database
      const fallback = library.length > 0 ? [] : RoleDatabase.getRolesForSource('franchise', script.franchiseId, gameState);
      fallback.forEach(role => {
        const incoming: ScriptCharacter = namedCharacterForRole({
          ...role,
          franchiseId: script.franchiseId,
          franchiseCharacterId: role.id,
          locked: role.requiredType === 'director' ? true : (role.importance !== 'minor'),
        }, `${script.franchiseId}|${script.id}`);
        const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
        if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
      });
    }

    ensureDirector(characters);
  }

  if (script.sourceType === 'public-domain' && script.publicDomainId) {
    const pdRoles = RoleDatabase.getRolesForSource('public-domain', script.publicDomainId, gameState);
    pdRoles.forEach(role => {
      const incoming: ScriptCharacter = {
        ...role,
        franchiseId: undefined,
        franchiseCharacterId: role.id,
        locked: role.requiredType === 'director',
      };
      const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
      if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
    });
    ensureDirector(characters);
  }

  // Idempotency: remove duplicates by franchiseCharacterId/name+type
  // Prefer freshly-imported (and merged) definitions over previously-locked copies in `existing`.
  const keyed = new Map<string, ScriptCharacter>();

  for (const c of characters) {
    const key = c.franchiseCharacterId || `${c.name}:${c.requiredType || 'actor'}`;
    if (!keyed.has(key)) keyed.set(key, c);
  }

  for (const c of existing.filter(c => c.locked)) {
    const key = c.franchiseCharacterId || `${c.name}:${c.requiredType || 'actor'}`;
    if (!keyed.has(key)) keyed.set(key, c);
  }

  // Merge with existing manual roles (unlocked custom roles only).
  // Imported roles may be unlocked (e.g. public-domain suggestions), but they still
  // carry franchiseCharacterId / roleTemplateId and must not be duplicated.
  const manual = existing.filter(c => !c.locked && !c.franchiseCharacterId && !c.roleTemplateId);
  const finalList = [...Array.from(keyed.values()), ...manual];

  // Guarantee at least one minor cameo for depth
  if (!finalList.some(r => r.importance === 'minor')) {
    finalList.push({ id: `cameo-${script.id}`, name: 'Cameo Appearance', importance: 'minor', description: 'Short cameo role', requiredType: 'actor', ageRange: [25,80] });
  }

  // Actor roles must always have a gender requirement.
  // (Imported roles often lack it, and casting filters now require it.)
  return finalList.map((role) => {
    role = namedCharacterForRole(role, `${script.franchiseId || script.publicDomainId || script.id}|import`);
    const requiredType = getRoleRequiredType(role);

    if (requiredType === 'director') {
      return {
        ...role,
        requiredType: 'director',
        requiredGender: undefined,
        requiredRace: undefined,
        requiredNationality: undefined,
      };
    }

    if (!role.requiredGender) {
      const seed = `${role.franchiseCharacterId || role.roleTemplateId || role.id || role.name}|gender`;
      return {
        ...role,
        requiredType: 'actor',
        requiredGender: stablePick<Gender>(['Male', 'Female'], seed),
      };
    }

    return {
      ...role,
      requiredType: 'actor',
    };
  });
}
