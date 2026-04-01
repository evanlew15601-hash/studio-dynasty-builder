import type { GameState } from '@/types/game';
import { getSupabaseClient } from './client';

export type OnlineLeagueTurnSnapshot = {
  gameState: GameState;
  meta: {
    savedAt: string;
    version: string;
  };
};

export async function upsertOnlineLeagueTurnSnapshot(params: {
  leagueId: string;
  turn: number;
  snapshot: OnlineLeagueTurnSnapshot;
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId, turn, snapshot } = params;

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;
  if (!userId) throw new Error('No authenticated user');

  const { error } = await supabase
    .from('online_league_turn_states')
    .upsert({
      league_id: leagueId,
      turn,
      snapshot_json: JSON.stringify(snapshot),
      created_by: userId,
      updated_at: new Date().toISOString(),
    } as any);

  if (error) throw error;
}

export async function fetchOnlineLeagueTurnSnapshot(params: {
  leagueId: string;
  turn: number;
}): Promise<OnlineLeagueTurnSnapshot | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId, turn } = params;

  const { data, error } = await supabase
    .from('online_league_turn_states')
    .select('snapshot_json')
    .eq('league_id', leagueId)
    .eq('turn', turn)
    .maybeSingle();

  if (error) throw error;
  if (!data?.snapshot_json) return null;

  try {
    return JSON.parse(data.snapshot_json) as OnlineLeagueTurnSnapshot;
  } catch {
    return null;
  }
}
