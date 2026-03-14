import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/game/store';
import { getSupabaseClient } from '@/integrations/supabase/client';

type PresenceStudioSnapshot = {
  studioName: string;
  budget: number;
  reputation: number;
  week: number;
  year: number;
  releasedTitles: number;
  updatedAt: number;
};

function generateLeagueCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function formatMoney(amount: number): string {
  return `$${(amount / 1_000_000).toFixed(0)}M`;
}

function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return 'local-player';
  const key = 'studio-magnate-online-player-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = (globalThis.crypto?.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  window.localStorage.setItem(key, next);
  return next;
}

export const OnlineLeague: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  const [leagueCodeInput, setLeagueCodeInput] = useState('');
  const [activeLeagueCode, setActiveLeagueCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceStudioSnapshot[]>>({});

  const supabase = useMemo(() => getSupabaseClient(), []);
  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const canUseOnline = !!supabase;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem('studio-magnate-online-last-league');
    if (last) setLeagueCodeInput(last);
  }, []);

  useEffect(() => {
    if (!activeLeagueCode) return;
    if (!supabase) return;

    const code = activeLeagueCode.toUpperCase();
    setStatus('connecting');
    setError(null);

    const channel = supabase.channel(`league:${code}`, {
      config: {
        presence: {
          key: playerId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setPresence(channel.presenceState() as any);
      })
      .on('presence', { event: 'join' }, () => {
        setPresence(channel.presenceState() as any);
      })
      .on('presence', { event: 'leave' }, () => {
        setPresence(channel.presenceState() as any);
      });

    channel
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('connected');
        }
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('error');
          setError('Unable to connect to the league channel.');
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      setPresence({});
      setStatus('idle');
    };
  }, [activeLeagueCode, supabase, playerId]);

  useEffect(() => {
    if (!gameState) return;
    if (!activeLeagueCode) return;
    const channel = channelRef.current;
    if (!channel) return;

    const snapshot: PresenceStudioSnapshot = {
      studioName: gameState.studio.name,
      budget: gameState.studio.budget,
      reputation: gameState.studio.reputation,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      releasedTitles: gameState.projects.filter((p) => p.status === 'released').length,
      updatedAt: Date.now(),
    };

    channel.track(snapshot as any);
  }, [gameState?.currentWeek, gameState?.currentYear, gameState?.studio?.budget, gameState?.studio?.reputation, activeLeagueCode]);

  const members = useMemo(() => {
    const entries: Array<{ playerId: string; snapshot: PresenceStudioSnapshot }> = [];

    Object.entries(presence || {}).forEach(([pid, arr]) => {
      const latest = Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null;
      if (!latest) return;
      entries.push({ playerId: pid, snapshot: latest });
    });

    return entries.sort((a, b) => {
      if (b.snapshot.reputation !== a.snapshot.reputation) return b.snapshot.reputation - a.snapshot.reputation;
      return b.snapshot.budget - a.snapshot.budget;
    });
  }, [presence]);

  const handleCreateLeague = () => {
    const code = generateLeagueCode();
    setLeagueCodeInput(code);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', code);
    }
    setActiveLeagueCode(code);
  };

  const handleJoinLeague = () => {
    const code = leagueCodeInput.trim().toUpperCase();
    if (!code) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', code);
    }
    setActiveLeagueCode(code);
  };

  const handleLeaveLeague = () => {
    setActiveLeagueCode(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Online League (Beta)</h2>
        <p className="text-sm text-muted-foreground">
          Lightweight online mode powered by Supabase Realtime. Join friends with an invite code and compare studio progress.
        </p>
      </div>

      {!canUseOnline && (
        <Card>
          <CardHeader>
            <CardTitle>Not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Supabase is installed, but this build isn’t configured with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
            </p>
            <p>
              Add those to a local <code>.env</code> (see <code>.env.example</code>), then restart the dev server.
            </p>
          </CardContent>
        </Card>
      )}

      {canUseOnline && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>League Lobby</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Leagues are currently ephemeral: if everyone disconnects, the room disappears. This is intentional while we iterate on the final mechanics.
              </div>

              <div className="flex gap-2">
                <Input
                  value={leagueCodeInput}
                  onChange={(e) => setLeagueCodeInput(e.target.value)}
                  placeholder="Invite code (e.g., 7 chars)"
                  disabled={!!activeLeagueCode}
                />
                {!activeLeagueCode ? (
                  <Button onClick={handleJoinLeague} disabled={!leagueCodeInput.trim()}>
                    Join
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleLeaveLeague}>
                    Leave
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!activeLeagueCode ? (
                  <Button variant="secondary" onClick={handleCreateLeague}>
                    Create League
                  </Button>
                ) : (
                  <Badge variant={status === 'connected' ? 'default' : status === 'connecting' ? 'secondary' : 'destructive'}>
                    {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Error'}
                  </Badge>
                )}

                {activeLeagueCode && (
                  <div className="text-sm text-muted-foreground">
                    Invite code: <span className="font-mono font-semibold">{activeLeagueCode}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Your snapshot</div>
                {!gameState ? (
                  <div className="text-sm text-muted-foreground">Game state not loaded.</div>
                ) : (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{gameState.studio.name}</div>
                      <Badge variant="outline">Week {gameState.currentWeek}, {gameState.currentYear}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Budget {formatMoney(gameState.studio.budget)} • Reputation {Math.round(gameState.studio.reputation)}/100 • Released {gameState.projects.filter(p => p.status === 'released').length}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>League Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Live presence list. We currently broadcast studio snapshots automatically as your weeks advance.
              </div>

              {activeLeagueCode && members.length === 0 && (
                <div className="text-sm text-muted-foreground">Waiting for members…</div>
              )}

              {!activeLeagueCode && (
                <div className="text-sm text-muted-foreground">Join or create a league to see members.</div>
              )}

              {members.map(({ playerId: pid, snapshot }, idx) => (
                <div key={pid} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">
                      {idx + 1}. {snapshot.studioName}{pid === playerId ? ' (You)' : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Week {snapshot.week}, {snapshot.year} • Updated {Math.max(0, Math.round((Date.now() - snapshot.updatedAt) / 1000))}s ago
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Rep {Math.round(snapshot.reputation)}/100</div>
                    <div className="text-xs text-muted-foreground">{formatMoney(snapshot.budget)} • {snapshot.releasedTitles} released</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
