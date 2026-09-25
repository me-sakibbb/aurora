// Native (Expo). Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so access must be literal.
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};
