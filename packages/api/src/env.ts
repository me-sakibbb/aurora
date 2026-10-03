// Web (Next.js). Next inlines `process.env.NEXT_PUBLIC_*` at build time, so access must be literal.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // FastAPI service (aurora-backend).
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  // Web uses Supabase's Google redirect flow, so no client ID is needed here.
  googleWebClientId: undefined as string | undefined,
};
