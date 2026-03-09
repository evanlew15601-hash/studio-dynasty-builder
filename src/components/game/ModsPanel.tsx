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
import { PROVIDER_DEALS, type ProviderDealProfile, type ProviderId } from '@/data/ProviderDealsDatabase';
import { PublicDomainGenerator } from '@/data/PublicDomainGenerator';
import { FranchiseGenerator } from '@/data/FranchiseGenerator';
import { STUDIO_PROFILES, type StudioProfile } from '@/data/StudioGenerator';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';
import { MediaContentGenerator } from '@/data/MediaContentGenerator';
import { AWARD_SHOWS, type AwardCategoryDefinition, type AwardShowDefinition } from '@/data/AwardsSchedule';
import { FRANCHISE_CHARACTER_DB, type FranchiseCharacterDef } from '@/data/FranchiseCharacterDB';
import { FRANCHISE_ROLE_SETS } from '@/data/RoleDatabase';
import { PARODY_CHARACTER_NAME_MAP, type ParodyCharacterNameMapEntry } from '@/data/ParodyCharacterNames';
import { generateInitialTalentPool } from '@/data/WorldGenerator';
import type { Franchise, Genre, MediaSource, PublicDomainIP, ScriptCharacter, TalentPerson } from '@/types/game';
import type { ModBundle, ModInfo, ModOp, ModPatch } from '@/types/modding';
import { useToast } from '@/hooks/use-toast';
import { applyPatchesByKey, applyPatchesToRecord, getPatchesForEntity, normalizeModBundle } from '@/utils/modding';
import { parseCsv, toCsv } from '@/utils/csv';
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
  'mediaHeadlineTemplates',
  'mediaContentTemplates',
] as const;

const DEFAULT_MOD_VERSION = '1.0.0';

type EntityType = (typeof ENTITY_TYPES)[number];

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
  traits?: string[];
  specialties?: Genre[];
  genres: TalentPerson['genres'];
};

type NameMappingRow = { key: string; value: string };

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

function ensureMod(bundle: ModBundle, modId: string): ModBundle {
  const mods = bundle.mods || [];
  if (mods.some((m) => m.id === modId)) return bundle;
  return { ...bundle, mods: [...mods, makeDefaultMod(modId)] };
}

function upsertPatch(bundle: ModBundle, patch: ModPatch): ModBundle {
  const patches = bundle.patches || [];
  const idx = patches.findIndex((p) => p.id === patch.id);
  if (idx === -1) return { ...bundle, patches: [...patches, patch] };
  const next = patches.slice();
  next[idx] = patch;
  return { ...bundle, patches: next };
}

function removePatch(bundle: ModBundle, patchId: string): ModBundle {
  const patches = bundle.patches || [];
  if (!patches.some((p) => p.id === patchId)) return bundle;
  return { ...bundle, patches: patches.filter((p) => p.id !== patchId) };
}

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
    traits: t.traits,
    specialties: t.specialties,
    genres: t.genres,
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitListCell(value: string): string[] {
  const v = value.trim();
  if (!v) return [];
  if (v.includes('|')) {
    return v
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return splitCsv(v);
}

function joinListCell(value: string[] | undefined): string {
  return (value || []).join('|');
}

function downloadTextFile(filename: string, text: string, mime: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
    const v = row.value.trim();
    if (!k || !v) continue;
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

function patchKeyFor(bundle: ModBundle, modId: string, entityType: string): string {
  return (bundle.patches || [])
    .filter((p) => p.modId === modId && p.entityType === entityType)
    .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
    .join('|');
}

export const ModsPanel: React.FC = () => {
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement | null>(null);
  const importPublicDomainCsvRef = useRef<HTMLInputElement | null>(null);
  const importMediaSourceCsvRef = useRef<HTMLInputElement | null>(null);

  const [bundle, setBundle] = useState<ModBundle>(() => getModBundle());
  const [raw, setRaw] = useState<string>(() => JSON.stringify(getModBundle(), null, 2));
  const [savedRaw, setSavedRaw] = useState<string>(() => JSON.stringify(getModBundle(), null, 2));

  const [activeSlot, setActiveSlot] = useState<string>(() => getActiveModSlot());
  const [newSlotName, setNewSlotName] = useState('');

  const slots = useMemo(() => listModSlots(), [activeSlot]);

  const isDirty = useMemo(() => raw !== savedRaw, [raw, savedRaw]);

  // Editor
  const [editorModId, setEditorModId] = useState('my-mod');
  const [newModId, setNewModId] = useState('');
  const [isEditorDataReady, setIsEditorDataReady] = useState(false);

  const basePublicDomainIPs = useMemo(() => PublicDomainGenerator.getBasePublicDomainIPs(20), []);
  const baseFranchises = useMemo(() => FranchiseGenerator.generateInitialFranchises(30), []);
  const baseCoreTalent = useMemo(() => {
    const all = generateInitialTalentPool({ currentYear: 2024, actorCount: 0, directorCount: 0 });
    return all.filter((t) => t.id.startsWith('core:'));
  }, []);
  const baseMediaSources = useMemo(() => MediaSourceGenerator.getBaseMediaSources(), []);
  const baseMediaHeadlineTemplates = useMemo(() => MediaContentGenerator.getBaseHeadlineTemplates(), []);
  const baseMediaContentTemplates = useMemo(() => MediaContentGenerator.getBaseContentTemplates(), []);

  const baseProvidersById = useMemo(() => new Map(PROVIDER_DEALS.map((p) => [p.id, p] as const)), []);
  const basePublicDomainById = useMemo(() => new Map(basePublicDomainIPs.map((p) => [p.id, p] as const)), [basePublicDomainIPs]);
  const baseFranchiseById = useMemo(() => new Map(baseFranchises.map((f) => [f.id, f] as const)), [baseFranchises]);
  const baseTalentById = useMemo(() => new Map(baseCoreTalent.map((t) => [t.id, t] as const)), [baseCoreTalent]);
  const baseStudioByName = useMemo(() => new Map(STUDIO_PROFILES.map((s) => [s.name, s] as const)), []);
  const baseMediaById = useMemo(() => new Map(baseMediaSources.map((s) => [s.id, s] as const)), [baseMediaSources]);

  const [providerEdits, setProviderEdits] = useState<Record<string, ProviderDealProfile>>({});
  const [publicDomainSearch, setPublicDomainSearch] = useState('');
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
  const [studioSearch, setStudioSearch] = useState('');
  const [studioEdits, setStudioEdits] = useState<Record<string, StudioProfile>>({});
  const [mediaSourceSearch, setMediaSourceSearch] = useState('');
  const [mediaSourceEdits, setMediaSourceEdits] = useState<Record<string, MediaSource>>({});
  const [mediaTemplateKey, setMediaTemplateKey] = useState<string>(() => Object.keys(baseMediaHeadlineTemplates)[0] ?? 'casting_announcement');
  const [newMediaTemplateKey, setNewMediaTemplateKey] = useState('');
  const [mediaHeadlineTemplateEdits, setMediaHeadlineTemplateEdits] = useState<Record<string, string[]>>({});
  const [mediaContentTemplateEdits, setMediaContentTemplateEdits] = useState<Record<string, string[]>>({});
  const [parodyNamesKey, setParodyNamesKey] = useState<string>(() => Object.keys(PARODY_CHARACTER_NAME_MAP)[0] ?? 'Star Wars');
  const [parodyByCharacterIdRows, setParodyByCharacterIdRows] = useState<NameMappingRow[]>([]);
  const [parodyByTemplateIdRows, setParodyByTemplateIdRows] = useState<NameMappingRow[]>([]);

  const [awardShowKey, setAwardShowKey] = useState<string>(() => AWARD_SHOWS[0]?.id ?? '');
  const [awardShowEdits, setAwardShowEdits] = useState<Record<string, AwardShowDefinition>>({});

  const [restorePublicDomainId, setRestorePublicDomainId] = useState('');
  const [restoreMediaSourceId, setRestoreMediaSourceId] = useState('');
  const [restoreStudioName, setRestoreStudioName] = useState('');
  const [restoreAwardShowId, setRestoreAwardShowId] = useState('');

  const [newStudioProfileName, setNewStudioProfileName] = useState('');

  // Quick patch builder
  const [quickModId, setQuickModId] = useState('my-mod');
  const [quickEntityType, setQuickEntityType] = useState<EntityType>('providerDeal');
  const [quickOp, setQuickOp] = useState<ModOp>('update');
  const [quickTarget, setQuickTarget] = useState('');
  const [quickPayload, setQuickPayload] = useState('');

  const syncFromBundle = (next: ModBundle, markSaved: boolean = false) => {
    setBundle(next);
    const nextRaw = JSON.stringify(next, null, 2);
    setRaw(nextRaw);
    if (markSaved) setSavedRaw(nextRaw);
  };

  const parseFromRawOrToast = (): ModBundle | null => {
    try {
      const parsed = JSON.parse(raw);
      return normalizeModBundle(parsed);
    } catch {
      toast({ title: 'Invalid JSON', description: 'Could not parse the mod bundle JSON.', variant: 'destructive' });
      return null;
    }
  };

  const handleReload = () => {
    const b = getModBundle();
    syncFromBundle(b, true);
  };

  const resolveNewSlotName = (promptText: string, suggested: string): string => {
    const proposed = newSlotName.trim();
    if (proposed) return proposed;
    if (typeof window === 'undefined') return '';
    return (window.prompt(promptText, suggested) || '').trim();
  };

  const handleSave = () => {
    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    if (activeSlot === 'default') {
      const picked = resolveNewSlotName('Save As (new slot name):', 'my-mod-db');
      if (!picked) {
        toast({ title: 'Not saved', description: 'Default slot is read-only. Create a new slot to save changes.' });
        return;
      }
      if (picked === 'default') {
        toast({ title: 'Invalid slot name', description: '"default" is reserved. Pick a different name.' });
        return;
      }

      const existing = listModSlots();
      if (existing.includes(picked) && typeof window !== 'undefined') {
        const ok = window.confirm(`Slot "${picked}" already exists. Overwrite it?`);
        if (!ok) return;
      }

      setActiveModSlot(picked);
      const nextSlot = getActiveModSlot();
      setActiveSlot(nextSlot);
      setNewSlotName('');

      saveModBundle(normalized);
      syncFromBundle(normalized, true);
      toast({ title: 'Mods saved', description: `Saved to new slot "${nextSlot}".` });
      return;
    }

    saveModBundle(normalized);
    syncFromBundle(normalized, true);
    toast({ title: 'Mods saved', description: `Saved to slot "${getActiveModSlot()}".` });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      toast({ title: 'Copied', description: 'Mod bundle JSON copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
    }
  };

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-magnate-mod-${activeSlot}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download failed', description: 'Could not generate a download.', variant: 'destructive' });
    }
  };

  const handleImportClick = () => {
    importRef.current?.click();
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      try {
        const parsed = JSON.parse(text);
        const normalized = normalizeModBundle(parsed);
        syncFromBundle(normalized);
        toast({ title: 'Imported', description: 'Imported mod bundle JSON. Click Save to persist.' });
      } catch {
        setRaw(text);
        toast({
          title: 'Imported (unformatted)',
          description: 'Could not parse JSON. The file contents were inserted as-is.',
          variant: 'destructive',
        });
      }

      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSwitchSlot = (slotId: string) => {
    if (slotId === activeSlot) return;
    if (isDirty && typeof window !== 'undefined') {
      const ok = window.confirm('You have unsaved changes. Switch slots anyway?');
      if (!ok) return;
    }

    setActiveModSlot(slotId);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    handleReload();
  };

  const handleCreateSlot = () => {
    const next = newSlotName.trim();
    if (!next) return;

    if (next === 'default') {
      toast({ title: 'Invalid slot name', description: '"default" is reserved. Pick a different name.' });
      return;
    }

    const existing = listModSlots();
    if (existing.includes(next) && typeof window !== 'undefined') {
      const ok = window.confirm(`Slot "${next}" already exists. Overwrite it?`);
      if (!ok) return;
    }

    setActiveModSlot(next);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    setNewSlotName('');

    const normalized = parseFromRawOrToast();
    const start = normalized ?? { version: 1, mods: [], patches: [] };
    saveModBundle(start);
    syncFromBundle(start, true);

    toast({ title: 'Slot created', description: `Active slot is now "${nextSlot}".` });
  };

  const handleDeleteSlot = () => {
    if (activeSlot === 'default') return;

    if (isDirty && typeof window !== 'undefined') {
      const ok = window.confirm('You have unsaved changes. Delete this slot anyway?');
      if (!ok) return;
    }

    const old = activeSlot;
    deleteModSlot(old);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    handleReload();
    toast({ title: 'Slot deleted', description: `Deleted slot "${old}".` });
  };

  const handleDuplicateSlot = () => {
    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    const suggested = activeSlot === 'default' ? 'my-mod-db' : `${activeSlot}-copy`;
    const picked = resolveNewSlotName('Duplicate slot as (new slot name):', suggested);
    if (!picked) return;

    if (picked === 'default') {
      toast({ title: 'Invalid slot name', description: '"default" is reserved. Pick a different name.' });
      return;
    }

    const existing = listModSlots();
    if (existing.includes(picked) && typeof window !== 'undefined') {
      const ok = window.confirm(`Slot "${picked}" already exists. Overwrite it?`);
      if (!ok) return;
    }

    setActiveModSlot(picked);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    setNewSlotName('');

    saveModBundle(normalized);
    syncFromBundle(normalized, true);

    toast({ title: 'Slot duplicated', description: `Duplicated into slot "${nextSlot}".` });
  };

  const handleRenameSlot = () => {
    if (activeSlot === 'default') return;

    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    const picked = resolveNewSlotName('Rename slot to (new slot name):', activeSlot);
    if (!picked) return;

    if (picked === 'default') {
      toast({ title: 'Invalid slot name', description: '"default" is reserved. Pick a different name.' });
      return;
    }

    if (picked === activeSlot) return;

    const existing = listModSlots();
    if (existing.includes(picked) && typeof window !== 'undefined') {
      const ok = window.confirm(`Slot "${picked}" already exists. Overwrite it?`);
      if (!ok) return;
    }

    const old = activeSlot;

    setActiveModSlot(picked);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    setNewSlotName('');

    saveModBundle(normalized);
    syncFromBundle(normalized, true);

    deleteModSlot(old);

    toast({ title: 'Slot renamed', description: `Renamed "${old}" -> "${nextSlot}".` });
  };

  const handleClear = () => {
    if (activeSlot === 'default') {
      toast({ title: 'Read-only', description: 'Default slot cannot be cleared. Create a new slot instead.' });
      return;
    }

    if (isDirty && typeof window !== 'undefined') {
      const ok = window.confirm('You have unsaved changes. Clear this slot anyway?');
      if (!ok) return;
    }

    clearModBundle();
    handleReload();
    toast({ title: 'Cleared', description: `Cleared slot "${getActiveModSlot()}".` });
  };

  const selectedMod = useMemo(() => {
    const modId = editorModId.trim();
    return (bundle.mods || []).find((m) => m.id === modId) ?? (modId ? makeDefaultMod(modId) : null);
  }, [bundle.mods, editorModId]);

  const handleCreateMod = () => {
    const nextId = newModId.trim();
    if (!nextId) return;

    const next = ensureMod(bundle, nextId);
    syncFromBundle(next);
    setEditorModId(nextId);
    setQuickModId(nextId);
    setNewModId('');
    toast({ title: 'Mod created', description: `Created mod "${nextId}".` });
  };

  const handleUpdateMod = (updates: Partial<ModInfo>) => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);
    next = {
      ...next,
      mods: next.mods.map((m) => (m.id === modId ? ({ ...m, ...updates } as any) : m)),
    };

    syncFromBundle(next);
  };

  const editorBundle = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return { version: 1, mods: [], patches: [] } as ModBundle;

    const modInfo = (bundle.mods || []).find((m) => m.id === modId) ?? makeDefaultMod(modId);
    return {
      version: 1,
      mods: [{ ...modInfo, enabled: true }],
      patches: (bundle.patches || []).filter((p) => p.modId === modId),
    } as ModBundle;
  }, [bundle.mods, bundle.patches, editorModId]);

  const providerPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'providerDeal'), [bundle, editorModId]);
  const publicDomainPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'publicDomainIP'), [bundle, editorModId]);
  const franchisePatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'franchise'), [bundle, editorModId]);
  const talentPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'talent'), [bundle, editorModId]);
  const roleSetPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'franchiseRoleSet'), [bundle, editorModId]);
  const characterDbPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'franchiseCharacterDb'), [bundle, editorModId]);
  const studioProfilePatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'studioProfile'), [bundle, editorModId]);
  const mediaSourcePatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'mediaSource'), [bundle, editorModId]);
  const mediaHeadlineTemplatesPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'mediaHeadlineTemplates'), [bundle, editorModId]);
  const mediaContentTemplatesPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'mediaContentTemplates'), [bundle, editorModId]);
  const parodyNamesPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'parodyCharacterNames'), [bundle, editorModId]);
  const awardShowPatchKey = useMemo(() => patchKeyFor(bundle, editorModId, 'awardShow'), [bundle, editorModId]);

  useEffect(() => {
    const modId = editorModId.trim();
    if (!modId) return;

    setIsEditorDataReady(false);

    // Provider deals
    {
      const patched = applyPatchesByKey(PROVIDER_DEALS, getPatchesForEntity(editorBundle, 'providerDeal'), (p) => p.id);
      const next: Record<string, ProviderDealProfile> = {};
      for (const p of patched) next[p.id] = stripUndefined(p);
      setProviderEdits(next);
    }

    // Public domain
    {
      const patched = applyPatchesByKey(basePublicDomainIPs, getPatchesForEntity(editorBundle, 'publicDomainIP'), (p) => p.id);
      const next: Record<string, PublicDomainIP> = {};
      for (const p of patched) next[p.id] = stripUndefined(p);
      setPublicDomainEdits(next);
      if (publicDomainCharactersKey && !next[publicDomainCharactersKey]) {
        setPublicDomainCharactersKey(patched[0]?.id ?? '');
      }
    }

    // Role sets
    {
      const patched = applyPatchesToRecord(FRANCHISE_ROLE_SETS as any, getPatchesForEntity(editorBundle, 'franchiseRoleSet')) as Record<
        string,
        ScriptCharacter[]
      >;
      setRoleSetRows(stripUndefined(patched[roleSetKey] ?? (FRANCHISE_ROLE_SETS as any)[roleSetKey] ?? []));
    }

    // Character DB
    {
      const patched = applyPatchesToRecord(FRANCHISE_CHARACTER_DB as any, getPatchesForEntity(editorBundle, 'franchiseCharacterDb')) as Record<
        string,
        FranchiseCharacterDef[]
      >;
      setCharacterDbRows(stripUndefined(patched[characterDbKey] ?? (FRANCHISE_CHARACTER_DB as any)[characterDbKey] ?? []));
    }

    // Talent
    {
      const patched = applyPatchesByKey(baseCoreTalent, getPatchesForEntity(editorBundle, 'talent'), (t) => t.id);
      const next: Record<string, TalentEdit> = {};
      for (const t of patched) next[t.id] = pickTalentEdit(t);
      setTalentEdits(next);
    }

    // Franchises
    {
      const patched = applyPatchesByKey(baseFranchises, getPatchesForEntity(editorBundle, 'franchise'), (f) => f.id);
      const next: Record<string, Franchise> = {};
      for (const f of patched) next[f.id] = stripUndefined(f);
      setFranchiseEdits(next);
    }

    // Studio profiles
    {
      const patched = applyPatchesByKey(STUDIO_PROFILES, getPatchesForEntity(editorBundle, 'studioProfile'), (s) => s.name);
      const next: Record<string, StudioProfile> = {};
      for (const s of patched) next[s.name] = stripUndefined(s);
      setStudioEdits(next);
    }

    // Media sources
    {
      const patched = applyPatchesByKey(baseMediaSources, getPatchesForEntity(editorBundle, 'mediaSource'), (s) => s.id);
      const next: Record<string, MediaSource> = {};
      for (const s of patched) next[s.id] = stripUndefined(s);
      setMediaSourceEdits(next);
    }

    // Media templates
    {
      const patchedHeadlines = applyPatchesToRecord(
        baseMediaHeadlineTemplates as any,
        getPatchesForEntity(editorBundle, 'mediaHeadlineTemplates')
      ) as Record<string, string[]>;
      const patchedContent = applyPatchesToRecord(
        baseMediaContentTemplates as any,
        getPatchesForEntity(editorBundle, 'mediaContentTemplates')
      ) as Record<string, string[]>;

      const nextHeadlines: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(patchedHeadlines)) {
        nextHeadlines[k] = Array.isArray(v) ? v.slice() : [];
      }

      const nextContent: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(patchedContent)) {
        nextContent[k] = Array.isArray(v) ? v.slice() : [];
      }

      setMediaHeadlineTemplateEdits(nextHeadlines);
      setMediaContentTemplateEdits(nextContent);
    }

    // Parody names
    {
      const patched = applyPatchesToRecord(PARODY_CHARACTER_NAME_MAP as any, getPatchesForEntity(editorBundle, 'parodyCharacterNames')) as Record<
        string,
        ParodyCharacterNameMapEntry
      >;
      const entry = patched[parodyNamesKey] ?? (PARODY_CHARACTER_NAME_MAP as any)[parodyNamesKey] ?? ({} as ParodyCharacterNameMapEntry);
      setParodyByCharacterIdRows(nameRowsFromRecord(entry.byCharacterId));
      setParodyByTemplateIdRows(nameRowsFromRecord(entry.byTemplateId));
    }

    // Award shows
    {
      const patched = applyPatchesByKey(AWARD_SHOWS, getPatchesForEntity(editorBundle, 'awardShow'), (s) => s.id);
      const next: Record<string, AwardShowDefinition> = {};
      for (const s of patched) next[s.id] = stripUndefined(s);
      setAwardShowEdits(next);
    }

    setIsEditorDataReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editorModId,
    roleSetKey,
    characterDbKey,
    parodyNamesKey,
    providerPatchKey,
    publicDomainPatchKey,
    franchisePatchKey,
    talentPatchKey,
    roleSetPatchKey,
    characterDbPatchKey,
    studioProfilePatchKey,
    mediaSourcePatchKey,
    mediaHeadlineTemplatesPatchKey,
    mediaContentTemplatesPatchKey,
    parodyNamesPatchKey,
    awardShowPatchKey,
  ]);

  useEffect(() => {
    if (awardShowKey && awardShowEdits[awardShowKey]) return;
    const first = Object.keys(awardShowEdits)[0] ?? '';
    if (first !== awardShowKey) setAwardShowKey(first);
  }, [awardShowEdits, awardShowKey]);

  useEffect(() => {
    if (publicDomainCharactersKey && publicDomainEdits[publicDomainCharactersKey]) return;
    const first = Object.keys(publicDomainEdits)[0] ?? '';
    if (first !== publicDomainCharactersKey) setPublicDomainCharactersKey(first);
  }, [publicDomainEdits, publicDomainCharactersKey]);

  useEffect(() => {
    const hasSelected =
      !!mediaTemplateKey &&
      (mediaHeadlineTemplateEdits[mediaTemplateKey] !== undefined || mediaContentTemplateEdits[mediaTemplateKey] !== undefined);
    if (hasSelected) return;

    const keys = Array.from(
      new Set([...Object.keys(mediaHeadlineTemplateEdits), ...Object.keys(mediaContentTemplateEdits), ...Object.keys(baseMediaHeadlineTemplates)])
    );
    const first = keys[0] ?? '';
    if (first && first !== mediaTemplateKey) setMediaTemplateKey(first);
  }, [baseMediaHeadlineTemplates, mediaContentTemplateEdits, mediaHeadlineTemplateEdits, mediaTemplateKey]);

  const updateProvider = (id: ProviderId, updates: Partial<ProviderDealProfile>) => {
    setProviderEdits((prev) => {
      const base = prev[id] ?? (baseProvidersById.get(id) as ProviderDealProfile);
      return { ...prev, [id]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const updateProviderCsv = (id: ProviderId, field: 'specialties' | 'requirements.preferredGenres', value: string) => {
    const list = splitCsv(value) as any;
    if (field === 'specialties') {
      updateProvider(id, { specialties: list.length ? list : undefined } as any);
      return;
    }

    setProviderEdits((prev) => {
      const base = prev[id] ?? (baseProvidersById.get(id) as ProviderDealProfile);
      const req = (base as any).requirements || {};
      return {
        ...prev,
        [id]: stripUndefined({ ...base, requirements: { ...req, preferredGenres: list.length ? list : undefined } }),
      } as any;
    });
  };

  const updatePublicDomain = (id: string, updates: Partial<PublicDomainIP>) => {
    setPublicDomainEdits((prev) => {
      const base = prev[id] ?? (basePublicDomainById.get(id) as PublicDomainIP);
      return { ...prev, [id]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const updatePublicDomainList = (
    id: string,
    field: 'coreElements' | 'requiredElements' | 'genreFlexibility' | 'notableAdaptations',
    value: string
  ) => {
    const list = splitCsv(value);
    updatePublicDomain(id, { [field]: list.length ? list : undefined } as any);
  };

  const getPublicDomainCharacters = (id: string): ScriptCharacter[] => {
    const rec = publicDomainEdits[id] ?? basePublicDomainById.get(id);
    return ((rec?.suggestedCharacters as ScriptCharacter[] | undefined) || []).map((c) => stripUndefined(c));
  };

  const setPublicDomainCharacters = (id: string, rows: ScriptCharacter[]) => {
    updatePublicDomain(id, { suggestedCharacters: rows } as any);
  };

  const updatePublicDomainCharacterRow = (idx: number, updates: Partial<ScriptCharacter>) => {
    const id = publicDomainCharactersKey;
    if (!id) return;
    const current = getPublicDomainCharacters(id);
    const next = current.slice();
    next[idx] = stripUndefined({ ...next[idx], ...updates });
    setPublicDomainCharacters(id, next);
  };

  const handleAddPublicDomainCharacterRow = () => {
    const id = publicDomainCharactersKey;
    if (!id) return;

    const current = getPublicDomainCharacters(id);
    const existingIds = new Set(current.map((c) => c.id));
    let suffix = current.length + 1;
    let nextId = `pd-char-${suffix}`;
    while (existingIds.has(nextId)) {
      suffix++;
      nextId = `pd-char-${suffix}`;
    }

    setPublicDomainCharacters(id, [
      ...current,
      {
        id: nextId,
        name: 'New Character',
        importance: 'minor',
        requiredType: 'actor',
        ageRange: [20, 60],
      },
    ]);
  };

  const handleDeletePublicDomainCharacterRow = (idx: number) => {
    const id = publicDomainCharactersKey;
    if (!id) return;
    const current = getPublicDomainCharacters(id);
    const next = current.slice();
    next.splice(idx, 1);
    setPublicDomainCharacters(id, next);
  };

  const updateRoleRow = (idx: number, updates: Partial<ScriptCharacter>) => {
    setRoleSetRows((prev) => {
      const next = prev.slice();
      next[idx] = stripUndefined({ ...next[idx], ...updates });
      return next;
    });
  };

  const handleAddRoleRow = () => {
    setRoleSetRows((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      let suffix = prev.length + 1;
      let id = `role-${suffix}`;
      while (existingIds.has(id)) {
        suffix++;
        id = `role-${suffix}`;
      }

      return [
        ...prev,
        {
          id,
          name: 'New Role',
          importance: 'minor',
          requiredType: 'actor',
          ageRange: [20, 60],
        },
      ];
    });
  };

  const handleDeleteRoleRow = (idx: number) => {
    setRoleSetRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCharacterRow = (idx: number, updates: Partial<FranchiseCharacterDef>) => {
    setCharacterDbRows((prev) => {
      const next = prev.slice();
      next[idx] = stripUndefined({ ...next[idx], ...updates });
      return next;
    });
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

  const updateTalent = (id: string, updates: Partial<TalentEdit>) => {
    setTalentEdits((prev) => {
      const base = prev[id] ?? (baseTalentById.get(id) ? pickTalentEdit(baseTalentById.get(id) as TalentPerson) : ({} as TalentEdit));
      return { ...prev, [id]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const updateTalentGenres = (id: string, value: string) => {
    updateTalent(id, { genres: splitCsv(value) as any });
  };

  const updateTalentTraits = (id: string, value: string) => {
    const list = splitCsv(value);
    updateTalent(id, { traits: list.length ? list : undefined });
  };

  const updateFranchise = (id: string, updates: Partial<Franchise>) => {
    setFranchiseEdits((prev) => {
      const base = prev[id] ?? (baseFranchiseById.get(id) as Franchise);
      return { ...prev, [id]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const updateFranchiseGenres = (id: string, value: string) => {
    updateFranchise(id, { genre: splitCsv(value) as any });
  };

  const updateStudio = (name: string, updates: Partial<StudioProfile>) => {
    setStudioEdits((prev) => {
      const base = prev[name] ?? (baseStudioByName.get(name) as StudioProfile);
      return { ...prev, [name]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const handleResetStudiosView = () => {
    const patched = applyPatchesByKey(STUDIO_PROFILES, getPatchesForEntity(editorBundle, 'studioProfile'), (s) => s.name);
    const next: Record<string, StudioProfile> = {};
    for (const s of patched) next[s.name] = stripUndefined(s);
    setStudioEdits(next);
  };

  const handleAddStudioProfile = () => {
    const existing = new Set([...STUDIO_PROFILES.map((s) => s.name), ...Object.keys(studioEdits)]);

    let name = newStudioProfileName.trim();
    if (!name) {
      let suffix = 1;
      name = `Custom Studio ${suffix}`;
      while (existing.has(name)) {
        suffix++;
        name = `Custom Studio ${suffix}`;
      }
    }

    if (existing.has(name)) {
      toast({ title: 'Already exists', description: `Studio "${name}" already exists.`, variant: 'destructive' });
      return;
    }

    const profile: StudioProfile = {
      name,
      personality: 'Custom studio profile',
      budget: 50000000,
      reputation: 50,
      specialties: [],
      businessTendency: 'Custom studio business tendency',
      riskTolerance: 'moderate',
      releaseFrequency: 6,
      brandIdentity: 'Custom studio identity',
    };

    setStudioEdits((prev) => ({ ...prev, [name]: stripUndefined(profile) }));
    setNewStudioProfileName('');
  };

  const handleDeleteStudioProfile = (name: string) => {
    setStudioEdits((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleRestoreStudioProfile = (name: string) => {
    const base = baseStudioByName.get(name);
    if (!base) return;
    setStudioEdits((prev) => ({ ...prev, [name]: stripUndefined(base) }));
  };

  const updateStudioSpecialties = (name: string, value: string) => {
    const list = splitCsv(value) as Genre[];
    updateStudio(name, { specialties: list.length ? list : ([] as any) } as any);
  };

  const updateMediaSource = (id: string, updates: Partial<MediaSource>) => {
    setMediaSourceEdits((prev) => {
      const base = prev[id] ?? (baseMediaById.get(id) as MediaSource);
      return { ...prev, [id]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const updateMediaSourceSpecialties = (id: string, value: string) => {
    const list = splitCsv(value) as Genre[];
    updateMediaSource(id, { specialties: list.length ? list : ([] as any) } as any);
  };

  const handleResetMediaSourcesView = () => {
    const patched = applyPatchesByKey(baseMediaSources, getPatchesForEntity(editorBundle, 'mediaSource'), (s) => s.id);
    const next: Record<string, MediaSource> = {};
    for (const s of patched) next[s.id] = stripUndefined(s);
    setMediaSourceEdits(next);
  };

  const handleResetMediaTemplatesView = () => {
    const patchedHeadlines = applyPatchesToRecord(
      baseMediaHeadlineTemplates as any,
      getPatchesForEntity(editorBundle, 'mediaHeadlineTemplates')
    ) as Record<string, string[]>;
    const patchedContent = applyPatchesToRecord(
      baseMediaContentTemplates as any,
      getPatchesForEntity(editorBundle, 'mediaContentTemplates')
    ) as Record<string, string[]>;

    const nextHeadlines: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(patchedHeadlines)) nextHeadlines[k] = Array.isArray(v) ? v.slice() : [];

    const nextContent: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(patchedContent)) nextContent[k] = Array.isArray(v) ? v.slice() : [];

    setMediaHeadlineTemplateEdits(nextHeadlines);
    setMediaContentTemplateEdits(nextContent);
  };

  const handleResetMediaTemplateType = (key: string) => {
    const patchedHeadlines = applyPatchesToRecord(
      baseMediaHeadlineTemplates as any,
      getPatchesForEntity(editorBundle, 'mediaHeadlineTemplates')
    ) as Record<string, string[]>;
    const patchedContent = applyPatchesToRecord(
      baseMediaContentTemplates as any,
      getPatchesForEntity(editorBundle, 'mediaContentTemplates')
    ) as Record<string, string[]>;

    setMediaHeadlineTemplateEdits((prev) => ({
      ...prev,
      [key]: Array.isArray(patchedHeadlines[key]) ? patchedHeadlines[key].slice() : [],
    }));
    setMediaContentTemplateEdits((prev) => ({
      ...prev,
      [key]: Array.isArray(patchedContent[key]) ? patchedContent[key].slice() : [],
    }));
  };

  const handleAddMediaTemplateType = () => {
    const key = newMediaTemplateKey.trim();
    if (!key) return;

    setMediaHeadlineTemplateEdits((prev) => (prev[key] ? prev : { ...prev, [key]: ['New headline template'] }));
    setMediaContentTemplateEdits((prev) => (prev[key] ? prev : { ...prev, [key]: ['New content template'] }));
    setMediaTemplateKey(key);
    setNewMediaTemplateKey('');
  };

  const handleDeleteMediaTemplateType = (key: string) => {
    const isBaseKey = (baseMediaHeadlineTemplates as any)[key] !== undefined || (baseMediaContentTemplates as any)[key] !== undefined;
    if (isBaseKey) {
      handleResetMediaTemplateType(key);
      return;
    }

    setMediaHeadlineTemplateEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setMediaContentTemplateEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateMediaTemplateRow = (kind: 'headline' | 'content', key: string, idx: number, value: string) => {
    if (kind === 'headline') {
      setMediaHeadlineTemplateEdits((prev) => {
        const list = (prev[key] || []).slice();
        list[idx] = value;
        return { ...prev, [key]: list };
      });
      return;
    }

    setMediaContentTemplateEdits((prev) => {
      const list = (prev[key] || []).slice();
      list[idx] = value;
      return { ...prev, [key]: list };
    });
  };

  const handleAddMediaTemplateRow = (kind: 'headline' | 'content', key: string) => {
    if (kind === 'headline') {
      setMediaHeadlineTemplateEdits((prev) => ({ ...prev, [key]: [...(prev[key] || []), ''] }));
      return;
    }
    setMediaContentTemplateEdits((prev) => ({ ...prev, [key]: [...(prev[key] || []), ''] }));
  };

  const handleDeleteMediaTemplateRow = (kind: 'headline' | 'content', key: string, idx: number) => {
    if (kind === 'headline') {
      setMediaHeadlineTemplateEdits((prev) => {
        const list = (prev[key] || []).slice();
        list.splice(idx, 1);
        return { ...prev, [key]: list };
      });
      return;
    }

    setMediaContentTemplateEdits((prev) => {
      const list = (prev[key] || []).slice();
      list.splice(idx, 1);
      return { ...prev, [key]: list };
    });
  };

  const handleAddMediaSource = () => {
    const existing = new Set([...baseMediaSources.map((s) => s.id), ...Object.keys(mediaSourceEdits)]);
    let suffix = 1;
    let id = `source_custom_${suffix}`;
    while (existing.has(id)) {
      suffix++;
      id = `source_custom_${suffix}`;
    }

    const nextSource: MediaSource = {
      id,
      name: 'New Source',
      type: 'blog',
      credibility: 50,
      bias: 0,
      reach: 50,
      specialties: [],
      established: 2024,
    };

    setMediaSourceEdits((prev) => ({ ...prev, [id]: nextSource }));
  };

  const handleDeleteMediaSource = (id: string) => {
    setMediaSourceEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRestoreMediaSource = (id: string) => {
    const base = baseMediaById.get(id);
    if (!base) return;
    setMediaSourceEdits((prev) => ({ ...prev, [id]: stripUndefined(base) }));
  };

  const handleResetPublicDomainView = () => {
    const patched = applyPatchesByKey(basePublicDomainIPs, getPatchesForEntity(editorBundle, 'publicDomainIP'), (p) => p.id);
    const next: Record<string, PublicDomainIP> = {};
    for (const p of patched) next[p.id] = stripUndefined(p);
    setPublicDomainEdits(next);
  };

  const handleAddPublicDomainIP = () => {
    const existing = new Set([...basePublicDomainIPs.map((p) => p.id), ...Object.keys(publicDomainEdits)]);
    let suffix = 1;
    let id = `pd-custom-${suffix}`;
    while (existing.has(id)) {
      suffix++;
      id = `pd-custom-${suffix}`;
    }

    const ip: PublicDomainIP = {
      id,
      name: 'New Public Domain IP',
      domainType: 'literature',
      dateEnteredDomain: '1900-01-01',
      coreElements: [],
      genreFlexibility: [],
      notableAdaptations: [],
      reputationScore: 50,
      adaptationFatigue: 0,
      culturalRelevance: 50,
      requiredElements: [],
      suggestedCharacters: [],
      cost: 0,
    };

    setPublicDomainEdits((prev) => ({ ...prev, [id]: stripUndefined(ip) }));
    setPublicDomainCharactersKey(id);
  };

  const handleDeletePublicDomainIP = (id: string) => {
    setPublicDomainEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRestorePublicDomainIP = (id: string) => {
    const base = basePublicDomainById.get(id);
    if (!base) return;
    setPublicDomainEdits((prev) => ({ ...prev, [id]: stripUndefined(base) }));
  };

  const handleResetPublicDomainCharactersView = () => {
    const id = publicDomainCharactersKey;
    if (!id) return;

    const patched = applyPatchesByKey(basePublicDomainIPs, getPatchesForEntity(editorBundle, 'publicDomainIP'), (p) => p.id);
    const rec = patched.find((p) => p.id === id) ?? basePublicDomainById.get(id);
    setPublicDomainCharacters(id, ((rec?.suggestedCharacters as ScriptCharacter[] | undefined) || []).map((c) => stripUndefined(c)));
  };

  const handleResetAwardShowsView = () => {
    const patched = applyPatchesByKey(AWARD_SHOWS, getPatchesForEntity(editorBundle, 'awardShow'), (s) => s.id);
    const next: Record<string, AwardShowDefinition> = {};
    for (const s of patched) next[s.id] = stripUndefined(s);
    setAwardShowEdits(next);
  };

  const handleAddAwardShow = () => {
    const existing = new Set([...AWARD_SHOWS.map((s) => s.id), ...Object.keys(awardShowEdits)]);
    let suffix = 1;
    let id = `custom-show-${suffix}`;
    while (existing.has(id)) {
      suffix++;
      id = `custom-show-${suffix}`;
    }

    const show: AwardShowDefinition = {
      id,
      name: 'Custom Awards',
      medium: 'film',
      nominationWeek: 1,
      ceremonyWeek: 1,
      cooldownWeeks: 1,
      eligibilityCutoffWeek: 1,
      prestige: 5,
      momentumBonus: 5,
      categories: [],
    };

    setAwardShowEdits((prev) => ({ ...prev, [id]: stripUndefined(show) }));
    setAwardShowKey(id);
  };

  const handleDeleteAwardShow = (id: string) => {
    setAwardShowEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRestoreAwardShow = (id: string) => {
    const base = AWARD_SHOWS.find((s) => s.id === id);
    if (!base) return;
    setAwardShowEdits((prev) => ({ ...prev, [id]: stripUndefined(base) }));
  };

  const updateParodyByCharacterIdRow = (idx: number, updates: Partial<NameMappingRow>) => {
    setParodyByCharacterIdRows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  };

  const updateParodyByTemplateIdRow = (idx: number, updates: Partial<NameMappingRow>) => {
    setParodyByTemplateIdRows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  };

  const handleAddParodyByCharacterIdRow = () => setParodyByCharacterIdRows((prev) => [...prev, { key: '', value: '' }]);
  const handleAddParodyByTemplateIdRow = () => setParodyByTemplateIdRows((prev) => [...prev, { key: '', value: '' }]);
  const handleDeleteParodyByCharacterIdRow = (idx: number) => setParodyByCharacterIdRows((prev) => prev.filter((_, i) => i !== idx));
  const handleDeleteParodyByTemplateIdRow = (idx: number) => setParodyByTemplateIdRows((prev) => prev.filter((_, i) => i !== idx));

  const updateAwardShow = (id: string, updates: Partial<AwardShowDefinition>) => {
    setAwardShowEdits((prev) => {
      const base = prev[id] ?? (AWARD_SHOWS.find((s) => s.id === id) as AwardShowDefinition);
      return { ...prev, [id]: stripUndefined({ ...base, ...updates }) };
    });
  };

  const updateAwardCategory = (showId: string, idx: number, updates: Partial<AwardCategoryDefinition>) => {
    setAwardShowEdits((prev) => {
      const base = prev[showId] ?? (AWARD_SHOWS.find((s) => s.id === showId) as AwardShowDefinition);
      const categories = (base.categories || []).slice();
      categories[idx] = stripUndefined({ ...categories[idx], ...updates });
      return { ...prev, [showId]: stripUndefined({ ...base, categories }) };
    });
  };

  const handleAddAwardCategory = (showId: string) => {
    setAwardShowEdits((prev) => {
      const base = prev[showId] ?? (AWARD_SHOWS.find((s) => s.id === showId) as AwardShowDefinition);
      const categories = (base.categories || []).slice();
      const id = `category-${categories.length + 1}`;
      categories.push({ id, name: 'New Category', awardKind: 'studio' } as any);
      return { ...prev, [showId]: stripUndefined({ ...base, categories }) };
    });
  };

  const handleDeleteAwardCategory = (showId: string, idx: number) => {
    setAwardShowEdits((prev) => {
      const base = prev[showId] ?? (AWARD_SHOWS.find((s) => s.id === showId) as AwardShowDefinition);
      const categories = (base.categories || []).slice();
      categories.splice(idx, 1);
      return { ...prev, [showId]: stripUndefined({ ...base, categories }) };
    });
  };

  const handleAddQuickPatch = () => {
    const modId = quickModId.trim();
    if (!modId) return;

    const entityType = quickEntityType;
    const op = quickOp;

    const target = quickTarget.trim() || undefined;
    if ((op === 'update' || op === 'delete') && !target) {
      toast({ title: 'Missing target', description: 'Update/delete patches require a target.', variant: 'destructive' });
      return;
    }

    let payload: any = undefined;
    if (op !== 'delete') {
      const text = quickPayload.trim();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          toast({ title: 'Invalid payload JSON', description: 'Payload must be valid JSON.', variant: 'destructive' });
          return;
        }
      }
    }

    const patch: Partial<ModPatch> = {
      modId,
      entityType,
      op,
      target,
      payload,
    };

    let next = ensureMod(bundle, modId);
    next = { ...next, patches: [...(next.patches || []), patch as any] };
    next = normalizeModBundle(next);
    syncFromBundle(next);

    toast({ title: 'Patch added', description: 'Added patch to the mod bundle JSON. Click Save to persist.' });
  };

  const applyProviderEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    for (const base of PROVIDER_DEALS) {
      const edited = providerEdits[base.id] ?? base;
      const patchId = `providerDeal:${modId}:${base.id}`;
      if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'providerDeal',
        op: 'update',
        target: base.id,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied provider deal edits as patches. Click Save to persist.' });
  };

  const applyPublicDomainEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    const baseIds = new Set(basePublicDomainIPs.map((p) => p.id));
    const desiredIds = new Set(Object.keys(publicDomainEdits));

    for (const base of basePublicDomainIPs) {
      const patchId = `publicDomainIP:${modId}:${base.id}`;
      const edited = publicDomainEdits[base.id];

      if (!edited) {
        next = upsertPatch(next, {
          id: patchId,
          modId,
          entityType: 'publicDomainIP',
          op: 'delete',
          target: base.id,
        });
        continue;
      }

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'publicDomainIP',
        op: 'update',
        target: base.id,
        payload: stripUndefined(edited),
      });
    }

    for (const [id, edited] of Object.entries(publicDomainEdits)) {
      if (baseIds.has(id)) continue;
      const patchId = `publicDomainIP:${modId}:${id}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'publicDomainIP',
        op: 'insert',
        target: id,
        payload: stripUndefined(edited),
      });
    }

    for (const p of (next.patches || []).filter((p) => p.modId === modId && p.entityType === 'publicDomainIP')) {
      const id = String(p.target || p.id.split(':').slice(-1)[0] || '');
      if (!id) continue;
      if (!baseIds.has(id) && !desiredIds.has(id)) {
        next = removePatch(next, p.id);
      }
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied public domain edits as patches. Click Save to persist.' });
  };

  const applyRoleSetEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const base = (FRANCHISE_ROLE_SETS as any)[roleSetKey] ?? [];
    const edited = roleSetRows;
    const patchId = `franchiseRoleSet:${modId}:${roleSetKey}`;

    let next = ensureMod(bundle, modId);
    if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
      next = removePatch(next, patchId);
    } else {
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'franchiseRoleSet',
        op: 'update',
        target: roleSetKey,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied franchise role set edits as a patch. Click Save to persist.' });
  };

  const applyCharacterDbEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const base = (FRANCHISE_CHARACTER_DB as any)[characterDbKey] ?? [];
    const edited = characterDbRows;
    const patchId = `franchiseCharacterDb:${modId}:${characterDbKey}`;

    let next = ensureMod(bundle, modId);
    if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
      next = removePatch(next, patchId);
    } else {
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'franchiseCharacterDb',
        op: 'update',
        target: characterDbKey,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied franchise character DB edits as a patch. Click Save to persist.' });
  };

  const applyTalentEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    for (const base of baseCoreTalent) {
      const baseEdit = pickTalentEdit(base);
      const edited = talentEdits[base.id] ?? baseEdit;
      const patchId = `talent:${modId}:${base.id}`;

      if (deepEqual(stripUndefined(baseEdit), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      const payload = stripUndefined({ ...base, ...edited, specialties: edited.specialties } as any);
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'talent',
        op: 'update',
        target: base.id,
        payload,
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied talent edits as patches. Click Save to persist.' });
  };

  const applyFranchiseEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    for (const base of baseFranchises) {
      const edited = franchiseEdits[base.id] ?? base;
      const patchId = `franchise:${modId}:${base.id}`;

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'franchise',
        op: 'update',
        target: base.id,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied franchise edits as patches. Click Save to persist.' });
  };

  const applyStudioEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    const baseNames = new Set(STUDIO_PROFILES.map((s) => s.name));

    for (const base of STUDIO_PROFILES) {
      const patchId = `studioProfile:${modId}:${base.name}`;
      const edited = studioEdits[base.name];

      if (!edited) {
        next = upsertPatch(next, {
          id: patchId,
          modId,
          entityType: 'studioProfile',
          op: 'delete',
          target: base.name,
        });
        continue;
      }

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'studioProfile',
        op: 'update',
        target: base.name,
        payload: stripUndefined(edited),
      });
    }

    for (const [name, edited] of Object.entries(studioEdits)) {
      if (baseNames.has(name)) continue;
      const patchId = `studioProfile:${modId}:${name}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'studioProfile',
        op: 'insert',
        target: name,
        payload: stripUndefined(edited),
      });
    }

    // Prune stale insert patches for custom names that were deleted from the editor view.
    const toRemove: string[] = [];
    for (const p of next.patches || []) {
      if (p.modId !== modId) continue;
      if (p.entityType !== 'studioProfile') continue;
      const t = String(p.target || '');
      if (baseNames.has(t)) continue;
      if (studioEdits[t]) continue;
      toRemove.push(p.id);
    }
    for (const id of toRemove) next = removePatch(next, id);

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied studio profile edits as patches. Click Save to persist.' });
  };

  const applyMediaSourceEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    const baseIds = new Set(baseMediaSources.map((s) => s.id));

    for (const base of baseMediaSources) {
      const patchId = `mediaSource:${modId}:${base.id}`;
      const edited = mediaSourceEdits[base.id];

      if (!edited) {
        next = upsertPatch(next, {
          id: patchId,
          modId,
          entityType: 'mediaSource',
          op: 'delete',
          target: base.id,
        });
        continue;
      }

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'mediaSource',
        op: 'update',
        target: base.id,
        payload: stripUndefined(edited),
      });
    }

    for (const [id, edited] of Object.entries(mediaSourceEdits)) {
      if (baseIds.has(id)) continue;
      const patchId = `mediaSource:${modId}:${id}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'mediaSource',
        op: 'insert',
        target: id,
        payload: stripUndefined(edited),
      });
    }

    // Prune stale insert patches for custom IDs that were deleted from the editor view.
    const toRemove: string[] = [];
    for (const p of next.patches || []) {
      if (p.modId !== modId) continue;
      if (p.entityType !== 'mediaSource') continue;
      const t = String(p.target || '');
      if (baseIds.has(t)) continue;
      if (mediaSourceEdits[t]) continue;
      toRemove.push(p.id);
    }
    for (const id of toRemove) next = removePatch(next, id);

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied media source edits as patches. Click Save to persist.' });
  };

  const applyMediaTemplateEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    const headlineKeys = new Set<string>([...Object.keys(baseMediaHeadlineTemplates), ...Object.keys(mediaHeadlineTemplateEdits)]);
    const contentKeys = new Set<string>([...Object.keys(baseMediaContentTemplates), ...Object.keys(mediaContentTemplateEdits)]);

    for (const p of next.patches || []) {
      if (p.modId !== modId) continue;
      if (p.entityType === 'mediaHeadlineTemplates' && p.target) headlineKeys.add(String(p.target));
      if (p.entityType === 'mediaContentTemplates' && p.target) contentKeys.add(String(p.target));
    }

    for (const key of Array.from(headlineKeys)) {
      const baseList = (baseMediaHeadlineTemplates as any)[key] as string[] | undefined;
      const edited = mediaHeadlineTemplateEdits[key];
      const patchId = `mediaHeadlineTemplates:${modId}:${key}`;

      if (edited === undefined) {
        next = removePatch(next, patchId);
        continue;
      }

      const op: ModOp = baseList !== undefined ? 'update' : 'insert';
      if (deepEqual(stripUndefined(baseList || []), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'mediaHeadlineTemplates',
        op,
        target: key,
        payload: edited,
      });
    }

    for (const key of Array.from(contentKeys)) {
      const baseList = (baseMediaContentTemplates as any)[key] as string[] | undefined;
      const edited = mediaContentTemplateEdits[key];
      const patchId = `mediaContentTemplates:${modId}:${key}`;

      if (edited === undefined) {
        next = removePatch(next, patchId);
        continue;
      }

      const op: ModOp = baseList !== undefined ? 'update' : 'insert';
      if (deepEqual(stripUndefined(baseList || []), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'mediaContentTemplates',
        op,
        target: key,
        payload: edited,
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied media template edits as patches. Click Save to persist.' });
  };

  const applyParodyNamesEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const base = (PARODY_CHARACTER_NAME_MAP as any)[parodyNamesKey] ?? ({} as ParodyCharacterNameMapEntry);
    const nextByCharacterId = nameRecordFromRows(parodyByCharacterIdRows);
    const nextByTemplateId = nameRecordFromRows(parodyByTemplateIdRows);

    const edited: ParodyCharacterNameMapEntry = {
      byCharacterId: Object.keys(nextByCharacterId).length ? nextByCharacterId : undefined,
      byTemplateId: Object.keys(nextByTemplateId).length ? nextByTemplateId : undefined,
    };

    const patchPayload: ParodyCharacterNameMapEntry = {
      byCharacterId: namePatchRecordFromRows(base.byCharacterId, parodyByCharacterIdRows) as any,
      byTemplateId: namePatchRecordFromRows(base.byTemplateId, parodyByTemplateIdRows) as any,
    };

    const patchId = `parodyCharacterNames:${modId}:${parodyNamesKey}`;

    let next = ensureMod(bundle, modId);
    if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
      next = removePatch(next, patchId);
    } else {
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'parodyCharacterNames',
        op: 'update',
        target: parodyNamesKey,
        payload: stripUndefined(patchPayload),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied parody name edits as a patch. Click Save to persist.' });
  };

  const applyAwardShowEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    let next = ensureMod(bundle, modId);

    const baseIds = new Set(AWARD_SHOWS.map((s) => s.id));

    for (const base of AWARD_SHOWS) {
      const patchId = `awardShow:${modId}:${base.id}`;
      const edited = awardShowEdits[base.id];

      if (!edited) {
        next = upsertPatch(next, {
          id: patchId,
          modId,
          entityType: 'awardShow',
          op: 'delete',
          target: base.id,
        });
        continue;
      }

      if (deepEqual(stripUndefined(base), stripUndefined(edited))) {
        next = removePatch(next, patchId);
        continue;
      }

      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'awardShow',
        op: 'update',
        target: base.id,
        payload: stripUndefined(edited),
      });
    }

    for (const [id, edited] of Object.entries(awardShowEdits)) {
      if (baseIds.has(id)) continue;
      const patchId = `awardShow:${modId}:${id}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'awardShow',
        op: 'insert',
        target: id,
        payload: stripUndefined(edited),
      });
    }

    // Prune stale insert patches for custom IDs that were deleted from the editor view.
    const toRemove: string[] = [];
    for (const p of next.patches || []) {
      if (p.modId !== modId) continue;
      if (p.entityType !== 'awardShow') continue;
      const t = String(p.target || '');
      if (baseIds.has(t)) continue;
      if (awardShowEdits[t]) continue;
      toRemove.push(p.id);
    }
    for (const id of toRemove) next = removePatch(next, id);

    syncFromBundle(next);
    toast({ title: 'Applied', description: 'Applied award show edits as patches. Click Save to persist.' });
  };

  const changedProviderCount = useMemo(() => {
    let changed = 0;
    for (const base of PROVIDER_DEALS) {
      const edited = providerEdits[base.id] ?? base;
      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [providerEdits]);

  const changedPublicDomainCount = useMemo(() => {
    let changed = 0;

    const baseIds = new Set(basePublicDomainIPs.map((p) => p.id));

    for (const base of basePublicDomainIPs) {
      const edited = publicDomainEdits[base.id];
      if (!edited) {
        changed++;
        continue;
      }

      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }

    for (const id of Object.keys(publicDomainEdits)) {
      if (!baseIds.has(id)) changed++;
    }

    return changed;
  }, [basePublicDomainIPs, publicDomainEdits]);

  const roleSetIsChanged = useMemo(() => {
    const base = (FRANCHISE_ROLE_SETS as any)[roleSetKey] ?? [];
    return !deepEqual(stripUndefined(base), stripUndefined(roleSetRows));
  }, [roleSetKey, roleSetRows]);

  const characterDbIsChanged = useMemo(() => {
    const base = (FRANCHISE_CHARACTER_DB as any)[characterDbKey] ?? [];
    return !deepEqual(stripUndefined(base), stripUndefined(characterDbRows));
  }, [characterDbKey, characterDbRows]);

  const changedTalentCount = useMemo(() => {
    let changed = 0;
    for (const base of baseCoreTalent) {
      const baseEdit = pickTalentEdit(base);
      const edited = talentEdits[base.id] ?? baseEdit;
      if (!deepEqual(stripUndefined(baseEdit), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseCoreTalent, talentEdits]);

  const changedFranchiseCount = useMemo(() => {
    let changed = 0;
    for (const base of baseFranchises) {
      const edited = franchiseEdits[base.id] ?? base;
      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }
    return changed;
  }, [baseFranchises, franchiseEdits]);

  const changedStudioCount = useMemo(() => {
    let changed = 0;

    const baseNames = new Set(STUDIO_PROFILES.map((s) => s.name));

    for (const base of STUDIO_PROFILES) {
      const edited = studioEdits[base.name];
      if (!edited) {
        changed++;
        continue;
      }

      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }

    for (const name of Object.keys(studioEdits)) {
      if (!baseNames.has(name)) changed++;
    }

    return changed;
  }, [studioEdits]);

  const changedMediaSourceCount = useMemo(() => {
    let changed = 0;

    const baseIds = new Set(baseMediaSources.map((s) => s.id));

    for (const base of baseMediaSources) {
      const edited = mediaSourceEdits[base.id];
      if (!edited) {
        changed++;
        continue;
      }

      if (!deepEqual(stripUndefined(base), stripUndefined(edited))) changed++;
    }

    for (const id of Object.keys(mediaSourceEdits)) {
      if (!baseIds.has(id)) changed++;
    }

    return changed;
  }, [baseMediaSources, mediaSourceEdits]);

  const changedMediaTemplateCount = useMemo(() => {
    let changed = 0;

    const keys = new Set<string>([
      ...Object.keys(baseMediaHeadlineTemplates),
      ...Object.keys(baseMediaContentTemplates),
      ...Object.keys(mediaHeadlineTemplateEdits),
      ...Object.keys(mediaContentTemplateEdits),
    ]);

    for (const key of keys) {
      const baseH = (baseMediaHeadlineTemplates as any)[key] as string[] | undefined;
      const baseC = (baseMediaContentTemplates as any)[key] as string[] | undefined;
      const editedH = mediaHeadlineTemplateEdits[key];
      const editedC = mediaContentTemplateEdits[key];

      const headlineChanged =
        editedH === undefined ? !!baseH : !deepEqual(stripUndefined(baseH || []), stripUndefined(editedH));
      const contentChanged = editedC === undefined ? !!baseC : !deepEqual(stripUndefined(baseC || []), stripUndefined(editedC));

      if (headlineChanged || contentChanged) changed++;
    }

    return changed;
  }, [baseMediaContentTemplates, baseMediaHeadlineTemplates, mediaContentTemplateEdits, mediaHeadlineTemplateEdits]);

  const parodyNamesIsChanged = useMemo(() => {
    const base = (PARODY_CHARACTER_NAME_MAP as any)[parodyNamesKey] ?? ({} as ParodyCharacterNameMapEntry);
    const edited: ParodyCharacterNameMapEntry = {
      byCharacterId: Object.keys(nameRecordFromRows(parodyByCharacterIdRows)).length ? nameRecordFromRows(parodyByCharacterIdRows) : undefined,
      byTemplateId: Object.keys(nameRecordFromRows(parodyByTemplateIdRows)).length ? nameRecordFromRows(parodyByTemplateIdRows) : undefined,
    };
    return !deepEqual(stripUndefined(base), stripUndefined(edited));
  }, [parodyNamesKey, parodyByCharacterIdRows, parodyByTemplateIdRows]);

  const awardShowIsChanged = useMemo(() => {
    const edited = awardShowEdits[awardShowKey];
    if (!edited) return false;

    const base = AWARD_SHOWS.find((s) => s.id === awardShowKey);
    if (!base) return true;

    return !deepEqual(stripUndefined(base), stripUndefined(edited));
  }, [awardShowEdits, awardShowKey]);

  const awardShowsForEditor = useMemo(() => {
    return Object.values(awardShowEdits)
      .slice()
      .sort((a, b) => a.ceremonyWeek - b.ceremonyWeek || a.id.localeCompare(b.id));
  }, [awardShowEdits]);

  const publicDomainIPsForEditor = useMemo(() => {
    return Object.values(publicDomainEdits)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [publicDomainEdits]);

  const filteredPublicDomainIPs = useMemo(() => {
    const q = publicDomainSearch.trim().toLowerCase();
    const list = isEditorDataReady ? publicDomainIPsForEditor : basePublicDomainIPs;
    if (!q) return list;
    return list.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(q));
  }, [basePublicDomainIPs, isEditorDataReady, publicDomainSearch, publicDomainIPsForEditor]);

  const deletedBasePublicDomainIds = useMemo(() => {
    const out: string[] = [];
    for (const p of basePublicDomainIPs) {
      if (!publicDomainEdits[p.id]) out.push(p.id);
    }
    return out.sort();
  }, [basePublicDomainIPs, publicDomainEdits]);

  const deletedBaseMediaSourceIds = useMemo(() => {
    const out: string[] = [];
    for (const s of baseMediaSources) {
      if (!mediaSourceEdits[s.id]) out.push(s.id);
    }
    return out.sort();
  }, [baseMediaSources, mediaSourceEdits]);

  const deletedBaseStudioNames = useMemo(() => {
    const out: string[] = [];
    for (const s of STUDIO_PROFILES) {
      if (!studioEdits[s.name]) out.push(s.name);
    }
    return out.sort();
  }, [studioEdits]);

  const deletedBaseAwardShowIds = useMemo(() => {
    const out: string[] = [];
    for (const s of AWARD_SHOWS) {
      if (!awardShowEdits[s.id]) out.push(s.id);
    }
    return out.sort();
  }, [awardShowEdits]);

  const filteredTalent = useMemo(() => {
    const q = talentSearch.trim().toLowerCase();
    if (!q) return baseCoreTalent;
    return baseCoreTalent.filter((t) => `${t.id} ${t.name}`.toLowerCase().includes(q));
  }, [baseCoreTalent, talentSearch]);

  const filteredFranchises = useMemo(() => {
    const q = franchiseSearch.trim().toLowerCase();
    if (!q) return baseFranchises;
    return baseFranchises.filter((f) => `${f.id} ${f.title}`.toLowerCase().includes(q));
  }, [baseFranchises, franchiseSearch]);

  const studiosForEditor = useMemo(() => {
    return Object.values(studioEdits)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studioEdits]);

  const filteredStudios = useMemo(() => {
    const q = studioSearch.trim().toLowerCase();
    const list = isEditorDataReady ? studiosForEditor : STUDIO_PROFILES;
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [isEditorDataReady, studioSearch, studiosForEditor]);

  const mediaTemplateKeys = useMemo(() => {
    return Array.from(
      new Set([
        ...Object.keys(baseMediaHeadlineTemplates),
        ...Object.keys(baseMediaContentTemplates),
        ...Object.keys(mediaHeadlineTemplateEdits),
        ...Object.keys(mediaContentTemplateEdits),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [baseMediaContentTemplates, baseMediaHeadlineTemplates, mediaContentTemplateEdits, mediaHeadlineTemplateEdits]);

  const mediaSourcesForEditor = useMemo(() => {
    return Object.values(mediaSourceEdits)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [mediaSourceEdits]);

  const filteredMediaSources = useMemo(() => {
    const q = mediaSourceSearch.trim().toLowerCase();
    const list = isEditorDataReady ? mediaSourcesForEditor : baseMediaSources;
    if (!q) return list;
    return list.filter((s) => `${s.id} ${s.name}`.toLowerCase().includes(q));
  }, [baseMediaSources, isEditorDataReady, mediaSourceSearch, mediaSourcesForEditor]);

  const handleExportMediaSourcesCsv = () => {
    const headers = ['id', 'name', 'type', 'credibility', 'bias', 'reach', 'established', 'specialties'];
    const rows = filteredMediaSources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      credibility: String(s.credibility),
      bias: String(s.bias),
      reach: String(s.reach),
      established: String(s.established),
      specialties: joinListCell((s.specialties || []) as any),
    }));

    const csv = toCsv(headers, rows);
    try {
      downloadTextFile(`media-sources-${activeSlot}.csv`, csv, 'text/csv');
    } catch {
      toast({ title: 'Export failed', description: 'Could not export CSV.', variant: 'destructive' });
    }
  };

  const handleImportMediaSourcesCsvClick = () => {
    importMediaSourceCsvRef.current?.click();
  };

  const handleImportMediaSourcesCsv: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    file
      .text()
      .then((text) => {
        const parsed = parseCsv(text);
        const rows = parsed.rows.map((r) => {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) next[k.toLowerCase()] = v;
          return next;
        });

        const allowedTypes = new Set<MediaSource['type']>(['newspaper', 'magazine', 'blog', 'social_media', 'trade_publication', 'tv_network']);

        setMediaSourceEdits((prev) => {
          let next = { ...prev };

          for (const row of rows) {
            const id = (row.id || '').trim();
            if (!id) continue;

            const base = next[id] ?? baseMediaById.get(id);
            const incomingType = (row.type || '').trim();
            const type = (allowedTypes.has(incomingType as any) ? (incomingType as any) : undefined) ?? (base?.type ?? 'blog');

            const merged: MediaSource = {
              id,
              name: (row.name || base?.name || '').trim() || 'Media Source',
              type,
              credibility: Number(row.credibility || base?.credibility || 0) || 0,
              bias: Number(row.bias || base?.bias || 0) || 0,
              reach: Number(row.reach || base?.reach || 0) || 0,
              established: Number(row.established || base?.established || 0) || 0,
              specialties: splitListCell(row.specialties || joinListCell((base?.specialties || []) as any)) as any,
            };

            next[id] = stripUndefined(merged);
          }

          return next;
        });

        toast({ title: 'Imported', description: 'Imported media sources from CSV (merged). Click Apply to generate patches.' });
      })
      .catch(() => {
        toast({ title: 'Import failed', description: 'Could not read CSV file.', variant: 'destructive' });
      });
  };

  const handleExportPublicDomainCsv = () => {
    const headers = [
      'id',
      'name',
      'domainType',
      'reputationScore',
      'adaptationFatigue',
      'culturalRelevance',
      'dateEnteredDomain',
      'lastAdaptationDate',
      'cost',
      'genreFlexibility',
      'coreElements',
      'requiredElements',
      'notableAdaptations',
      'description',
    ];

    const rows = filteredPublicDomainIPs.map((p) => ({
      id: p.id,
      name: p.name,
      domainType: p.domainType,
      reputationScore: String(p.reputationScore),
      adaptationFatigue: String(p.adaptationFatigue ?? 0),
      culturalRelevance: String(p.culturalRelevance ?? 0),
      dateEnteredDomain: p.dateEnteredDomain,
      lastAdaptationDate: p.lastAdaptationDate ?? '',
      cost: String(p.cost ?? 0),
      genreFlexibility: joinListCell((p.genreFlexibility || []) as any),
      coreElements: joinListCell(p.coreElements || []),
      requiredElements: joinListCell(p.requiredElements || []),
      notableAdaptations: joinListCell(p.notableAdaptations || []),
      description: p.description ?? '',
    }));

    const csv = toCsv(headers, rows);
    try {
      downloadTextFile(`public-domain-${activeSlot}.csv`, csv, 'text/csv');
    } catch {
      toast({ title: 'Export failed', description: 'Could not export CSV.', variant: 'destructive' });
    }
  };

  const handleImportPublicDomainCsvClick = () => {
    importPublicDomainCsvRef.current?.click();
  };

  const handleImportPublicDomainCsv: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    file
      .text()
      .then((text) => {
        const parsed = parseCsv(text);
        const rows = parsed.rows.map((r) => {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) next[k.toLowerCase()] = v;
          return next;
        });

        const allowedTypes = new Set(['literature', 'mythology', 'folklore', 'historical', 'religious']);

        setPublicDomainEdits((prev) => {
          let next = { ...prev };

          for (const row of rows) {
            const id = (row.id || '').trim();
            if (!id) continue;

            const base = next[id] ?? basePublicDomainById.get(id);
            const incomingType = (row.domaintype || '').trim();
            const domainType = (allowedTypes.has(incomingType) ? incomingType : undefined) ?? (base?.domainType ?? 'literature');

            const merged: PublicDomainIP = {
              id,
              name: (row.name || base?.name || '').trim() || 'Public Domain IP',
              domainType: domainType as any,
              reputationScore: Number(row.reputationscore || base?.reputationScore || 0) || 0,
              adaptationFatigue: Number(row.adaptationfatigue || base?.adaptationFatigue || 0) || 0,
              culturalRelevance: Number(row.culturalrelevance || base?.culturalRelevance || 0) || 0,
              dateEnteredDomain: (row.dateentereddomain || base?.dateEnteredDomain || '').trim() || '1900-01-01',
              lastAdaptationDate: (row.lastadaptationdate || base?.lastAdaptationDate || '').trim() || undefined,
              cost: Number(row.cost || base?.cost || 0) || 0,
              genreFlexibility: splitListCell(row.genreflexibility || joinListCell((base?.genreFlexibility || []) as any)) as any,
              coreElements: splitListCell(row.coreelements || joinListCell(base?.coreElements || [])),
              requiredElements: splitListCell(row.requiredelements || joinListCell(base?.requiredElements || [])),
              notableAdaptations: splitListCell(row.notableadaptations || joinListCell(base?.notableAdaptations || [])),
              suggestedCharacters: base?.suggestedCharacters || [],
              description: (row.description || base?.description || '').trim() || undefined,
            };

            next[id] = stripUndefined(merged);
          }

          return next;
        });

        toast({ title: 'Imported', description: 'Imported public domain IPs from CSV (merged). Click Apply to generate patches.' });
      })
      .catch(() => {
        toast({ title: 'Import failed', description: 'Could not read CSV file.', variant: 'destructive' });
      });
  };

  const handleResetProviderRow = (id: ProviderId) => {
    const base = baseProvidersById.get(id);
    if (!base) return;
    setProviderEdits((prev) => ({ ...prev, [id]: stripUndefined(base) }));
  };

  const handleResetPublicDomainRow = (id: string) => {
    const base = basePublicDomainById.get(id);
    setPublicDomainEdits((prev) => {
      if (base) return { ...prev, [id]: stripUndefined(base) };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResetTalentRow = (id: string) => {
    const base = baseTalentById.get(id);
    if (!base) return;
    setTalentEdits((prev) => ({ ...prev, [id]: pickTalentEdit(base) }));
  };

  const handleResetFranchiseRow = (id: string) => {
    const base = baseFranchiseById.get(id);
    if (!base) return;
    setFranchiseEdits((prev) => ({ ...prev, [id]: stripUndefined(base) }));
  };

  const handleResetStudioRow = (name: string) => {
    const base = baseStudioByName.get(name);
    setStudioEdits((prev) => {
      if (base) return { ...prev, [name]: stripUndefined(base) };
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleResetMediaSourceRow = (id: string) => {
    const base = baseMediaById.get(id);
    setMediaSourceEdits((prev) => {
      if (base) return { ...prev, [id]: stripUndefined(base) };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResetParodyNames = () => {
    const base = (PARODY_CHARACTER_NAME_MAP as any)[parodyNamesKey] ?? ({} as ParodyCharacterNameMapEntry);
    setParodyByCharacterIdRows(nameRowsFromRecord(base.byCharacterId));
    setParodyByTemplateIdRows(nameRowsFromRecord(base.byTemplateId));
  };

  const handleResetAwardShow = () => {
    const base = AWARD_SHOWS.find((s) => s.id === awardShowKey);
    setAwardShowEdits((prev) => {
      if (base) return { ...prev, [awardShowKey]: stripUndefined(base) };
      const next = { ...prev };
      delete next[awardShowKey];
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Mods</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {activeSlot === 'default' ? <Badge variant="secondary">default (read-only)</Badge> : null}
            {isDirty ? <Badge variant="outline">unsaved</Badge> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Slot</Label>
            <Select value={activeSlot} onValueChange={handleSwitchSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select slot" />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Create slot</Label>
            <div className="flex gap-2">
              <Input value={newSlotName} onChange={(e) => setNewSlotName(e.target.value)} placeholder="e.g. my-mod-db" />
              <Button size="sm" variant="secondary" onClick={handleCreateSlot}>
                Create
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={handleReload}>
              Reload
            </Button>
            <Button size="sm" onClick={handleSave}>
              {activeSlot === 'default' ? 'Save As…' : 'Save'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDuplicateSlot}>
              Duplicate
            </Button>
            <Button size="sm" variant="secondary" disabled={activeSlot === 'default'} onClick={handleRenameSlot}>
              Rename
            </Button>
            <Button size="sm" variant="secondary" disabled={activeSlot === 'default'} onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" variant="destructive" disabled={activeSlot === 'default'} onClick={handleDeleteSlot}>
              Delete slot
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        <Input ref={importMediaSourceCsvRef} type="file" accept="text/csv,.csv" className="hidden" onChange={handleImportMediaSourcesCsv} />
        <Input ref={importPublicDomainCsvRef} type="file" accept="text/csv,.csv" className="hidden" onChange={handleImportPublicDomainCsv} />

        <Tabs defaultValue="database" className="w-full">
          <TabsList>
            <TabsTrigger value="database">Database editor</TabsTrigger>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Editing mod</Label>
                <Select value={editorModId} onValueChange={(v) => {
                  setEditorModId(v);
                  setQuickModId(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mod" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([...(bundle.mods || []).map((m) => m.id), editorModId]))
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
                  <Switch checked={selectedMod?.enabled ?? true} onCheckedChange={(checked) => handleUpdateMod({ enabled: checked })} />
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
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="providerDeals">Provider Deals</TabsTrigger>
                <TabsTrigger value="publicDomain">Public Domain IP</TabsTrigger>
                <TabsTrigger value="pdCharacters">PD Characters</TabsTrigger>
                <TabsTrigger value="franchiseRoles">Franchise Roles</TabsTrigger>
                <TabsTrigger value="franchiseCharacters">Franchise Characters</TabsTrigger>
                <TabsTrigger value="talent">Talent (Core)</TabsTrigger>
                <TabsTrigger value="franchises">Franchises</TabsTrigger>
                <TabsTrigger value="awardShows">Award Shows</TabsTrigger>
                <TabsTrigger value="studios">Studios</TabsTrigger>
                <TabsTrigger value="mediaSources">Media Sources</TabsTrigger>
                <TabsTrigger value="mediaTemplates">Media Templates</TabsTrigger>
                <TabsTrigger value="parodyNames">Parody Names</TabsTrigger>
              </TabsList>

              <TabsContent value="providerDeals" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Provider Deals: <span className="font-medium text-foreground">{changedProviderCount}</span> changed
                  </div>
                  <Button size="sm" onClick={applyProviderEdits}>
                    Apply changes
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-2">ID</TableHead>
                      <TableHead className="p-2">Name</TableHead>
                      <TableHead className="p-2">Kind</TableHead>
                      <TableHead className="p-2">Share</TableHead>
                      <TableHead className="p-2">Avg rate</TableHead>
                      <TableHead className="p-2">Bonus</TableHead>
                      <TableHead className="p-2">Min quality</TableHead>
                      <TableHead className="p-2">Preferred genres</TableHead>
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
                            <Input className="h-8 min-w-[180px]" value={edited.name} onChange={(e) => updateProvider(base.id, { name: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select value={edited.dealKind} onValueChange={(v) => updateProvider(base.id, { dealKind: v as any })}>
                              <SelectTrigger className="h-8 w-[140px]">
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
                              className="h-8 w-[110px]"
                              type="number"
                              value={String(edited.marketShare)}
                              onChange={(e) => updateProvider(base.id, { marketShare: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[120px]"
                              type="number"
                              value={String(edited.averageRate)}
                              onChange={(e) => updateProvider(base.id, { averageRate: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[90px]"
                              type="number"
                              step="0.01"
                              value={String(edited.bonusMultiplier)}
                              onChange={(e) => updateProvider(base.id, { bonusMultiplier: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[120px]"
                              type="number"
                              value={String((edited as any).requirements?.minQuality ?? 0)}
                              onChange={(e) => {
                                const v = Number(e.target.value) || 0;
                                updateProvider(base.id, { requirements: { ...(edited as any).requirements, minQuality: v } } as any);
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(((edited as any).requirements?.preferredGenres as string[]) || []).join(', ')}
                              onChange={(e) => updateProviderCsv(base.id, 'requirements.preferredGenres', e.target.value)}
                              placeholder="drama, action"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => handleResetProviderRow(base.id)}>
                              Reset
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="publicDomain" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Public Domain IPs: <span className="font-medium text-foreground">{changedPublicDomainCount}</span> changed
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deletedBasePublicDomainIds.length ? (
                      <Select
                        value={restorePublicDomainId}
                        onValueChange={(v) => {
                          setRestorePublicDomainId('');
                          handleRestorePublicDomainIP(v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder={`Restore deleted (${deletedBasePublicDomainIds.length})`} />
                        </SelectTrigger>
                        <SelectContent>
                          {deletedBasePublicDomainIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={handleResetPublicDomainView}>
                      Reset view
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleAddPublicDomainIP}>
                      Add IP
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleImportPublicDomainCsvClick}>
                      Import CSV
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleExportPublicDomainCsv}>
                      Export CSV
                    </Button>
                    <Button size="sm" onClick={applyPublicDomainEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Search</Label>
                    <Input value={publicDomainSearch} onChange={(e) => setPublicDomainSearch(e.target.value)} placeholder="Filter by id or name" />
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
                      <TableHead className="p-2">Entered</TableHead>
                      <TableHead className="p-2">Last adapt</TableHead>
                      <TableHead className="p-2">Cost</TableHead>
                      <TableHead className="p-2">Genres</TableHead>
                      <TableHead className="p-2">Core</TableHead>
                      <TableHead className="p-2">Required</TableHead>
                      <TableHead className="p-2">Notable</TableHead>
                      <TableHead className="p-2">Description</TableHead>
                      <TableHead className="p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPublicDomainIPs.map((row) => {
                      const edited = publicDomainEdits[row.id] ?? row;
                      const base = basePublicDomainById.get(row.id);
                      const isInserted = !base;
                      const isChanged = isInserted ? true : !deepEqual(stripUndefined(base), stripUndefined(edited));

                      return (
                        <TableRow key={row.id} className={isChanged ? 'bg-muted/30' : undefined}>
                          <TableCell className="p-2 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span>{row.id}</span>
                              {isInserted ? <Badge variant="secondary">new</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 min-w-[220px]" value={edited.name} onChange={(e) => updatePublicDomain(row.id, { name: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select value={edited.domainType} onValueChange={(v) => updatePublicDomain(row.id, { domainType: v as any })}>
                              <SelectTrigger className="h-8 w-[160px]">
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
                              onChange={(e) => updatePublicDomain(row.id, { reputationScore: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[90px]"
                              type="number"
                              value={String(edited.adaptationFatigue ?? 0)}
                              onChange={(e) => updatePublicDomain(row.id, { adaptationFatigue: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[100px]"
                              type="number"
                              value={String(edited.culturalRelevance ?? 0)}
                              onChange={(e) => updatePublicDomain(row.id, { culturalRelevance: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[140px]" value={edited.dateEnteredDomain} onChange={(e) => updatePublicDomain(row.id, { dateEnteredDomain: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[140px]"
                              value={edited.lastAdaptationDate ?? ''}
                              onChange={(e) => updatePublicDomain(row.id, { lastAdaptationDate: e.target.value || undefined })}
                              placeholder="(optional)"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[100px]"
                              type="number"
                              value={String(edited.cost ?? 0)}
                              onChange={(e) => updatePublicDomain(row.id, { cost: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.genreFlexibility || []).join(', ')}
                              onChange={(e) => updatePublicDomainList(row.id, 'genreFlexibility', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.coreElements || []).join(', ')}
                              onChange={(e) => updatePublicDomainList(row.id, 'coreElements', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.requiredElements || []).join(', ')}
                              onChange={(e) => updatePublicDomainList(row.id, 'requiredElements', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.notableAdaptations || []).join(', ')}
                              onChange={(e) => updatePublicDomainList(row.id, 'notableAdaptations', e.target.value)}
                              placeholder="(optional)"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[260px]"
                              value={edited.description ?? ''}
                              onChange={(e) => updatePublicDomain(row.id, { description: e.target.value || undefined })}
                              placeholder="(optional)"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleResetPublicDomainRow(row.id)}>
                                Reset
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeletePublicDomainIP(row.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <p className="text-xs text-muted-foreground">CSV import/export uses <code>|</code> inside a cell for list fields (e.g. <code>genreFlexibility</code>, <code>coreElements</code>).</p>
              </TabsContent>

              <TabsContent value="pdCharacters" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Suggested Characters for <span className="font-medium text-foreground">{publicDomainCharactersKey || '(none)'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={handleResetPublicDomainCharactersView}>
                      Reset view
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleAddPublicDomainCharacterRow}>
                      Add character
                    </Button>
                    <Button size="sm" onClick={applyPublicDomainEdits}>
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
                        {publicDomainIPsForEditor.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.id}
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
                            <Input className="h-8 w-[160px] font-mono text-xs" value={c.id} onChange={(e) => updatePublicDomainCharacterRow(idx, { id: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 min-w-[180px]" value={c.name} onChange={(e) => updatePublicDomainCharacterRow(idx, { name: e.target.value })} />
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
                              onChange={(e) => updatePublicDomainCharacterRow(idx, { traits: splitCsv(e.target.value) as any })}
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
                            <Button size="sm" variant="ghost" onClick={() => handleDeletePublicDomainCharacterRow(idx)}>
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="franchiseRoles" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Franchise Role Set: <span className="font-medium text-foreground">{roleSetIsChanged ? 'changed' : 'no changes'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={handleAddRoleRow}>
                      Add role
                    </Button>
                    <Button size="sm" onClick={applyRoleSetEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parody source key</Label>
                    <Select value={roleSetKey} onValueChange={setRoleSetKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(FRANCHISE_ROLE_SETS).map((k) => (
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
                            <Input className="h-8 w-[150px] font-mono text-xs" value={r.id} onChange={(e) => updateRoleRow(idx, { id: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 min-w-[180px]" value={r.name} onChange={(e) => updateRoleRow(idx, { name: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select value={r.importance} onValueChange={(v) => updateRoleRow(idx, { importance: v as any })}>
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
                            <Select value={r.requiredType ?? 'actor'} onValueChange={(v) => updateRoleRow(idx, { requiredType: v as any })}>
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
                            <Input className="h-8 w-[90px]" type="number" value={String(minAge)} onChange={(e) => updateRoleRow(idx, { ageRange: [Number(e.target.value) || 0, maxAge] })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[90px]" type="number" value={String(maxAge)} onChange={(e) => updateRoleRow(idx, { ageRange: [minAge, Number(e.target.value) || 0] })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[200px]"
                              value={(r.traits || []).join(', ')}
                              onChange={(e) => updateRoleRow(idx, { traits: splitCsv(e.target.value) as any })}
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
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRoleRow(idx)}>
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="franchiseCharacters" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Franchise Character DB: <span className="font-medium text-foreground">{characterDbIsChanged ? 'changed' : 'no changes'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={handleAddCharacterRow}>
                      Add character
                    </Button>
                    <Button size="sm" onClick={applyCharacterDbEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Franchise key</Label>
                    <Select value={characterDbKey} onValueChange={setCharacterDbKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(FRANCHISE_CHARACTER_DB).map((k) => (
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
                      <TableHead className="p-2">Template</TableHead>
                      <TableHead className="p-2">Importance</TableHead>
                      <TableHead className="p-2">Type</TableHead>
                      <TableHead className="p-2">Mandatory</TableHead>
                      <TableHead className="p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {characterDbRows.map((c, idx) => (
                      <TableRow key={`${c.character_id}-${idx}`}>
                        <TableCell className="p-2">
                          <Input
                            className="h-8 w-[160px] font-mono text-xs"
                            value={c.character_id}
                            onChange={(e) => updateCharacterRow(idx, { character_id: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input className="h-8 min-w-[180px]" value={c.name} onChange={(e) => updateCharacterRow(idx, { name: e.target.value })} />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className="h-8 w-[140px]"
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
                          <Select value={c.requiredType ?? 'actor'} onValueChange={(v) => updateCharacterRow(idx, { requiredType: v as any })}>
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
                            <Switch checked={!!c.is_mandatory} onCheckedChange={(checked) => updateCharacterRow(idx, { is_mandatory: checked })} />
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCharacterRow(idx)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="talent" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Talent: <span className="font-medium text-foreground">{changedTalentCount}</span> changed
                  </div>
                  <Button size="sm" onClick={applyTalentEdits}>
                    Apply changes
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} placeholder="Search talent..." />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-2">ID</TableHead>
                      <TableHead className="p-2">Name</TableHead>
                      <TableHead className="p-2">Type</TableHead>
                      <TableHead className="p-2">Age</TableHead>
                      <TableHead className="p-2">Nationality</TableHead>
                      <TableHead className="p-2">Reputation</TableHead>
                      <TableHead className="p-2">Market</TableHead>
                      <TableHead className="p-2">Genres</TableHead>
                      <TableHead className="p-2">Traits</TableHead>
                      <TableHead className="p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTalent.map((base) => {
                      const edited = talentEdits[base.id] ?? pickTalentEdit(base);
                      const isChanged = !deepEqual(stripUndefined(pickTalentEdit(base)), stripUndefined(edited));

                      return (
                        <TableRow key={base.id} className={isChanged ? 'bg-muted/30' : undefined}>
                          <TableCell className="p-2 font-mono text-xs">{base.id}</TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 min-w-[180px]" value={edited.name} onChange={(e) => updateTalent(base.id, { name: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[140px]" value={edited.type} onChange={(e) => updateTalent(base.id, { type: e.target.value as any })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[90px]" type="number" value={String(edited.age)} onChange={(e) => updateTalent(base.id, { age: Number(e.target.value) || 0 })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[160px]"
                              value={edited.nationality ?? ''}
                              onChange={(e) => updateTalent(base.id, { nationality: e.target.value || undefined })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[110px]"
                              type="number"
                              value={String(edited.reputation)}
                              onChange={(e) => updateTalent(base.id, { reputation: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[120px]"
                              type="number"
                              value={String(edited.marketValue)}
                              onChange={(e) => updateTalent(base.id, { marketValue: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.genres || []).join(', ')}
                              onChange={(e) => updateTalentGenres(base.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.traits || []).join(', ')}
                              onChange={(e) => updateTalentTraits(base.id, e.target.value)}
                              placeholder="(optional)"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => handleResetTalentRow(base.id)}>
                              Reset
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <p className="text-xs text-muted-foreground">Tip: this edits the stable <code>core:*</code> talent set (not the randomly-generated filler talent).</p>
              </TabsContent>

              <TabsContent value="franchises" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Franchises: <span className="font-medium text-foreground">{changedFranchiseCount}</span> changed
                  </div>
                  <Button size="sm" onClick={applyFranchiseEdits}>
                    Apply changes
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input value={franchiseSearch} onChange={(e) => setFranchiseSearch(e.target.value)} placeholder="Search franchises..." />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-2">ID</TableHead>
                      <TableHead className="p-2">Title</TableHead>
                      <TableHead className="p-2">Status</TableHead>
                      <TableHead className="p-2">Tone</TableHead>
                      <TableHead className="p-2">Genres</TableHead>
                      <TableHead className="p-2">Cost</TableHead>
                      <TableHead className="p-2">Tags</TableHead>
                      <TableHead className="p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFranchises.map((base) => {
                      const edited = franchiseEdits[base.id] ?? base;
                      const isChanged = !deepEqual(stripUndefined(base), stripUndefined(edited));

                      return (
                        <TableRow key={base.id} className={isChanged ? 'bg-muted/30' : undefined}>
                          <TableCell className="p-2 font-mono text-xs">{base.id}</TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 min-w-[180px]" value={edited.title} onChange={(e) => updateFranchise(base.id, { title: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[120px]" value={edited.status} onChange={(e) => updateFranchise(base.id, { status: e.target.value as any })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[120px]" value={edited.tone} onChange={(e) => updateFranchise(base.id, { tone: e.target.value as any })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.genre || []).join(', ')}
                              onChange={(e) => updateFranchiseGenres(base.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[120px]"
                              type="number"
                              value={String(edited.cost ?? 0)}
                              onChange={(e) => updateFranchise(base.id, { cost: Number(e.target.value) || 0 } as any)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.tags || []).join(', ')}
                              onChange={(e) => updateFranchise(base.id, { tags: splitCsv(e.target.value) })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => handleResetFranchiseRow(base.id)}>
                              Reset
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <p className="text-xs text-muted-foreground">Tip: base franchises are deterministic (seeded) so patches are stable.</p>
              </TabsContent>

              <TabsContent value="awardShows" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Award Shows: <span className="font-medium text-foreground">{awardShowIsChanged ? 'changed' : 'no changes'}</span>
                  </div>
                  <Button size="sm" onClick={applyAwardShowEdits}>
                    Apply changes
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Award show</Label>
                    <Select value={awardShowKey} onValueChange={setAwardShowKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {awardShowsForEditor.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end justify-end gap-2">
                    {deletedBaseAwardShowIds.length ? (
                      <Select
                        value={restoreAwardShowId}
                        onValueChange={(v) => {
                          setRestoreAwardShowId('');
                          handleRestoreAwardShow(v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder={`Restore deleted (${deletedBaseAwardShowIds.length})`} />
                        </SelectTrigger>
                        <SelectContent>
                          {deletedBaseAwardShowIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={handleResetAwardShowsView}>
                      Reset schedule
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleAddAwardShow}>
                      Add show
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!awardShowKey}
                      onClick={() => handleDeleteAwardShow(awardShowKey)}
                    >
                      Delete show
                    </Button>
                    <Button size="sm" variant="secondary" disabled={!awardShowKey} onClick={handleResetAwardShow}>
                      Reset view
                    </Button>
                    <Button size="sm" variant="secondary" disabled={!awardShowKey} onClick={() => handleAddAwardCategory(awardShowKey)}>
                      Add category
                    </Button>
                  </div>
                </div>

                {awardShowKey ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input
                          value={(awardShowEdits[awardShowKey]?.name ?? '')}
                          onChange={(e) => updateAwardShow(awardShowKey, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Ceremony week</Label>
                        <Input
                          type="number"
                          value={String(awardShowEdits[awardShowKey]?.ceremonyWeek ?? 0)}
                          onChange={(e) => updateAwardShow(awardShowKey, { ceremonyWeek: Number(e.target.value) || 0 } as any)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Prestige</Label>
                        <Input
                          type="number"
                          value={String((awardShowEdits[awardShowKey] as any)?.prestige ?? 0)}
                          onChange={(e) => updateAwardShow(awardShowKey, { prestige: Number(e.target.value) || 0 } as any)}
                        />
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-2">id</TableHead>
                          <TableHead className="p-2">Name</TableHead>
                          <TableHead className="p-2">Kind</TableHead>
                          <TableHead className="p-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(awardShowEdits[awardShowKey]?.categories || []).map((c, idx) => (
                          <TableRow key={`${c.id}-${idx}`}>
                            <TableCell className="p-2">
                              <Input
                                className="h-8 w-[160px] font-mono text-xs"
                                value={c.id}
                                onChange={(e) => updateAwardCategory(awardShowKey, idx, { id: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                className="h-8 min-w-[240px]"
                                value={c.name}
                                onChange={(e) => updateAwardCategory(awardShowKey, idx, { name: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Select
                                value={(c as any).awardKind ?? 'studio'}
                                onValueChange={(v) => updateAwardCategory(awardShowKey, idx, { awardKind: v as any } as any)}
                              >
                                <SelectTrigger className="h-8 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="studio">studio</SelectItem>
                                  <SelectItem value="talent">talent</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteAwardCategory(awardShowKey, idx)}>
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="studios" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Studio Profiles: <span className="font-medium text-foreground">{changedStudioCount}</span> changed
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deletedBaseStudioNames.length ? (
                      <Select
                        value={restoreStudioName}
                        onValueChange={(v) => {
                          setRestoreStudioName('');
                          handleRestoreStudioProfile(v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder={`Restore deleted (${deletedBaseStudioNames.length})`} />
                        </SelectTrigger>
                        <SelectContent>
                          {deletedBaseStudioNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={handleResetStudiosView}>
                      Reset view
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleAddStudioProfile}>
                      Add studio
                    </Button>
                    <Button size="sm" onClick={applyStudioEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Search</Label>
                    <Input value={studioSearch} onChange={(e) => setStudioSearch(e.target.value)} placeholder="Filter by name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">New studio name</Label>
                    <Input value={newStudioProfileName} onChange={(e) => setNewStudioProfileName(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-2">Name</TableHead>
                      <TableHead className="p-2">Budget</TableHead>
                      <TableHead className="p-2">Reputation</TableHead>
                      <TableHead className="p-2">Specialties</TableHead>
                      <TableHead className="p-2">Founded</TableHead>
                      <TableHead className="p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudios.map((row) => {
                      const base = baseStudioByName.get(row.name);
                      const edited = studioEdits[row.name] ?? row;
                      const isInserted = !base;
                      const isChanged = isInserted ? true : !deepEqual(stripUndefined(base), stripUndefined(edited));

                      return (
                        <TableRow key={row.name} className={isChanged ? 'bg-muted/30' : undefined}>
                          <TableCell className="p-2 min-w-[260px]">
                            <div className="flex items-center gap-2">
                              <Input className="h-8" value={row.name} disabled />
                              {isInserted ? <Badge variant="secondary">new</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[140px]"
                              type="number"
                              value={String(edited.budget)}
                              onChange={(e) => updateStudio(row.name, { budget: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[120px]"
                              type="number"
                              value={String(edited.reputation)}
                              onChange={(e) => updateStudio(row.name, { reputation: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.specialties || []).join(', ')}
                              onChange={(e) => updateStudioSpecialties(row.name, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[120px]"
                              type="number"
                              value={String(edited.foundedYear ?? 0)}
                              onChange={(e) => updateStudio(row.name, { foundedYear: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleResetStudioRow(row.name)}>
                                Reset
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteStudioProfile(row.name)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="mediaSources" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Media Sources: <span className="font-medium text-foreground">{changedMediaSourceCount}</span> changed
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deletedBaseMediaSourceIds.length ? (
                      <Select
                        value={restoreMediaSourceId}
                        onValueChange={(v) => {
                          setRestoreMediaSourceId('');
                          handleRestoreMediaSource(v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder={`Restore deleted (${deletedBaseMediaSourceIds.length})`} />
                        </SelectTrigger>
                        <SelectContent>
                          {deletedBaseMediaSourceIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={handleResetMediaSourcesView}>
                      Reset view
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleAddMediaSource}>
                      Add source
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleImportMediaSourcesCsvClick}>
                      Import CSV
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleExportMediaSourcesCsv}>
                      Export CSV
                    </Button>
                    <Button size="sm" onClick={applyMediaSourceEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <Input value={mediaSourceSearch} onChange={(e) => setMediaSourceSearch(e.target.value)} placeholder="Search media sources..." />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-2">ID</TableHead>
                      <TableHead className="p-2">Name</TableHead>
                      <TableHead className="p-2">Type</TableHead>
                      <TableHead className="p-2">Credibility</TableHead>
                      <TableHead className="p-2">Bias</TableHead>
                      <TableHead className="p-2">Reach</TableHead>
                      <TableHead className="p-2">Established</TableHead>
                      <TableHead className="p-2">Specialties</TableHead>
                      <TableHead className="p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMediaSources.map((row) => {
                      const base = baseMediaById.get(row.id);
                      const edited = mediaSourceEdits[row.id] ?? row;
                      const isInserted = !base;
                      const isChanged = isInserted ? true : !deepEqual(stripUndefined(base), stripUndefined(edited));

                      return (
                        <TableRow key={row.id} className={isChanged ? 'bg-muted/30' : undefined}>
                          <TableCell className="p-2 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span>{row.id}</span>
                              {isInserted ? <Badge variant="secondary">new</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 min-w-[200px]" value={edited.name} onChange={(e) => updateMediaSource(row.id, { name: e.target.value })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select value={edited.type} onValueChange={(v) => updateMediaSource(row.id, { type: v as any })}>
                              <SelectTrigger className="h-8 w-[180px]">
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
                              className="h-8 w-[110px]"
                              type="number"
                              value={String(edited.credibility)}
                              onChange={(e) => updateMediaSource(row.id, { credibility: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[90px]" type="number" value={String(edited.bias)} onChange={(e) => updateMediaSource(row.id, { bias: Number(e.target.value) || 0 })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input className="h-8 w-[90px]" type="number" value={String(edited.reach)} onChange={(e) => updateMediaSource(row.id, { reach: Number(e.target.value) || 0 })} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 w-[110px]"
                              type="number"
                              value={String(edited.established)}
                              onChange={(e) => updateMediaSource(row.id, { established: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              className="h-8 min-w-[220px]"
                              value={(edited.specialties || []).join(', ')}
                              onChange={(e) => updateMediaSourceSpecialties(row.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleResetMediaSourceRow(row.id)}>
                                Reset
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteMediaSource(row.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <p className="text-xs text-muted-foreground">CSV import/export uses <code>|</code> inside a cell for list fields (e.g. <code>specialties</code>).</p>
              </TabsContent>

              <TabsContent value="mediaTemplates" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Media Templates: <span className="font-medium text-foreground">{changedMediaTemplateCount}</span> changed
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={handleResetMediaTemplatesView}>
                      Reset view
                    </Button>
                    <Button size="sm" onClick={applyMediaTemplateEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Event type</Label>
                    <Select value={mediaTemplateKey} onValueChange={setMediaTemplateKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {mediaTemplateKeys.map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs text-muted-foreground">Add new event type</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={newMediaTemplateKey}
                        onChange={(e) => setNewMediaTemplateKey(e.target.value)}
                        placeholder="e.g. premiere"
                      />
                      <Button size="sm" variant="secondary" onClick={handleAddMediaTemplateType}>
                        Add type
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!mediaTemplateKey}
                        onClick={() => handleResetMediaTemplateType(mediaTemplateKey)}
                      >
                        Reset type
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          !mediaTemplateKey ||
                          (baseMediaHeadlineTemplates as any)[mediaTemplateKey] !== undefined ||
                          (baseMediaContentTemplates as any)[mediaTemplateKey] !== undefined
                        }
                        onClick={() => handleDeleteMediaTemplateType(mediaTemplateKey)}
                      >
                        Delete type
                      </Button>
                    </div>
                  </div>
                </div>

                {mediaTemplateKey ? (
                  <Tabs defaultValue="headlines" className="w-full">
                    <TabsList>
                      <TabsTrigger value="headlines">Headlines</TabsTrigger>
                      <TabsTrigger value="content">Content</TabsTrigger>
                    </TabsList>

                    <TabsContent value="headlines" className="space-y-3">
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddMediaTemplateRow('headline', mediaTemplateKey)}
                        >
                          Add headline
                        </Button>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="p-2 w-[60px]">#</TableHead>
                            <TableHead className="p-2">Template</TableHead>
                            <TableHead className="p-2"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(mediaHeadlineTemplateEdits[mediaTemplateKey] || []).map((t, idx) => (
                            <TableRow key={`h-${idx}`}>
                              <TableCell className="p-2 font-mono text-xs">{idx + 1}</TableCell>
                              <TableCell className="p-2">
                                <Textarea
                                  className="min-h-[64px] font-mono text-xs"
                                  value={t}
                                  onChange={(e) => updateMediaTemplateRow('headline', mediaTemplateKey, idx, e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteMediaTemplateRow('headline', mediaTemplateKey, idx)}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="content" className="space-y-3">
                      <div className="flex items-center justify-end">
                        <Button size="sm" variant="secondary" onClick={() => handleAddMediaTemplateRow('content', mediaTemplateKey)}>
                          Add content
                        </Button>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="p-2 w-[60px]">#</TableHead>
                            <TableHead className="p-2">Template</TableHead>
                            <TableHead className="p-2"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(mediaContentTemplateEdits[mediaTemplateKey] || []).map((t, idx) => (
                            <TableRow key={`c-${idx}`}>
                              <TableCell className="p-2 font-mono text-xs">{idx + 1}</TableCell>
                              <TableCell className="p-2">
                                <Textarea
                                  className="min-h-[96px] font-mono text-xs"
                                  value={t}
                                  onChange={(e) => updateMediaTemplateRow('content', mediaTemplateKey, idx, e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteMediaTemplateRow('content', mediaTemplateKey, idx)}>
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground">Select an event type to edit templates.</p>
                )}

                <p className="text-xs text-muted-foreground">
                  Tip: templates can include placeholders like <code>{'{FilmTitle}'}</code>, <code>{'{StudioName}'}</code>, and <code>{'{ActorName}'}</code>.
                </p>
              </TabsContent>

              <TabsContent value="parodyNames" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    Parody Names: <span className="font-medium text-foreground">{parodyNamesIsChanged ? 'changed' : 'no changes'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={handleResetParodyNames}>
                      Reset view
                    </Button>
                    <Button size="sm" onClick={applyParodyNamesEdits}>
                      Apply changes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parody source key</Label>
                    <Select value={parodyNamesKey} onValueChange={setParodyNamesKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(PARODY_CHARACTER_NAME_MAP).map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">byCharacterId</div>
                      <Button size="sm" variant="secondary" onClick={handleAddParodyByCharacterIdRow}>
                        Add row
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-2">key</TableHead>
                          <TableHead className="p-2">value</TableHead>
                          <TableHead className="p-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parodyByCharacterIdRows.map((r, idx) => (
                          <TableRow key={`c-${idx}`}>
                            <TableCell className="p-2">
                              <Input className="h-8" value={r.key} onChange={(e) => updateParodyByCharacterIdRow(idx, { key: e.target.value })} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-8" value={r.value} onChange={(e) => updateParodyByCharacterIdRow(idx, { value: e.target.value })} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteParodyByCharacterIdRow(idx)}>
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">byTemplateId</div>
                      <Button size="sm" variant="secondary" onClick={handleAddParodyByTemplateIdRow}>
                        Add row
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-2">key</TableHead>
                          <TableHead className="p-2">value</TableHead>
                          <TableHead className="p-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parodyByTemplateIdRows.map((r, idx) => (
                          <TableRow key={`t-${idx}`}>
                            <TableCell className="p-2">
                              <Input className="h-8" value={r.key} onChange={(e) => updateParodyByTemplateIdRow(idx, { key: e.target.value })} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-8" value={r.value} onChange={(e) => updateParodyByTemplateIdRow(idx, { value: e.target.value })} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteParodyByTemplateIdRow(idx)}>
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Tip: deleting a row generates a patch payload that sets the key to <code>null</code> so deep-merge patching can remove it.
                </p>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mod ID</Label>
                  <Input className="w-[180px]" value={quickModId} onChange={(e) => setQuickModId(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Entity</Label>
                  <Select value={quickEntityType} onValueChange={(v) => setQuickEntityType(v as EntityType)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Op</Label>
                  <Select value={quickOp} onValueChange={(v) => setQuickOp(v as ModOp)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insert">insert</SelectItem>
                      <SelectItem value="update">update</SelectItem>
                      <SelectItem value="delete">delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Target</Label>
                  <Input className="w-[220px]" value={quickTarget} onChange={(e) => setQuickTarget(e.target.value)} placeholder="e.g. source_1" />
                </div>

                <div className="flex-1" />

                <Button size="sm" variant="secondary" onClick={handleImportClick}>
                  Import
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadJson}>
                  Download
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCopyJson}>
                  Copy JSON
                </Button>
                <Button size="sm" onClick={handleAddQuickPatch}>
                  Add patch
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Payload JSON</Label>
                <Textarea
                  value={quickPayload}
                  onChange={(e) => setQuickPayload(e.target.value)}
                  placeholder={quickOp === 'delete' ? '(delete op ignores payload)' : '{\n  "name": "New name"\n}'}
                  disabled={quickOp === 'delete'}
                  className="min-h-[120px] font-mono text-xs"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Supported entity types: <code>{ENTITY_TYPES.join('</code>, <code>')}</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mod bundle JSON</Label>
              <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-[420px] font-mono text-xs" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
