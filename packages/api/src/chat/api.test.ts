import { ApiError, apiFetch } from '../backend';
import { hasBengaliScript, sendChatMessage, toMessage } from './api';

jest.mock('../backend', () => ({
  ...jest.requireActual('../backend'),
  apiFetch: jest.fn(),
}));
jest.mock('../supabase', () => ({ getSupabase: jest.fn() }));

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

afterEach(() => {
  mockFetch.mockReset();
  jest.useRealTimers();
});

describe('sendChatMessage', () => {
  it('starts a conversation without an id and returns the reply as written', async () => {
    mockFetch.mockResolvedValueOnce({
      conversation_id: 'c1',
      original_message: 'hi',
      normalized_message: 'hi',
      is_bangla: false,
      reply: 'Hello! **How** can I help?',
    });

    const reply = await sendChatMessage({ message: 'hi' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/chat',
      expect.objectContaining({ method: 'POST', body: { message: 'hi' } }),
    );
    expect(reply).toEqual({
      conversationId: 'c1',
      reply: 'Hello! **How** can I help?',
      isBangla: false,
    });
  });

  it('continues a conversation', async () => {
    mockFetch.mockResolvedValueOnce({ conversation_id: 'c1', reply: 'হ্যাঁ', is_bangla: true });
    const reply = await sendChatMessage({ message: 'আচ্ছা', conversationId: 'c1' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/chat',
      expect.objectContaining({ body: { message: 'আচ্ছা', conversation_id: 'c1' } }),
    );
    expect(reply.isBangla).toBe(true);
  });

  it('gives up after the timeout with a retryable 408', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce(
      (_path, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const pending = sendChatMessage({ message: 'slow' });
    jest.advanceTimersByTime(90_000);
    await expect(pending).rejects.toEqual(new ApiError(408, 'The reply took too long.'));
  });

  it('passes other errors through', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError(404, 'Conversation not found'));
    await expect(sendChatMessage({ message: 'x', conversationId: 'other' })).rejects.toThrow(
      'Conversation not found',
    );
  });
});

describe('toMessage', () => {
  it('reads canned replies as MyBela’s', () => {
    expect(
      toMessage({ id: '1', role: 'canned', content: 'Please call 999.', created_at: 't' }),
    ).toEqual({ id: '1', role: 'assistant', content: 'Please call 999.', createdAt: 't' });
    expect(toMessage({ id: '2', role: 'user', content: 'hi', created_at: 't' }).role).toBe('user');
  });
});

describe('hasBengaliScript', () => {
  it('spots Bengali script only', () => {
    expect(hasBengaliScript('ami bhat khabo')).toBe(false);
    expect(hasBengaliScript('আমি ভাত খাব')).toBe(true);
    expect(hasBengaliScript('Breakfast e ডিম?')).toBe(true);
  });
});
