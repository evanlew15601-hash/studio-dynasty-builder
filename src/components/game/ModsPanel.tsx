import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PROVIDER_DEALS, getEffectiveProviderDeals, type ProviderDealProfile, type ProviderId } from '@/data/ProviderDealsDatabase';
import { PublicDomainGenerator } from '@/data/PublicDomainGenerator';
import { FranchiseGenerator } from '@/data/FranchiseGenerator';
import { STUDIO_PROFILES, type StudioProfile } from '@/data/StudioGenerator';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';
import { AWARD_SHOWS, type AwardShowDefinition, type AwardCategoryDefinition } from '@/data/AwardsSchedule';
import { FRANCHISE_CHARACTER_DB, type FranchiseCharacterDef } from '@/data/FranchiseCharacterDB';
import { FRANCHISE_ROLE_SETS } from '@/data/RoleDatabase';
import { PARODY_CHARACTER_NAME_MAP, type ParodyCharacterNameMapEntry } from '@/data/ParodyCharacterNames';
import { generateInitialTalentPool } from '@/data/WorldGenerator';
import type { Franchise, Genre, MediaSource, PublicDomainIP, ScriptCharacter, TalentPerson } from '@/types/game';
import { useToast } from '@/hooks/use-toast';
import type { ModBundle, ModInfo, ModOp, ModPatch } from '@/types/modding';
import { applyPatchesByKey, applyPatchesToRecord, getPatchesForEntity, normalizeModBundle } from '@/utils/modding';
import {
  clearModBundle,
  deleteModSlot,
  getActiveModSlot,
  getModBundle,
  listModSlots,
  saveModBundle,
  setActiveModSlot,
} from '@/utils/moddingStore';

const ENTITY_TYPES = [
  'talent',
  'franchise',
  'publicDomainIP',
  'providerDeal',
  'franchiseRoleSet',
  'parodyCharacterNames',
  'franchiseCharacterDb',
  'awardShow',
  'studioProfile',
  'mediaSource',
] as const;

const DEFAULT_MOD_VERSION = '1.0.0';

function makeDefaultMod(id: string): ModInfo {
  return { id, name: id, version: DEFAULT_MOD_VERSION, enabled: true, priority: 0 };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (!a || !b) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const ak = Object.keys(a as any).sort();
  const bk = Object.keys(b as any).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    if (!deepEqual((a as any)[ak[i]], (b as any)[bk[i]])) return false;
  }
  return true;
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function nameRowsFromRecord(rec?: Record<string, string>): NameMappingRow[] {
  return Object.entries(rec || {})
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function nameRecordFromRows(rows: NameMappingRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (!k) continue;
    const v = row.value.trim();
    if (!v) continue;
    out[k] = v;
  }
  return out;
}

function namePatchRecordFromRows(base: Record<string, string> | undefined, rows: NameMappingRow[]): Record<string, string | null> | undefined {
  const baseRec = base || {};
  const next = nameRecordFromRows(rows);
  const out: Record<string, string | null> = { ...next };

  for (const key of Object.keys(baseRec)) {
    if (!(key in next)) out[key] = null;
  }

  return Object.keys(out).length ? out : undefined;
}

function ensureMod(bundle: ModBundle, modId: string): ModBundle {
  if (bundle.mods.some((m) => m.id === modId)) return bundle;
  return { ...bundle, mods: [...bundle.mods, makeDefaultMod(modId)] };
}

function upsertPatch(bundle: ModBundle, patch: ModPatch): ModBundle {
  const idx = bundle.patches.findIndex((p) => p.id === patch.id);
  if (idx === -1) return { ...bundle, patches: [...bundle.patches, patch] };
  const next = bundle.patches.slice();
  next[idx] = patch;
  return { ...bundle, patches: next };
}

type TalentEdit = {
  id: string;
  name: string;
  type: TalentPerson['type'];
  age: number;
  gender?: TalentPerson['gender'];
  race?: TalentPerson['race'];
  nationality?: TalentPerson['nationality'];
  experience: number;
  reputation: number;
  marketValue: number;
  contractStatus: TalentPerson['contractStatus'];
  fame?: number;
  publicImage?: number;
  careerStage?: TalentPerson['careerStage'];
  archetype?: string;
  traits?: string[];
  specialties?: Genre[];
  genres: TalentPerson['genres'];
  biography?: string;
};

function pickTalentEdit(t: TalentPerson): TalentEdit {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    age: t.age,
    gender: t.gender,
    race: t.race,
    nationality: t.nationality,
    experience: t.experience,
    reputation: t.reputation,
    marketValue: t.marketValue,
    contractStatus: t.contractStatus,
    fame: t.fame,
    publicImage: t.publicImage,
    careerStage: t.careerStage,
    archetype: t.archetype,
    traits: t.traits,
    specialties: t.specialties,
    genres: t.genres,
    biography: t.biography,
  };
}

export const ModsPanel: React.FC = () => {
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement | null>(null);

  const [raw, setRaw] = useState('');
  const [savedRaw, setSavedRaw] = useState('');
  const [bundle, setBundle] = useState<ModBundle>(() => getModBundle());
  const [activeSlot, setActiveSlot] = useState<string>(() => getActiveModSlot());
  const [newSlotName, setNewSlotName] = useState('');

  // Editor
  const [editorModId, setEditorModId] = useState('my-mod');
  const [newModId, setNewModId] = useState('');
  const [providerEdits, setProviderEdits] = useState<Record<ProviderId, ProviderDealProfile>>({} as Record<ProviderId, ProviderDealProfile>);
  const [studioSearch, setStudioSearch] = useState('');
  const [studioEdits, setStudioEdits] = useState<Record<string, StudioProfile>>({});
  const [publicDomainEdits, setPublicDomainEdits] = useState<Record<string, PublicDomainIP>>({});
  const [publicDomainCharactersKey, setPublicDomainCharactersKey] = useState<string>('pd-1');
  const [roleSetKey, setRoleSetKey] = useState<string>(() => Object.keys(FRANCHISE_ROLE_SETS)[0] ?? 'Star Wars');
  const [roleSetRows, setRoleSetRows] = useState<ScriptCharacter[]>([]);
  const [characterDbKey, setCharacterDbKey] = useState<string>(() => Object.keys(FRANCHISE_CHARACTER_DB)[0] ?? 'Star Wars');
  const [characterDbRows, setCharacterDbRows] = useState<FranchiseCharacterDef[]>([]);
  const [talentSearch, setTalentSearch] = useState('');
  const [talentEdits, setTalentEdits] = useState<Record<string, TalentEdit>>({});
  const [franchiseSearch, setFranchiseSearch] = useState('');
  const [franchiseEdits, setFranchiseEdits] = useState<Record<string, Franchise>>({});
  const [awardShowSearch, setAwardShowSearch] = useState('');
  const [awardShowKey, setAwardShowKey] = useState<string>(() => AWARD_SHOWS[0]?.id ?? 'crown');
  const [awardShowEdits, setAwardShowEdits] = useState<Record<string, AwardShowDefinition>>({});
  const [mediaSourceSearch, setMediaSourceSearch] = useState('');
  const [mediaSourceEdits, setMediaSourceEdits] = useState<Record<string, MediaSource>>({});

  const [parodyNamesKey, setParodyNamesKey] = useState<string>(() => Object.keys(PARODY_CHARACTER_NAME_MAP)[0] ?? 'Star Wars');
  const [parodyByCharacterIdRows, setParodyByCharacterIdRows] = useState<NameMappingRow[]>([]);
  const [parodyByTemplateIdRows, setParodyByTemplateIdRows] = useState<NameMappingRow[]>([]);

  // Quick patch builder (raw JSON tab)
  const [quickEntityType, setQuickEntityType] = useState<(typeof ENTITY_TYPES)[number]>('providerDeal');
  const [quickOp, setQuickOp] = useState<ModOp>('update');
  const [quickTarget, setQuickTarget] = useState('netflix');
  const [quickPayload, setQuickPayload] = useState('{\n  "averageRate": 3000000\n}');

  useEffect(() => {
    const slot = getActiveModSlot();
    setActiveSlot(slot);
    const b = getModBundle();
    const nextRaw = JSON.stringify(b, null, 2);
    setBundle(b);
    setRaw(nextRaw);
    setSavedRaw(nextRaw);

    if (b.mods?.length) {
      setEditorModId(b.mods[0].id);
    }
  }, []);

  const enabledCount = useMemo(() => (bundle.mods || []).filter((m) => m.enabled).length, [bundle.mods]);
  const slots = useMemo(() => listModSlots(), [activeSlot]);

  const baseProvidersById = useMemo(() => {
    const map = new Map<ProviderId, ProviderDealProfile>();
    for (const p of PROVIDER_DEALS) {
      map.set(p.id, p as ProviderDealProfile);
    }
    return map;
  }, []);

  const baseStudioProfiles = useMemo(() => STUDIO_PROFILES, []);

  const baseStudioProfilesByName = useMemo(() => {
    const map = new Map<string, StudioProfile>();
    for (const s of baseStudioProfiles) {
      map.set(s.name, s);
    }
    return map;
  }, [baseStudioProfiles]);

  const basePublicDomainIPs = useMemo(() => PublicDomainGenerator.generateInitialPublicDomainIPs(50), []);

  const baseCoreTalent = useMemo(
    () => generateInitialTalentPool({ currentYear: new Date().getFullYear(), actorCount: 0, directorCount: 0 }),
    []
  );

  const baseFranchises = useMemo(() => FranchiseGenerator.generateInitialFranchises(30), []);

  const baseMediaSources = useMemo(() => MediaSourceGenerator.getBaseMediaSources(), []);

  const baseMediaSourcesById = useMemo(() => {
    const map = new Map<string, MediaSource>();
    for (const s of baseMediaSources) {
      map.set(s.id, s);
    }
    return map;
  }, [baseMediaSources]);

  const baseFranchiseRoleSets = useMemo(() => FRANCHISE_ROLE_SETS, []);
  const baseFranchiseRoleSetKeys = useMemo(() => Object.keys(baseFranchiseRoleSets).sort(), [baseFranchiseRoleSets]);

  const baseFranchiseCharacterDb = useMemo(() => FRANCHISE_CHARACTER_DB, []);
  const baseFranchiseCharacterDbKeys = useMemo(() => Object.keys(baseFranchiseCharacterDb).sort(), [baseFranchiseCharacterDb]);

  const baseAwardShows = useMemo(() => AWARD_SHOWS, []);

  const baseAwardShowsById = useMemo(() => {
    const map = new Map<string, AwardShowDefinition>();
    for (const s of baseAwardShows) {
      map.set(s.id, s);
    }
    return map;
  }, [baseAwardShows]);

  const basePublicDomainById = useMemo(() => {
    const map = new Map<string, PublicDomainIP>();
    for (const ip of basePublicDomainIPs) {
      map.set(ip.id, ip);
    }
    return map;
  }, [basePublicDomainIPs]);

  const baseCoreTalentById = useMemo(() => {
    const map = new Map<string, TalentPerson>();
    for (const t of baseCoreTalent) {
      map.set(t.id, t);
    }
    return map;
  }, [baseCoreTalent]);

  const baseFranchisesById = useMemo(() => {
    const map = new Map<string, Franchise>();
    for (const f of baseFranchises) {
      map.set(f.id, f);
    }
    return map;
  }, [baseFranchises]);

  const selectedMod = useMemo(() => bundle.mods.find((m) => m.id === editorModId) ?? null, [bundle.mods, editorModId]);

  const rebuildProviderEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'providerDeal'),
    };

    const providers = getEffectiveProviderDeals(editorBundle);
    const next = {} as Record<ProviderId, ProviderDealProfile>;
    for (const p of providers) {
      next[p.id] = p;
    }
    setProviderEdits(next);
  };

  const rebuildStudioEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'studioProfile'),
    };

    const patched = applyPatchesByKey(baseStudioProfiles, getPatchesForEntity(editorBundle, 'studioProfile'), (s) => s.name);
    const next: Record<string, StudioProfile> = {};
    for (const s of patched) {
      next[s.name] = { ...s, specialties: [...(s.specialties || [])] };
    }

    setStudioEdits(next);
  };

  const rebuildPublicDomainEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'publicDomainIP'),
    };

    const patched = applyPatchesByKey(basePublicDomainIPs, getPatchesForEntity(editorBundle, 'publicDomainIP'), (p) => p.id);
    const next: Record<string, PublicDomainIP> = {};
    for (const ip of patched) {
      next[ip.id] = ip;
    }
    setPublicDomainEdits(next);
  };

  const rebuildRoleSetRows = (b: ModBundle, modId: string, key: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'franchiseRoleSet'),
    };

    const patched = applyPatchesToRecord(baseFranchiseRoleSets, getPatchesForEntity(editorBundle, 'franchiseRoleSet'));
    setRoleSetRows((patched[key] ?? baseFranchiseRoleSets[key] ?? []).map((r) => ({ ...r })));
  };

  const rebuildCharacterDbRows = (b: ModBundle, modId: string, key: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'franchiseCharacterDb'),
    };

    const patched = applyPatchesToRecord(baseFranchiseCharacterDb, getPatchesForEntity(editorBundle, 'franchiseCharacterDb'));
    setCharacterDbRows((patched[key] ?? baseFranchiseCharacterDb[key] ?? []).map((c) => ({ ...c })));
  };

  const rebuildTalentEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'talent'),
    };

    const patched = applyPatchesByKey(baseCoreTalent, getPatchesForEntity(editorBundle, 'talent'), (t) => t.id);
    const next: Record<string, TalentEdit> = {};
    for (const t of patched) {
      next[t.id] = pickTalentEdit(t);
    }
    setTalentEdits(next);
  };

  const rebuildFranchiseEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'franchise'),
    };

    const patched = applyPatchesByKey(baseFranchises, getPatchesForEntity(editorBundle, 'franchise'), (f) => f.id);
    const next: Record<string, Franchise> = {};
    for (const f of patched) {
      next[f.id] = { ...f, genre: [...f.genre], franchiseTags: [...(f.franchiseTags || [])], entries: [...(f.entries || [])] };
    }
    setFranchiseEdits(next);
  };

  const rebuildAwardShowEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'awardShow'),
    };

    const patched = applyPatchesByKey(baseAwardShows, getPatchesForEntity(editorBundle, 'awardShow'), (s) => s.id);
    const next: Record<string, AwardShowDefinition> = {};

    for (const s of patched) {
      next[s.id] = {
        ...s,
        categories: (s.categories || []).map((c) => ({
          ...c,
          eligibility: c.eligibility ? { ...c.eligibility } : undefined,
          talent: c.talent ? { ...c.talent } : undefined,
        })),
      };
    }

    setAwardShowEdits(next);

    if (!next[awardShowKey] && patched[0]?.id) {
      setAwardShowKey(patched[0].id);
    }
  };

  const rebuildMediaSourceEdits = (b: ModBundle, modId: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'mediaSource'),
    };

    const patched = applyPatchesByKey(baseMediaSources, getPatchesForEntity(editorBundle, 'mediaSource'), (s) => s.id);
    const next: Record<string, MediaSource> = {};
    for (const s of patched) {
      next[s.id] = { ...s, specialties: [...(s.specialties || [])] };
    }
    setMediaSourceEdits(next);
  };

  const nameRowsFromRecord = (rec?: Record<string, string>): NameMappingRow[] => {
    return Object.entries(rec || {})
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => a.key.localeCompare(b.key));
  };

  const nameRecordFromRows = (rows: NameMappingRow[]): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const row of rows) {
      const k = row.key.trim();
      if (!k) continue;
      const v = row.value.trim();
      if (!v) continue;
      out[k] = v;
    }
    return out;
  };

  const rebuildParodyCharacterNamesRows = (b: ModBundle, modId: string, key: string) => {
    const modInfo = b.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
    const editorBundle: ModBundle = {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (b.patches || []).filter((p) => p.modId === modId && p.entityType === 'parodyCharacterNames'),
    };

    const patched = applyPatchesToRecord(PARODY_CHARACTER_NAME_MAP, getPatchesForEntity(editorBundle, 'parodyCharacterNames'));
    const entry = patched[key] ?? PARODY_CHARACTER_NAME_MAP[key] ?? ({} as ParodyCharacterNameMapEntry);

    setParodyByCharacterIdRows(nameRowsFromRecord(entry.byCharacterId));
    setParodyByTemplateIdRows(nameRowsFromRecord(entry.byTemplateId));
  };

  const providerDealPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'providerDeal')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const studioProfilePatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'studioProfile')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const publicDomainPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'publicDomainIP')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const franchiseRoleSetPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'franchiseRoleSet')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const franchiseCharacterDbPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'franchiseCharacterDb')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const talentPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'talent')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const franchisePatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'franchise')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const awardShowPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'awardShow')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const mediaSourcePatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'mediaSource')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  const parodyCharacterNamesPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'parodyCharacterNames')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  useEffect(() => {
    const modId = editorModId.trim();
    if (!modId) return;
    rebuildProviderEdits(bundle, modId);
    rebuildStudioEdits(bundle, modId);
    rebuildPublicDomainEdits(bundle, modId);
    rebuildRoleSetRows(bundle, modId, roleSetKey);
    rebuildCharacterDbRows(bundle, modId, characterDbKey);
    rebuildTalentEdits(bundle, modId);
    rebuildFranchiseEdits(bundle, modId);
    rebuildAwardShowEdits(bundle, modId);
    rebuildMediaSourceEdits(bundle, modId);
    rebuildParodyCharacterNamesRows(bundle, modId, parodyNamesKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editorModId,
    roleSetKey,
    characterDbKey,
    parodyNamesKey,
    providerDealPatchKey,
    studioProfilePatchKey,
    publicDomainPatchKey,
    franchiseRoleSetPatchKey,
    franchiseCharacterDbPatchKey,
    talentPatchKey,
    franchisePatchKey,
    awardShowPatchKey,
    mediaSourcePatchKey,
    parodyCharacterNamesPatchKey,
  ]);

  const changedProviderCount = useMemo(() => {
    let changed = 0;
    for (const [id, edited] of Object.entries(providerEdits)) {
      const base = baseProvidersById.get(id as ProviderId);
      if (!base) continue;
      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [providerEdits, baseProvidersById]);

  const changedStudioCount = useMemo(() => {
    let changed = 0;
    for (const base of baseStudioProfiles) {
      const edited = studioEdits[base.name] ?? base;
      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseStudioProfiles, studioEdits]);

  const changedPublicDomainCount = useMemo(() => {
    let changed = 0;
    for (const [id, edited] of Object.entries(publicDomainEdits)) {
      const base = basePublicDomainById.get(id);
      if (!base) continue;
      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [publicDomainEdits, basePublicDomainById]);

  const roleSetIsChanged = useMemo(() => {
    const base = baseFranchiseRoleSets[roleSetKey] ?? [];
    return !deepEqual(stripUndefined(base), stripUndefined(roleSetRows));
  }, [baseFranchiseRoleSets, roleSetKey, roleSetRows]);

  const characterDbIsChanged = useMemo(() => {
    const base = baseFranchiseCharacterDb[characterDbKey] ?? [];
    return !deepEqual(stripUndefined(base), stripUndefined(characterDbRows));
  }, [baseFranchiseCharacterDb, characterDbKey, characterDbRows]);

  const changedTalentCount = useMemo(() => {
    let changed = 0;
    for (const t of baseCoreTalent) {
      const baseEdit = pickTalentEdit(t);
      const edited = talentEdits[t.id] ?? baseEdit;
      if (!deepEqual(stripUndefined(baseEdit), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseCoreTalent, talentEdits]);

  const changedFranchiseCount = useMemo(() => {
    let changed = 0;
    for (const f of baseFranchises) {
      const edited = franchiseEdits[f.id] ?? f;
      if (!deepEqual(stripUndefined(f), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseFranchises, franchiseEdits]);

  const changedAwardShowCount = useMemo(() => {
    let changed = 0;
    for (const s of baseAwardShows) {
      const edited = awardShowEdits[s.id] ?? s;
      if (!deepEqual(stripUndefined(s), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseAwardShows, awardShowEdits]);

  const changedMediaSourceCount = useMemo(() => {
    let changed = 0;
    for (const s of baseMediaSources) {
      const edited = mediaSourceEdits[s.id] ?? s;
      if (!deepEqual(stripUndefined(s), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseMediaSources, mediaSourceEdits]);

  const parodyNamesIsChanged = useMemo(() => {
    const base = PARODY_CHARACTER_NAME_MAP[parodyNamesKey] ?? ({} as ParodyCharacterNameMapEntry);
    const nextByCharacterId = nameRecordFromRows(parodyByCharacterIdRows);
    const nextByTemplateId = nameRecordFromRows(parodyByTemplateIdRows);

    const edited: ParodyCharacterNameMapEntry = {
      byCharacterId: Object.keys(nextByCharacterId).length ? nextByCharacterId : undefined,
      byTemplateId: Object.keys(nextByTemplateId).length ? nextByTemplateId : undefined,
    };

    return !deepEqual(stripUndefined(base), stripUndefined(edited));
  }, [parodyByCharacterIdRows, parodyByTemplateIdRows, parodyNamesKey]);

  const syncFromBundle = (next: ModBundle) => {
    setBundle(next);
    setRaw(JSON.stringify(next, null, 2));
  };

  const parseFromRawOrToast = (): ModBundle | null => {
    try {
      const parsed = JSON.parse(raw);
      return normalizeModBundle(parsed);
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Could not parse the mod bundle JSON.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleReload = () => {
    const b = getModBundle();
    const nextRaw = JSON.stringify(b, null, 2);
    syncFromBundle(b);
    setSavedRaw(nextRaw);
  };

  const handleSave = () => {
    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    // TEW-style: keep the default slot as a safe baseline.
    // If we're on "default", treat Save as "Save As".
    if (activeSlot === 'default') {
      const proposed = newSlotName.trim();
      const picked =
        proposed ||
        (typeof window !== 'undefined'
          ? (window.prompt('Save As (new slot name):', 'my-mod-db') || '').trim()
          : '');

      if (!picked) {
        toast({ title: 'Not saved', description: 'Default slot is read-only. Create a slot to save changes.' });
        return;
      }

      if (picked === 'default') {
        toast({ title: 'Invalid slot name', description: '"default" is reserved. Pick a different name.' });
        return;
      }

      setActiveModSlot(picked);
      const nextSlot = getActiveModSlot();
      setActiveSlot(nextSlot);
      setNewSlotName('');

      saveModBundle(normalized);
      syncFromBundle(normalized);

      toast({
        title: 'Mods saved',
        description: `Saved to new slot "${nextSlot}" (d        description: `Saved to       });
      return;
    }

    saveModBundle(normalized);
    syncFromBundle(normalized);
    toast({
      title: 'Mods saved',
      description: `Saved to slot "${getActiveModSlot()}      description: `Saved to slot "${getActiveModSlot()}". Reload the     });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      toast({ title: 'Copied', description: 'Mod bundle       toast({ title: 'Copied',     } catch {
      toast({ title: 'Copy failed', description: 'Could       toast({ title: 'Copy failed', description: 'Could not copy to     }
  };

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([raw], { type: 'application/      cons      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-magnate-mod-${activeSlot}.jso          document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download failed', description: 'Co      toast({ title: 'Download failed', description: 'Could not generate a    }
  };

  const handleImportClick = () => {
    importRef.current?.click();
  };

  const handleImportFile: React.ChangeEventHandler<HTMLI  const handleImportFile    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      try {
        const parsed = JSON.parse(text);
        const normalized = normalizeModBundle(parsed);
        syncFromBundle(normalized);
        toast({ title: 'Imported', description: 'Importe        toast({ title: 'Imported', description: 'Imported       } catch {
        setRaw(text);
        toast({
          title: 'Imported (unformatted)',
          description: 'Could not parse JSON. The file c          description: 'Could not parse JSON. The fil          variant: 'destructive',
        });
      }

      // Allow importing the same file again.
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSwitchSlot = (slotId: string) => {
    setActiveModSlot(slotId);
    setActiveSlot(getActiveModSlot());
    handleReload();
  };

  const handleCreateSlot = () => {
    const next = newSlotName.trim();
    if (!next) return;

    if (next === 'default') {
      toast({ title: 'Invalid slot name', description: '      toast({ title: 'Invalid slot name', descripti      return;
    }

    setActiveModSlot(next);
    setActiveSlot(getActiveModSlot());
    setNewSlotName('');

    // Start the new slot from the current JSON (if vali    // Start the new slot f    const normalized = parseFromRawOrToast();
    if (normalized) {
      saveModBundle(normalized);
      syncFromBundle(normalized);
    } else {
      const empty: ModBundle = { version: 1, mods: [], p      const em      saveModBundle(empty);
      syncFromBundle(empty);
    }

    toast({ title: 'Slot created', description: `Active     toast({ title: 'Slot created  };

  const handleDeleteSlot = () => {
    if (activeSlot === 'default') return;
    deleteModSlot(activeSlot);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    handleReload();
    toast({ title: 'Slot deleted', description: `Deleted    toast({ title: 'Slot del  };

  const handleClear = () => {
    if (activeSlot === 'default') {
      toast({ title: 'Read-only', description: 'Default       toast({ title: 'Read-only', description: 'Default slot cannot be cleared      return;
    }

    clearModBundle();
    const b = getModBundle();
    syncFromBundle(b);
    setSavedRaw(JSON.stringify(b, null, 2));
    toast({
      title: 'Mods cleared',
      description: `Cleared slot "${getActiveModSlot()}". Reload to fully revert.`,
    });
  };

  const handleCreateMod = () => {
    const nextId = newModId.trim();
    if (!nextId) return;

    const next = ensureMod(bundle, nextId);
    syncFromBundle(next);
    setEditorModId(nextId);
    setNewModId('');
    toast({    toast({ title: 'Mod created', description: `Created mod "${nextId}" in this slot.
  const ha
  const handleUpdateMod = (updates: Partial<ModInfo>) => {
    const modId = editorModId.trim();
    if (!modId    let ne
    let next = ensureMod(bundle, modId);
    next = {
      ...next,
      mods: next.mods.map((m) => (m.id === modId ? ({ ...m, ...updates } as any) : m
    syncFr
    syncFromBundle(n
  const up
  const updateProvider = (id: ProviderId, updates: Partial<ProviderDealProfile>) => {
    setProviderEdits((prev) => {
      const current = prev[id] ?? (baseProvidersById.get(id) as ProviderDealProfile);
      return { ...prev, [id]: stripUndefined({ ...current, ...updates })   }  
  const up
  const updateStudio = (name: string, updates: Partial<StudioProfile>) => {
    setStudioEdits((prev) => {
      const current = prev[name] ?? (baseStudioProfilesByName.get(name) as StudioProfile);
      return { ...prev, [name]: stripUndefined({ ...current, ...updates })   }  
  const up
  const updateStudioSpecialties = (name: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as    update
    updateStudio(name, { specialties: list.length ? list : [
  const up
  const updatePublicDomain = (id: string, updates: Partial<PublicDomainIP>) => {
    setPublicDomainEdits((prev) => {
      const current = prev[id] ?? (basePublicDomainById.get(id) as PublicDomainIP);
      return { ...prev, [id]: stripUndefined({ ...current, ...updates })   }  
  const up
  const updatePublicDomainStringList = (id: string, field: 'coreElements' | 'requiredElements' | 'notableAdaptations', value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePublicDomain(id, { [field]: list.length ? list : undefined } as 
  const up
  const updatePublicDomainGenreList = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePublicDomain(id, { genreFlexibility: list as any } as 
  const ge
  const getPublicDomainCharacters = (ipId: string): ScriptCharacter[] => {
    if (!ipId) return [];
    const edited = publicDomainEdits[ipId] ?? basePublicDomainById.get(ipId);
    return ((edited?.suggestedCharacters as ScriptCharacter[] | undefined) || []).map((c) => stripUndefined
  const se
  const setPublicDomainCharacters = (ipId: string, characters: ScriptCharacter[]) => {
    if (!ipId) return;
    updatePublicDomain(ipId, { suggestedCharacters: stripUndefined(characters) as an
  const up
  const updatePublicDomainCharacterRow = (idx: number, updates: Partial<ScriptCharacter>) => {
    const ipId = publicDomainCharactersKey;
    if (!ipId) return;
    const current = getPublicDomainCharacters(ipId);
    const next = current.slice();
    next[idx] = stripUndefined({ ...next[idx], ...updates });
    setPublicDomainCharacters(ipId, n
  const up
  const updatePublicDomainCharacterTraits = (idx: number, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePublicDomainCharacterRow(idx, { traits: list.length ? list : undefine
  const ha
  const handleAddPublicDomainCharacterRow = () => {
    const ipId = publicDomainCharactersKey;
    if (!ipId    const 
    const current = getPublicDomainCharacters(ipId);
    const existingIds = new Set(current.map((c) => c.id));
    let suffix = current.length + 1;
    let id = `pd_char_${suffix}`;
    while (existingIds.has(id)) {
      suffix++;
      id = `pd_char_${suffi
    setPub
    setPublicDomainCharacters(ipId, [
      ...curren         {
        id,
        name: 'New Character',
        importance: 'supporting',
        requiredType: 'actor'          }  
  const ha
  const handleDeletePublicDomainCharacterRow = (idx: number) => {
    const ipId = publicDomainCharactersKey;
    if (!ipId) return;
    const current = getPublicDomainCharacters(ipId);
    setPublicDomainCharacters(ipId, current.filter((_, i) => i !== i
  const up
  const updateParodyByCharacterIdRow = (idx: number, updates: Partial<NameMappingRow>) => {
    setParodyByCharacterIdRows((prev) => {
      const next = prev.slice();
      const existing = next[idx];
      if (!existing) return prev;
      next[idx] = stripUndefined({ ...existing, ...updates });
      return nex  }  
  const up
  const updateParodyByTemplateIdRow = (idx: number, updates: Partial<NameMappingRow>) => {
    setParodyByTemplateIdRows((prev) => {
      const next = prev.slice();
      const existing = next[idx];
      if (!existing) return prev;
      next[idx] = stripUndefined({ ...existing, ...updates });
      return nex  }  
  const ha
  const handleAddParodyByCharacterIdRow = () => {
    setParodyByCharacterIdRows((prev) => [...prev, { key: '', value: ''
  const ha
  const handleAddParodyByTemplateIdRow = () => {
    setParodyByTemplateIdRows((prev) => [...prev, { key: '', value: ''
  const ha
  const handleDeleteParodyByCharacterIdRow = (idx: number) => {
    setParodyByCharacterIdRows((prev) => prev.filter((_, i) => i !== i
  const ha
  const handleDeleteParodyByTemplateIdRow = (idx: number) => {
    setParodyByTemplateIdRows((prev) => prev.filter((_, i) => i !== i
  const up
  const updateRoleRow = (idx: number, updates: Partial<ScriptCharacter>) => {
    setRoleSetRows((prev) => {
      const next = prev.slice();
      next[idx] = stripUndefined({ ...next[idx], ...updates });
      return nex  }  
  const up
  const updateRoleTraits = (idx: number, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateRoleRow(idx, { traits: list.length ? list : undefine
  const ha
  const handleAddRoleRow = () => {
    setRoleSetRows((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      let suffix = prev.length + 1;
      let id = `role-${suffix}`;
      while (existingIds.has(id)) {
        suffix++;
        id = `role-${suffix}
      retu
      return [
        ...prev,         {
          id,
          name: 'New Role',
          importance: 'minor',
          requiredType: 'actor',
          ageRange: [20, 60],
        }          }  
  const ha
  const handleDeleteRoleRow = (idx: number) => {
    setRoleSetRows((prev) => prev.filter((_, i) => i !== i
  const up
  const updateCharacterRow = (idx: number, updates: Partial<FranchiseCharacterDef>) => {
    setCharacterDbRows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...updates };
      return nex  }  
  const up
  const updateCharacterTraits = (idx: number, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateCharacterRow(idx, { traits: list.length ? list : undefine
  const up
  const updateTalent = (id: string, updates: Partial<TalentEdit>) => {
    setTalentEdits((prev) => {
      const base = baseCoreTalentById.get(id);
      const current = prev[id] ?? (base ? pickTalentEdit(base) : null);
      if (!current) return prev;
      return { ...prev, [id]: stripUndefined({ ...current, ...updates })   }  
  const up
  const updateTalentGenres = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateTalent(id, { genres: list as an
  const up
  const updateTalentTraits = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateTalent(id, { traits: list.length ? list : undefine
  const up
  const updateTalentSpecialties = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Genre[];
    updateTalent(id, { specialties: list.length ? list : undefine
  const up
  const updateFranchise = (id: string, updates: Partial<Franchise>) => {
    setFranchiseEdits((prev) => {
      const base = baseFranchisesById.get(id);
      const current = prev[id] ?? base;
      if (!current) return prev;
      return { ...prev, [id]: stripUndefined({ ...current, ...updates })   }  
  const up
  const updateFranchiseTags = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateFranchise(id, { franchiseTags: lis
  const updateFranchiseGenres = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Genre[];
    updateFranchise(id, { genre: list });
  };

  const updateFranchiseEntries = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateFranchise(id, { entries: list });
  };

  const updateAwardShow = (id: string, updates: Partial<AwardShowDefinition>) => {
    setAwardShowEdits((prev) => {
      const base = baseAwardShowsById.get(id);
      const current = prev[id] ?? base;
      if (!current) return prev;
      return { ...prev, [id]: stripUndefined({ ...current, ...updates }) };
    });
  };

  const handleResetAwardShowRow = (id: string) => {
    const base = baseAwardShowsById.get(id);
    if (!base) return;
    setAwardShowEdits((prev) => ({ ...prev, [id]: base }));
  };

  const updateAwardCategoryRow = (showId: string, idx: number, updates: Partial<AwardCategoryDefinition>) => {
    setAwardShowEdits((prev) => {
      const base = baseAwardShowsById.get(showId);
      const current = prev[showId] ?? base;
      if (!current) return prev;

      const categories = (current.categories || []).slice();
      const existing = categories[idx];
      if (!existing) return prev;

      const nextEligibility = updates.eligibility
        ? stripUndefined({ ...(existing.eligibility || {}), ...updates.eligibility })
        : existing.eligibility;

      const nextTalent = updates.talent
        ? stripUndefined({ ...(existing.talent || {}), ...updates.talent })
        : existing.talent;

      categories[idx] = stripUndefined({
        ...existing,
        ...updates,
        eligibility: nextEligibility && Object.keys(nextEligibility).length ? nextEligibility : undefined,
        talent: nextTalent && Object.keys(nextTalent).length ? nextTalent : undefined,
      });

      return { ...prev, [showId]: stripUndefined({ ...current, categories }) };
    });
  };

  const handleAddAwardCategoryRow = (showId: string) => {
    setAwardShowEdits((prev) => {
      const base = baseAwardShowsById.get(showId);
      const current = prev[showId] ?? base;
      if (!current) return prev;

      const categories = (current.categories || []).slice();
      const existingIds = new Set(categories.map((c) => c.id));

      let suffix = categories.length + 1;
      let id = `cat_${suffix}`;
      while (existingIds.has(id)) {
        suffix++;
        id = `cat_${suffix}`;
      }

      const nextCategories: AwardCategoryDefinition[] = [
        ...categories,
        {
          id,
          name: 'New Category',
          awardKind: 'studio',
        },
      ];

      return { ...prev, [showId]: stripUndefined({ ...current, categories: nextCategories }) };
    });
  };

  const handleDeleteAwardCategoryRow = (showId: string, idx: number) => {
    setAwardShowEdits((prev) => {
      const base = baseAwardShowsById.get(showId);
      const current = prev[showId] ?? base;
      if (!current) return prev;

      const categories = (current.categories || []).filter((_, i) => i !== idx);
      return { ...prev, [showId]: stripUndefined({ ...current, categories }) };
    });
  };

  const updateAwardCategoryGenres = (showId: string, idx: number, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Genre[];

    updateAwardCategoryRow(showId, idx, { eligibility: { genres: list.length ? list : undefined } });
  };

  const updateAwardCategoryProjectTypes = (showId: string, idx: number, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as any[];

    updateAwardCategoryRow(showId, idx, { eligibility: { projectTypes: list.length ? (list as any) : undefined } });
  };

  const handleApplyAwardShowEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseIds = new Set(baseAwardShows.map((s) => s.id));

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'awardShow' && p.op === 'update' && p.target && baseIds.has(String(p.target)))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const showId of baseIds) {
      const edited = awardShowEdits[showId] ?? baseAwardShowsById.get(showId);
      const base = baseAwardShowsById.get(showId);
      if (!edited || !base) continue;

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) continue;

      const patchId = `awardShow:${modId}:${showId}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'awardShow',
        op: 'update',
        target: showId,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied award show changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleAddCharacterRow = () => {
    setCharacterDbRows((prev) => {
      const existing = new Set(prev.map((c) => c.character_id));
      let suffix = prev.length + 1;
      let id = `char_${suffix}`;
      while (existing.has(id)) {
        suffix++;
        id = `char_${suffix}`;
      }

      return [
        ...prev,
        {
          character_id: id,
          name: 'New Character',
          role_template_id: 'supporting',
          importance: 'supporting',
          requiredType: 'actor',
          is_mandatory: false,
          ageRange: [20, 60],
        },
      ];
    });
  };

  const handleDeleteCharacterRow = (idx: number) => {
    setCharacterDbRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProviderRequirements = (id: ProviderId, updates: Partial<ProviderDealProfile['requirements']>) => {
    setProviderEdits((prev) => {
      const current = prev[id] ?? (baseProvidersById.get(id) as ProviderDealProfile);
      return { ...prev, [id]: stripUndefined({ ...current, requirements: { ...current.requirements, ...updates } }) };
    });
  };

  const updateProviderPreferredGenres = (id: ProviderId, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Genre[];
    updateProviderRequirements(id, { preferredGenres: list.length ? list : undefined });
  };

  const updateProviderExpectations = (id: ProviderId, updates: Partial<ProviderDealProfile['expectations']>) => {
    setProviderEdits((prev) => {
      const current = prev[id] ?? (baseProvidersById.get(id) as ProviderDealProfile);
      return { ...prev, [id]: { ...current, expectations: { ...current.expectations, ...updates } } };
    });
  };

  const handleResetProviderRow = (id: ProviderId) => {
    const base = baseProvidersById.get(id);
    if (!base) return;
    setProviderEdits((prev) => ({ ...prev, [id]: base }));
  };

  const handleResetStudioRow = (name: string) => {
    const base = baseStudioProfilesByName.get(name);
    if (!base) return;
    setStudioEdits((prev) => ({ ...prev, [name]: base }));
  };

  const handleResetMediaSourceRow = (id: string) => {
    const base = baseMediaSourcesById.get(id);
    if (!base) return;
    setMediaSourceEdits((prev) => ({ ...prev, [id]: base }));
  };

  const handleResetPublicDomainRow = (id: string) => {
    const base = basePublicDomainById.get(id);
    if (!base) return;
    setPublicDomainEdits((prev) => ({ ...prev, [id]: base }));
  };

  const handleApplyProviderEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseIds = new Set(PROVIDER_DEALS.map((p) => p.id));

    // Only rewrite update patches for built-in providers; keep any custom insert/delete patches.
    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'providerDeal' && p.op === 'update' && p.target && baseIds.has(p.target as ProviderId))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const providerId of baseIds) {
      const edited = providerEdits[providerId] ?? (baseProvidersById.get(providerId) as ProviderDealProfile);
      const base = baseProvidersById.get(providerId);
      if (!base) continue;

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) continue;

      const patchId = `providerDeal:${modId}:${providerId}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'providerDeal',
        op: 'update',
        target: providerId,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied provider changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyStudioEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseNames = new Set(baseStudioProfiles.map((s) => s.name));

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'studioProfile' && p.op === 'update' && p.target && baseNames.has(String(p.target)))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const name of baseNames) {
      const edited = studioEdits[name] ?? (baseStudioProfilesByName.get(name) as StudioProfile);
      const base = baseStudioProfilesByName.get(name);
      if (!base) continue;

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) continue;

      const patchId = `studioProfile:${modId}:${name}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'studioProfile',
        op: 'update',
        target: name,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied studio profile changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyMediaSourceEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseIds = new Set(baseMediaSources.map((s) => s.id));

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'mediaSource' && p.op === 'update' && p.target && baseIds.has(String(p.target)))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const id of baseIds) {
      const edited = mediaSourceEdits[id] ?? (baseMediaSourcesById.get(id) as MediaSource);
      const base = baseMediaSourcesById.get(id);
      if (!base) continue;

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) continue;

      const patchId = `mediaSource:${modId}:${id}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'mediaSource',
        op: 'update',
        target: id,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied media source changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyPublicDomainEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseIds = new Set(basePublicDomainIPs.map((p) => p.id));

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'publicDomainIP' && p.op === 'update' && p.target && baseIds.has(String(p.target)))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const ipId of baseIds) {
      const edited = publicDomainEdits[ipId] ?? (basePublicDomainById.get(ipId) as PublicDomainIP);
      const base = basePublicDomainById.get(ipId);
      if (!base) continue;

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) continue;

      const patchId = `publicDomainIP:${modId}:${ipId}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'publicDomainIP',
        op: 'update',
        target: ipId,
        pay        payload: stripUndefine      });
    }

    syncFro    syncFromBun    toast({    toast({ title: 'Applied', description: `Applied public domain changes as patches in mod "${modId}". Click Save to per  };

  const han  const handleApplyParodyCharacterNamesEdits    const m    const modId = editorMod    if (!mo    if (!modI
    const k    const key = parod    if (!ke    if (!ke
    const k    const keptPatches = bundle.patch      (p) =      (p) => !(p.modId === modId && p.entityType === 'parodyCharacterNames' && p.op === 'update' && p.targe    );

    let nex    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches 
    const b    const base = PARODY_CHARACTER_NAME_MAP[key] ?? ({} as ParodyCharacterName    const n    const nextByCharacterId = nameRecordFromRows(parodyByCharact    const n    const nextByTemplateId = nameRecordFromRows(parodyByTempla
    const e    const edited: ParodyCharacterNameMa      byCha      byCharacterId: Object.keys(nextByCharacterId).length ? nextByCharacterId :       byTem      byTemplateId: Object.keys(nextByTemplateId).length ? nextByTemplateId :     };

    if (!de    if (!deepEqual(stripUndefined(base), stripUndefined(e      const      const patchId = `parodyCharacterNames:${modId
      const      const patchByCharacterId = namePatchRecordFromRows(base.byCharacterId, parodyByCharact      const      const patchByTemplateId = namePatchRecordFromRows(base.byTemplateId, parodyByTempla
      next       next = upsertPat        id:        id        mod            ent        entityType: 'parodyCharac        op:        op:        tar        ta        pay        payload: stripU          b          byCharacterId: patchByCh          b          byTemplateId: patchByT        }),       });
    }

    syncFro    syncFromBun    toast({    toast({ title: 'Applied', description: `Applied parody name mapping changes as patches in mod "${modId}". Click Save to per  };

  const han  const handleApplyRoleSetEdits    const m    const modId = editorMod    if (!mo    if (!modI
    const k    const key = r    if (!ke    if (!ke
    const k    const keptPatches = bundle.patch      (p) =      (p) => !(p.modId === modId && p.entityType === 'franchiseRoleSet' && p.op === 'update' && p.targe    );

    let nex    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches 
    const b    const base = baseFranchiseRoleSets[k
    if (!de    if (!deepEqual(stripUndefined(base), stripUndefined(roleSe      const      const patchId = `franchiseRoleSet:${modId      next       next = upsertPat        id:        id        mod            ent        entityType: 'franchis        op:        op:        tar        ta        pay        payload: stripUndefined(rol      });
    }

    syncFro    syncFromBun    toast({    toast({ title: 'Applied', description: `Applied role set changes as patches in mod "${modId}". Click Save to per  };

  const han  const handleApplyCharacterDbEdits    const m    const modId = editorMod    if (!mo    if (!modI
    const k    const key = chara    if (!ke    if (!ke
    const k    const keptPatches = bundle.patch      (p) =      (p) => !(p.modId === modId && p.entityType === 'franchiseCharacterDb' && p.op === 'update' && p.targe    );

    let nex    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches 
    const b    const base = baseFranchiseCharacterDb[k
    if (!de    if (!deepEqual(stripUndefined(base), stripUndefined(characterD      const      const patchId = `franchiseCharacterDb:${modId      next       next = upsertPat        id:        id        mod            ent        entityType: 'franchiseCha        op:        op:        tar        ta        pay        payload: stripUndefined(charact      });
    }

    syncFro    syncFromBun    toast({    toast({ title: 'Applied', description: `Applied franchise character changes as patches in mod "${modId}". Click Save to per  };

  const han  const handleApplyTalentEdits    const m    const modId = editorMod    if (!mo    if (!modI
    const b    const baseIds = new Set(baseCoreTalent.map((t) 
    const k    const keptPatches = bundle.patch      (p) =      (p) => !(p.modId === modId && p.entityType === 'talent' && p.op === 'update' && p.target && baseIds.has(String(p    );

    let nex    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches 
    for (co    for (const t of baseCor      const      const baseEdit = pickTale      const      const edited = talentEdits[t.id] ??
      if (d      if (deepEqual(stripUndefined(baseEdit), stripUndefined(edited)))
      const      const { id: _id, ...payload }
      const      const patchId = `talent:${modId}      next       next = upsertPat        id:        id        mod            ent        entityType:        op:        op:        tar        tar        pay        payload: stripUndefined      });
    }

    syncFro    syncFromBun    toast({    toast({ title: 'Applied', description: `Applied talent changes as patches in mod "${modId}". Click Save to per  };

  const han  const handleApplyFranchiseEdits    const m    const modId = editorMod    if (!mo    if (!modI
    const b    const baseIds = new Set(baseFranchises.map((f) 
    const k    const keptPatches = bundle.patch      (p) =      (p) => !(p.modId === modId && p.entityType === 'franchise' && p.op === 'update' && p.target && baseIds.has(String(p    );

    let nex    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches 
    for (co    for (const f of baseFra      const      const edited = franchiseEdits[f      if (d      if (deepEqual(stripUndefined(f), stripUndefined(edited)))
      const      const patchId = `franchise:${modId}      next       next = upsertPat        id:        id        mod            ent        entityType: 'f        op:        op:        tar        tar        pay        payload: stripUndefine      });
    }

    syncFro    syncFromBun    toast({    toast({ title: 'Applied', description: `Applied franchise changes as patches in mod "${modId}". Click Save to per  };

  const han  const handleAddPatchToEditor    const n    const normalized = parseFromRaw    if (!no    if (!normalize
    const m    const modId = editorMod    if (!mo    if       toast      toast({ title: 'Missing mod id', description: 'Enter a mod id (e.g. "my-mod").', variant: 'destru      retur       }

    const n    const next: Mod      ...no      ...n      mods:      mods: normalized.mods.some((m) => m.id === modId) ? normalized.mods : [...normalized.mods, makeDefaultMo      patch      patches: normalized.patche    };

    let pay    let payload: unknown =     if (qui    if (quickOp === 'insert' || quickOp === '      try {         pay        payload = JSON.parse(quic      } cat             toa        toast({ title: 'Invalid payload JSON', description: 'Payload must be valid JSON.', variant: 'destru        ret           }
    }

    const i    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `p-${crypto.randomUUID()}` : `p-${Dat
    next.pa    next.patc      id,
      modId        entit      entityType: quickE      op: q      op      targe      target: quickTarget.trim() ||       paylo        });

    syncFro    syncFromBun    toast({    toast({ title: 'Patch added', description: 'Patch added to the JSON editor. Click Save to per  };

  return (
    <div cl    <div className="s      <inpu      <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImpo
      <Card      <Card className="card        <Ca        <C          <          <CardTitle className="flex items-center justify                       <span>Mod Datab                       <div className="flex items-cent                         <Badge variant="outline">{enabledCount}/{bundle.mods.length} enabl                         <Badge variant="secondary">{bundle.patches.length} patch                             <          </        </C        </C        <Ca        <CardContent className="s          <          <p className="text-sm text-muted-fo                       Mods are applied as patches on top of the built-in data; they do not replace the default databas                       priority mods win           <    
          <          <div className="grid grid-cols-1 lg:grid-cols                       <div className="s                         <div className="text-xs text-muted-foreground">Active                          <Select value={activeSlot} onValueChange={handleSw                           <Sele                             <SelectValue placeholder="Selec                           </Sele                           <Sele                             {slots.ma                               <SelectItem key={s}                                                          </S                                                 </Sele                                           
                       <div className="s                         <div className="text-xs text-muted-foreground">Create slot (Save                         <div className="fl                                                    value={ne                             onChange={(e) => setNewSlotName(e.targ                             placeholder="e.g. real-                                              <Button size="sm" variant="secondary" onClick={handleCr                                                                                           
                       <div className="s                         <div className="text-xs text-muted-foreground">Slot act                         <div className="flex flex-wr                           <Button size="sm" variant="secondary" onClick={hand                                                                   <Button size="sm" onClick={handleSave}>
                  {activeSlot === 'default' ? 'Save As…' : 'Save'}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCopyJson}>
                  Copy JSON
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadJson}>
                  Download
                </Button>
                <Button size="sm" variant="secondary" onClick={handleImportClick}>
                  Import
                </Button>
                <Button size="sm" variant="destructive" onClick={handleClear}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSlot}
                  disabled={activeSlot === 'default'}
                >
                  Delete Slot
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="editor" className="w-full">
            <TabsList>
              <TabsTrigger value="editor">Database editor</TabsTrigger>
              <TabsTrigger value="json">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="editor">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Mod Database</span>
                      <div className="flex items-center gap-2">
                        {activeSlot === 'default' ? <Badge variant="outline">default (read-only)</Badge> : null}
                                   <Badge variant="outline">{enabledCount}/{bundle.mods.length} enabl                                   <Badge variant="secondary">{bundle.patches.length} patch                                                            </                             </C                             <CardContent className="s                               <p className="text-xs text-muted-fo                                 Edit values in a grid, then apply changes to generate patches. This currently sup                                 <code>providerDeal</code>, <code>studioProfile</code>, <code>mediaSource</code>, <code>publicDomainIP</code> (including suggested characters), <code>franchiseRoleSet</code>, <code>parodyCharacterNames</code>, <code>franchiseCharacterDb</code>, <code>talent</code>, <code>franchise</code>, and <code>awardSh                         
                               <div className="grid grid-cols-1 lg:grid-cols                                 <div className="s                                   <Label className="text-xs text-muted-foreground">Editing m                                   <Select value={editorModId} onValueChange={setEdi                                     <Sele                                       <SelectValue placeholder="Sele                                     </Sele                                     <Sele                            {Array.from(new Set([...(bundle.mods || []).map((m) => m.id), editorModId]))
                              .filter((id) => !!id)
                              .map((id) => (
                                <SelectItem key={id} value={id}>
                                  {id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-muted-foreground">Create new mod</Label>
                        <div className="flex gap-2">
                          <Input value={newModId} onChange={(e) => setNewModId(e.target.value)} placeholder="e.g. real-world" />
                          <Button size="sm" variant="secondary" onClick={handleCreateMod}>
                            Create
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Enabled</Label>
                        <div className="h-10 flex items-center">
                          <Switch
                            checked={selectedMod?.enabled ?? true}
                            onCheckedChange={(checked) => handleUpdateMod({ enabled: checked })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Priority</Label>
                        <Input
                          value={String(selectedMod?.priority ?? 0)}
                          onChange={(e) => handleUpdateMod({ priority: Number(e.target.value) || 0 })}
                          type="number"
                        />
                      </div>

                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input value={selectedMod?.name ?? editorModId} onChange={(e) => handleUpdateMod({ name: e.target.value })} />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Version</Label>
                        <Input
                          value={selectedMod?.version ?? DEFAULT_MOD_VERSION}
                          onChange={(e) => handleUpdateMod({ version: e.target.value })}
                          placeholder={DEFAULT_MOD_VERSION}
                        />
                      </div>

                      <div className="space-y-1 lg:col-span-3">
                        <Label className="text-xs text-muted-foreground">Author</Label>
                        <Input value={selectedMod?.author ?? ''} onChange={(e) => handleUpdateMod({ author: e.target.value || undefined })} />
                      </div>
                    </div>

                    <Separator />

                    <Tabs defaultValue="providerDeals" className="w-full">
                      <TabsList>
                        <TabsTrigger value="providerDeals">Provider Deals</TabsTrigger>
                        <TabsTrigger value="studios">Studios</TabsTrigger>
                        <TabsTrigger value="mediaSources">Media Sources</TabsTrigger>
                        <TabsTrigger value="publicDomain">Public Domain IP</TabsTrigger>
                        <TabsTrigger value="publicDomainCharacters">PD Characters</TabsTrigger>
                        <TabsTrigger value="franchiseRoles">Franchise Roles</TabsTrigger>
                        <TabsTrigger value="parodyNames">Parody Names</TabsTrigger>
                        <TabsTrigger value="franchiseCharacters">Franchise Characters</TabsTrigger>
                        <TabsTrigger value="talent">Talent (Core)</TabsTrigger>
                        <TabsTrigger value="franchises">Franchises</TabsTrigger>
                        <TabsTrigger value="awardShows">Award Shows</TabsTrigger>
                        <TabsTrigger value="awardCategories">Award Categories</TabsTrigger>
                      </TabsList>

                      <TabsContent value="providerDeals" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Provider Deals: <span className="font-medium text-foreground">{changedProviderCount}</span> changed
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildProviderEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyProviderEdits}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">ID</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">Kind</TableHead>
                              <TableHead className="p-2">Color</TableHead>
                              <TableHead className="p-2">Market share</TableHead>
                              <TableHead className="p-2">Avg rate</TableHead>
                              <TableHead className="p-2">Bonus</TableHead>
                              <TableHead className="p-2">Min quality</TableHead>
                              <TableHead className="p-2">Min budget</TableHead>
                              <TableHead className="p-2">Preferred genres</TableHead>
                              <TableHead className="p-2">Viewers/share</TableHead>
                              <TableHead className="p-2">Completion %</TableHead>
                              <TableHead className="p-2">Sub growth</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {PROVIDER_DEALS.map((base) => {
                              const edited = providerEdits[base.id] ?? base;
                              const isChanged = !deepEqual(stripUndefined(base), stripUndefined(edited));

                              return (
                                <TableRow key={base.id} className={isChanged ? 'bg-muted/30' : undefined}>
                                  <TableCell className="p-2 font-mono text-xs">{base.id}</TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[180px]"
                                      value={edited.name}
                                      onChange={(e) => updateProvider(base.id, { name: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={edited.dealKind}
                                      onValueChange={(v) => updateProvider(base.id, { dealKind: v as any })}
                                    >
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="streaming">streaming</SelectItem>
                                        <SelectItem value="cable">cable</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[150px] font-mono text-xs"
                                      value={edited.color}
                                      onChange={(e) => updateProvider(base.id, { color: e.target.value })}
                                      placeholder="bg-red-600"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[120px]"
                                      type="number"
                                      value={String(edited.marketShare)}
                                      onChange={(e) => updateProvider(base.id, { marketShare: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[140px]"
                                      type="number"
                                      value={String(edited.averageRate)}
                                      onChange={(e) => updateProvider(base.id, { averageRate: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[110px]"
                                      type="number"
                                      step="0.01"
                                      value={String(edited.bonusMultiplier)}
                                      onChange={(e) => updateProvider(base.id, { bonusMultiplier: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                                 className="h-8                                                  typ                                                 value={String(edited.requirements?.minQual                                                 onChange={(e) => updateProviderRequirements(base.id, { minQuality: Number(e.target.value                                                                                    </                                             <TableCell classN                                                                                            className="h-8                                                  typ                                                 value={String(edited.requirements?.minBud                                                 onChange={(e) => updateProviderRequirements(base.id, { minBudget: Number(e.target.value                                                                                    </                                             <TableCell classN                                                                                            className="h-8 min-                                                 value={(edited.requirements?.preferredGenres || []).j                                                 onChange={(e) => updateProviderPreferredGenres(base.id, e.targ                                                 placeholder="drama,                                                                                    </                                             <TableCell classN                                                                                            className="h-8                                                  typ                                                 value={String(edited.expectations?.viewersPerSh                                                 onChange={(e) => updateProviderExpectations(base.id, { viewersPerShare: Number(e.target.value                                                                                    </                                             <TableCell classN                                                                                            className="h-8                                                  typ                                                 value={String(edited.expectations?.completionR                                                 onChange={(e) => updateProviderExpectations(base.id, { completionRate: Number(e.target.value                                                                                    </                                             <TableCell classN                                                                                            className="h-8                                                  typ                                                 st                                                 value={String(edited.expectations?.subscriberGrowthR                                                 onChan                                                   updateProviderExpectations(base.id, { subscriberGrowthRate: Number(e.target.valu                                                                                                                            </                                             <TableCell classN                                               <div className="flex justify-e                                                 <Button size="sm" variant="ghost" onClick={() => handleResetProviderRow(                                                                                                                                                                                      </                                           <                                                                                                      </                                 
                                   <p className="text-xs text-muted-fo                                     Tip: after clicking <strong>Apply changes</strong>, use the top-level <strong>Save</strong> button                                                                                                    </Ta
                                 <TabsContent value="studios" className="s                                   <div className="flex flex-wrap items-center justify-betwe                                     <div className="text-sm text-muted-fo                                       Studios: <span className="font-medium text-foreground">{changedStudioCount}</spa                                                                      <div className="flex flex-wr                                                                  size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildStudioEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyStudioEdits} disabled={changedStudioCount === 0}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Input value={studioSearch} onChange={(e) => setStudioSearch(e.target.value)} placeholder="studio name" />
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">Studio</TableHead>
                              <TableHead className="p-2">Budget</TableHead>
                              <TableHead className="p-2">Reputation</TableHead>
                              <TableHead className="p-2">Specialties</TableHead>
                              <TableHead className="p-2">Risk</TableHead>
                              <TableHead className="p-2">Releases/yr</TableHead>
                              <TableHead className="p-2">Founded</TableHead>
                              <TableHead className="p-2">Brand</TableHead>
                              <TableHead className="p-2">Business tendency</TableHead>
                              <TableHead className="p-2">Personality</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {baseStudioProfiles
                              .filter((s) => {
                                const q = studioSearch.trim().toLowerCase();
                                if (!q) return true;
                                return s.name.toLowerCase().includes(q);
                              })
                              .map((s) => {
                                const edited = studioEdits[s.name] ?? s;
                                const isChanged = !deepEqual(stripUndefined(s), stripUndefined(edited));

                                return (
                                  <TableRow key={s.name} className={isChanged ? 'bg-muted/30' : undefined}>
                                    <TableCell className="p-2 min-w-[220px]">{s.name}</TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[140px]"
                                        type="number"
                                        value={String(edited.budget)}
                                        onChange={(e) => updateStudio(s.name, { budget: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[110px]"
                                        type="number"
                                        value={String(edited.reputation)}
                                        onChange={(e) => updateStudio(s.name, { reputation: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={(edited.specialties || []).join(', ')}
                                        onChange={(e) => updateStudioSpecialties(s.name, e.target.value)}
                                        placeholder="drama, comedy"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select
                                        value={edited.riskTolerance}
                                        onValueChange={(v) => updateStudio(s.name, { riskTolerance: v as any })}
                                      >
                                        <SelectTrigger className="h-8 w-[140px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="conservative">conservative</SelectItem>
                                          <SelectItem value="moderate">moderate</SelectItem>
                                          <SelectItem value="aggressive">aggressive</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[120px]"
                                        type="number"
                                        value={String(edited.releaseFrequency)}
                                        onChange={(e) => updateStudio(s.name, { releaseFrequency: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                                 <Input
                                        className="h-8 w-[100px]"
                                        type="number"
                                        value={edited.foundedYear ? String(edited.foundedYear) : ''}
                                        onChange={(e) => updateStudio(s.name, { foundedYear: e.target.value ? Number(e.target.value) || undefined : undefined })}
                                        placeholder="(auto)"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={edited.brandIdentity}
                                        onChange={(e) => updateStudio(s.name, { brandIdentity: e.target.value })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[240px]"
                                        value={edited.businessTendency}
                                        onChange={(e) => updateStudio(s.name, { businessTendency: e.target.value })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[260px]"
                                        value={edited.personality}
                                        onChange={(e) => updateStudio(s.name, { personality: e.target.value })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleResetStudioRow(s.name)}>
                                          Reset
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: this edits AI competitor studio profiles. Applying changes writes full-record <code>studioProfile</code> update patches keyed by studio name.
                        </p>
                      </TabsContent>

                      <TabsContent value="mediaSources" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Media Sources: <span className="font-medium text-foreground">{changedMediaSourceCount}</span> changed
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildMediaSourceEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyMediaSourceEdits} disabled={changedMediaSourceCount === 0}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Input value={mediaSourceSearch} onChange={(e) => setMediaSourceSearch(e.target.value)} placeholder="name or id" />
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">ID</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">Type</TableHead>
                              <TableHead className="p-2">Cred</TableHead>
                              <TableHead className="p-2">Bias</TableHead>
                              <TableHead className="p-2">Reach</TableHead>
                              <TableHead className="p-2">Established</TableHead>
                              <TableHead className="p-2">Specialties</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {baseMediaSources
                              .filter((s) => {
                                const q = mediaSourceSearch.trim().toLowerCase();
                                if (!q) return true;
                                return s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
                              })
                              .map((s) => {
                                const edited = mediaSourceEdits[s.id] ?? s;
                                const isChanged = !deepEqual(stripUndefined(s), stripUndefined(edited));

                                return (
                                  <TableRow key={s.id} className={isChanged ? 'bg-muted/30' : undefined}>
                                    <TableCell className="p-2 font-mono text-xs">{s.id}</TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 min-w-[200px]" value={edited.name} onChange={(e) => updateMediaSource(s.id, { name: e.target.value })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.type} onValueChange={(v) => updateMediaSource(s.id, { type: v as any })}>
                                        <SelectTrigger className="h-8 w-[170px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="newspaper">newspaper</SelectItem>
                                          <SelectItem value="magazine">magazine</SelectItem>
                                          <SelectItem value="blog">blog</SelectItem>
                                          <SelectItem value="social_media">social_media</SelectItem>
                                          <SelectItem value="trade_publication">trade_publication</SelectItem>
                                          <SelectItem value="tv_network">tv_network</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.credibility)}
                                        onChange={(e) => updateMediaSource(s.id, { credibility: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.bias)}
                                        onChange={(e) => updateMediaSource(s.id, { bias: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.reach)}
                                        onChange={(e) => updateMediaSource(s.id, { reach: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[110px]"
                                        type="number"
                                        value={String(edited.established)}
                                        onChange={(e) => updateMediaSource(s.id, { established: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[240px]"
                                        value={(edited.specialties || []).join(', ')}
                                        onChange={(e) => updateMediaSourceSpecialties(s.id, e.target.value)}
                                        placeholder="drama, comedy"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleResetMediaSourceRow(s.id)}>
                                          Reset
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: this edits the media outlets used by the media engine. Applying changes writes full-record <code>mediaSource</code> update patches keyed by media source id.
                        </p>
                      </TabsContent>

                      <TabsContent value="publicDomain" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Public Domain IP: <span className="font-medium text-foreground">{changedPublicDomainCount}</span> changed
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildPublicDomainEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyPublicDomainEdits}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">ID</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">Type</TableHead>
                              <TableHead className="p-2">Reputation</TableHead>
                              <TableHead className="p-2">Fatigue</TableHead>
                              <TableHead className="p-2">Relevance</TableHead>
                              <TableHead className="p-2">Date</TableHead>
                              <TableHead className="p-2">Last adapt</TableHead>
                              <TableHead className="p-2">Cost</TableHead>
                              <TableHead className="p-2">Genres</TableHead>
                              <TableHead className="p-2">Core elements</TableHead>
                              <TableHead className="p-2">Required elements</TableHead>
                              <TableHead className="p-2">Notable adaptations</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {basePublicDomainIPs.map((base) => {
                              const edited = publicDomainEdits[base.id] ?? base;
                              const isChanged = !deepEqual(stripUndefined(base), stripUndefined(edited));

                              return (
                                <TableRow key={base.id} className={isChanged ? 'bg-muted/30' : undefined}>
                                  <TableCell className="p-2 font-mono text-xs">{base.id}</TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[200px]"
                                      value={edited.name}
                                      onChange={(e) => updatePublicDomain(base.id, { name: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={edited.domainType}
                                      onValueChange={(v) => updatePublicDomain(base.id, { domainType: v as any })}
                                    >
                                      <SelectTrigger className="h-8 w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="literature">literature</SelectItem>
                                        <SelectItem value="mythology">mythology</SelectItem>
                                        <SelectItem value="folklore">folklore</SelectItem>
                                        <SelectItem value="historical">historical</SelectItem>
                                        <SelectItem value="religious">religious</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[110px]"
                                      type="number"
                                      value={String(edited.reputationScore)}
                                      onChange={(e) => updatePublicDomain(base.id, { reputationScore: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[110px]"
                                      type="number"
                                      value={String(edited.adaptationFatigue ?? 0)}
                                      onChange={(e) => updatePublicDomain(base.id, { adaptationFatigue: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[110px]"
                                      type="number"
                                      value={String(edited.culturalRelevance ?? 0)}
                                      onChange={(e) => updatePublicDomain(base.id, { culturalRelevance: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[140px]"
                                      value={edited.dateEnteredDomain}
                                      onChange={(e) => updatePublicDomain(base.id, { dateEnteredDomain: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[140px]"
                                      value={edited.lastAdaptationDate ?? ''}
                                      onChange={(e) => updatePublicDomain(base.id, { lastAdaptationDate: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[110px]"
                                      type="number"
                                      value={String(edited.cost ?? 0)}
                                      onChange={(e) => updatePublicDomain(base.id, { cost: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[220px]"
                                      value={(edited.genreFlexibility || []).join(', ')}
                                      onChange={(e) => updatePublicDomainGenreList(base.id, e.target.value)}
                                      placeholder="drama, thriller"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[260px]"
                                      value={(edited.coreElements || []).join(', ')}
                                      onChange={(e) => updatePublicDomainStringList(base.id, 'coreElements', e.target.value)}
                                      placeholder="themes, settings, characters"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[240px]"
                                      value={(edited.requiredElements || []).join(', ')}
                                      onChange={(e) => updatePublicDomainStringList(base.id, 'requiredElements', e.target.value)}
                                      placeholder="must include"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[240px]"
                                      value={(edited.notableAdaptations || []).join(', ')}
                                      onChange={(e) => updatePublicDomainStringList(base.id, 'notableAdaptations', e.target.value)}
                                      placeholder="film ids"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[260px]"
                                      value={edited.description ?? ''}
                                      onChange={(e) => updatePublicDomain(base.id, { description: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleResetPublicDomainRow(base.id)}>
                                        Reset
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: the <code>Genres</code>, <code>Core elements</code>, and <code>Required elements</code> fields accept a comma-separated list.
                        </p>
                      </TabsContent>

                      <TabsContent value="publicDomainCharacters" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Suggested Characters: <span className="font-medium text-foreground">{publicDomainCharactersKey || '(none)'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const id = publicDomainCharactersKey;
                                if (!id) return;

                                const modId = editorModId.trim();
                                if (!modId) return;

                                const modInfo = bundle.mods.find((m) => m.id === modId) ?? makeDefaultMod(modId);
                                const editorBundle: ModBundle = {
                                  version: 1,
                                  mods: [{ ...modInfo, enabled: true }],
                                  patches: (bundle.patches || []).filter((p) => p.modId === modId && p.entityType === 'publicDomainIP'),
                                };

                                const patched = applyPatchesByKey(
                                  basePublicDomainIPs,
                                  getPatchesForEntity(editorBundle, 'publicDomainIP'),
                                  (p) => p.id
                                );
                                const next = patched.find((p) => p.id === id) ?? basePublicDomainById.get(id);
                                setPublicDomainCharacters(id, (next?.suggestedCharacters as ScriptCharacter[] | undefined) || []);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleAddPublicDomainCharacterRow}>
                              Add character
                            </Button>
                            <Button size="sm" onClick={handleApplyPublicDomainEdits}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Public domain IP</Label>
                            <Select value={publicDomainCharactersKey} onValueChange={setPublicDomainCharactersKey}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select IP" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set([...basePublicDomainIPs.map((p) => p.id), publicDomainCharactersKey]))
                                  .filter((k) => !!k)
                                  .map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {k}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">id</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">Importance</TableHead>
                              <TableHead className="p-2">Type</TableHead>
                              <TableHead className="p-2">Gender</TableHead>
                              <TableHead className="p-2">Race</TableHead>
                              <TableHead className="p-2">Nationality</TableHead>
                              <TableHead className="p-2">Min age</TableHead>
                              <TableHead className="p-2">Max age</TableHead>
                              <TableHead className="p-2">Traits</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPublicDomainCharacters(publicDomainCharactersKey).map((c, idx) => {
                              const minAge = c.ageRange?.[0] ?? 0;
                              const maxAge = c.ageRange?.[1] ?? 0;

                              return (
                                <TableRow key={`${c.id}-${idx}`}>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[160px] font-mono text-xs"
                                      value={c.id}
                                      onChange={(e) => updatePublicDomainCharacterRow(idx, { id: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[180px]"
                                      value={c.name}
                                      onChange={(e) => updatePublicDomainCharacterRow(idx, { name: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select value={c.importance} onValueChange={(v) => updatePublicDomainCharacterRow(idx, { importance: v as any })}>
                                      <SelectTrigger className="h-8 w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lead">lead</SelectItem>
                                        <SelectItem value="supporting">supporting</SelectItem>
                                        <SelectItem value="minor">minor</SelectItem>
                                        <SelectItem value="crew">crew</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select value={c.requiredType ?? 'actor'} onValueChange={(v) => updatePublicDomainCharacterRow(idx, { requiredType: v as any })}>
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="actor">actor</SelectItem>
                                        <SelectItem value="director">director</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={c.requiredGender ?? 'any'}
                                      onValueChange={(v) => updatePublicDomainCharacterRow(idx, { requiredGender: v === 'any' ? undefined : (v as any) })}
                                    >
                                      <SelectTrigger className="h-8 w-[110px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="any">any</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={c.requiredRace ?? 'any'}
                                      onValueChange={(v) => updatePublicDomainCharacterRow(idx, { requiredRace: v === 'any' ? undefined : (v as any) })}
                                    >
                                      <SelectTrigger className="h-8 w-[160px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="any">any</SelectItem>
                                        <SelectItem value="White">White</SelectItem>
                                        <SelectItem value="Black">Black</SelectItem>
                                        <SelectItem value="Asian">Asian</SelectItem>
                                        <SelectItem value="Latino">Latino</SelectItem>
                                        <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                                        <SelectItem value="Indigenous">Indigenous</SelectItem>
                                        <SelectItem value="Mixed">Mixed</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[160px]"
                                      value={c.requiredNationality ?? ''}
                                      onChange={(e) => updatePublicDomainCharacterRow(idx, { requiredNationality: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[90px]"
                                      type="number"
                                      value={String(minAge)}
                                      onChange={(e) => updatePublicDomainCharacterRow(idx, { ageRange: [Number(e.target.value) || 0, maxAge] })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[90px]"
                                      type="number"
                                      value={String(maxAge)}
                                      onChange={(e) => updatePublicDomainCharacterRow(idx, { ageRange: [minAge, Number(e.target.value) || 0] })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[200px]"
                                      value={(c.traits || []).join(', ')}
                                      onChange={(e) => updatePublicDomainCharacterTraits(idx, e.target.value)}
                                      placeholder="brave, stoic"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[220px]"
                                      value={c.description ?? ''}
                                      onChange={(e) => updatePublicDomainCharacterRow(idx, { description: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleDeletePublicDomainCharacterRow(idx)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: edit the grid, then click <strong>Apply changes</strong> to generate <code>publicDomainIP</code> patches.
                        </p>
                      </TabsContent>

                      <TabsContent value="franchiseRoles" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Franchise Role Set: <span className="font-medium text-foreground">{roleSetIsChanged ? 'changed' : 'no changes'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildRoleSetRows(bundle, modId, roleSetKey);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleAddRoleRow}>
                              Add role
                            </Button>
                            <Button size="sm" onClick={handleApplyRoleSetEdits} disabled={!roleSetIsChanged}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Parody source key</Label>
                            <Select value={roleSetKey} onValueChange={setRoleSetKey}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select franchise parody source" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set([...baseFranchiseRoleSetKeys, roleSetKey]))
                                  .filter((k) => !!k)
                                  .map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {k}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">Role id</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">franchiseCharacterId</TableHead>
                              <TableHead className="p-2">roleTemplateId</TableHead>
                              <TableHead className="p-2">Importance</TableHead>
                              <TableHead className="p-2">Required type</TableHead>
                              <TableHead className="p-2">Gender</TableHead>
                              <TableHead className="p-2">Race</TableHead>
                              <TableHead className="p-2">Nationality</TableHead>
                              <TableHead className="p-2">Min age</TableHead>
                              <TableHead className="p-2">Max age</TableHead>
                              <TableHead className="p-2">Traits</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {roleSetRows.map((r, idx) => {
                              const minAge = r.ageRange?.[0] ?? 0;
                              const maxAge = r.ageRange?.[1] ?? 0;

                              return (
                                <TableRow key={`${r.id}-${idx}`}>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[160px] font-mono text-xs"
                                      value={r.id}
                                      onChange={(e) => updateRoleRow(idx, { id: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[180px]"
                                      value={r.name}
                                      onChange={(e) => updateRoleRow(idx, { name: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[180px] font-mono text-xs"
                                      value={r.franchiseCharacterId ?? ''}
                                      onChange={(e) => updateRoleRow(idx, { franchiseCharacterId: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[180px] font-mono text-xs"
                                      value={r.roleTemplateId ?? ''}
                                      onChange={(e) => updateRoleRow(idx, { roleTemplateId: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={r.importance}
                                      onValueChange={(v) => updateRoleRow(idx, { importance: v as any })}
                                    >
                                      <SelectTrigger className="h-8 w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lead">lead</SelectItem>
                                        <SelectItem value="supporting">supporting</SelectItem>
                                        <SelectItem value="minor">minor</SelectItem>
                                        <SelectItem value="crew">crew</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={r.requiredType ?? 'actor'}
                                      onValueChange={(v) => updateRoleRow(idx, { requiredType: v as any })}
                                    >
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="actor">actor</SelectItem>
                                        <SelectItem value="director">director</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={r.requiredGender ?? 'any'}
                                      onValueChange={(v) => updateRoleRow(idx, { requiredGender: v === 'any' ? undefined : (v as any) })}
                                    >
                                      <SelectTrigger className="h-8 w-[110px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="any">any</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={r.requiredRace ?? 'any'}
                                      onValueChange={(v) => updateRoleRow(idx, { requiredRace: v === 'any' ? undefined : (v as any) })}
                                    >
                                      <SelectTrigger className="h-8 w-[160px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="any">any</SelectItem>
                                        <SelectItem value="White">White</SelectItem>
                                        <SelectItem value="Black">Black</SelectItem>
                                        <SelectItem value="Asian">Asian</SelectItem>
                                        <SelectItem value="Latino">Latino</SelectItem>
                                        <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                                        <SelectItem value="Indigenous">Indigenous</SelectItem>
                                        <SelectItem value="Mixed">Mixed</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[160px]"
                                      value={r.requiredNationality ?? ''}
                                      onChange={(e) => updateRoleRow(idx, { requiredNationality: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[90px]"
                                      type="number"
                                      value={String(minAge)}
                                      onChange={(e) => updateRoleRow(idx, { ageRange: [Number(e.target.value) || 0, maxAge] })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[90px]"
                                      type="number"
                                      value={String(maxAge)}
                                      onChange={(e) => updateRoleRow(idx, { ageRange: [minAge, Number(e.target.value) || 0] })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[200px]"
                                      value={(r.traits || []).join(', ')}
                                      onChange={(e) => updateRoleTraits(idx, e.target.value)}
                                      placeholder="brave, stoic"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[220px]"
                                      value={r.description ?? ''}
                                      onChange={(e) => updateRoleRow(idx, { description: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteRoleRow(idx)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: this generates a single <code>franchiseRoleSet</code> update patch for the selected parody source key.
                        </p>
                      </TabsContent>

                      <TabsContent value="parodyNames" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Parody Names: <span className="font-medium text-foreground">{parodyNamesIsChanged ? 'changed' : 'no changes'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildParodyCharacterNamesRows(bundle, modId, parodyNamesKey);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyParodyCharacterNamesEdits} disabled={!parodyNamesIsChanged}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Parody source key</Label>
                            <Select value={parodyNamesKey} onValueChange={setParodyNamesKey}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select key" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set([...Object.keys(PARODY_CHARACTER_NAME_MAP), parodyNamesKey]))
                                  .filter((k) => !!k)
                                  .map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {k}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">By Character ID</div>
                            <Button size="sm" variant="secondary" onClick={handleAddParodyByCharacterIdRow}>
                              Add mapping
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="p-2">character_id</TableHead>
                                <TableHead className="p-2">Name</TableHead>
                                <TableHead className="p-2"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parodyByCharacterIdRows.map((row, idx) => (
                                <TableRow key={`${row.key}-${idx}`}>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[220px] font-mono text-xs"
                                      value={row.key}
                                      onChange={(e) => updateParodyByCharacterIdRow(idx, { key: e.target.value })}
                                      placeholder="char_hero_pilot"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[260px]"
                                      value={row.value}
                                      onChange={(e) => updateParodyByCharacterIdRow(idx, { value: e.target.value })}
                                      placeholder="Luke Starwalker"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteParodyByCharacterIdRow(idx)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">By Template ID</div>
                            <Button size="sm" variant="secondary" onClick={handleAddParodyByTemplateIdRow}>
                              Add mapping
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="p-2">role_template_id</TableHead>
                                <TableHead className="p-2">Name</TableHead>
                                <TableHead className="p-2"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parodyByTemplateIdRows.map((row, idx) => (
                                <TableRow key={`${row.key}-${idx}`}>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[220px] font-mono text-xs"
                                      value={row.key}
                                      onChange={(e) => updateParodyByTemplateIdRow(idx, { key: e.target.value })}
                                      placeholder="lead_hero"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[260px]"
                                      value={row.value}
                                      onChange={(e) => updateParodyByTemplateIdRow(idx, { value: e.target.value })}
                                      placeholder="Luke Starwalker"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteParodyByTemplateIdRow(idx)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Tip: this affects role import name resolution for franchises with a matching <code>parodySource</code>.
                        </p>
                      </TabsContent>

                      <TabsContent value="franchiseCharacters" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Franchise Character DB: <span className="font-medium text-foreground">{characterDbIsChanged ? 'changed' : 'no changes'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildCharacterDbRows(bundle, modId, characterDbKey);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleAddCharacterRow}>
                              Add character
                            </Button>
                            <Button size="sm" onClick={handleApplyCharacterDbEdits} disabled={!characterDbIsChanged}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Parody source / franchise key</Label>
                            <Select value={characterDbKey} onValueChange={setCharacterDbKey}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select key" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set([...baseFranchiseCharacterDbKeys, characterDbKey]))
                                  .filter((k) => !!k)
                                  .map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {k}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">character_id</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">role_template_id</TableHead>
                              <TableHead className="p-2">Importance</TableHead>
                              <TableHead className="p-2">Type</TableHead>
                              <TableHead className="p-2">Mandatory</TableHead>
                              <TableHead className="p-2">Min age</TableHead>
                              <TableHead className="p-2">Max age</TableHead>
                              <TableHead className="p-2">Traits</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {characterDbRows.map((c, idx) => {
                              const minAge = c.ageRange?.[0] ?? 0;
                              const maxAge = c.ageRange?.[1] ?? 0;

                              return (
                                <TableRow key={`${c.character_id}-${idx}`}>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[180px] font-mono text-xs"
                                      value={c.character_id}
                                      onChange={(e) => updateCharacterRow(idx, { character_id: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[180px]"
                                      value={c.name}
                                      onChange={(e) => updateCharacterRow(idx, { name: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[170px] font-mono text-xs"
                                      value={c.role_template_id}
                                      onChange={(e) => updateCharacterRow(idx, { role_template_id: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select value={c.importance} onValueChange={(v) => updateCharacterRow(idx, { importance: v as any })}>
                                      <SelectTrigger className="h-8 w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lead">lead</SelectItem>
                                        <SelectItem value="supporting">supporting</SelectItem>
                                        <SelectItem value="minor">minor</SelectItem>
                                        <SelectItem value="crew">crew</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Select
                                      value={c.requiredType ?? 'actor'}
                                      onValueChange={(v) => updateCharacterRow(idx, { requiredType: v as any })}
                                    >
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="actor">actor</SelectItem>
                                        <SelectItem value="director">director</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="h-8 flex items-center">
                                      <Switch
                                        checked={!!c.is_mandatory}
                                        onCheckedChange={(checked) => updateCharacterRow(idx, { is_mandatory: checked })}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[90px]"
                                      type="number"
                                      value={String(minAge)}
                                      onChange={(e) => updateCharacterRow(idx, { ageRange: [Number(e.target.value) || 0, maxAge] })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[90px]"
                                      type="number"
                                      value={String(maxAge)}
                                      onChange={(e) => updateCharacterRow(idx, { ageRange: [minAge, Number(e.target.value) || 0] })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[200px]"
                                      value={(c.traits || []).join(', ')}
                                      onChange={(e) => updateCharacterTraits(idx, e.target.value)}
                                      placeholder="brave, stoic"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 min-w-[220px]"
                                      value={c.description ?? ''}
                                      onChange={(e) => updateCharacterRow(idx, { description: e.target.value || undefined })}
                                      placeholder="(optional)"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCharacterRow(idx)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: this generates a single <code>franchiseCharacterDb</code> update patch for the selected key.
                        </p>
                      </TabsContent>

                      <TabsContent value="talent" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Core Talent: <span className="font-medium text-foreground">{changedTalentCount}</span> changed
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildTalentEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyTalentEdits} disabled={changedTalentCount === 0}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Search</Label>
                            <Input value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} placeholder="name or id" />
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">ID</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">Type</TableHead>
                              <TableHead className="p-2">Age</TableHead>
                              <TableHead className="p-2">Gender</TableHead>
                              <TableHead className="p-2">Race</TableHead>
                              <TableHead className="p-2">Nationality</TableHead>
                              <TableHead className="p-2">Exp</TableHead>
                              <TableHead className="p-2">Contract</TableHead>
                              <TableHead className="p-2">Reputation</TableHead>
                              <TableHead className="p-2">Market value</TableHead>
                              <TableHead className="p-2">Fame</TableHead>
                              <TableHead className="p-2">Public image</TableHead>
                              <TableHead className="p-2">Career</TableHead>
                              <TableHead className="p-2">Specialties</TableHead>
                              <TableHead className="p-2">Genres</TableHead>
                              <TableHead className="p-2">Traits</TableHead>
                              <TableHead className="p-2">Archetype</TableHead>
                              <TableHead className="p-2">Biography</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {baseCoreTalent
                              .filter((t) => {
                                const q = talentSearch.trim().toLowerCase();
                                if (!q) return true;
                                return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
                              })
                              .map((t) => {
                                const edited = talentEdits[t.id] ?? pickTalentEdit(t);

                                return (
                                  <TableRow key={t.id} className={!deepEqual(stripUndefined(pickTalentEdit(t)), stripUndefined(edited)) ? 'bg-muted/30' : undefined}>
                                    <TableCell className="p-2 font-mono text-xs">{t.id}</TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 min-w-[200px]" value={edited.name} onChange={(e) => updateTalent(t.id, { name: e.target.value })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.type} onValueChange={(v) => updateTalent(t.id, { type: v as any })}>
                                        <SelectTrigger className="h-8 w-[160px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="actor">actor</SelectItem>
                                          <SelectItem value="director">director</SelectItem>
                                          <SelectItem value="writer">writer</SelectItem>
                                          <SelectItem value="producer">producer</SelectItem>
                                          <SelectItem value="cinematographer">cinematographer</SelectItem>
                                          <SelectItem value="editor">editor</SelectItem>
                                          <SelectItem value="composer">composer</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[80px]"
                                        type="number"
                                        value={String(edited.age)}
                                        onChange={(e) => updateTalent(t.id, { age: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.gender ?? 'Male'} onValueChange={(v) => updateTalent(t.id, { gender: v as any })}>
                                        <SelectTrigger className="h-8 w-[120px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Male">Male</SelectItem>
                                          <SelectItem value="Female">Female</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.race ?? 'any'} onValueChange={(v) => updateTalent(t.id, { race: v === 'any' ? undefined : (v as any) })}>
                                        <SelectTrigger className="h-8 w-[160px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="any">any</SelectItem>
                                          <SelectItem value="White">White</SelectItem>
                                          <SelectItem value="Black">Black</SelectItem>
                                          <SelectItem value="Asian">Asian</SelectItem>
                                          <SelectItem value="Latino">Latino</SelectItem>
                                          <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                                          <SelectItem value="Indigenous">Indigenous</SelectItem>
                                          <SelectItem value="Mixed">Mixed</SelectItem>
                                          <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[160px]"
                                        value={edited.nationality ?? ''}
                                        onChange={(e) => updateTalent(t.id, { nationality: e.target.value || undefined })}
                                        placeholder="(optional)"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.experience)}
                                        onChange={(e) => updateTalent(t.id, { experience: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.contractStatus} onValueChange={(v) => updateTalent(t.id, { contractStatus: v as any })}>
                                        <SelectTrigger className="h-8 w-[140px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="available">available</SelectItem>
                                          <SelectItem value="contracted">contracted</SelectItem>
                                          <SelectItem value="exclusive">exclusive</SelectItem>
                                          <SelectItem value="busy">busy</SelectItem>
                                          <SelectItem value="retired">retired</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[120px]"
                                        type="number"
                                        value={String(edited.reputation)}
                                        onChange={(e) => updateTalent(t.id, { reputation: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[140px]"
                                        type="number"
                                        value={String(edited.marketValue)}
                                        onChange={(e) => updateTalent(t.id, { marketValue: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.fame ?? 0)}
                                        onChange={(e) => updateTalent(t.id, { fame: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[100px]"
                                        type="number"
                                        value={String(edited.publicImage ?? 0)}
                                        onChange={(e) => updateTalent(t.id, { publicImage: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.careerStage ?? 'unknown'} onValueChange={(v) => updateTalent(t.id, { careerStage: v as any })}>
                                        <SelectTrigger className="h-8 w-[140px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unknown">unknown</SelectItem>
                                          <SelectItem value="rising">rising</SelectItem>
                                          <SelectItem value="established">established</SelectItem>
                                          <SelectItem value="veteran">veteran</SelectItem>
                                          <SelectItem value="legend">legend</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={(edited.specialties || []).join(', ')}
                                        onChange={(e) => updateTalentSpecialties(t.id, e.target.value)}
                                        placeholder="drama, thriller"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={(edited.genres || []).join(', ')}
                                        onChange={(e) => updateTalentGenres(t.id, e.target.value)}
                                        placeholder="drama, thriller"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={(edited.traits || []).join(', ')}
                                        onChange={(e) => updateTalentTraits(t.id, e.target.value)}
                                        placeholder="reliable, intense"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={edited.archetype ?? ''}
                                        onChange={(e) => updateTalent(t.id, { archetype: e.target.value || undefined })}
                                        placeholder="(optional)"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[260px]"
                                        value={edited.biography ?? ''}
                                        onChange={(e) => updateTalent(t.id, { biography: e.target.value || undefined })}
                                        placeholder="(optional)"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: this edits the stable <code>core:*</code> talent set (not the randomly-generated filler talent).
                        </p>
                      </TabsContent>

                      <TabsContent value="franchises" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Franchises: <span className="font-medium text-foreground">{changedFranchiseCount}</span> changed
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildFranchiseEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyFranchiseEdits} disabled={changedFranchiseCount === 0}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Search</Label>
                            <Input value={franchiseSearch} onChange={(e) => setFranchiseSearch(e.target.value)} placeholder="title, parody source, or id" />
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">ID</TableHead>
                              <TableHead className="p-2">Title</TableHead>
                              <TableHead className="p-2">Creator</TableHead>
                              <TableHead className="p-2">Status</TableHead>
                              <TableHead className="p-2">Tone</TableHead>
                              <TableHead className="p-2">Genres</TableHead>
                              <TableHead className="p-2">Parody source</TableHead>
                              <TableHead className="p-2">Origin date</TableHead>
                              <TableHead className="p-2">Entries</TableHead>
                              <TableHead className="p-2">Last entry</TableHead>
                              <TableHead className="p-2">Total BO</TableHead>
                              <TableHead className="p-2">Avg rating</TableHead>
                              <TableHead className="p-2">Cultural</TableHead>
                              <TableHead className="p-2">Merch</TableHead>
                              <TableHead className="p-2">Fanbase</TableHead>
                              <TableHead className="p-2">Fatigue</TableHead>
                              <TableHead className="p-2">Cost</TableHead>
                              <TableHead className="p-2">Tags</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {baseFranchises
                              .filter((f) => {
                                const q = franchiseSearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  f.id.toLowerCase().includes(q) ||
                                  f.title.toLowerCase().includes(q) ||
                                  (f.parodySource || '').toLowerCase().includes(q)
                                );
                              })
                              .map((f) => {
                                const edited = franchiseEdits[f.id] ?? f;
                                const isChanged = !deepEqual(stripUndefined(f), stripUndefined(edited));

                                return (
                                  <TableRow key={f.id} className={isChanged ? 'bg-muted/30' : undefined}>
                                    <TableCell className="p-2 font-mono text-xs">{f.id}</TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[200px]"
                                        value={edited.title}
                                        onChange={(e) => updateFranchise(f.id, { title: e.target.value })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[140px] font-mono text-xs"
                                        value={edited.creatorStudioId}
                                        onChange={(e) => updateFranchise(f.id, { creatorStudioId: e.target.value })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.status} onValueChange={(v) => updateFranchise(f.id, { status: v as any })}>
                                        <SelectTrigger className="h-8 w-[140px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="active">active</SelectItem>
                                          <SelectItem value="dormant">dormant</SelectItem>
                                          <SelectItem value="rebooted">rebooted</SelectItem>
                                          <SelectItem value="retired">retired</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.tone} onValueChange={(v) => updateFranchise(f.id, { tone: v as any })}>
                                        <SelectTrigger className="h-8 w-[130px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="dark">dark</SelectItem>
                                          <SelectItem value="light">light</SelectItem>
                                          <SelectItem value="pulpy">pulpy</SelectItem>
                                          <SelectItem value="serious">serious</SelectItem>
                                          <SelectItem value="comedic">comedic</SelectItem>
                                          <SelectItem value="epic">epic</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[180px]"
                                        value={(edited.genre || []).join(', ')}
                                        onChange={(e) => updateFranchiseGenres(f.id, e.target.value)}
                                        placeholder="action, sci-fi"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[200px]"
                                        value={edited.parodySource ?? ''}
                                        onChange={(e) => updateFranchise(f.id, { parodySource: e.target.value || undefined })}
                                        placeholder="(optional)"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[140px]"
                                        value={edited.originDate}
                                        onChange={(e) => updateFranchise(f.id, { originDate: e.target.value })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={(edited.entries || []).join(', ')}
                                        onChange={(e) => updateFranchiseEntries(f.id, e.target.value)}
                                        placeholder="film ids"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[140px]"
                                        value={edited.lastEntryDate ?? ''}
                                        onChange={(e) => updateFranchise(f.id, { lastEntryDate: e.target.value || undefined })}
                                        placeholder="(optional)"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[140px]"
                                        type="number"
                                        value={String(edited.totalBoxOffice ?? 0)}
                                        onChange={(e) => updateFranchise(f.id, { totalBoxOffice: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[110px]"
                                        type="number"
                                        value={String(edited.averageRating ?? 0)}
                                        onChange={(e) => updateFranchise(f.id, { averageRating: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.culturalWeight)}
                                        onChange={(e) => updateFranchise(f.id, { culturalWeight: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[90px]"
                                        type="number"
                                        value={String(edited.merchandisingPotential ?? 0)}
                                        onChange={(e) => updateFranchise(f.id, { merchandisingPotential: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[120px]"
                                        type="number"
                                        value={String(edited.fanbaseSize ?? 0)}
                                        onChange={(e) => updateFranchise(f.id, { fanbaseSize: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[110px]"
                                        type="number"
                                        value={String(edited.criticalFatigue ?? 0)}
                                        onChange={(e) => updateFranchise(f.id, { criticalFatigue: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 w-[120px]"
                                        type="number"
                                        value={String(edited.cost)}
                                        onChange={(e) => updateFranchise(f.id, { cost: Number(e.target.value) || 0 })}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[220px]"
                                        value={(edited.franchiseTags || []).join(', ')}
                                        onChange={(e) => updateFranchiseTags(f.id, e.target.value)}
                                        placeholder="space, rebellion"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        className="h-8 min-w-[260px]"
                                        value={edited.description ?? ''}
                                        onChange={(e) => updateFranchise(f.id, { description: e.target.value || undefined })}
                                        placeholder="(optional)"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: Franchise defaults are randomly generated. Applying changes writes full-record <code>franchise</code> update patches keyed by franchise id.
                        </p>
                      </TabsContent>

                      <TabsContent value="awardShows" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Award Shows: <span className="font-medium text-foreground">{changedAwardShowCount}</span> changed
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildAwardShowEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" onClick={handleApplyAwardShowEdits} disabled={changedAwardShowCount === 0}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Search</Label>
                            <Input value={awardShowSearch} onChange={(e) => setAwardShowSearch(e.target.value)} placeholder="name or id" />
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-2">ID</TableHead>
                              <TableHead className="p-2">Name</TableHead>
                              <TableHead className="p-2">Medium</TableHead>
                              <TableHead className="p-2">Nom week</TableHead>
                              <TableHead className="p-2">Ceremony week</TableHead>
                              <TableHead className="p-2">Cutoff week</TableHead>
                              <TableHead className="p-2">Prestige</TableHead>
                              <TableHead className="p-2">Momentum</TableHead>
                              <TableHead className="p-2">Categories</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {baseAwardShows
                              .filter((s) => {
                                const q = awardShowSearch.trim().toLowerCase();
                                if (!q) return true;
                                return s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
                              })
                              .map((s) => {
                                const edited = awardShowEdits[s.id] ?? s;
                                const isChanged = !deepEqual(stripUndefined(s), stripUndefined(edited));

                                return (
                                  <TableRow key={s.id} className={isChanged ? 'bg-muted/30' : undefined}>
                                    <TableCell className="p-2 font-mono text-xs">{s.id}</TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 min-w-[200px]" value={edited.name} onChange={(e) => updateAwardShow(s.id, { name: e.target.value })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Select value={edited.medium} onValueChange={(v) => updateAwardShow(s.id, { medium: v as any })}>
                                        <SelectTrigger className="h-8 w-[110px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="film">film</SelectItem>
                                          <SelectItem value="tv">tv</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 w-[90px]" type="number" value={String(edited.nominationWeek)} onChange={(e) => updateAwardShow(s.id, { nominationWeek: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 w-[90px]" type="number" value={String(edited.ceremonyWeek)} onChange={(e) => updateAwardShow(s.id, { ceremonyWeek: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 w-[90px]" type="number" value={String(edited.eligibilityCutoffWeek)} onChange={(e) => updateAwardShow(s.id, { eligibilityCutoffWeek: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 w-[90px]" type="number" value={String(edited.prestige)} onChange={(e) => updateAwardShow(s.id, { prestige: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input className="h-8 w-[90px]" type="number" value={String(edited.momentumBonus)} onChange={(e) => updateAwardShow(s.id, { momentumBonus: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Badge variant="outline">{(edited.categories || []).length}</Badge>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => { setAwardShowKey(s.id); }}>
                                          Edit categories
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleResetAwardShowRow(s.id)}>
                                          Reset
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        <p className="text-xs text-muted-foreground">
                          Tip: Apply changes generates <code>awardShow</code> update patches keyed by show id.
                        </p>
                      </TabsContent>

                      <TabsContent value="awardCategories" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            Award Categories: <span className="font-medium text-foreground">{awardShowKey}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const modId = editorModId.trim();
                                if (!modId) return;
                                rebuildAwardShowEdits(bundle, modId);
                              }}
                            >
                              Reset view
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleAddAwardCategoryRow(awardShowKey)}>
                              Add category
                            </Button>
                            <Button size="sm" onClick={handleApplyAwardShowEdits} disabled={changedAwardShowCount === 0}>
                              Apply changes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Award show</Label>
                            <Select value={awardShowKey} onValueChange={setAwardShowKey}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select show" />
                              </SelectTrigger>
                              <SelectContent>
                                {baseAwardShows.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {(() => {
                          const show = awardShowEdits[awardShowKey] ?? baseAwardShowsById.get(awardShowKey);
                          const categories = show?.categories || [];

                          if (!show) {
                            return <div className="text-sm text-muted-foreground">Unknown award show.</div>;
                          }

                          return (
                            <>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="p-2">ID</TableHead>
                                    <TableHead className="p-2">Name</TableHead>
                                    <TableHead className="p-2">Kind</TableHead>
                                    <TableHead className="p-2">Talent type</TableHead>
                                    <TableHead className="p-2">Gender</TableHead>
                                    <TableHead className="p-2">Supporting</TableHead>
                                    <TableHead className="p-2">Bias</TableHead>
                                    <TableHead className="p-2">Genres</TableHead>
                                    <TableHead className="p-2">Project types</TableHead>
                                    <TableHead className="p-2">Animation</TableHead>
                                    <TableHead className="p-2"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {categories.map((c, idx) => (
                                    <TableRow key={`${c.id}-${idx}`}>
                                      <TableCell className="p-2">
                                        <Input className="h-8 w-[160px] font-mono text-xs" value={c.id} onChange={(e) => updateAwardCategoryRow(show.id, idx, { id: e.target.value })} />
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Input className="h-8 min-w-[220px]" value={c.name} onChange={(e) => updateAwardCategoryRow(show.id, idx, { name: e.target.value })} />
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Select value={c.awardKind} onValueChange={(v) => updateAwardCategoryRow(show.id, idx, { awardKind: v as any })}>
                                          <SelectTrigger className="h-8 w-[120px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="studio">studio</SelectItem>
                                            <SelectItem value="talent">talent</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Select
                                          value={c.talent?.type ?? 'actor'}
                                          onValueChange={(v) => updateAwardCategoryRow(show.id, idx, { talent: { ...(c.talent || {}), type: v as any } })}
                                        >
                                          <SelectTrigger className="h-8 w-[120px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="actor">actor</SelectItem>
                                            <SelectItem value="director">director</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Select
                                          value={c.talent?.gender ?? 'any'}
                                          onValueChange={(v) => updateAwardCategoryRow(show.id, idx, { talent: { ...(c.talent || {}), gender: v === 'any' ? undefined : (v as any) } })}
                                        >
                                          <SelectTrigger className="h-8 w-[110px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="any">any</SelectItem>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <div className="h-8 flex items-center">
                                          <Switch
                                            checked={!!c.talent?.supporting}
                                            onCheckedChange={(checked) => updateAwardCategoryRow(show.id, idx, { talent: { ...(c.talent || {}), supporting: checked || undefined } })}
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Input className="h-8 w-[90px]" type="number" value={String(c.bias ?? 0)} onChange={(e) => updateAwardCategoryRow(show.id, idx, { bias: Number(e.target.value) || 0 })} />
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Input
                                          className="h-8 min-w-[220px]"
                                          value={(c.eligibility?.genres || []).join(', ')}
                                          onChange={(e) => updateAwardCategoryGenres(show.id, idx, e.target.value)}
                                          placeholder="drama, comedy"
                                        />
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <Input
                                          className="h-8 min-w-[220px]"
                                          value={(c.eligibility?.projectTypes || []).join(', ')}
                                          onChange={(e) => updateAwardCategoryProjectTypes(show.id, idx, e.target.value)}
                                          placeholder="series, limited-series"
                                        />
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <div className="h-8 flex items-center">
                                          <Switch
                                            checked={!!c.eligibility?.requireAnimation}
                                            onCheckedChange={(checked) => updateAwardCategoryRow(show.id, idx, { eligibility: { ...(c.eligibility || {}), requireAnimation: checked || undefined } })}
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" variant="ghost" onClick={() => handleDeleteAwardCategoryRow(show.id, idx)}>
                                            Delete
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>

                              <p className="text-xs text-muted-foreground">
                                Tip: categories are stored on the award show record; apply changes writes a full <code>awardShow</code> patch.
                              </p>
                            </>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
s are stored on the award show record; apply changes writes a full <code>awardShow</code> patch.
                              </p>
                            </>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
                   </>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
