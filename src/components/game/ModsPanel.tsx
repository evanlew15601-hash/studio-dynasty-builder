import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ModBundle } from '@/types/modding';
import { normalizeModBundle } from '@/utils/modding';
import { clearModBundle, getModBundle, saveModBundle } from '@/utils/moddingStore';

export const ModsPanel: React.FC = () => {
  const { toast } = useToast();

  const [raw, setRaw] = useState('');
  const [bundle, setBundle] = useState<ModBundle>(() => getModBundle());

  useEffect(() => {
    const b = getModBundle();
    setBundle(b);
    setRaw(JSON.stringify(b, null, 2));
  }, []);

  const enabledCount = useMemo(() => (bundle.mods || []).filter((m) => m.enabled).length, [bundle.mods]);

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
        description: 'Mod bundle saved to this browser. You may need to reload the page for all systems to pick up changes.',
      });
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Could not parse the mod bundle JSON.',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    clearModBundle();
    const b = getModBundle();
    setBundle(b);
    setRaw(JSON.stringify(b, null, 2));
    toast({
      title: 'Mods cleared',
      description: 'All mods removed from this browser. Reload to fully revert.',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mod Bundle (Option A: patch overlay)</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{enabledCount}/{bundle.mods.length} enabled</Badge>
              <Badge variant="secondary">{bundle.patches.length} patches</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mods are applied as patches on top of the built-in data; they do not replace the default databases. Higher
            priority mods win conflicts.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={handleReload}>
              Reload
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClear}>
              Clear
            </Button>
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
