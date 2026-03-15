import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

export type OnlineLeagueTickGateStatus =
  | 'disabled'
  | 'not_configured'
  | 'auth'
  | 'joining'
  | 'ready'
  | 'error';

export type OnlineLeagueTickGateRemoteStudio = {
  userId: string;
  studioName: string;
  budget: number;
  reputation: number;
  week?: number;
  year?: number;
  releasedTitles?: number;
  updatedAt?: string;
  lastSeenAt?: string;
};

export type OnlineLeagueTickGateState = {
  status: OnlineLeagueTickGateStatus;
  error: string | null;
  leagueCode: string;
  leagueId: string | null;
  hostUserId: string | null;
  userId: string | null;
  isHost: boolean;
  turn: number;
  memberCount: number;
  readyCount: number;
  isReady: boolean;
  remoteStudios: OnlineLeagueTickGateRemoteStudio[];
  setReady: (ready: boolean) => Promise<void>;
  forceAdvance: () => Promise<void>;
};

type Params = {
  enabled: boolean;
  leagueCode: string;
  studioName: string;
  onTurnAdvanced: (turn: number, info: { leagueId: string; isHost: boolean }) => void;
};

export function useOnlineLeagueTickGate({
  enabled,
  leagueCode,
  studioName,
  onTurnAdvanced,
}: Params): OnlineLeagueTickGateState {
  const code = (leagueCode || '').trim().toUpperCase();

  const supabase = useMemo(() => getSupabaseClient(), []);

  const [status, setStatus] = useState<OnlineLeagueTickGateStatus>(enabled ? 'auth' : 'disabled');
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);

  const [turn, setTurn] = useState(0);
  const appliedTurnRef = useRef<number | null>(null);

  const [memberCount, setMemberCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [remoteStudios, setRemoteStudios] = useState<OnlineLeagueTickGateRemoteStudio[]>([]);

  const isHost = !!userId && !!hostUserId && userId === hostUserId;

  const pollRef = useRef<number | null>(null);
  const lastSeenUpdateRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return;
    }

    if (!supabase) {
      setStatus('not_configured');
      setError('Online mode is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setStatus('auth');
    setError(null);
  }, [enabled, supabase]);

  useEffect(() => {
    if (!enabled) return;
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      setStatus('auth');
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) {
          setStatus('error');
          setError('Unable to initialize online session.');
        }
        return;
      }

      if (!sessionData.session) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          if (!cancelled) {
            setStatus('error');
            setError('Anonymous sign-in failed. Enable anonymous sign-ins in Supabase Auth.');
          }
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;

      setUserId(userData.user?.id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, supabase]);

  useEffect(() => {
    if (!enabled) return;
    if (!supabase) return;
    if (!userId) return;
    if (!code) {
      setStatus('error');
      setError('Missing league code.');
      return;
    }

    let cancelled = false;

    (async () => {
      setStatus('joining');
      setError(null);

      const joinRes = await supabase.rpc('join_online_league', {
        league_code: code,
        studio_name: studioName || 'Studio',
      });

      if (cancelled) return;

      let id = joinRes.data ?? null;

      if (joinRes.error) {
        const message = joinRes.error.message || '';
        const notFound = message.toLowerCase().includes('league not found');

        if (!notFound) {
          setStatus('error');
          setError('Unable to join online league.');
          return;
        }

        const createRes = await supabase.rpc('create_online_league', {
          league_code: code,
          league_name: `${studioName || 'Studio'} League`,
          studio_name: studioName || 'Studio',
        });

        if (cancelled) return;

        if (createRes.error || !createRes.data) {
          setStatus('error');
          setError('Unable to create online league.');
          return;
        }

        id = createRes.data;
      }

      if (!id) {
        setStatus('error');
        setError('Unable to join online league.');
        return;
      }

      setLeagueId(id);

      const leagueRes = await supabase
        .from('online_leagues')
        .select('owner_user_id')
        .eq('id', id)
        .maybeSingle();

      if (!cancelled) {
        setHostUserId(leagueRes.data?.owner_user_id ?? null);
        setStatus('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, supabase, userId, code, studioName]);

  useEffect(() => {
    if (!enabled) return;
    if (!supabase) return;
    if (!leagueId) return;
    if (status !== 'ready') return;

    const poll = async () => {
      const now = Date.now();

      if (now - lastSeenUpdateRef.current > 15_000) {
        lastSeenUpdateRef.current = now;
        supabase
          .from('online_league_members')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('league_id', leagueId)
          .eq('user_id', userId);
      }

      const clockRes = await supabase
        .from('online_league_clock')
        .select('turn')
        .eq('league_id', leagueId)
        .maybeSingle();

      if (clockRes.error || !clockRes.data) return;

      const nextTurn = clockRes.data.turn ?? 0;
      setTurn(nextTurn);

      if (appliedTurnRef.current === null) {
        appliedTurnRef.current = nextTurn;
      }

      const membersRes = await supabase
        .from('online_league_members')
        .select('user_id, studio_name, last_seen_at')
        .eq('league_id', leagueId);

      const memberRows = membersRes.data || [];
      setMemberCount(memberRows.length);

      const snapshotsRes = await supabase
        .from('online_league_snapshots')
        .select('user_id, studio_name, budget, reputation, week, year, released_titles, updated_at')
        .eq('league_id', leagueId);

      const snapshotByUserId = new Map<string, { studio_name: string; budget: number; reputation: number; week?: number; year?: number; released_titles?: number; updated_at?: string }>();
      for (const row of snapshotsRes.data || []) {
        snapshotByUserId.set(row.user_id, {
          studio_name: row.studio_name,
          budget: row.budget,
          reputation: row.reputation,
          week: row.week,
          year: row.year,
          released_titles: row.released_titles,
          updated_at: row.updated_at,
        });
      }

      const otherStudios: OnlineLeagueTickGateRemoteStudio[] = memberRows
        .filter((m) => m.user_id !== userId)
        .map((m) => {
          const snap = snapshotByUserId.get(m.user_id);
          return {
            userId: m.user_id,
            studioName: snap?.studio_name || m.studio_name,
            budget: Number(snap?.budget ?? 0),
            reputation: Number(snap?.reputation ?? 0),
            week: snap?.week,
            year: snap?.year,
            releasedTitles: Number(snap?.released_titles ?? 0),
            updatedAt: snap?.updated_at,
            lastSeenAt: m.last_seen_at,
          };
        });

      setRemoteStudios(otherStudios);

      const nextReadyTurn = nextTurn + 1;

      const readyCountRes = await supabase
        .from('online_league_ready')
        .select('user_id', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('ready_for_turn', nextReadyTurn);

      setReadyCount(readyCountRes.count ?? 0);

      // Self ready state
      const selfReadyRes = await supabase
        .from('online_league_ready')
        .select('ready_for_turn')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .maybeSingle();

      const selfReadyForTurn = selfReadyRes.data?.ready_for_turn ?? 0;
      setIsReady(selfReadyForTurn === nextReadyTurn);

      // Apply remote turn advancement (at most one step per poll cycle)
      if (appliedTurnRef.current !== null && nextTurn > appliedTurnRef.current) {
        appliedTurnRef.current += 1;
        onTurnAdvanced(appliedTurnRef.current, { leagueId, isHost });
      }
    };

    poll();

    pollRef.current = window.setInterval(poll, 1200);

    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, supabase, leagueId, status, userId, isHost, onTurnAdvanced]);

  const setReady = async (ready: boolean) => {
    if (!enabled) return;
    if (!supabase) return;
    if (!code) return;
    if (status !== 'ready') return;

    const { data, error: rpcError } = await supabase.rpc('set_online_league_ready', {
      league_code: code,
      ready,
      force: false,
    });

    if (rpcError) {
      setError('Online league request failed.');
      return;
    }

    setTurn(typeof data === 'number' ? data : 0);
  };

  const forceAdvance = async () => {
    if (!enabled) return;
    if (!supabase) return;
    if (!code) return;
    if (status !== 'ready') return;

    const { data, error: rpcError } = await supabase.rpc('set_online_league_ready', {
      league_code: code,
      ready: false,
      force: true,
    });

    if (rpcError) {
      setError('Online league request failed.');
      return;
    }

    setTurn(typeof data === 'number' ? data : 0);
  };

  return {
    status,
    error,
    leagueCode: code,
    leagueId,
    hostUserId,
    userId,
    isHost,
    turn,
    memberCount,
    readyCount,
    isReady,
    remoteStudios,
    setReady,
    forceAdvance,
  };
}
