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
import { useToast } from '@/hooks/use-toast';
import type { ModBundle, ModInfo, ModOp, ModPatch } from '@/types/modding';
import { normalizeModBundle } from '@/utils/modding';
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
  const [providerEdits, setProviderEdits] = useState<Record<ProviderId, ProviderDealProfile>>({} as any);

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

  const providerDealPatchKey = useMemo(() => {
    const modId = editorModId.trim();
    if (!modId) return '';

    return (bundle.patches || [])
      .filter((p) => p.modId === modId && p.entityType === 'providerDeal')
      .map((p) => `${p.id}:${p.op}:${p.target}:${JSON.stringify(p.payload)}`)
      .join('|');
  }, [bundle.patches, editorModId]);

  useEffect(() => {
    const modId = editorModId.trim();
    if (!modId) return;
    rebuildProviderEdits(bundle, modId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorModId, providerDealPatchKey]);

  const changedProviderCount = useMemo(() => {
    let changed = 0;
    for (const [id, edited] of Object.entries(providerEdits)) {
      const base = baseProvidersById.get(id as ProviderId);
      if (!base) continue;
      if (!deepEqual(base, edited)) changed++;
    }
    return changed;
  }, [providerEdits, baseProvidersById]);

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
      mods: normalized.mods.some((m) => m.id === modId)
        ? normalized.mods
        : [...normalized.mods, { id: modId, name: modId, version: '1.0.0', enabled: true, priority: 0 }],
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
                      <code>providerDeal</code>.
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="json">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick patch builder</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Low-level tool: create a patch quickly, then click Save.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mod id</Label>
                        <Input value={editorModId} onChange={(e) => setEditorModId(e.target.value)} placeholder="my-mod" />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Entity type</Label>
                        <Select
                          value={quickEntityType}
                          onValueChange={(v) => setQuickEntityType(v as (typeof ENTITY_TYPES)[number])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Entity type" />
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
                        <Label className="text-xs text-muted-foreground">Operation</Label>
                        <Select value={quickOp} onValueChange={(v) => setQuickOp(v as ModOp)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Operation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="update">update</SelectItem>
                            <SelectItem value="insert">insert</SelectItem>
                            <SelectItem value="delete">delete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs text-muted-foreground">Target (id/key)</Label>
                        <Input
                          value={quickTarget}
                          onChange={(e) => setQuickTarget(e.target.value)}
                          placeholder="e.g. netflix"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Payload (JSON)</Label>
                      <Textarea
                        value={quickPayload}
                        onChange={(e) => setQuickPayload(e.target.value)}
                        className="font-mono text-xs min-h-[120px]"
                        spellCheck={false}
                        disabled={quickOp === 'delete'}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleAddPatchToEditor}>
                        Add patch to editor
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="font-mono text-xs min-h-[320px]"
                  spellCheck={false}
                />

                <p className="text-xs text-muted-foreground">
                  Entity types supported right now: <code>talent</code>, <code>franchise</code>, <code>publicDomainIP</code>,
                  <code>providerDeal</code>, <code>franchiseRoleSet</code>, <code>franchiseCharacterDb</code>.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
