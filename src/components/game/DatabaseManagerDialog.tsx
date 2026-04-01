import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  deleteModSlot,
  getActiveModSlot,
  listModSlots,
  loadModBundleSlot,
  saveModBundleToSlot,
  setActiveModSlot,
} from '@/utils/moddingStore';
import { deleteDatabaseSavesAsync, listSaveSlotsAsync, moveDatabaseSavesAsync, normalizeSlotId } from '@/utils/saveLoad';

type ConfirmState = {
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
};

export function DatabaseManagerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDatabaseChanged?: (activeDb: string) => void;
}) {
  const { toast } = useToast();

  const [activeDb, setActiveDb] = useState(() => getActiveModSlot());
  const [nameInput, setNameInput] = useState('');
  const [working, setWorking] = useState(false);

  const [saveSlotsByDb, setSaveSlotsByDb] = useState<Record<string, string[]>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const confirmActionRef = useRef<(() => Promise<void>) | null>(null);

  const allDbs = useMemo(() => listModSlots(), [activeDb]);

  const openConfirm = (state: ConfirmState, onConfirm: () => Promise<void>) => {
    confirmActionRef.current = onConfirm;
    setConfirmState(state);
    setConfirmOpen(true);
  };

  const refreshSaveIndex = async () => {
    const dbs = listModSlots();
    const next: Record<string, string[]> = {};

    for (const db of dbs) {
      next[db] = await listSaveSlotsAsync(db);
    }

    setSaveSlotsByDb(next);
  };

  useEffect(() => {
    if (!props.open) return;

    const current = getActiveModSlot();
    setActiveDb(current);
    setNameInput('');

    void refreshSaveIndex();
  }, [props.open]);

  const setActive = (slotId: string) => {
    setActiveModSlot(slotId);
    const next = getActiveModSlot();
    setActiveDb(next);
    props.onDatabaseChanged?.(next);
  };

  const normalizeDbNameOrToast = (raw: string): string | null => {
    const normalized = normalizeSlotId(raw);
    if (!normalized) {
      toast({ title: 'Enter a name', description: 'Database name cannot be empty.', variant: 'destructive' });
      return null;
    }

    if (normalized === 'default') {
      toast({ title: 'Invalid database name', description: '"default" is reserved. Pick a different name.', variant: 'destructive' });
      return null;
    }

    return normalized;
  };

  const confirmOverwriteIfNeeded = (
    targetDb: string,
    onConfirm: () => Promise<void>
  ): boolean => {
    const exists = listModSlots().includes(targetDb);
    if (!exists) return false;

    openConfirm(
      {
        title: 'Overwrite database?',
        description: `Database "${targetDb}" already exists. Overwriting will delete ALL saves for that database.`,
        actionLabel: 'Overwrite',
        destructive: true,
      },
      onConfirm
    );

    return true;
  };

  const performCreate = async (picked: string, overwriteTarget: boolean) => {
    setWorking(true);
    try {
      if (overwriteTarget) {
        await deleteDatabaseSavesAsync(picked);
      }

      const base = loadModBundleSlot('default');
      saveModBundleToSlot(picked, base);
      setActive(picked);

      toast({ title: 'Database created', description: `Active database is now "${picked}".` });
      setNameInput('');
      await refreshSaveIndex();
    } finally {
      setWorking(false);
    }
  };

  const handleCreate = async () => {
    const picked = normalizeDbNameOrToast(nameInput);
    if (!picked) return;

    const opened = confirmOverwriteIfNeeded(picked, async () => {
      try {
        await performCreate(picked, true);
      } catch (error) {
        console.error('Failed to create database', error);
        toast({ title: 'Create failed', description: 'Could not create that database.', variant: 'destructive' });
      }
    });
    if (opened) return;

    try {
      await performCreate(picked, false);
    } catch (error) {
      console.error('Failed to create database', error);
      toast({ title: 'Create failed', description: 'Could not create that database.', variant: 'destructive' });
    }
  };

  const performDuplicate = async (picked: string, overwriteTarget: boolean) => {
    setWorking(true);
    try {
      if (overwriteTarget) {
        await deleteDatabaseSavesAsync(picked);
      }

      const bundle = loadModBundleSlot(activeDb);
      saveModBundleToSlot(picked, bundle);
      setActive(picked);

      toast({ title: 'Database duplicated', description: `Duplicated "${activeDb}" -> "${picked}".` });
      setNameInput('');
      await refreshSaveIndex();
    } finally {
      setWorking(false);
    }
  };

  const handleDuplicate = async () => {
    const picked = normalizeDbNameOrToast(nameInput);
    if (!picked) return;

    const opened = confirmOverwriteIfNeeded(picked, async () => {
      try {
        await performDuplicate(picked, true);
      } catch (error) {
        console.error('Failed to duplicate database', error);
        toast({ title: 'Duplicate failed', description: 'Could not duplicate that database.', variant: 'destructive' });
      }
    });
    if (opened) return;

    try {
      await performDuplicate(picked, false);
    } catch (error) {
      console.error('Failed to duplicate database', error);
      toast({ title: 'Duplicate failed', description: 'Could not duplicate that database.', variant: 'destructive' });
    }
  };

  const performRename = async (picked: string, overwriteTarget: boolean) => {
    setWorking(true);
    try {
      if (overwriteTarget) {
        await deleteDatabaseSavesAsync(picked);
      }

      const bundle = loadModBundleSlot(activeDb);
      saveModBundleToSlot(picked, bundle);

      const moved = await moveDatabaseSavesAsync(activeDb, picked);

      deleteModSlot(activeDb);
      setActive(picked);

      toast({ title: 'Database renamed', description: `Renamed "${activeDb}" -> "${picked}" (${moved} save(s) moved).` });
      setNameInput('');
      await refreshSaveIndex();
    } finally {
      setWorking(false);
    }
  };

  const handleRename = async () => {
    if (activeDb === 'default') {
      toast({ title: 'Read-only', description: 'The default database cannot be renamed. Duplicate it instead.' });
      return;
    }

    const picked = normalizeDbNameOrToast(nameInput);
    if (!picked || picked === activeDb) return;

    const opened = confirmOverwriteIfNeeded(picked, async () => {
      try {
        await performRename(picked, true);
      } catch (error) {
        console.error('Failed to rename database', error);
        toast({ title: 'Rename failed', description: 'Could not rename that database.', variant: 'destructive' });
      }
    });
    if (opened) return;

    try {
      await performRename(picked, false);
    } catch (error) {
      console.error('Failed to rename database', error);
      toast({ title: 'Rename failed', description: 'Could not rename that database.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (activeDb === 'default') {
      toast({ title: 'Read-only', description: 'The default database cannot be deleted.' });
      return;
    }

    openConfirm(
      {
        title: 'Delete database?',
        description: `Delete database "${activeDb}" and ALL saves for it? This cannot be undone.`,
        actionLabel: 'Delete',
        destructive: true,
      },
      async () => {
        setWorking(true);
        try {
          const deleted = await deleteDatabaseSavesAsync(activeDb);
          deleteModSlot(activeDb);
          const next = getActiveModSlot();
          setActiveDb(next);
          props.onDatabaseChanged?.(next);

          toast({ title: 'Database deleted', description: `Deleted "${activeDb}" (${deleted} save(s) removed).` });
          await refreshSaveIndex();
        } catch (error) {
          console.error('Failed to delete database', error);
          toast({ title: 'Delete failed', description: 'Could not delete that database.', variant: 'destructive' });
        } finally {
          setWorking(false);
        }
      }
    );
  };

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Database Manager</DialogTitle>
            <DialogDescription>
              Databases are TEW-style: each database has its own saves. Loading/importing will not auto-switch databases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Active database</Label>
              <Select value={activeDb} onValueChange={(v) => setActive(v)}>
                <SelectTrigger disabled={working}>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {allDbs.map((db) => (
                    <SelectItem key={db} value={db}>
                      {db}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Saves in this DB: {(saveSlotsByDb[activeDb] || []).length}
              </div>

              <ScrollArea className="h-[120px] rounded-md border border-border/60 bg-background/40">
                <div className="p-2 space-y-1">
                  {(saveSlotsByDb[activeDb] || []).length ? (
                    (saveSlotsByDb[activeDb] || []).map((slot) => (
                      <div key={slot} className="text-xs font-mono text-muted-foreground">
                        {slot}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No saves found for this database.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="db-name">New name</Label>
              <Input
                id="db-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. my-mod-db"
                autoComplete="off"
                disabled={working}
              />
              <div className="text-xs text-muted-foreground">
                Names are normalized (spaces become dashes; only letters/numbers/_/-).
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={working} onClick={() => void handleCreate()}>
                Create
              </Button>
              <Button type="button" variant="secondary" disabled={working} onClick={() => void handleDuplicate()}>
                Duplicate from active
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={working || activeDb === 'default'}
                onClick={() => void handleRename()}
              >
                Rename active
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={working || activeDb === 'default'}
                onClick={() => void handleDelete()}
              >
                Delete active
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)} disabled={working}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmState?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              disabled={working}
              onClick={async () => {
                const action = confirmActionRef.current;
                setConfirmOpen(false);
                setConfirmState(null);
                confirmActionRef.current = null;
                if (!action) return;
                await action();
              }}
            >
              {confirmState?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
