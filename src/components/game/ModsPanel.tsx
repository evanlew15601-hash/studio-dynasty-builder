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
import { FRANCHISE_CHARACTER_DB, type FranchiseCharacterDef } from '@/data/FranchiseCharacterDB';
import { FRANCHISE_ROLE_SETS } from '@/data/RoleDatabase';
import { generateInitialTalentPool } from '@/data/WorldGenerator';
import type { PublicDomainIP, ScriptCharacter, TalentPerson } from '@/types/game';
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
  'franchiseCharacterDb',
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
  gender?: TalentPerson['gender'];
  race?: TalentPerson['race'];
  nationality?: TalentPerson['nationality'];
  reputation: number;
  marketValue: number;
  genres: TalentPerson['genres'];
};

function pickTalentEdit(t: TalentPerson): TalentEdit {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    gender: t.gender,
    race: t.race,
    nationality: t.nationality,
    reputation: t.reputation,
    marketValue: t.marketValue,
    genres: t.genres,
  };
}

export const ModsPanel: React.FC = () => {
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement | null>(null);

  const [raw, setRaw] = useState('');
  const [bundle, setBundle] = useState<ModBundle>(() => getModBundle());
  const [activeSlot, setActiveSlot] = useState<string>(() => getActiveModSlot());
  const [newSlotName, setNewSlotName] = useState('');

  // Editor
  const [editorModId, setEditorModId] = useState('my-mod');
  const [newModId, setNewModId] = useState('');
  const [providerEdits, setProviderEdits] = useState<Record<ProviderId, ProviderDealProfile>>({} as Record<ProviderId, ProviderDealProfile>);
  const [publicDomainEdits, setPublicDomainEdits] = useState<Record<string, PublicDomainIP>>({});
  const [roleSetKey, setRoleSetKey] = useState<string>(() => Object.keys(FRANCHISE_ROLE_SETS)[0] ?? 'Star Wars');
  const [roleSetRows, setRoleSetRows] = useState<ScriptCharacter[]>([]);
  const [characterDbKey, setCharacterDbKey] = useState<string>(() => Object.keys(FRANCHISE_CHARACTER_DB)[0] ?? 'Star Wars');
  const [characterDbRows, setCharacterDbRows] = useState<FranchiseCharacterDef[]>([]);
  const [talentSearch, setTalentSearch] = useState('');
  const [talentEdits, setTalentEdits] = useState<Record<string, TalentEdit>>({});
  const [franchiseSearch, setFranchiseSearch] = useState('');
  const [franchiseEdits, setFranchiseEdits] = useState<Record<string, Franchise>>({});

  // Quick patch builder (raw JSON tab)
  const [quickEntityType, setQuickEntityType] = useState<(typeof ENTITY_TYPES)[number]>('providerDeal');
  const [quickOp, setQuickOp] = useState<ModOp>('update');
  const [quickTarget, setQuickTarget] = useState('netflix');
  const [quickPayload, setQuickPayload] = useState('{\n  "averageRate": 3000000\n}');

  useEffect(() => {
    const slot = getActiveModSlot();
    setActiveSlot(slot);
    const b = getModBundle();
    setBundle(b);
    setRaw(JSON.stringify(b, null, 2));

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

  const basePublicDomainIPs = useMemo(() => PublicDomainGenerator.generateInitialPublicDomainIPs(50), []);

  const baseCoreTalent = useMemo(
    () => generateInitialTalentPool({ currentYear: new Date().getFullYear(), actorCount: 0, directorCount: 0 }),
    []
  );

  const baseFranchises = useMemo(() => FranchiseGenerator.generateInitialFranchises(30), []);

  const baseFranchiseRoleSets = useMemo(() => FRANCHISE_ROLE_SETS, []);
  const baseFranchiseRoleSetKeys = useMemo(() => Object.keys(baseFranchiseRoleSets).sort(), [baseFranchiseRoleSets]);

  const baseFranchiseCharacterDb = useMemo(() => FRANCHISE_CHARACTER_DB, []);
  const baseFranchiseCharacterDbKeys = useMemo(() => Object.keys(baseFranchiseCharacterDb).sort(), [baseFranchiseCharacterDb]);

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

  const providerDealPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'providerDeal')
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

  useEffect(() => {
    const modId = editorModId.trim();
    if (!modId) return;
    rebuildProviderEdits(bundle, modId);
    rebuildPublicDomainEdits(bundle, modId);
    rebuildRoleSetRows(bundle, modId, roleSetKey);
    rebuildCharacterDbRows(bundle, modId, characterDbKey);
    rebuildTalentEdits(bundle, modId);
    rebuildFranchiseEdits(bundle, modId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorModId, roleSetKey, characterDbKey, providerDealPatchKey, publicDomainPatchKey, franchiseRoleSetPatchKey, franchiseCharacterDbPatchKey, talentPatchKey, franchisePatchKey]);

  const changedProviderCount = useMemo(() => {
    let changed = 0;
    for (const [id, edited] of Object.entries(providerEdits)) {
      const base = baseProvidersById.get(id as ProviderId);
      if (!base) continue;
      if (!deepEqual(base, edited)) changed++;
    }
    return changed;
  }, [providerEdits, baseProvidersById]);

  const changedPublicDomainCount = useMemo(() => {
    let changed = 0;
    for (const [id, edited] of Object.entries(publicDomainEdits)) {
      const base = basePublicDomainById.get(id);
      if (!base) continue;
      if (!deepEqual(base, edited)) changed++;
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
    syncFromBundle(b);
  };

  const handleSave = () => {
    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    saveModBundle(normalized);
    syncFromBundle(normalized);
    toast({
      title: 'Mods saved',
      description: `Saved to slot "${getActiveModSlot()}". Reload the page if a system doesn't pick up changes immediately.`,
    });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      toast({ title: 'Copied', description: 'Mod bundle JSON copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard in this browser.', variant: 'destructive' });
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
      toast({ title: 'Download failed', description: 'Could not generate a download in this browser.', variant: 'destructive' });
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
        toast({ title: 'Imported', description: 'Imported mod bundle into the editor. Click Save to persist.' });
      } catch {
        setRaw(text);
        toast({
          title: 'Imported (unformatted)',
          description: 'Could not parse JSON. The file contents were loaded into the editor as plain text.',
          variant: 'destructive',
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

    setActiveModSlot(next);
    setActiveSlot(getActiveModSlot());
    setNewSlotName('');

    // Start the new slot from the current JSON (if valid), otherwise start empty.
    const normalized = parseFromRawOrToast();
    if (normalized) {
      saveModBundle(normalized);
      syncFromBundle(normalized);
    } else {
      const empty: ModBundle = { version: 1, mods: [], patches: [] };
      saveModBundle(empty);
      syncFromBundle(empty);
    }

    toast({ title: 'Slot created', description: `Active mod slot set to "${next}".` });
  };

  const handleDeleteSlot = () => {
    if (activeSlot === 'default') return;
    deleteModSlot(activeSlot);
    const nextSlot = getActiveModSlot();
    setActiveSlot(nextSlot);
    handleReload();
    toast({ title: 'Slot deleted', description: `Deleted slot "${activeSlot}".` });
  };

  const handleClear = () => {
    clearModBundle();
    const b = getModBundle();
    syncFromBundle(b);
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
    toast({ title: 'Mod created', description: `Created mod "${nextId}" in this slot.` });
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

  const updateProvider = (id: ProviderId, updates: Partial<ProviderDealProfile>) => {
    setProviderEdits((prev) => {
      const current = prev[id] ?? (baseProvidersById.get(id) as ProviderDealProfile);
      return { ...prev, [id]: { ...current, ...updates } };
    });
  };

  const updatePublicDomain = (id: string, updates: Partial<PublicDomainIP>) => {
    setPublicDomainEdits((prev) => {
      const current = prev[id] ?? (basePublicDomainById.get(id) as PublicDomainIP);
      return { ...prev, [id]: { ...current, ...updates } };
    });
  };

  const updatePublicDomainStringList = (id: string, field: 'coreElements' | 'requiredElements', value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePublicDomain(id, { [field]: list.length ? list : undefined } as any);
  };

  const updatePublicDomainGenreList = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePublicDomain(id, { genreFlexibility: list as any } as any);
  };

  const updateRoleRow = (idx: number, updates: Partial<ScriptCharacter>) => {
    setRoleSetRows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...updates };
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
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  };

  const updateCharacterTraits = (idx: number, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateCharacterRow(idx, { traits: list.length ? list : undefined });
  };

  const updateTalent = (id: string, updates: Partial<TalentEdit>) => {
    setTalentEdits((prev) => {
      const base = baseCoreTalentById.get(id);
      const current = prev[id] ?? (base ? pickTalentEdit(base) : null);
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...updates } };
    });
  };

  const updateTalentGenres = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateTalent(id, { genres: list as any });
  };

  const updateFranchise = (id: string, updates: Partial<Franchise>) => {
    setFranchiseEdits((prev) => {
      const base = baseFranchisesById.get(id);
      const current = prev[id] ?? base;
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...updates } };
    });
  };

  const updateFranchiseTags = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateFranchise(id, { franchiseTags: list });
  };

  const updateFranchiseGenres = (id: string, value: string) => {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Genre[];
    updateFranchise(id, { genre: list });
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
      return { ...prev, [id]: { ...current, requirements: { ...current.requirements, ...updates } } };
    });
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

      if (deepEqual(base, edited)) continue;

      const patchId = `providerDeal:${modId}:${providerId}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'providerDeal',
        op: 'update',
        target: providerId,
        payload: edited,
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied provider changes as patches in mod "${modId}". Click Save to persist.` });
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

      if (deepEqual(base, edited)) continue;

      const patchId = `publicDomainIP:${modId}:${ipId}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'publicDomainIP',
        op: 'update',
        target: ipId,
        payload: edited,
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied public domain changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyRoleSetEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const key = roleSetKey;
    if (!key) return;

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'franchiseRoleSet' && p.op === 'update' && p.target === key)
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    const base = baseFranchiseRoleSets[key] ?? [];

    if (!deepEqual(stripUndefined(base), stripUndefined(roleSetRows))) {
      const patchId = `franchiseRoleSet:${modId}:${key}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'franchiseRoleSet',
        op: 'update',
        target: key,
        payload: stripUndefined(roleSetRows),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied role set changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyCharacterDbEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const key = characterDbKey;
    if (!key) return;

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'franchiseCharacterDb' && p.op === 'update' && p.target === key)
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    const base = baseFranchiseCharacterDb[key] ?? [];

    if (!deepEqual(stripUndefined(base), stripUndefined(characterDbRows))) {
      const patchId = `franchiseCharacterDb:${modId}:${key}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'franchiseCharacterDb',
        op: 'update',
        target: key,
        payload: stripUndefined(characterDbRows),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied franchise character changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyTalentEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseIds = new Set(baseCoreTalent.map((t) => t.id));

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'talent' && p.op === 'update' && p.target && baseIds.has(String(p.target)))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const t of baseCoreTalent) {
      const baseEdit = pickTalentEdit(t);
      const edited = talentEdits[t.id] ?? baseEdit;

      if (deepEqual(stripUndefined(baseEdit), stripUndefined(edited))) continue;

      const { id: _id, ...payload } = edited;

      const patchId = `talent:${modId}:${t.id}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'talent',
        op: 'update',
        target: t.id,
        payload: stripUndefined(payload),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied talent changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleApplyFranchiseEdits = () => {
    const modId = editorModId.trim();
    if (!modId) return;

    const baseIds = new Set(baseFranchises.map((f) => f.id));

    const keptPatches = bundle.patches.filter(
      (p) => !(p.modId === modId && p.entityType === 'franchise' && p.op === 'update' && p.target && baseIds.has(String(p.target)))
    );

    let next: ModBundle = ensureMod({ ...bundle, patches: keptPatches }, modId);

    for (const f of baseFranchises) {
      const edited = franchiseEdits[f.id] ?? f;
      if (deepEqual(stripUndefined(f), stripUndefined(edited))) continue;

      const patchId = `franchise:${modId}:${f.id}`;
      next = upsertPatch(next, {
        id: patchId,
        modId,
        entityType: 'franchise',
        op: 'update',
        target: f.id,
        payload: stripUndefined(edited),
      });
    }

    syncFromBundle(next);
    toast({ title: 'Applied', description: `Applied franchise changes as patches in mod "${modId}". Click Save to persist.` });
  };

  const handleAddPatchToEditor = () => {
    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    const modId = editorModId.trim();
    if (!modId) {
      toast({ title: 'Missing mod id', description: 'Enter a mod id (e.g. "my-mod").', variant: 'destructive' });
      return;
    }

    const next: ModBundle = {
      ...normalized,
      mods: normalized.mods.some((m) => m.id === modId) ? normalized.mods : [...normalized.mods, makeDefaultMod(modId)],
      patches: normalized.patches.slice(),
    };

    let payload: unknown = undefined;
    if (quickOp === 'insert' || quickOp === 'update') {
      try {
        payload = JSON.parse(quickPayload);
      } catch {
        toast({ title: 'Invalid payload JSON', description: 'Payload must be valid JSON.', variant: 'destructive' });
        return;
      }
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `p-${crypto.randomUUID()}` : `p-${Date.now()}`;

    next.patches.push({
      id,
      modId,
      entityType: quickEntityType,
      op: quickOp,
      target: quickTarget.trim() || undefined,
      payload,
    });

    syncFromBundle(next);
    toast({ title: 'Patch added', description: 'Patch added to the JSON editor. Click Save to persist.' });
  };

  return (
    <div className="space-y-4">
      <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mod Database</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{enabledCount}/{bundle.mods.length} enabled</Badge>
              <Badge variant="secondary">{bundle.patches.length} patches</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mods are applied as patches on top of the built-in data; they do not replace the default databases. Higher
            priority mods win conflicts.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Active slot</div>
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

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Create slot (Save As)</div>
              <div className="flex gap-2">
                <Input
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  placeholder="e.g. real-world-mod"
                />
                <Button size="sm" variant="secondary" onClick={handleCreateSlot}>
                  Create
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Slot actions</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={handleReload}>
                  Reload
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save
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
                    <CardTitle className="text-base">Database editor (TEW-style)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Edit values in a grid, then apply changes to generate patches. This currently supports{' '}
                      <code>providerDeal</code>, <code>publicDomainIP</code>, <code>franchiseRoleSet</code>, <code>franchiseCharacterDb</code>, <code>talent</code>, and <code>franchise</code>.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Editing mod</Label>
                        <Select value={editorModId} onValueChange={setEditorModId}>
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
                        <TabsTrigger value="publicDomain">Public Domain IP</TabsTrigger>
                        <TabsTrigger value="franchiseRoles">Franchise Roles</TabsTrigger>
                        <TabsTrigger value="franchiseCharacters">Franchise Characters</TabsTrigger>
                        <TabsTrigger value="talent">Talent (Core)</TabsTrigger>
                        <TabsTrigger value="franchises">Franchises</TabsTrigger>
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
                              <TableHead className="p-2">Market share</TableHead>
                              <TableHead className="p-2">Avg rate</TableHead>
                              <TableHead className="p-2">Bonus</TableHead>
                              <TableHead className="p-2">Min quality</TableHead>
                              <TableHead className="p-2">Viewers/share</TableHead>
                              <TableHead className="p-2">Completion %</TableHead>
                              <TableHead className="p-2">Sub growth</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {PROVIDER_DEALS.map((base) => {
                              const edited = providerEdits[base.id] ?? base;
                              const isChanged = !deepEqual(base, edited);

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
                                      className="h-8 w-[120px]"
                                      type="number"
                                      value={String(edited.requirements?.minQuality ?? 0)}
                                      onChange={(e) => updateProviderRequirements(base.id, { minQuality: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[160px]"
                                      type="number"
                                      value={String(edited.expectations?.viewersPerShare ?? 0)}
                                      onChange={(e) => updateProviderExpectations(base.id, { viewersPerShare: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[130px]"
                                      type="number"
                                      value={String(edited.expectations?.completionRate ?? 0)}
                                      onChange={(e) => updateProviderExpectations(base.id, { completionRate: Number(e.target.value) || 0 })}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      className="h-8 w-[120px]"
                                      type="number"
                                      step="0.001"
                                      value={String(edited.expectations?.subscriberGrowthRate ?? 0)}
                                      onChange={(e) =>
                                        updateProviderExpectations(base.id, { subscriberGrowthRate: Number(e.target.value) || 0 })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => handleResetProviderRow(base.id)}>
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
                          Tip: after clicking <strong>Apply changes</strong>, use the top-level <strong>Save</strong> button to persist
                          this slot.
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
                              <TableHead className="p-2">Genres</TableHead>
                              <TableHead className="p-2">Core elements</TableHead>
                              <TableHead className="p-2">Required elements</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                              <TableHead className="p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {basePublicDomainIPs.map((base) => {
                              const edited = publicDomainEdits[base.id] ?? base;
                              const isChanged = !deepEqual(base, edited);

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
                          Tip: the <code>Genres</code> and <code>Core elements</code> fields accept a comma-separated list.
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
                              <TableHead className="p-2">Importance</TableHead>
                              <TableHead className="p-2">Required type</TableHead>
                              <TableHead className="p-2">Min age</TableHead>
                              <TableHead className="p-2">Max age</TableHead>
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
                              <TableHead className="p-2">Gender</TableHead>
                              <TableHead className="p-2">Race</TableHead>
                              <TableHead className="p-2">Nationality</TableHead>
                              <TableHead className="p-2">Reputation</TableHead>
                              <TableHead className="p-2">Market value</TableHead>
                              <TableHead className="p-2">Genres</TableHead>
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
                                        className="h-8 min-w-[220px]"
                                        value={(edited.genres || []).join(', ')}
                                        onChange={(e) => updateTalentGenres(t.id, e.target.value)}
                                        placeholder="drama, thriller"
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
                              <TableHead className="p-2">Status</TableHead>
                              <TableHead className="p-2">Tone</TableHead>
                              <TableHead className="p-2">Genres</TableHead>
                              <TableHead className="p-2">Parody source</TableHead>
                              <TableHead className="p-2">Origin date</TableHead>
                              <TableHead className="p-2">Cultural</TableHead>
                              <TableHead className="p-2">Merch</TableHead>
                              <TableHead className="p-2">Fanbase</TableHead>
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
                    </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
