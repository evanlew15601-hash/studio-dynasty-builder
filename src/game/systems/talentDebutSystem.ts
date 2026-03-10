import type { GameState } from '@/types/game';
import type { TickSystem } from '../core/types';
import { buildCoreTalentDebutsForYear, ensureCoreTalentRelationships } from '@/data/WorldGenerator';
import { generateProceduralDebuts } from '@/data/TalentDebutGenerator';

/**
 * Adds new talent at the start of each year.
 * - Handcrafted debuts from CORE_TALENT_BIBLE
 * - Small procedural rookie class for ongoing freshness
 */
export const TalentDebutSystem: TickSystem = {
  id: 'talentDebuts',
  label: 'Talent debuts',
  onTick: (state, ctx) => {
    // Year rollover happens when Week 52 advances to Week 1.
    if (ctx.week !== 1) return state;

    const year = ctx.year;
    const existingIds = new Set((state.talent || []).map((t) => t.id));

    const handcraftedDebuts = buildCoreTalentDebutsForYear(year).filter((t) => !existingIds.has(t.id));
    const rookieDebuts = generateProceduralDebuts({
      existingTalent: state.talent || [],
      year,
      actorCount: 8,
      directorCount: 2,
      seed: `rookies:${state.universeSeed ?? 0}:${year}`,
    });

    const incoming = [...handcraftedDebuts, ...rookieDebuts];
    if (incoming.length === 0) return state;

    const updatedTalent = ensureCoreTalentRelationships([...(state.talent || []), ...incoming]);

    ctx.recap.push({
      type: 'talent',
      title: `${incoming.length} new talent debut${incoming.length === 1 ? '' : 's'} in ${year}`,
      body: incoming
        .slice(0, 10)
        .map((t) => `• ${t.name} (${t.type})`)
        .join('\n') + (incoming.length > 10 ? `\n…and ${incoming.length - 10} more` : ''),
      severity: 'info',
    });

    const next: GameState = {
      ...state,
      talent: updatedTalent,
    };

    return next;
  },
};
