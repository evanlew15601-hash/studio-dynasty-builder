import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ModBundle } from '@/types/modding';
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

export const ModsPanel: React.FC = () => {
  const { toast } = useToast();

  const [raw, setRaw] = useState('');
  const [bundle, setBundle] = useState<ModBundle>(() => getModBundle());
  const [activeSlot, setActiveSlot] = useState<string>(() => getActiveModSlot());
  const [newSlotName, setNewSlotName] = useState('');

  useEffect(() => {
    const slot = getActiveModSlot();
    setActiveSlot(slot);
    const b = getModBundle();
    setBundle(b);
    setRaw(JSON.stringify(b, null, 2));
  }, []);

  const enabledCount = useMemo(() => (bundle.mods || []).filter((m) => m.enabled).length, [bundle.mods]);
  const slots = useMemo(() => listModSlots(), [activeSlot]);

  const handleReload = () => {
    const b = getModBundle();
    setBundle(b);
    setRaw(JSON.stringify(b, null, 2));
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeModBundle(parsed);
      saveModBundle(normalized);
      setBundle(normalized);
      setRaw(JSON.stringify(normalized, null, 2));
      toast({
        title: 'Mods saved',
        description: `Saved to slot "${getActiveModSlot()}". Reload the page if a system doesn't pick up changes immediately.`,
      });
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Could not parse the mod bundle JSON.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      toast({ title: 'Copied', description: 'Mod bundle JSON copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard in this browser.', variant: 'destructive' });
    }
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
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeModBundle(parsed);
      saveModBundle(normalized);
      setBundle(normalized);
      setRaw(JSON.stringify(normalized, null, 2));
    } catch {
      const empty: ModBundle = { version: 1, mods: [], patches: [] };
      saveModBundle(empty);
      setBundle(empty);
      setRaw(JSON.stringify(empty, null, 2));
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
    setBundle(b);
    setRaw(JSON.stringify(b, null, 2));
    toast({
      title: 'Mods cleared',
      description: `Cleared slot "${getActiveModSlot()}". Reload to fully revert.`,
    });
  };

  return (
    <div className="space-y-4">
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
