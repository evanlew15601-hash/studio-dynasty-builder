import type { Project, Script } from '@/types/game';

export type SequelMedium = 'film' | 'tv-series' | 'tv-limited';

export function createSequelScript(params: {
  id: string;
  title: string;
  description: string;
  budget: number;
  franchiseId: string;
  medium: SequelMedium;
  originalProject: Project;
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
    returningCast,
    getCharacterKey,
  } = params;

  const base = originalProject.script;

  const isTv = medium !== 'film';

  const pages = isTv ? 60 : 120;
  const estimatedRuntime = isTv ? 45 : (base?.estimatedRuntime || 120) + 10;

  const pacing = isTv ? 'episodic' : 'fast-paced';

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
    themes: base?.themes || ['adventure', 'friendship'],
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
    characters: (base?.characters || []).map((char) => ({
      ...char,
      assignedTalentId:
        returningCast.find((cast) => cast.characterId === getCharacterKey(char) && cast.confirmed)?.talentId ||
        undefined,
    })),
    franchiseId,
    sourceType: 'franchise',
  };
}
