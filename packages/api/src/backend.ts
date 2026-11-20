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
    signal,
  }: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** JSON-encoded, except `FormData`, which is sent as multipart (the runtime sets the boundary). */
    body?: unknown;
    /** Cancels the request (TanStack Query passes one, so stale searches are dropped). */
    signal?: AbortSignal;
  } = {},
): Promise<unknown> {
  if (!env.apiUrl) {
    throw new Error(
      'Backend API is not configured. Set NEXT_PUBLIC_API_URL (web) or EXPO_PUBLIC_API_URL ' +
        '(mobile). See .env.example files.',
    );
  }

  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (isSupabaseConfigured()) {
    const { data } = await getSupabase().auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch(`${env.apiUrl.replace(/\/+$/, '')}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    signal,
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

/**
 * What kind of failure an error is, so screens can say something useful instead of a generic
 * "something went wrong" (F15). `offline` covers requests that never got an answer.
 */
export type ErrorKind = 'offline' | 'rateLimited' | 'server' | 'notFound' | 'unknown';

export function errorKind(error: unknown, online = true): ErrorKind {
  if (!online) return 'offline';
  if (error instanceof ApiError) {
    if (error.status === 0) return 'offline';
    if (error.status === 429) return 'rateLimited';
    if (error.status === 404) return 'notFound';
    if (error.status >= 500) return 'server';
    return 'unknown';
  }
  // fetch rejects with a TypeError when the network drops mid-request.
  if (error instanceof TypeError) return 'offline';
  return 'unknown';
}

/**
 * Whether a failed request is worth repeating automatically: network drops, timeouts, rate limits
 * and server errors are; other 4xx answers (bad input, not found, not allowed) won't change.
 */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}
