import type { GameState, Script, ScriptCharacter, TalentPerson } from '@/types/game';

function normalizeCharactersForScript(params: {
  gameState: GameState;
  scriptId: string;
  characters: ScriptCharacter[] | undefined;
}): ScriptCharacter[] | undefined {
  const { gameState, scriptId, characters } = params;
  if (!characters) return characters;

  const talentById = new Map((gameState.talent || []).map((t) => [t.id, t] as const));

  const looksLikeDirectorRole = (c: ScriptCharacter): boolean => {
    if (c.requiredType === 'director') return true;
    if (c.importance === 'crew') return true;

    if (c.assignedTalentId) {
      const t = talentById.get(c.assignedTalentId) as TalentPerson | undefined;
      if (t?.type === 'director') return true;
    }

    const name = (c.name || '').trim().toLowerCase();
    if (name === 'director') return true;
    if (name.startsWith('director ')) return true;
    if (name.endsWith(' director')) return true;

    // For legacy scripts: "Directing" / "Director (Crew)" style labels.
    if (name.includes('director') && name.length <= 32) return true;

    return false;
  };

  return characters.map((c) => {
    if (!looksLikeDirectorRole(c)) return c;

    return {
      ...c,
      importance: 'crew',
      requiredType: 'director',
    };
  });
}

function normalizeDirectorRolesForScript(gameState: GameState, script: Script): Script {
  return {
    ...script,
    characters: normalizeCharactersForScript({
      gameState,
      scriptId: script.id,
      characters: script.characters,
    }),
  };
}

export function normalizeDirectorRolesInGameState(gameState: GameState): GameState {
  const normalizeProjectScript = <T extends { script?: Script }>(p: T): T => {
    if (!p.script) return p;
    return {
      ...p,
      script: normalizeDirectorRolesForScript(gameState, p.script),
    };
  };

  const normalizeAllReleases = (gameState.allReleases || []).map((r) => {
    if (!r || typeof r !== 'object') return r;
    if (!('script' in r)) return r;
    return normalizeProjectScript(r as any);
  });

  return {
    ...gameState,
    scripts: (gameState.scripts || []).map((s) => normalizeDirectorRolesForScript(gameState, s)),
    projects: (gameState.projects || []).map((p) => normalizeProjectScript(p)),
    allReleases: normalizeAllReleases as any,
  };
}
