import React, { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getStoredUiSkinId, setUiSkin, UI_SKINS, type UiSkinId } from '@/utils/uiSkins';

export function GameSettingsDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [uiSkin, setUiSkinState] = useState<UiSkinId>(() => getStoredUiSkinId());

  useEffect(() => {
    if (!props.open) return;
    setUiSkinState(getStoredUiSkinId());
  }, [props.open]);

  const activeSkin = useMemo(() => UI_SKINS.find((s) => s.id === uiSkin) ?? UI_SKINS[0], [uiSkin]);

  const handleUiSkinChange = (skinId: UiSkinId) => {
    setUiSkin(skinId);
    setUiSkinState(skinId);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>UI changes apply instantly and persist across sessions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-foreground">UI Skin</div>
                <div className="text-xs text-muted-foreground">Currently: {activeSkin.name}</div>
              </div>
              {uiSkin !== 'studio' && (
                <Button size="sm" variant="secondary" onClick={() => handleUiSkinChange('studio')}>
                  Reset to default
                </Button>
              )}
            </div>

            <Separator className="my-3 bg-border/60" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {UI_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => handleUiSkinChange(skin.id)}
                  aria-pressed={uiSkin === skin.id}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border bg-background/30 backdrop-blur-sm p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-primary/12 after:to-transparent after:-translate-x-full after:transition-transform after:duration-700 after:pointer-events-none group-hover:after:translate-x-full',
                    uiSkin === skin.id
                      ? 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_50px_hsl(var(--primary)/0.10)]'
                      : 'border-border/50 hover:border-primary/40'
                  )}
                >
                  <div
                    className="h-10 w-full rounded-md border border-border/40"
                    style={{ backgroundImage: skin.preview.backgroundImage }}
                  />
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground leading-tight">{skin.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{skin.description}</div>
                    </div>
                    {uiSkin === skin.id && (
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {skin.preview.swatches.map((c, idx) => (
                      <span
                        key={idx}
                        className="h-2.5 w-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
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
