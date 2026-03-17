import React, { useEffect, useMemo, useState } from 'react';
import type { GameEvent, GameState } from '@/types/game';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  fetchUnreadOnlineLeagueMessages,
  markOnlineLeagueMessagesRead,
  type OnlineLeagueMessageRow,
} from '@/integrations/supabase/onlineLeagueTurnCompile';

function eventTone(ev: GameEvent): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (ev.type) {
    case 'crisis':
      return 'destructive';
    case 'regulatory':
    case 'technology':
      return 'secondary';
    case 'opportunity':
      return 'default';
    default:
      return 'outline';
  }
}

export const InboxDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  isOnlineMode: boolean;
  leagueId?: string | null;
}> = ({ open, onOpenChange, gameState, isOnlineMode, leagueId }) => {
  const { toast } = useToast();

  const decisions = useMemo(() => (gameState.eventQueue || []) as GameEvent[], [gameState.eventQueue]);

  const [onlineMessages, setOnlineMessages] = useState<OnlineLeagueMessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const canUseOnlineInbox = isOnlineMode && !!leagueId;

  const refreshOnlineMessages = async () => {
    if (!canUseOnlineInbox) {
      setOnlineMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const msgs = await fetchUnreadOnlineLeagueMessages({ leagueId: leagueId! });
      setOnlineMessages(msgs);
    } catch (e) {
      console.warn('Inbox: failed to fetch online league messages', e);
      toast({
        title: 'Inbox',
        description: 'Failed to load online league messages.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const markAllOnlineRead = async () => {
    if (!canUseOnlineInbox) return;
    if (!onlineMessages.length) return;

    try {
      await markOnlineLeagueMessagesRead({ messageIds: onlineMessages.map((m) => m.id) });
      setOnlineMessages([]);
    } catch (e) {
      console.warn('Inbox: failed to mark online league messages read', e);
      toast({
        title: 'Inbox',
        description: 'Failed to mark messages as read.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    void refreshOnlineMessages();
  }, [open, leagueId, isOnlineMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inbox</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">Decisions</div>
                  <Badge variant={decisions.length > 0 ? 'destructive' : 'outline'} className="text-[10px]">
                    {decisions.length}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Decisions appear as blocking popups; this list is a quick audit.
                </div>
              </div>

              {decisions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No pending decisions.</div>
              ) : (
                <div className="space-y-2">
                  {decisions.map((ev) => (
                    <div key={ev.id} className="rounded-md border border-border/60 bg-card/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{ev.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{ev.description}</div>
                        </div>
                        <Badge variant={eventTone(ev)} className="text-[10px]">
                          {ev.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">Agent Messages</div>
                  <Badge
                    variant={canUseOnlineInbox && onlineMessages.length > 0 ? 'secondary' : 'outline'}
                    className="text-[10px]"
                  >
                    {canUseOnlineInbox ? onlineMessages.length : 0}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!canUseOnlineInbox || loadingMessages}
                    onClick={() => void refreshOnlineMessages()}
                  >
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={!canUseOnlineInbox || loadingMessages || onlineMessages.length === 0}
                    onClick={() => void markAllOnlineRead()}
                  >
                    Mark read
                  </Button>
                </div>
              </div>

              {!canUseOnlineInbox ? (
                <div className="text-sm text-muted-foreground">Agent messages are available in Online League mode.</div>
              ) : loadingMessages ? (
                <div className="text-sm text-muted-foreground">Loading messages…</div>
              ) : onlineMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No unread messages.</div>
              ) : (
                <div className="space-y-2">
                  {onlineMessages.map((m) => (
                    <div key={m.id} className="rounded-md border border-border/60 bg-card/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{m.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">Turn {m.turn}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          unread
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
