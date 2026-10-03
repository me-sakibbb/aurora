import { env } from './env';
import { getSupabase, isSupabaseConfigured } from './supabase';

/** A non-2xx response from the FastAPI backend. `status` 0 means the request never got an answer. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiConfigured() {
  return Boolean(env.apiUrl);
}

/**
 * Calls the FastAPI service (`/api/v1/...`). The signed-in user's Supabase access token is sent as
 * a Bearer token when there is one; the backend verifies it. Returns the parsed JSON body.
 */
export async function apiFetch(
  path: string,
  {
    method = 'GET',
    body,
  }: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<unknown> {
  if (!env.apiUrl) {
    throw new Error(
      'Backend API is not configured. Set NEXT_PUBLIC_API_URL (web) or EXPO_PUBLIC_API_URL ' +
        '(mobile). See .env.example files.',
    );
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (isSupabaseConfigured()) {
    const { data } = await getSupabase().auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch(`${env.apiUrl.replace(/\/+$/, '')}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const json = (await response.json()) as { detail?: unknown };
      if (typeof json.detail === 'string') detail = json.detail;
    } catch {}
    throw new ApiError(response.status, detail || `HTTP ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}
