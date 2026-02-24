import { GameState, Script, ScriptCharacter } from '@/types/game';
import { FRANCHISE_CHARACTER_DB, FranchiseCharacterDef } from '@/data/FranchiseCharacterDB';
import { RoleDatabase } from '@/data/RoleDatabase';
import { PARODY_CHARACTER_NAME_MAP } from '@/data/ParodyCharacterNames';
import { ensureFranchiseCharacterStates, makeFallbackFranchiseCharacterId } from '@/utils/franchiseCharacters';

function toScriptCharacter(
  def: FranchiseCharacterDef,
  franchiseId?: string,
  parodySource?: string,
  signatureTalentId?: string
): ScriptCharacter {
  // Prefer recognizable names from parody source mapping when available
  let resolvedName = def.name;
  if (parodySource) {
    const map = PARODY_CHARACTER_NAME_MAP[parodySource];
    if (map) {
      // Prefer stable per-character mappings to avoid accidentally renaming/duplicating roles
      // when templates evolve over time.
      resolvedName = map.byCharacterId?.[def.character_id] || def.name;
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
    assignedTalentId: signatureTalentId,
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
    assignedTalentId: existing.assignedTalentId,
    locked: incoming.locked ?? existing.locked,
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

    // Signature casting + persistent roster state.
    const franchiseStates = franchise ? ensureFranchiseCharacterStates(franchise, gameState) : [];
    const signatureById = new Map(
      franchiseStates
        .filter(s => !!s.signatureTalentId)
        .map(s => [s.franchiseCharacterId, s.signatureTalentId!] as const)
    );

    const dbKey = script.franchiseId;
    let defs = FRANCHISE_CHARACTER_DB[dbKey];
    if (!defs && franchise?.parodySource) {
      defs = FRANCHISE_CHARACTER_DB[franchise.parodySource];
    }

    if (defs && defs.length > 0) {
      for (const def of defs) {
        const signature = signatureById.get(def.character_id);
        const signatureAvailable = signature && gameState.talent.some(t => t.id === signature && t.contractStatus === 'available')
          ? signature
          : undefined;
        const incoming = toScriptCharacter(def, script.franchiseId, franchise?.parodySource, signatureAvailable);
        const match = existing.find(c => c.franchiseCharacterId === def.character_id || (c.name === incoming.name && c.requiredType === def.requiredType));
        if (!match) {
          characters.push(incoming);
        } else {
          characters.push(mergeWithOverrides(match, incoming));
        }
      }
    } else if (franchise) {
      // Fallback to curated role database
      const fallback = RoleDatabase.getRolesForSource('franchise', script.franchiseId, gameState);
      fallback.forEach(role => {
        // Back-compat: older saves may have used raw role.id as franchiseCharacterId.
        const legacyId = role.id;
        const prefixedId = makeFallbackFranchiseCharacterId(franchise, role.id);
        const franchiseCharacterId = existing.some(c => c.franchiseCharacterId === legacyId) ? legacyId : prefixedId;

        const signature = signatureById.get(franchiseCharacterId);
        const signatureAvailable = signature && gameState.talent.some(t => t.id === signature && t.contractStatus === 'available')
          ? signature
          : undefined;
        const incoming: ScriptCharacter = {
          ...role,
          franchiseId: script.franchiseId,
          franchiseCharacterId,
          assignedTalentId: signatureAvailable,
          locked: role.requiredType === 'director' ? true : (role.importance !== 'minor'),
        };
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
        locked: role.requiredType === 'director' ? true : (role.importance !== 'minor'),
      };
      const match = existing.find(c => c.franchiseCharacterId === incoming.franchiseCharacterId || (c.name === incoming.name && c.requiredType === incoming.requiredType));
      if (!match) characters.push(incoming); else characters.push(mergeWithOverrides(match, incoming));
    });
    ensureDirector(characters);
  }

  const keyFor = (c: ScriptCharacter) => c.franchiseCharacterId || c.roleTemplateId || `${c.name}:${c.requiredType || 'actor'}`;

  // Idempotency: remove duplicates while preferring freshly imported/merged roles.
  const keyed = new Map<string, ScriptCharacter>();
  for (const c of [...characters, ...existing]) {
    const key = keyFor(c);
    if (!keyed.has(key)) keyed.set(key, c);
  }

  const finalList = Array.from(keyed.values());

  // Guarantee at least one minor cameo for depth
  if (!finalList.some(r => r.importance === 'minor')) {
    finalList.push({ id: `cameo-${Date.now()}`, name: 'Cameo Appearance', importance: 'minor', description: 'Short cameo role', requiredType: 'actor', ageRange: [25,80] });
  }

  return finalList;
}
