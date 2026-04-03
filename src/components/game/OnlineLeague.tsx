import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database } from 'lucide-react';
import { OnlineLeagueSQLDialog } from './OnlineLeagueSQLDialog';
import { SupabaseConfigDialog } from './SupabaseConfigDialog';
import { useGameStore } from '@/game/store';
import { getSupabaseClient, getSupabaseConfigStatus, onSupabaseConfigChanged } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    if (!supabase) return () => {};

    let cancelled = false;

    (async () => {
      setAuthStatus('signing-in');
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) {
          setAuthStatus('error');
          setError('Unable to authenticate.');
        }
        return;
      }

      if (sessionData?.session?.user?.id) {
        if (!cancelled) {
          setUserId(sessionData.session.user.id);
          setAuthStatus('ready');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!canUseOnline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Online League</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Online leagues are not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online League</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
{(!canUseOnline || !getSupabaseConfigStatus().configured) && (
          <div className="rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-6 text-destructive-foreground">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-destructive/20 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">SETUP REQUIRED: Online League Database</h3>
                <p className="text-sm mb-3">Online League needs a one-time Supabase database setup before you can play multiplayer.</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <ol className="list-decimal pl-6 space-y-1 mb-4">
                <li>Create a free Supabase project</li>
                <li className="font-medium">Run the Online League SQL schema (copy below)</li>
                <li>Enable anonymous authentication</li>
                <li>Copy your Project URL + anon key into Configure</li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 border-t border-destructive/20">
              <OnlineLeagueSQLDialog>
                <Button size="sm" className="bg-destructive hover:bg-destructive/90 font-medium">
                  📋 Copy SQL Schema
                </Button>
              </OnlineLeagueSQLDialog>
              <SupabaseConfigDialog>
                <Button size="sm" variant="outline" className="font-medium">
                  ⚙️ Configure Supabase
                </Button>
              </SupabaseConfigDialog>
              <Button size="sm" variant="secondary" asChild>
                <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer" className="font-medium">
                  Create Supabase →
                </a>
              </Button>
            </div>
            <p className="text-xs mt-3 opacity-75">Run SQL **once** only. Takes 30 seconds. No ongoing costs.</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Online league interface will be implemented here */}
        </div>
      </CardContent>
    </Card>
  );
};
