import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { DatabaseManagerDialog } from '@/components/game/DatabaseManagerDialog';
import { ModsPanel } from '@/components/game/ModsPanel';
import { getActiveModSlot, listModSlots, setActiveModSlot } from '@/utils/moddingStore';

const Mods = () => {
  const [databaseSlot, setDatabaseSlot] = useState(() => getActiveModSlot());
  const [dbManagerOpen, setDbManagerOpen] = useState(false);

  useEffect(() => {
    const current = getActiveModSlot();
    if (databaseSlot !== current) {
      setDatabaseSlot(current);
    }
  }, [databaseSlot]);

  const handleDatabaseChange = (slotId: string) => {
    setActiveModSlot(slotId);
    setDatabaseSlot(getActiveModSlot());
  };

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <DatabaseManagerDialog
        open={dbManagerOpen}
        onOpenChange={setDbManagerOpen}
        onDatabaseChanged={(db) => setDatabaseSlot(db)}
      />

      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mods / Database Editor</h1>
            <p className="text-sm text-muted-foreground">Edit the mod bundle for the active database without starting a game.</p>
          </div>

          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              Back
            </Link>
          </Button>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Active database</Label>
              <Select value={databaseSlot} onValueChange={handleDatabaseChange}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {listModSlots().map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setDbManagerOpen(true)}>
                Manage…
              </Button>
            </div>
          </CardContent>
        </Card>

        <ModsPanel key={databaseSlot} showDatabaseControls={false} />
      </div>
    </div>
  );
};

export default Mods;
