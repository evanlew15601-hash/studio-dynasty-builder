import type { GameState, Studio, WorldHistoryEntry } from '@/types/game';
import { StudioGenerator, STUDIO_PROFILES } from '@/data/StudioGenerator';
import { stableInt } from '@/utils/stableRandom';
import { stablePick } from '@/utils/stablePick';
import { pushWorldHistory } from '@/utils/worldHistory';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function closureChance(s: Studio): number {
  const rep = s.reputation ?? 50;
  const bud = s.budget ?? 0;

  let chance = 0;

  if (bud < 15_000_000) chance += 0.08;
  if (bud < 8_000_000) chance += 0.10;

  if (rep < 35) chance += 0.08;
  if (rep < 25) chance += 0.10;

  return clamp(chance, 0, 0.20);
}

function closurePriority(s: Studio): number {
  const rep = s.reputation ?? 50;
  const bud = s.budget ?? 0;

  const repScore = Math.max(0, 45 - rep) * 2;
  const budScore = Math.max(0, 20_000_000 - bud) / 1_000_000;

  return repScore + budScore;
}

function spawnStudio(params: {
  sg: StudioGenerator;
  year: number;
  seed: string;
  existingNames: Set<string>;
}): Studio | null {
  const { sg, year, seed, existingNames } = params;

  const profileNames = (STUDIO_PROFILES || []).map((p) => p.name);

  // Prefer unused profiles.
  const pool = profileNames.filter((n) => !existingNames.has(n));

  const selectedName =
    (pool.length > 0 ? stablePick(pool, `${seed}|profile`) : undefined) ||
    (() => {
      const adj = stablePick(
        ['New', 'Silver', 'Bright', 'Echo', 'Summit', 'Cobalt', 'Velvet', 'Evergreen', 'Iron', 'Lunar'],
        `${seed}|adj`
      );
      const noun = stablePick(
        ['Harbor', 'Canyon', 'Lantern', 'Atlas', 'Meadow', 'Signal', 'Foundry', 'Crescent', 'Comet', 'Marble'],
        `${seed}|noun`
      );
      const suffix = stablePick(['Pictures', 'Studios', 'Entertainment', 'Films'], `${seed}|suffix`);

      const name = `${adj ?? 'New'} ${noun ?? 'Harbor'} ${suffix ?? 'Studios'}`;
      if (existingNames.has(name)) return null;
      return name;
    })();

  if (!selectedName) return null;

  const profile = sg.getStudioProfile(selectedName);

  if (!profile) {
    // Procedural fallback.
    const id = `comp:${slug(selectedName)}:${year}`;
    return {
      id,
      name: selectedName,
      reputation: stableInt(`${seed}|rep`, 45, 70),
      budget: stableInt(`${seed}|budget`, 8_000_000, 40_000_000),
      founded: year,
      specialties: ['drama'],
    } as any;
  }

  return {
    id: `comp:${slug(profile.name)}`,
    name: profile.name,
    reputation: profile.reputation,
    budget: profile.budget,
    founded: profile.foundedYear ?? (1955 + stableInt(`${profile.name}|founded`, 0, 55)),
    specialties: profile.specialties,
    personality: profile.personality,
    businessTendency: profile.businessTendency,
    brandIdentity: profile.brandIdentity,
    biography: profile.biography,
    riskTolerance: profile.riskTolerance,
    releaseFrequency: profile.releaseFrequency,
    awards: [],
  };
}

export const CompetitorStudioLifecycleSystem: TickSystem = {
  id: 'competitorStudioLifecycle',
  label: 'Competitor studio lifecycle',
  dependsOn: ['studioFortunes'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const studios = state.competitorStudios || [];
    if (studios.length === 0) return state;

    const previousYear = ctx.year - 1;

    // Keep the roster roughly stable; replace at most one exit per year.
    const targetCount = studios.length;

    const seedBase = `${state.universeSeed ?? 0}|competitorStudioLifecycle|${previousYear}`;

    let exit: Studio | null = null;

    for (const s of studios) {
      const chance = closureChance(s);
      if (chance <= 0) continue;

      const roll = stableInt(`${seedBase}|close|${s.id}`, 0, 9999) / 10000;
      if (roll >= chance) continue;

      if (!exit || closurePriority(s) > closurePriority(exit)) {
        exit = s;
      }
    }

    let nextStudios = studios;
    let worldHistory = state.worldHistory || [];

    if (exit) {
      nextStudios = studios.filter((s) => s.id !== exit!.id);

      const rep = exit.reputation ?? 50;
      const bud = exit.budget ?? 0;
      const importance: 3 | 4 | 5 = rep >= 85 || bud >= 120_000_000 ? 5 : rep >= 70 || bud >= 70_000_000 ? 4 : 3;

      const entry: WorldHistoryEntry = {
        id: `hist:studio_exit:${previousYear}:${exit.id}`,
        kind: 'studio_milestone',
        year: previousYear,
        week: 52,
        title: `${exit.name} shutters`,
        body: `${exit.name} ceased active operations after a difficult run.`,
        entityIds: { studioIds: [exit.id] },
        importance,
      };

      worldHistory = pushWorldHistory(worldHistory, entry);

      ctx.recap.push({
        type: 'market',
        title: 'Industry shakeup',
        body: `• ${exit.name} shutters`,
        severity: 'info',
      });
    }

    // Replace any exits to keep the field populated.
    if (nextStudios.length < targetCount) {
      const sg = new StudioGenerator();
      const existingNames = new Set(nextStudios.map((s) => s.name));

      const replacement = spawnStudio({
        sg,
        year: ctx.year,
        seed: `${seedBase}|spawn|0`,
        existingNames,
      });

      if (replacement) {
        nextStudios = [...nextStudios, replacement];

        const rep = replacement.reputation ?? 50;
        const bud = replacement.budget ?? 0;
        const importance: 3 | 4 | 5 = rep >= 85 || bud >= 120_000_000 ? 5 : rep >= 75 || bud >= 80_000_000 ? 4 : 3;

        const entry: WorldHistoryEntry = {
          id: `hist:studio_entry:${ctx.year}:${replacement.id}`,
          kind: 'studio_milestone',
          year: ctx.year,
          week: 1,
          title: `${replacement.name} enters the market`,
          body: `${replacement.name} launched operations in ${ctx.year}.`,
          entityIds: { studioIds: [replacement.id] },
          importance,
        };

        worldHistory = pushWorldHistory(worldHistory, entry);

        ctx.recap.push({
          type: 'market',
          title: 'New competitor studio',
          body: `• ${replacement.name} enters the market`,
          severity: 'info',
        });
      }
    }

    if (nextStudios === studios && worldHistory === (state.worldHistory || [])) return state;

    return {
      ...state,
      competitorStudios: nextStudios,
      worldHistory,
    };
  },
};
