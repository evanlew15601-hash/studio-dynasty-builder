import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  clearSupabaseLocalConfig,
  getSupabaseConfigForUi,
  getSupabaseConfigStatus,
  setSupabaseLocalConfig,
} from '@/integrations/supabase/client';

export function SupabaseConfigDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const status = useMemo(() => getSupabaseConfigStatus(), [props.open]);
  const effective = useMemo(() => getSupabaseConfigForUi(), [props.open]);

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  useEffect(() => {
    if (!props.open) return;
    setUrl(effective?.url ?? '');
    setAnonKey(effective?.anonKey ?? '');
  }, [effective?.anonKey, effective?.url, props.open]);

  const canClearLocal = status.source === 'local';

  const handleSave = () => {
    const normalizedUrl = url.trim();
    const normalizedAnon = anonKey.trim();

    if (!normalizedUrl || !normalizedAnon) {
      toast({
        title: 'Missing values',
        description: 'Enter both the Supabase URL and anon key.',
        variant: 'destructive',
      });
      return;
    }

    setSupabaseLocalConfig({ url: normalizedUrl, anonKey: normalizedAnon });
    toast({ title: 'Saved', description: 'Online League settings saved on this device.' });
    props.onOpenChange(false);
  };

  const handleClear = () => {
    clearSupabaseLocalConfig();
    toast({ title: 'Cleared', description: 'Removed local Online League settings.' });
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl card-premium">
        <DialogHeader>
          <DialogTitle>Online League Settings (Supabase)</DialogTitle>
          <DialogDescription>
            Online League is optional. You can configure Supabase on this device without rebuilding the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
            Status:{' '}
            <span className="font-medium text-foreground">
              {status.configured ? `configured (${status.source ?? 'unknown'})` : 'not configured'}
            </span>
            {status.url ? <div className="mt-1 font-mono break-all">{status.url}</div> : null}
            <div className="mt-2">
              Tip: for local Supabase, the URL is usually <code>http://127.0.0.1:54321</code>.
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-url">Supabase URL</Label>
            <Input
              id="supabase-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-anon">Supabase anon key</Label>
            <Input
              id="supabase-anon"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              autoComplete="off"
              type="password"
            />
            <div className="text-xs text-muted-foreground">
              This is the public anon key from your Supabase project (Settings -> API).
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {canClearLocal ? (
            <Button type="button" variant="secondary" onClick={handleClear}>
              Clear local override
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
