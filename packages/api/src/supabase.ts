import './polyfills';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from './database.types';
import { env } from './env';
import { authStorage } from './storage/auth-storage';

let client: SupabaseClient<Database> | undefined;

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Lazily created so the app can boot (and screens can be built) before backend env vars exist. */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (web) or ' +
        'EXPO_PUBLIC_SUPABASE_URL/ANON_KEY (mobile). See .env.example files.',
    );
  }
  client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // OAuth (Google) redirects land on the web URL; native handles them via deep link.
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
  return client;
}
