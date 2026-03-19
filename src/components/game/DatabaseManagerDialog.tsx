import React, { useEffect, useRef, useState } from 'react';
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
import { normalizeModBundle } from '@/utils/modding';

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

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importTargetDb, setImportTargetDb] = useState<string | null>(null);
  const [importOverwrite, setImportOverwrite] = useState(false);

  const [saveSlotsByDb, setSaveSlotsByDb] = useState<Record<string, string[]>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const confirmActionRef = useRef<(() => Promise<void>) | null>(null);

  const allDbs = listModSlots();

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

  const beginImportFlow = (targetDb: string, overwriteTarget: boolean) => {
    setImportTargetDb(targetDb);
    setImportOverwrite(overwriteTarget);

    // Triggered by a user gesture (button click / confirm), so the file picker is allowed.
    queueMicrotask(() => importInputRef.current?.click());
  };

  const guessDatabaseName = (bundle: { mods?: { id?: unknown }[] } | null | undefined, filename: string): string => {
    const modId = typeof bundle?.mods?.[0]?.id === 'string' ? bundle.mods[0].id : '';
    const fromMod = normalizeSlotId(modId);
    if (fromMod && fromMod !== 'default') return fromMod;

    const baseFilename = filename.replace(/\.[^.]+$/, '');
    const fromFile = normalizeSlotId(baseFilename);
    if (fromFile && fromFile !== 'default') return fromFile;

    return 'imported-db';
  };

  const makeUniqueDatabaseName = (base: string): string => {
    const slots = listModSlots();
    if (!slots.includes(base)) return base;

    let n = 2;
    while (slots.includes(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  const handleImportDatabaseJson = async () => {
    const raw = nameInput.trim();

    // If the user provides a name, import into that exact database (with overwrite confirmation).
    if (raw) {
      const picked = normalizeDbNameOrToast(raw);
      if (!picked) return;

      const exists = listModSlots().includes(picked);
      if (exists) {
        openConfirm(
          {
            title: 'Overwrite database?',
            description: `Database "${picked}" already exists. Importing will replace its mod bundle and delete ALL saves for that database.`,
            actionLabel: 'Overwrite & import',
            destructive: true,
          },
          async () => {
            beginImportFlow(picked, true);
          }
        );
        return;
      }

      beginImportFlow(picked, false);
      return;
    }

    // Otherwise, auto-create a new database name based on the bundle's modId / filename.
    beginImportFlow('__auto__', false);
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let targetDb = importTargetDb;

    void (async () => {
      setWorking(true);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;

        if (!parsed || typeof parsed !== 'object') {
          toast({ title: 'Invalid database', description: 'JSON did not look like a mod bundle.', variant: 'destructive' });
          return;
        }

        const version = (parsed as any).version;
        if (version != null && version !== 1) {
          toast({ title: 'Invalid database', description: 'Unsupported mod bundle version.', variant: 'destructive' });
          return;
        }

        const normalized = normalizeModBundle(parsed);
        if ((normalized.mods || []).length === 0 && (normalized.patches || []).length === 0) {
          toast({ title: 'Invalid database', description: 'JSON did not look like a mod bundle.', variant: 'destructive' });
          return;
        }

        if (!targetDb || targetDb === '__auto__') {
          const base = guessDatabaseName(normalized as any, file.name);
          targetDb = makeUniqueDatabaseName(base);
        }

        if (!targetDb || targetDb === '__auto__') {
          toast({ title: 'Import failed', description: 'Could not determine a database name for this import.', variant: 'destructive' });
          return;
        }

        if (targetDb === 'default') {
          toast({ title: 'Invalid database name', description: 'The default database cannot be overwritten. Import into a different name.', variant: 'destructive' });
          return;
        }

        if (importOverwrite) {
          await deleteDatabaseSavesAsync(targetDb);
        }

        saveModBundleToSlot(targetDb, normalized);
        setActive(targetDb);

        toast({ title: 'Database imported', description: `Imported mod bundle into "${targetDb}".` });
        setNameInput('');
        await refreshSaveIndex();
      } catch (error) {
        console.error('Failed to import database', error);
        toast({ title: 'Import failed', description: 'Could not import that database JSON.', variant: 'destructive' });
      } finally {
        setWorking(false);
        setImportTargetDb(null);
        setImportOverwrite(false);
      }
    })();
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
              Databases are TEW-style: each database has its own saves. Loading a save will not auto-switch databases.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
            disabled={working}
          />

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
              <Button type="button" variant="secondary" disabled={working} onClick={() => void handleImportDatabaseJson()}>
                Import JSON
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
