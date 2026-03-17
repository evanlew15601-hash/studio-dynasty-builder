import type { GameState, WorldHistoryEntry } from '@/types/game';
import type { TickSystem } from '../core/types';
import { buildCoreTalentDebutsForYear, ensureCoreTalentRelationships } from '@/data/WorldGenerator';
import { generateProceduralDebuts } from '@/data/TalentDebutGenerator';
import { pushWorldHistory } from '@/utils/worldHistory';

/**
 * Adds new talent at the start of each year.
 * - Handcrafted debuts from CORE_TALENT_BIBLE
 * - Small procedural rookie class for ongoing freshness
 */
export const TalentDebutSystem: TickSystem = {
  id: 'talentDebuts',
  label: 'Talent debuts',
  dependsOn: ['talentLifecycle', 'talentRetirements'],
  onTick: (state, ctx) => {
    // Year rollover happens when Week 52 advances to Week 1.
    if (ctx.week !== 1) return state;

    const year = ctx.year;
    const previousYear = year - 1;

    const existingIds = new Set((state.talent || []).map((t) => t.id));

    const handcraftedDebuts = buildCoreTalentDebutsForYear(year).filter((t) => !existingIds.has(t.id));

    // Online League: keep the talent pool strictly core + handcrafted debuts.
    // Procedural rookies are intentionally disabled to ensure every player shares the exact same talent IDs.
    const rookieDebuts = state.mode === 'online'
      ? []
      : (() => {
          const activeCount = (state.talent || []).filter(
            (t) => (t.type === 'actor' || t.type === 'director') && t.contractStatus !== 'retired'
          ).length;

          const retiredActors = (state.talent || []).filter((t) => t.type === 'actor' && t.retired?.year === previousYear)
            .length;
          const retiredDirectors = (state.talent || []).filter((t) => t.type === 'director' && t.retired?.year === previousYear)
            .length;

          const baselineActors = activeCount > 320 ? 0 : 8;
          const baselineDirectors = activeCount > 320 ? 0 : 2;

          return generateProceduralDebuts({
            existingTalent: state.talent || [],
            year,
            actorCount: baselineActors + retiredActors,
            directorCount: baselineDirectors + retiredDirectors,
            seed: `rookies:${state.universeSeed ?? 0}:${year}`,
          });
        })();

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

    let worldHistory = state.worldHistory || [];

    if (state.mode !== 'online') {
      const historyEntries: WorldHistoryEntry[] = [];

      for (const t of handcraftedDebuts) {
        const rep = t.reputation ?? 0;
        const importance: 1 | 2 | 3 | 4 | 5 = rep >= 95 ? 5 : 4;
        historyEntries.push({
          id: `hist:talent_debut:${year}:${t.id}`,
          kind: 'talent_debut',
          year,
          week: 1,
          title: `${t.name} debuts`,
          body: `${t.name} entered the industry in ${year}.`,
          entityIds: { talentIds: [t.id] },
          importance,
        });
      }

      // Keep rookies out of history unless they're notable.
      for (const t of rookieDebuts) {
        const rep = t.reputation ?? 0;
        const importance: 1 | 2 | 3 | 4 | 5 | undefined = t.isNotable || rep >= 90 ? 3 : undefined;
        if (!importance) continue;

        historyEntries.push({
          id: `hist:talent_debut:${year}:${t.id}`,
          kind: 'talent_debut',
          year,
          week: 1,
          title: `${t.name} debuts`,
          body: `${t.name} entered the industry in ${year}.`,
          entityIds: { talentIds: [t.id] },
          importance,
        });
      }

      for (const e of historyEntries) {
        worldHistory = pushWorldHistory(worldHistory, e);
      }
    }

    const next: GameState = {
      ...state,
      talent: updatedTalent,
      worldHistory: state.mode === 'online' ? state.worldHistory : worldHistory,
    };

    return next;
  },
};
