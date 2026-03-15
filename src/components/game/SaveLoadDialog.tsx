import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_SAVE_SLOT_ID,
  deleteGameAsync,
  getActiveSaveSlotId,
  getSavesDirAsync,
  listSaveSlotsAsync,
  loadGameAsync,
  normalizeSlotId,
  saveGameAsync,
  saveSnapshotAsync,
  setActiveSaveSlotId,
  type SaveGameSnapshot,
} from '@/utils/saveLoad';

type SaveSlotRow = {
  slotId: string;
  savedAt?: string;
  studioName?: string;
  week?: number;
  year?: number;
  version?: string;
};

function formatSlotLabel(row: SaveSlotRow): string {
  const parts: string[] = [];
  if (row.studioName) parts.push(row.studioName);
  if (row.year && row.week) parts.push(`W${row.week}, ${row.year}`);
  if (row.savedAt) parts.push(new Date(row.savedAt).toLocaleString());
  return parts.join(' • ');
}

function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SaveLoadDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'single' | 'online';
  currentGameState?: GameState;
  currentPhase?: string;
  unlockedAchievementIds?: string[];
  onLoaded: (snapshot: SaveGameSnapshot) => void;
}) {
  const { toast } = useToast();

  const [activeSlot, setActiveSlot] = useState(getActiveSaveSlotId());
  const [newSlotId, setNewSlotId] = useState('');
  const [savesDir, setSavesDir] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<SaveSlotRow[]>([]);

  const importFileRef = useRef<HTMLInputElement | null>(null);

  const normalizedActiveSlot = useMemo(() => normalizeSlotId(activeSlot) || getActiveSaveSlotId(), [activeSlot]);

  const refreshSlots = async () => {
    setLoading(true);
    try {
      const slotIds = await listSaveSlotsAsync();
      const rows: SaveSlotRow[] = [];

      for (const slotId of slotIds) {
        const snapshot = await loadGameAsync(slotId);
        if (!snapshot) {
          rows.push({ slotId });
          continue;
        }

        rows.push({
          slotId,
          savedAt: snapshot.meta?.savedAt,
          version: snapshot.meta?.version,
          studioName: snapshot.gameState?.studio?.name,
          week: snapshot.gameState?.currentWeek,
          year: snapshot.gameState?.currentYear,
        });
      }

      setSlots(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!props.open) return;

    setActiveSlot(getActiveSaveSlotId());
    void refreshSlots();

    void (async () => {
      const dir = await getSavesDirAsync();
      setSavesDir(dir);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const handleSetActiveSlot = (slotId: string) => {
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return;

    setActiveSaveSlotId(normalized);
    setActiveSlot(normalized);

    toast({
      title: 'Active slot set',
      description: `Now using "${normalized}" for saves.`,
    });
  };

  const handleSaveTo = async (slotId: string) => {
    if (!props.currentGameState) return;

    const normalized = normalizeSlotId(slotId);
    if (!normalized) return;

    try {
      setActiveSaveSlotId(normalized);
      setActiveSlot(normalized);

      await saveGameAsync(normalized, props.currentGameState, {
        currentPhase: props.currentPhase,
        unlockedAchievementIds: props.unlockedAchievementIds,
      });

      toast({ title: 'Game Saved', description: `Saved to "${normalized}".` });
      await refreshSlots();
    } catch (error) {
      console.error('Save failed', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save your game.',
        variant: 'destructive',
      });
    }
  };

  const handleLoad = async (slotId: string) => {
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return;

    const snapshot = await loadGameAsync(normalized);
    if (!snapshot) {
      toast({
        title: 'No save found',
        description: `Nothing saved in "${normalized}" yet.`,
        variant: 'destructive',
      });
      return;
    }

    setActiveSaveSlotId(normalized);
    setActiveSlot(normalized);

    props.onLoaded(snapshot);
    props.onOpenChange(false);
  };

  const handleDelete = async (slotId: string) => {
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return;

    await deleteGameAsync(normalized);

    if (normalized === normalizedActiveSlot) {
      setActiveSaveSlotId(DEFAULT_SAVE_SLOT_ID);
      setActiveSlot(DEFAULT_SAVE_SLOT_ID);
    }

    toast({ title: 'Deleted', description: `Removed "${normalized}".` });
    await refreshSlots();
  };

  const handleExport = async (slotId: string) => {
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return;

    const snapshot = await loadGameAsync(normalized);
    if (!snapshot) {
      toast({
        title: 'No save found',
        description: `Nothing saved in "${normalized}" yet.`,
        variant: 'destructive',
      });
      return;
    }

    downloadJson(`studio-magnate-${normalized}.json`, JSON.stringify(snapshot, null, 2));
  };

  const handleImportFilePicked = async (file: File | null) => {
    if (!file) return;

    const targetSlot = normalizeSlotId(newSlotId) || normalizedActiveSlot;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as SaveGameSnapshot;

      if (!parsed || !parsed.gameState || !parsed.meta) {
        toast({
          title: 'Invalid save file',
          description: 'This file does not look like a Studio Magnate save.',
          variant: 'destructive',
        });
        return;
      }

      await saveSnapshotAsync(targetSlot, parsed);
      setActiveSaveSlotId(targetSlot);
      setActiveSlot(targetSlot);

      toast({
        title: 'Imported',
        description: `Imported into "${targetSlot}".`,
      });

      setNewSlotId('');
      await refreshSlots();
    } catch (error) {
      console.error('Import failed', error);
      toast({
        title: 'Import failed',
        description: 'Could not read that file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Save & Load</DialogTitle>
          <DialogDescription>
            {props.currentGameState
              ? 'Loading a save will restart the game to ensure all systems reset cleanly.'
              : 'On Steam builds, saves are stored on disk and can be synced via Steam Cloud.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="active-slot">Active slot</Label>
                <div className="flex gap-2">
                  <Input
                    id="active-slot"
                    value={activeSlot}
                    onChange={(e) => setActiveSlot(e.target.value)}
                    placeholder="e.g. slot1"
                    autoComplete="off"
                  />
                  <Button type="button" variant="secondary" onClick={() => handleSetActiveSlot(activeSlot)}>
                    Set
                  </Button>
                </div>
              </div>

              {props.currentGameState ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="btn-studio" onClick={() => handleSaveTo(normalizedActiveSlot)}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const normalized = normalizeSlotId(newSlotId);
                      if (!normalized) {
                        toast({ title: 'Enter a slot name', description: 'Example: "slot2" or "run-2".', variant: 'destructive' });
                        return;
                      }
                      void handleSaveTo(normalized);
                    }}
                  >
                    Save As…
                  </Button>
                  <Input
                    value={newSlotId}
                    onChange={(e) => setNewSlotId(e.target.value)}
                    placeholder="New slot id (optional)"
                    className="max-w-[240px]"
                    autoComplete="off"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Saving is available after you start a game.
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Import / Export</Label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => importFileRef.current?.click()}>
                    Import JSON…
                  </Button>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      void handleImportFilePicked(f);
                      if (e.target) e.target.value = '';
                    }}
                  />

                  <Button type="button" variant="outline" onClick={() => void handleExport(normalizedActiveSlot)}>
                    Export active slot
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Import uses the “New slot id” above if set; otherwise it overwrites the active slot.
                </div>
              </div>

              <div className="space-y-2">
                <Label>Save location</Label>
                {savesDir ? (
                  <div className="space-y-2">
                    <div className="rounded-md border bg-background/40 p-3 text-xs font-mono break-all">{savesDir}</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(savesDir);
                            toast({ title: 'Copied', description: 'Save folder path copied to clipboard.' });
                          } catch {
                            toast({ title: 'Copy failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
                          }
                        }}
                      >
                        Copy path
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Steam Cloud: enable Steam Auto Cloud for this folder to sync saves across machines.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">In a browser build, saves live in localStorage.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Existing saves</div>
                <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => void refreshSlots()}>
                  Refresh
                </Button>
              </div>

              <ScrollArea className="h-[360px] pr-3">
                <div className="space-y-2">
                  {slots.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No saves found.</div>
                  ) : (
                    slots.map((row) => (
                      <div key={row.slotId} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{row.slotId}</div>
                            <div className="text-xs text-muted-foreground break-words">{formatSlotLabel(row) || '—'}</div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" size="sm" onClick={() => void handleLoad(row.slotId)}>
                              Load
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void handleExport(row.slotId)}>
                              Export
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDelete(row.slotId)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
