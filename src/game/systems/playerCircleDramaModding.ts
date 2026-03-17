import type { GameEvent, MediaItem, MediaSource } from '@/types/game';
import type { ModBundle, ModPatch } from '@/types/modding';
import { applyPatchesToRecord, deepMerge, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';

export interface PlayerCircleDramaConfig {
  feudChemistryThreshold: number;
  feudChemistryExplosive: number;
  poachLoyaltyThreshold: number;
  poachLoyaltySevere: number;
  chanceFeudMax: number;
  chancePoachMax: number;
}

const DEFAULT_CONFIG: PlayerCircleDramaConfig = {
  feudChemistryThreshold: -60,
  feudChemistryExplosive: -75,
  poachLoyaltyThreshold: 40,
  poachLoyaltySevere: 25,
  chanceFeudMax: 0.25,
  chancePoachMax: 0.2,
};

const BASE_EVENT_OVERRIDES: Record<string, Partial<GameEvent>> = {
  'circle:poach': {},
  'circle:feud': {},
};

export interface PlayerCircleDramaMediaTemplate {
  type: MediaItem['type'];
  sentiment: MediaItem['sentiment'];
  headline: string;
  content: string;
  impact?: Partial<MediaItem['impact']>;
  tags?: string[];
  sourceType?: MediaSource['type'];
  sourceId?: string;
}

const BASE_MEDIA_TEMPLATES: Record<string, PlayerCircleDramaMediaTemplate> = {
  'circle:poach:pr-spin': {
    type: 'editorial',
    sentiment: 'neutral',
    headline: '{StudioName} launches damage control amid {TalentName} poaching rumors',
    content:
      '{StudioName} moved quickly to contain talk of a rival approach for {TalentName}. ' +
      'Sources describe a coordinated outreach effort and a bid to keep the relationship on track.',
    impact: { virality: 40, intensity: 40 },
    tags: ['pr', 'inner-circle', 'poaching'],
    sourceType: 'trade_publication',
  },
  'circle:feud:pr-shield': {
    type: 'news',
    sentiment: 'neutral',
    headline: '{StudioName} issues statement to steady {ProjectTitle} production',
    content:
      '{StudioName} acknowledged "creative tensions" on {ProjectTitle} and emphasized a focused set. ' +
      'Representatives for {TalentAName} and {TalentBName} say production remains on schedule.',
    impact: { virality: 35, intensity: 35 },
    tags: ['pr', 'inner-circle', 'set', 'feud'],
    sourceType: 'trade_publication',
  },
};

function interpolate(input: string, vars: Record<string, string | number>): string {
  return input.replace(/\{([A-Za-z0-9_]+)\}/g, (m, key) => {
    if (!(key in vars)) return m;
    return String(vars[key]);
  });
}

function interpolateEvent(event: GameEvent, vars: Record<string, string | number>): GameEvent {
  const choices = (event.choices || []).map((c) => ({
    ...c,
    text: interpolate(c.text, vars),
    requirements: (c.requirements || []).map((r) => ({
      ...r,
      description: interpolate(r.description, vars),
    })),
    consequences: (c.consequences || []).map((con) => ({
      ...con,
      description: interpolate(con.description, vars),
    })),
  }));

  return {
    ...event,
    title: interpolate(event.title, vars),
    description: interpolate(event.description, vars),
    choices,
  };
}

function loadPatches(entityType: string, bundle?: ModBundle): ModPatch[] {
  const b = bundle ?? getModBundle();
  return getPatchesForEntity(b, entityType);
}

export function getPlayerCircleDramaConfig(options?: { mods?: ModBundle; enableMods?: boolean }): PlayerCircleDramaConfig {
  if (options?.enableMods === false) return DEFAULT_CONFIG;

  const patches = loadPatches('playerCircleDramaConfig', options?.mods);
  if (!patches.length) return DEFAULT_CONFIG;

  const record = applyPatchesToRecord({ config: DEFAULT_CONFIG }, patches);
  return (record.config ? deepMerge(DEFAULT_CONFIG, record.config) : DEFAULT_CONFIG) as PlayerCircleDramaConfig;
}

export function applyPlayerCircleDramaEventMods(
  kind: 'circle:poach' | 'circle:feud',
  baseEvent: GameEvent,
  vars: Record<string, string | number>,
  options?: { mods?: ModBundle; enableMods?: boolean }
): GameEvent {
  if (options?.enableMods === false) return interpolateEvent(baseEvent, vars);

  const patches = loadPatches('playerCircleDramaEvent', options?.mods);
  const record = applyPatchesToRecord(BASE_EVENT_OVERRIDES, patches);
  const override = (record[kind] || {}) as Partial<GameEvent>;

  const merged = deepMerge(baseEvent, override) as GameEvent;

  // Protect required event identity fields.
  const protectedEvent: GameEvent = {
    ...merged,
    id: baseEvent.id,
    type: baseEvent.type,
    triggerDate: baseEvent.triggerDate,
    data: baseEvent.data,
  };

  const normalized: GameEvent = {
    ...protectedEvent,
    title: typeof protectedEvent.title === 'string' && protectedEvent.title.trim() ? protectedEvent.title : baseEvent.title,
    description:
      typeof protectedEvent.description === 'string' && protectedEvent.description.trim()
        ? protectedEvent.description
        : baseEvent.description,
  };

  return interpolateEvent(normalized, vars);
}

export function getPlayerCircleDramaMediaTemplate(
  key: string,
  vars: Record<string, string | number>,
  options?: { mods?: ModBundle; enableMods?: boolean }
): PlayerCircleDramaMediaTemplate | null {
  const base = BASE_MEDIA_TEMPLATES[key];
  if (!base) return null;

  if (options?.enableMods === false) {
    return {
      ...base,
      headline: interpolate(base.headline, vars),
      content: interpolate(base.content, vars),
    };
  }

  const patches = loadPatches('playerCircleDramaMedia', options?.mods);
  const record = applyPatchesToRecord(BASE_MEDIA_TEMPLATES, patches);
  const template = record[key];
  if (!template) return null;

  return {
    ...template,
    headline: interpolate(template.headline, vars),
    content: interpolate(template.content, vars),
  };
}
