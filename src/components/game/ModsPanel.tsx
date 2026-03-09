import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ModBundle, ModOp } from '@/types/modding';
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

export const ModsPanel: React.FC = () => {
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement | null>(null);

  const [raw, setRaw] = useState('');
  const [bundle, setBundle] = useState<ModBundle>(() => getModBundle());
  const [activeSlot, setActiveSlot] = useState<string>(() => getActiveModSlot());
  const [newSlotName, setNewSlotName] = useState('');

  // Quick editor
  const [quickModId, setQuickModId] = useState('my-mod');
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
      setQuickModId(b.mods[0].id);
    }
  }, []);

  const enabledCount = useMemo(() => (bundle.mods || []).filter((m) => m.enabled).length, [bundle.mods]);
  const slots = useMemo(() => listModSlots(), [activeSlot]);

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

  const handleAddPatchToEditor = () => {
    const normalized = parseFromRawOrToast();
    if (!normalized) return;

    const modId = quickModId.trim();
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick patch builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                TEW-style workflow: fill in a couple fields, add a patch, then click Save.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mod id</Label>
                  <Input value={quickModId} onChange={(e) => setQuickModId(e.target.value)} placeholder="my-mod" />
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
        </CardContent>
      </Card>
    </div>
  );
};
