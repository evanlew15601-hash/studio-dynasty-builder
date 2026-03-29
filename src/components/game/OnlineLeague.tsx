import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OnlineLeagueSQLDialog } from './OnlineLeagueSQLDialog';
import { useGameStore } from '@/game/store';
import { getSupabaseClient, onSupabaseConfigChanged } from '@/integrations/supabase/client';

type PresenceStudioSnapshot = {
  studioName: string;
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
  if (normalized.includes('studio name already taken')) return 'That studio name is already taken in this league.';
  if (normalized.includes('online_league_members_league_studio_name_uniq')) return 'That studio name is already taken in this league.';
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
  const [leagueStudioName, setLeagueStudioName] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [authStatus, setAuthStatus] = useState<'idle' | 'signing-in' | 'ready' | 'error'>('idle');
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceStudioSnapshot[]>>({});
  const [persistedSnapshots, setPersistedSnapshots] = useState<PersistedLeagueSnapshot[]>([]);
  const [leagueBusy, setLeagueBusy] = useState(false);

  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    return onSupabaseConfigChanged(() => setConfigVersion((v) => v + 1));
  }, []);

  const supabase = useMemo(() => getSupabaseClient(), [configVersion]);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const canUseOnline = !!supabase;

  const refreshSnapshots = useCallback(async (leagueId: string) => {
    if (!supabase) return;

    const { data, error: loadError } = await supabase
      .from('online_league_snapshots')
      .select('league_id, user_id, studio_name, reputation, week, year, released_titles, updated_at')
      .eq('league_id', leagueId);

    if (loadError) return;
    setPersistedSnapshots((data || []) as any);
  }, [supabase]);

  const resolveLeagueStudioName = useCallback(async (leagueId: string, fallback: string) => {
    if (!supabase) return fallback;
    if (!userId) return fallback;

    const { data } = await supabase
      .from('online_league_members')
      .select('studio_name')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .maybeSingle();

    return (data?.studio_name || fallback).trim();
  }, [supabase, userId]);

  useEffect(() => {
    if (initialLeagueCode && !leagueCodeInput) {
      setLeagueCodeInput(initialLeagueCode);
    }

    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem('studio-magnate-online-last-league');
    if (last && !initialLeagueCode) setLeagueCodeInput(last);
  }, [initialLeagueCode]);

  useEffect(() => {
    if (leagueNameInput.trim()) return;
    const fallback = gameState?.studio?.name ? `${gameState.studio.name} League` : '';
    if (fallback) setLeagueNameInput(fallback);
  }, [gameState?.studio?.name, leagueNameInput]);

  useEffect(() => {
    if (leagueStudioName?.trim()) return;
    if (!gameState?.studio?.name) return;
    setLeagueStudioName(gameState.studio.name);
  }, [gameState?.studio?.name, leagueStudioName]);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      setAuthStatus('signing-in');
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) {
          setAuthStatus('error');\n          setError('Unable to authenticate.');\n          }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return null;
};
```

</xai:function_call > 

No, old_str must match exactly. The current last lines are:

```
      if (sessionError) {
        if (!cancelled) {
setAuthStatus('error');\n          setError('Unable to authenticate.');\n        }
      }
```

So target from '      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();' to end, but since EOF, better to use the tool to append by replacing a unique last line.

Since it's EOF issue, replace the last known block with full closure.

To make it safe, use the unique setError line as anchor.

old_str: 
```
\n          setAuthStatus('error');\n          setError('Unable to authenticate.');\n        }\n


```
        setAuthStatus('error');
        setError('Unable to authenticate.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Placeholder return to close component
  return (
    <div />
  );
};
```

This closes: inner if, sessionError if, async IIFE, useEffect, component.

Yes, preserves all, adds standard cleanup, minimal JSX placeholder (since task says STRICT SURGICAL syntax only).

Indent: from file, useEffect body is 4 spaces, inner async 6, etc.

From previous, it looks 2 spaces.

To match, use 2 spaces.

Component return placeholder is fine as syntax fix.

This will fix EOF.

Then re-test build.
</thinking>

Wait, tool call first. 

Yes. 

Note: Indentation from file is 2 spaces (standard JS).

For old_str, make unique:
The last lines are unique: the setError call. 

old_str:
```
          setAuthStatus('error');
          setError('Unable to authenticate.');
        }
      }
```

Assuming that's the end.

Yes. 

New adds the closures after.

If not exact match, it fails, but from structure it should.

Proceed. </thinking>


<xai:function_call name="edit_file">
<parameter name="path">src/components/game/OnlineLeague.tsx
