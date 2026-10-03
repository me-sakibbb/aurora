// Native (Expo). Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so access must be literal.
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  // FastAPI service (aurora-backend).
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  // Google Cloud "Web application" client ID; Android's native picker uses it as the ID token audience.
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
