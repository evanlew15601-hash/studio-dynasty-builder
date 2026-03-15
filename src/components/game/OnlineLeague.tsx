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

type PersistedLeagueSnapshot = {
  league_id: string;
  user_id: string;
  studio_name: string;
  budget: number | string;
  reputation: number;
  week: number;
  year: number;
  released_titles: number;
  updated_at: string;
};

function generateLeagueCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function mapOnlineLeagueError(message: string): string {
  const normalized = (message || '').toLowerCase();

  if (normalized.includes('league is full')) return 'This league is full.';
  if (normalized.includes('no league spots')) return 'Online leagues are at capacity right now. Try again later.';
  if (normalized.includes('invalid league code')) return 'Invalid league code.';
  if (normalized.includes('invalid studio name')) return 'Invalid studio name.';
  if (normalized.includes('league not found')) return 'League not found.';

  if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
    return 'Online league is busy right now. Try again in a moment.';
  }

  return 'Online league request failed.';
}

interface OnlineLeagueProps {
  initialLeagueCode?: string;
}

export const OnlineLeague: React.FC<OnlineLeagueProps> = ({ initialLeagueCode }) => {
  const gameState = useGameStore((s) => s.game);

  const [leagueCodeInput, setLeagueCodeInput] = useState('');
  const [leagueNameInput, setLeagueNameInput] = useState('');
  const [activeLeagueCode, setActiveLeagueCode] = useState<string | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [authStatus, setAuthStatus] = useState<'idle' | 'signing-in' | 'ready' | 'error'>('idle');
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceStudioSnapshot[]>>({});
  const [persistedSnapshots, setPersistedSnapshots] = useState<PersistedLeagueSnapshot[]>([]);
  const [leagueBusy, setLeagueBusy] = useState(false);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const canUseOnline = !!supabase;

  useEffect(() => {
    if (initialLeagueCode && !leagueCodeInput) {
      setLeagueCodeInput(initialLeagueCode);
    }

    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem('studio-magnate-online-last-league');
    if (last && !initialLeagueCode) setLeagueCodeInput(last);
  }, [initialLeagueCode, leagueCodeInput]);

  useEffect(() => {
    if (leagueNameInput.trim()) return;
    const fallback = gameState?.studio?.name ? `${gameState.studio.name} League` : '';
    if (fallback) setLeagueNameInput(fallback);
  }, [gameState?.studio?.name, leagueNameInput]);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      setAuthStatus('signing-in');
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) {
          setAuthStatus('error');
          setError('Unable to initialize online session.');
        }
        return;
      }

      if (!sessionData.session) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          if (!cancelled) {
            setAuthStatus('error');
            setError('Anonymous sign-in failed. Enable anonymous sign-ins in Supabase Auth.');
          }
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!cancelled) {
        setUserId(userData.user?.id ?? null);
        setAuthStatus('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!activeLeagueCode) return;
    if (!supabase) return;
    if (!userId) return;

    const code = activeLeagueCode.toUpperCase();
    setStatus('connecting');
    setError(null);

    const channel = supabase.channel(`league:${code}`, {
      config: {
        presence: {
          key: userId,
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
  }, [activeLeagueCode, supabase, userId]);

  useEffect(() => {
    if (!gameState) return;
    if (!activeLeagueCode) return;
    if (!activeLeagueId) return;
    if (!supabase) return;
    if (!userId) return;

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

    supabase
      .from('online_league_snapshots')
      .upsert({
        league_id: activeLeagueId,
        user_id: userId,
        studio_name: snapshot.studioName,
        budget: snapshot.budget,
        reputation: Math.round(snapshot.reputation),
        week: snapshot.week,
        year: snapshot.year,
        released_titles: snapshot.releasedTitles,
        updated_at: new Date().toISOString(),
      })
      .then(() => refreshSnapshots(activeLeagueId));

    supabase
      .from('online_league_members')
      .update({ last_seen_at: new Date().toISOString(), studio_name: snapshot.studioName })
      .eq('league_id', activeLeagueId)
      .eq('user_id', userId);
  }, [
    gameState?.currentWeek,
    gameState?.currentYear,
    gameState?.studio?.budget,
    gameState?.studio?.reputation,
    gameState?.projects,
    activeLeagueCode,
    activeLeagueId,
    supabase,
    userId,
  ]);

  const members = useMemo(() => {
    const entries: Array<{ userId: string; snapshot: PresenceStudioSnapshot }> = [];

    Object.entries(presence || {}).forEach(([pid, arr]) => {
      const latest = Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null;
      if (!latest) return;
      entries.push({ userId: pid, snapshot: latest });
    });

    return entries.sort((a, b) => {
      if (b.snapshot.reputation !== a.snapshot.reputation) return b.snapshot.reputation - a.snapshot.reputation;
      if (b.snapshot.releasedTitles !== a.snapshot.releasedTitles) return b.snapshot.releasedTitles - a.snapshot.releasedTitles;
      return a.snapshot.studioName.localeCompare(b.snapshot.studioName);
    });
  }, [presence]);

  const persistedMembers = useMemo(() => {
    const list = persistedSnapshots.slice();
    return list.sort((a, b) => {
      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      if (b.released_titles !== a.released_titles) return b.released_titles - a.released_titles;
      return a.studio_name.localeCompare(b.studio_name);
    });
  }, [persistedSnapshots]);

  const leagueAwards = useMemo(() => {
    type Candidate = {
      studioName: string;
      reputation: number;
      releasedTitles: number;
    };

    const candidates: Candidate[] = members.length > 0
      ? members.map(({ snapshot }) => ({
        studioName: snapshot.studioName,
        reputation: snapshot.reputation,
        releasedTitles: snapshot.releasedTitles,
      }))
      : persistedMembers.map((m) => ({
        studioName: m.studio_name,
        reputation: m.reputation,
        releasedTitles: m.released_titles,
      }));

    if (candidates.length === 0) return [] as Array<{ title: string; winner: string; detail: string }>;

    const topBy = <T extends keyof Candidate>(key: T, label: string, fmt: (c: Candidate) => string) => {
      const sorted = candidates.slice().sort((a, b) => {
        const av = Number(a[key] ?? 0);
        const bv = Number(b[key] ?? 0);
        if (bv !== av) return bv - av;
        return a.studioName.localeCompare(b.studioName);
      });

      const winner = sorted[0];
      return {
        title: label,
        winner: winner.studioName,
        detail: fmt(winner),
      };
    };

    return [
      topBy('reputation', 'Top reputation', (c) => `${Math.round(c.reputation)}/100 rep`),
      topBy('releasedTitles', 'Most releases', (c) => `${c.releasedTitles} released`),
    ];
  }, [members, persistedMembers]);

  const refreshSnapshots = async (leagueId: string) => {
    if (!supabase) return;

    const { data, error: loadError } = await supabase
      .from('online_league_snapshots')
      .select('*')
      .eq('league_id', leagueId);

    if (loadError) return;
    setPersistedSnapshots((data || []) as any);
  };

  useEffect(() => {
    if (!activeLeagueId) {
      setPersistedSnapshots([]);
      return;
    }

    refreshSnapshots(activeLeagueId);

    const handle = window.setInterval(() => {
      refreshSnapshots(activeLeagueId);
    }, 12_000);

    return () => {
      window.clearInterval(handle);
    };
  }, [activeLeagueId, supabase]);

  const handleCreateLeague = async () => {
    if (!supabase) return;
    if (authStatus !== 'ready') return;
    if (!gameState) return;

    setLeagueBusy(true);
    setError(null);

    const studioName = gameState.studio.name;
    const leagueName = leagueNameInput.trim() || `${studioName} League`;

    let lastErrorMessage = '';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateLeagueCode();

      const { data, error: rpcError } = await supabase.rpc('create_online_league', {
        league_code: code,
        league_name: leagueName,
        studio_name: studioName,
      });

      if (!rpcError && data) {
        setLeagueCodeInput(code);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('studio-magnate-online-last-league', code);
        }

        setActiveLeagueCode(code);
        setActiveLeagueId(data);
        await refreshSnapshots(data);
        setLeagueBusy(false);
        return;
      }

      lastErrorMessage = rpcError?.message || '';
      if (lastErrorMessage.toLowerCase().includes('no league spots')) break;
    }

    setLeagueBusy(false);
    setError(mapOnlineLeagueError(lastErrorMessage));
  };

  const handleJoinLeague = async () => {
    if (!supabase) return;
    if (authStatus !== 'ready') return;
    if (!gameState) return;

    const code = leagueCodeInput.trim().toUpperCase();
    if (!code) return;

    setLeagueBusy(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('join_online_league', {
      league_code: code,
      studio_name: gameState.studio.name,
    });

    if (rpcError || !data) {
      setLeagueBusy(false);
      setError(mapOnlineLeagueError(rpcError?.message || ''));
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', code);
    }

    setActiveLeagueCode(code);
    setActiveLeagueId(data);
    await refreshSnapshots(data);
    setLeagueBusy(false);
  };

  const handleLeaveLeague = () => {
    setActiveLeagueCode(null);
    setActiveLeagueId(null);
    setPersistedSnapshots([]);
  };

  useEffect(() => {
    if (!initialLeagueCode) return;
    if (activeLeagueCode) return;
    if (!supabase) return;
    if (authStatus !== 'ready') return;
    if (!gameState) return;

    const code = initialLeagueCode.trim().toUpperCase();
    if (!code) return;

    setLeagueCodeInput(code);

    supabase
      .rpc('join_online_league', {
        league_code: code,
        studio_name: gameState.studio.name,
      })
      .then(({ data }) => {
        if (!data) return;
        setActiveLeagueCode(code);
        setActiveLeagueId(data);
        refreshSnapshots(data);
      });
  }, [initialLeagueCode, activeLeagueCode, supabase, authStatus, gameState]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Online League (Beta)</h2>
        <p className="text-sm text-muted-foreground">
          Lightweight online mode powered by Supabase Realtime. Join friends with an invite code and compare studio progress.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules & expectations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            Online League shares only small “snapshot” stats (studio name, reputation, week/year, released titles). Game simulation and saves stay local to your device.
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-medium text-foreground">League size:</span> up to 8 members.</li>
            <li><span className="font-medium text-foreground">Inactivity cleanup:</span> leagues can be deleted after 14 days with no members checking in (<code>last_seen_at</code>).</li>
            <li><span className="font-medium text-foreground">Season cleanup:</span> after a season ends, leagues can be deleted after 7 days.</li>
            <li><span className="font-medium text-foreground">Leaving:</span> “Leave” just disconnects this screen; it doesn’t currently remove you from the league on the server.</li>
          </ul>
          <div className="text-xs text-muted-foreground">
            Note: cleanup runs opportunistically when leagues are created/joined (or if an admin runs <code>cleanup_online_leagues()</code>).
          </div>
        </CardContent>
      </Card>

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
                This is an optional online mode. Single-player gameplay is unchanged; this screen only shares lightweight snapshots to a league you join with an invite code.
              </div>

              {authStatus !== 'ready' && (
                <div className="rounded-md border p-3 text-sm">
                  {authStatus === 'signing-in' ? (
                    <span className="text-muted-foreground">Signing in (anonymous)…</span>
                  ) : authStatus === 'error' ? (
                    <span className="text-destructive">Online auth unavailable.</span>
                  ) : (
                    <span className="text-muted-foreground">Preparing online session…</span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">League name</div>
                <Input
                  value={leagueNameInput}
                  onChange={(e) => setLeagueNameInput(e.target.value)}
                  placeholder="Used when creating a new league"
                  disabled={!!activeLeagueCode}
                />
              </div>

              <div className="flex gap-2">
                <Input
                  value={leagueCodeInput}
                  onChange={(e) => setLeagueCodeInput(e.target.value)}
                  placeholder="Invite code (e.g., 7 chars)"
                  disabled={!!activeLeagueCode}
                />
                {!activeLeagueCode ? (
                  <Button onClick={handleJoinLeague} disabled={!leagueCodeInput.trim() || authStatus !== 'ready' || !gameState || leagueBusy}>
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
                  <Button variant="secondary" onClick={handleCreateLeague} disabled={authStatus !== 'ready' || !gameState || leagueBusy}>
                    {leagueBusy ? 'Working…' : 'Create League'}
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
                      Reputation {Math.round(gameState.studio.reputation)}/100 • Released {gameState.projects.filter(p => p.status === 'released').length}
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
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Live presence shows who’s connected right now. Snapshots persist the last reported stats for the league.
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Live now</div>

                {activeLeagueCode && members.length === 0 && (
                  <div className="text-sm text-muted-foreground">Waiting for members…</div>
                )}

                {!activeLeagueCode && (
                  <div className="text-sm text-muted-foreground">Join or create a league to see members.</div>
                )}

                {members.map(({ userId: pid, snapshot }, idx) => (
                  <div key={pid} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">
                        {idx + 1}. {snapshot.studioName}{pid === userId ? ' (You)' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Week {snapshot.week}, {snapshot.year} • Updated {Math.max(0, Math.round((Date.now() - snapshot.updatedAt) / 1000))}s ago
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">Rep {Math.round(snapshot.reputation)}/100</div>
                      <div className="text-xs text-muted-foreground">{snapshot.releasedTitles} released</div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Latest snapshots</div>

                {!activeLeagueId && (
                  <div className="text-sm text-muted-foreground">Join a league to load snapshots.</div>
                )}

                {activeLeagueId && persistedMembers.length === 0 && (
                  <div className="text-sm text-muted-foreground">No snapshots recorded yet.</div>
                )}

                {persistedMembers.map((m, idx) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">
                        {idx + 1}. {m.studio_name}{m.user_id === userId ? ' (You)' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Week {m.week}, {m.year} • Updated {Math.max(0, Math.round((Date.now() - Date.parse(m.updated_at)) / 1000))}s ago
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">Rep {Math.round(m.reputation)}/100</div>
                      <div className="text-xs text-muted-foreground">{m.released_titles} released</div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">League awards (beta)</div>
                <div className="text-sm text-muted-foreground">
                  Lightweight, leaderboard-style awards based on the latest stats. In Online League mode, the core award shows still resolve locally, but a shared League Crown ceremony appears on the Crown week so everyone sees the same results.
                </div>

                {leagueAwards.length === 0 && (
                  <div className="text-sm text-muted-foreground">No awards yet — join a league and start sharing snapshots.</div>
                )}

                {leagueAwards.map((a) => (
                  <div key={a.title} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.winner}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{a.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
