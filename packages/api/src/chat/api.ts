import { z } from 'zod';
import { ApiError, apiFetch } from '../backend';
import { getSupabase } from '../supabase';

// "Ask MyBela" chat (F16). Replies come from FastAPI `POST /chat`; the backend detects the
// language, runs the safety checks and stores both messages. Past messages are read straight
// from Supabase (`chat_threads` / `chat_messages`, RLS: own rows only).
// Nothing about the conversation is decided in the app; replies are shown as returned.

/** The backend's limit for one message. */
export const CHAT_MESSAGE_MAX = 2000;
/** Replies can take a while (several model calls); give up after this and offer a retry. */
export const CHAT_TIMEOUT_MS = 90_000;
export const CHAT_PAGE_SIZE = 30;

const chatReplySchema = z.object({
  conversation_id: z.string(),
  reply: z.string(),
  is_bangla: z.boolean().nullish(),
});

export type ChatReply = {
  conversationId: string;
  reply: string;
  /** The backend saw Bengali script in the message; used for typography only. */
  isBangla: boolean;
};

/**
 * `POST /api/v1/chat`. Starts a conversation when `conversationId` is omitted. Times out after
 * `CHAT_TIMEOUT_MS` with a retryable `ApiError` (408), so the person can simply try again.
 */
export async function sendChatMessage(
  { message, conversationId }: { message: string; conversationId?: string | null },
  signal?: AbortSignal,
): Promise<ChatReply> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CHAT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const json = await apiFetch('/chat', {
      method: 'POST',
      body: { message, ...(conversationId ? { conversation_id: conversationId } : {}) },
      signal: controller.signal,
    });
    const parsed = chatReplySchema.parse(json);
    return {
      conversationId: parsed.conversation_id,
      reply: parsed.reply,
      isBangla: parsed.is_bangla === true,
    };
  } catch (error) {
    if (timedOut) throw new ApiError(408, 'The reply took too long.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

// ─── History (Supabase direct) ───────────────────────────────────────────────────────────────────

export type ChatThread = { id: string; title: string | null; updatedAt: string };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

/** The most recently active conversation that isn't archived, or `null` when there's none. */
export async function fetchLatestThread(): Promise<ChatThread | null> {
  const { data, error } = await getSupabase()
    .from('chat_threads')
    .select('id, title, updated_at')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, title: data.title, updatedAt: data.updated_at } : null;
}

/**
 * One page of a conversation, newest first. Pass the oldest `createdAt` already shown as `before`
 * to load the page above it.
 */
export async function fetchThreadMessages(
  threadId: string,
  before?: string | null,
): Promise<ChatMessage[]> {
  let query = getSupabase()
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(CHAT_PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toMessage);
}

export function toMessage(row: {
  id: string;
  role: string;
  content: string;
  created_at: string;
}): ChatMessage {
  // `canned` rows are pre-written replies from the backend; they read as MyBela's.
  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content,
    createdAt: row.created_at,
  };
}

const BENGALI_SCRIPT = /[ঀ-৿]/;

/**
 * Whether text contains Bengali script, the same check the backend uses for `is_bangla`. Only
 * picks typography (Bengali needs a larger size and looser lines); nothing else depends on it.
 */
export function hasBengaliScript(text: string): boolean {
  return BENGALI_SCRIPT.test(text);
}
