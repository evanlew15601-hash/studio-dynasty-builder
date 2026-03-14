import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function getSupabaseClient(): SupabaseClient<Database> | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) return null;

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
