import { getSupabaseClient } from './client';
import type { OnlineLeagueTurnResolution, OnlineLeagueTurnSubmission } from '@/utils/onlineLeagueTurnCompile';

export async function upsertOnlineLeagueTurnSubmission(params: {
  leagueId: string;
  turn: number;
  submission: OnlineLeagueTurnSubmission;
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;
  if (!userId) throw new Error('No authenticated user');

  const { leagueId, turn, submission } = params;

  const { error } = await supabase
    .from('online_league_turn_submissions')
    .upsert({
      league_id: leagueId,
      turn,
      user_id: userId,
      submission_json: JSON.stringify(submission),
      updated_at: new Date().toISOString(),
    } as any);

  if (error) throw error;
}

export async function fetchOnlineLeagueTurnSubmissions(params: {
  leagueId: string;
  turn: number;
}): Promise<Record<string, OnlineLeagueTurnSubmission | null>> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId, turn } = params;

  const { data, error } = await supabase
    .from('online_league_turn_submissions')
    .select('user_id, submission_json')
    .eq('league_id', leagueId)
    .eq('turn', turn);

  if (error) throw error;

  const out: Record<string, OnlineLeagueTurnSubmission | null> = {};
  for (const row of data || []) {
    try {
      out[row.user_id] = JSON.parse(row.submission_json) as OnlineLeagueTurnSubmission;
    } catch {
      out[row.user_id] = null;
    }
  }

  return out;
}

export async function fetchOnlineLeagueReadyOrder(params: {
  leagueId: string;
  turn: number;
}): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId, turn } = params;

  const { data, error } = await supabase
    .from('online_league_ready_events')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('turn', turn)
    .order('ready_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((r) => r.user_id);
}

export async function fetchOnlineLeagueMemberStudioNames(params: {
  leagueId: string;
}): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId } = params;

  const { data, error } = await supabase
    .from('online_league_members')
    .select('user_id, studio_name')
    .eq('league_id', leagueId);

  if (error) throw error;

  const out: Record<string, string> = {};
  for (const row of data || []) {
    out[row.user_id] = row.studio_name;
  }
  return out;
}

export async function upsertOnlineLeagueTurnResolution(params: {
  leagueId: string;
  turn: number;
  resolution: OnlineLeagueTurnResolution;
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;
  if (!userId) throw new Error('No authenticated user');

  const { leagueId, turn, resolution } = params;

  const { error } = await supabase
    .from('online_league_turn_resolutions')
    .upsert({
      league_id: leagueId,
      turn,
      resolution_json: JSON.stringify(resolution),
      resolved_by: userId,
      updated_at: new Date().toISOString(),
    } as any);

  if (error) throw error;
}

export async function fetchOnlineLeagueTurnResolution(params: {
  leagueId: string;
  turn: number;
}): Promise<OnlineLeagueTurnResolution | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId, turn } = params;

  const { data, error } = await supabase
    .from('online_league_turn_resolutions')
    .select('resolution_json')
    .eq('league_id', leagueId)
    .eq('turn', turn)
    .maybeSingle();

  if (error) throw error;
  if (!data?.resolution_json) return null;

  try {
    return JSON.parse(data.resolution_json) as OnlineLeagueTurnResolution;
  } catch {
    return null;
  }
}

export type OnlineLeagueMessageRow = {
  id: string;
  league_id: string;
  user_id: string;
  turn: number;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export async function fetchUnreadOnlineLeagueMessages(params: {
  leagueId: string;
}): Promise<OnlineLeagueMessageRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId } = params;

  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;
  if (!userId) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('online_league_messages')
    .select('id, league_id, user_id, turn, title, body, created_at, read_at')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []) as any;
}

export async function markOnlineLeagueMessagesRead(params: {
  messageIds: string[];
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { messageIds } = params;
  if (!messageIds.length) return;

  const { error } = await supabase
    .from('online_league_messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds);

  if (error) throw error;
}

export async function insertOnlineLeagueMessages(params: {
  leagueId: string;
  messages: Array<{ userId: string; turn: number; title: string; body: string }>;
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { leagueId, messages } = params;
  if (!messages.length) return;

  const { error } = await supabase
    .from('online_league_messages')
    .insert(
      messages.map((m) => ({
        league_id: leagueId,
        user_id: m.userId,
        turn: m.turn,
        title: m.title,
        body: m.body,
      })) as any
    );

  if (error) throw error;
}
