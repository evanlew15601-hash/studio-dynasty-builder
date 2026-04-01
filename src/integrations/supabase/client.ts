import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const LOCAL_CONFIG_KEY = 'studio-magnate-supabase-config-v1';
const LEGACY_LOCAL_CONFIG_KEYS = ['studio-magnate-supabase-config', 'studio-magnate-supabase-config-v0'];
const CONFIG_CHANGED_EVENT = 'studio-magnate-supabase-config-changed';

export type SupabaseConfigSource = 'env' | 'local' | null;

export type SupabaseConfigStatus = {
  configured: boolean;
  source: SupabaseConfigSource;
  url: string | null;
};

type SupabaseConfig = { url: string; anonKey: string };

let cachedClient: SupabaseClient<Database> | null = null;
let cachedConfigKey: string | null = null;

function normalizeConfig(candidate: unknown): SupabaseConfig | null {
  if (!candidate || typeof candidate !== 'object') return null;

  const url = (candidate as any).url;
  const anonKey = (candidate as any).anonKey;

  if (typeof url !== 'string' || typeof anonKey !== 'string') return null;

  const normalizedUrl = url.trim();
  const normalizedAnon = anonKey.trim();

  if (!normalizedUrl || !normalizedAnon) return null;

  return { url: normalizedUrl, anonKey: normalizedAnon };
}

function emitConfigChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONFIG_CHANGED_EVENT));
}

export function onSupabaseConfigChanged(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CONFIG_CHANGED_EVENT, callback);
  return () => window.removeEventListener(CONFIG_CHANGED_EVENT, callback);
}

function getLocalConfig(): SupabaseConfig | null {
  if (typeof window === 'undefined') return null;

  const readKey = (key: string): SupabaseConfig | null => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return normalizeConfig(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  const current = readKey(LOCAL_CONFIG_KEY);
  if (current) return current;

  for (const key of LEGACY_LOCAL_CONFIG_KEYS) {
    const legacy = readKey(key);
    if (!legacy) continue;

    // Migrate legacy key to the current format so future runs are stable.
    window.localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(legacy));
    window.localStorage.removeItem(key);
    emitConfigChanged();
    return legacy;
  }

  return null;
}

function getEnvConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  return normalizeConfig({ url, anonKey });
}

function getEffectiveConfig(): { config: SupabaseConfig | null; source: SupabaseConfigSource } {
  const local = getLocalConfig();
  if (local) return { config: local, source: 'local' };

  const env = getEnvConfig();
  if (env) return { config: env, source: 'env' };

  return { config: null, source: null };
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const { config, source } = getEffectiveConfig();
  return { configured: !!config, source, url: config?.url ?? null };
}

export function getSupabaseConfigForUi(): { url: string; anonKey: string; source: SupabaseConfigSource } | null {
  const { config, source } = getEffectiveConfig();
  if (!config) return null;
  return { ...config, source };
}

export function setSupabaseLocalConfig(config: { url: string; anonKey: string }): void {
  if (typeof window === 'undefined') return;

  const normalized = normalizeConfig(config);
  if (!normalized) return;

  window.localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(normalized));
  cachedClient = null;
  cachedConfigKey = null;
  emitConfigChanged();
}

export function clearSupabaseLocalConfig(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(LOCAL_CONFIG_KEY);
  cachedClient = null;
  cachedConfigKey = null;
  emitConfigChanged();
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  const { config } = getEffectiveConfig();
  if (!config) return null;

  const configKey = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === configKey) return cachedClient;

  cachedClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  cachedConfigKey = configKey;
  return cachedClient;
}
