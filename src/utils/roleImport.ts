import { GameState, Script, ScriptCharacter } from '@/types/game';
import { FRANCHISE_CHARACTER_DB, FranchiseCharacterDef } from '@/data/FranchiseCharacterDB';
import { RoleDatabase } from '@/data/RoleDatabase';
import { PARODY_CHARACTER_NAME_MAP } from '@/data/ParodyCharacterNames';

function toScriptCharacter(def: FranchiseCharacterDef, franchiseId?: string, parodySource?: string): ScriptCharacter {
  // Prefer recognizable names from parody source mapping when available
  let resolvedName = def.name;
  if (parodySource) {
    const map = PARODY_CHARACTER_NAME_MAP[parodySource];
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
  return {
    ...incoming,
    id: existing.id || incoming.id,
    name: overrides.name || incoming.name,
    description: overrides.description || incoming.description,
    traits: overrides.traits || incoming.traits,
    ageRange: overrides.ageRange || incoming.ageRange,
    screenTimeMinutes: existing.screenTimeMinutes ?? incoming.screenTimeMinutes,
    assignedTalentId: existing.assignedTalentId,
    excluded: existing.excluded,
    locked: typeof incoming.locked === 'boolean' ? incoming.locked : existing.locked,
    franchiseId: incoming.franchiseId,
    franchiseCharacterId: incoming.franchiseCharacterId,
    roleTemplateId: incoming.roleTemplateId,
    localOverrides: overrides,
  };
}

function asLockedImportedRole(role: ScriptCharacter): ScriptCharacter {
  return {
    ...role,
    locked: true,
  };
}

function addDefaultCameo(chars: ScriptCharacter[]) {
  // Guarantee at least one minor cameo for depth
  // If the player explicitly excluded a cameo/minor role, don't re-add another one on every import.
  if (!chars.some(r => r.importance === 'minor')) {
    chars.push({
      id: `cameo-${Date.now()}`,
      name: 'Cameo Appearance',
      importance: 'minor',
      description: 'Short cameo role',
      requiredType: 'actor',
      ageRange: [25, 80],
    });
  }
}

export function importRolesForScript(script: Script, gameState: GameState): ScriptCharacter[] {
  const existing = script.characters || [];
  const characters: ScriptCharacter[] = [];

  // Back-compat: some saves/scripts may use sourceType "adaptation".
  // Treat it as an IP-backed script when either franchiseId or publicDomainId is present.
  if ((script.sourceType === 'franchise' || script.sourceType === 'adaptation') && script.franchiseId) {
    const franchise = gameState.franchises.find(f => f.id === script.franchiseId);
    const dbKey = script.franchiseId;
    let defs = FRANCHISE_CHARACTER_DB[dbKey];
    if (!defs && franchise?.parodySource) {
      defs = FRANCHISE_CHARACTER_DB[franchise.parodySource];
    }

    if (defs && defs.length > 0) {
      for (const def of defs) {
        const incoming = toScriptCharacter(def, script.franchiseId, franchise?.parodySource);
        const match = existing.find(c => c.franchiseCharacterId === def.character_id || (c.name === incoming.name && c.requiredType === def.requiredType));
        if (!match) {
          characters.push(incoming);
        } else {
          characters.push(mergeWithOverrides(match, incoming));
        }
      }
    } else {
      // Fallback to curated role database
      const fallback = RoleDatabase.getRolesForSource('franchise', script.franchiseId, gameState);
      fallback.forEach(role => {
        const incoming: ScriptCharacter = asLockedImportedRole({
          ...role,
          franchiseId: script.franchiseId,
          franchiseCharacterId: role.id,
        });
        const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
        if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
      });
    }
  }

  if ((script.sourceType === 'public-domain' || script.sourceType === 'adaptation') && script.publicDomainId) {
    const pdRoles = RoleDatabase.getRolesForSource('public-domain', script.publicDomainId, gameState);
    pdRoles.forEach(role => {
      const incoming: ScriptCharacter = asLockedImportedRole({
        ...role,
        franchiseId: undefined,
        franchiseCharacterId: role.id,
      });
      const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
      if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
    });
  }

  // Idempotency: remove duplicates by franchiseCharacterId/name+type
  // Prefer the freshly imported/merged roles, then fill gaps with any imported roles already stored on the script.
  const keyed = new Map<string, ScriptCharacter>();

  const existingImported = existing
    .filter(c => c.locked || c.franchiseCharacterId)
    .map(c => (c.franchiseCharacterId ? asLockedImportedRole(c) : c));

  for (const c of [...characters, ...existingImported]) {
    const key = c.franchiseCharacterId || `${c.name}:${c.requiredType || 'actor'}`;
    if (!keyed.has(key)) keyed.set(key, c);
  }

  // Merge with existing manual roles (unlocked and not linked to an IP role)
  const manual = existing.filter(c => !c.locked && !c.franchiseCharacterId);
  const finalList = [...Array.from(keyed.values()), ...manual];

  ensureDirector(finalList);
  addDefaultCameo(finalList);

  return finalList;
}
