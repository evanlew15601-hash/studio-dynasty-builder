import type { Franchise, Project, Script, ScriptCharacter } from '@/types/game';

export type SequelMedium = 'film' | 'tv-series' | 'tv-limited';

export function createSequelScript(params: {
  id: string;
  title: string;
  description: string;
  budget: number;
  franchiseId: string;
  medium: SequelMedium;
  originalProject: Project;
  franchise?: Franchise;
  returningCast: Array<{ characterId: string; talentId: string; confirmed: boolean }>;
  getCharacterKey: (c: { id: string; franchiseCharacterId?: string; roleTemplateId?: string }) => string;
}): Script {
  const {
    id,
    title,
    description,
    budget,
    franchiseId,
    medium,
    originalProject,
    franchise,
    returningCast,
    getCharacterKey,
  } = params;

  const base = originalProject.script;

  const isTv = medium !== 'film';

  const pages = isTv ? 60 : 120;
  const estimatedRuntime = isTv ? 45 : (base?.estimatedRuntime || 120) + 10;

  const pacing = isTv ? 'episodic' : 'fast-paced';

  const libraryCharacters = (franchise?.characterLibrary || [])
    .filter((character) => character.status === 'active')
    .filter((character) => character.narrativeImportance !== 'cameo' && character.narrativeImportance !== 'minor');

  const castContinuityFromLibrary = (franchise?.talentLibrary || [])
    .filter((talent) => talent.characterId && talent.continuityPreference === 'return')
    .map((talent) => ({ characterId: talent.characterId!, talentId: talent.talentId, confirmed: talent.status !== 'retired' }));

  const confirmedReturning = returningCast.length > 0
    ? returningCast
    : [
        ...(base?.characters || [])
          .filter((char) => char.assignedTalentId && (char.importance === 'lead' || char.importance === 'supporting' || char.importance === 'crew'))
          .map((char) => ({ characterId: getCharacterKey(char), talentId: char.assignedTalentId!, confirmed: true })),
        ...castContinuityFromLibrary,
      ];

  const returningByCharacter = new Map(
    confirmedReturning
      .filter((cast) => cast.confirmed)
      .map((cast) => [cast.characterId, cast.talentId])
  );

  const charactersByKey = new Map<string, ScriptCharacter>();
  for (const char of base?.characters || []) {
    const key = getCharacterKey(char);
    charactersByKey.set(key, {
      ...char,
      franchiseId,
      franchiseCharacterId: char.franchiseCharacterId || key,
      assignedTalentId: returningByCharacter.get(key),
    });
  }

  for (const character of libraryCharacters) {
    if (charactersByKey.has(character.characterId)) {
      const existing = charactersByKey.get(character.characterId)!;
      charactersByKey.set(character.characterId, {
        ...existing,
        name: character.name || existing.name,
        description: character.description || existing.description,
        ageRange: character.ageRange || existing.ageRange,
        requiredGender: character.gender || existing.requiredGender,
        importance: character.narrativeImportance === 'lead' ? 'lead' : 'supporting',
        traits: character.traits || existing.traits,
        relationships: character.relationships || existing.relationships,
        locked: true,
        assignedTalentId: returningByCharacter.get(character.characterId) || existing.assignedTalentId,
      });
      continue;
    }

    charactersByKey.set(character.characterId, {
      id: character.characterId,
      name: character.name,
      description: character.description,
      importance: character.narrativeImportance === 'lead' ? 'lead' : 'supporting',
      requiredType: 'actor',
      requiredGender: character.gender,
      ageRange: character.ageRange,
      traits: character.traits,
      relationships: character.relationships,
      franchiseId,
      franchiseCharacterId: character.characterId,
      locked: true,
      assignedTalentId: returningByCharacter.get(character.characterId),
    });
  }

  const continuityNotes = [
    ...(originalProject.contractedTalent || [])
      .filter((t) => ['Director', 'Writer', 'Producer'].includes(t.role))
      .map((t) => `Returning ${t.role} hold: ${t.talentId}`),
    ...(franchise?.continuity?.plotThreads || [])
      .filter((thread) => thread.status === 'active')
      .map((thread) => `Active franchise arc: ${thread.description}`),
  ];

  return {
    id,
    title,
    genre: base?.genre || 'action',
    logline: description,
    writer: base?.writer || 'Studio Writer',
    pages,
    quality: Math.max(60, (base?.quality || 70) - 5),
    budget,
    developmentStage: 'concept',
    targetAudience: base?.targetAudience || 'general',
    estimatedRuntime,
    characteristics: {
      tone: base?.characteristics?.tone || 'balanced',
      pacing: pacing as any,
      dialogue: base?.characteristics?.dialogue || 'naturalistic',
      visualStyle: base?.characteristics?.visualStyle || 'realistic',
      commercialAppeal: Math.min(10, (base?.characteristics?.commercialAppeal || 6) + 1),
      criticalPotential: Math.max(1, (base?.characteristics?.criticalPotential || 5) - 1),
      cgiIntensity: isTv ? 'minimal' : 'moderate',
      content: (base?.characteristics as any)?.content,
    } as any,
    characters: Array.from(charactersByKey.values()),
    themes: Array.from(new Set([...(base?.themes || ['adventure', 'friendship']), ...continuityNotes])),
    franchiseId,
    sourceType: 'franchise',
  };
}
