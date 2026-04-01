import { getSupabaseClient } from './client';

export type OnlineLeagueSnapshotRow = {
  league_id: string;
  user_id: string;
  studio_name: string;
  reputation: number;
  week: number;
  year: number;
  released_titles: number;
  updated_at: string;
};

export async function fetchOnlineLeagueSnapshots(params: { leagueId: string }): Promise<OnlineLeagueSnapshotRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;
  if (!userId) throw new Error('No authenticated user');

  const { leagueId } = params;

  const { data, error } = await supabase
    .from('online_league_snapshots')
    .select('league_id, user_id, studio_name, reputation, week, year, released_titles, updated_at')
    .eq('league_id', leagueId);

  if (error) throw error;

  return (data || []) as any;
}
