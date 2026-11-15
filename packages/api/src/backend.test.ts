import { ApiError, errorKind, isRetryable } from './backend';

describe('errorKind', () => {
  it('names each failure the screens explain differently', () => {
    expect(errorKind(new ApiError(429, 'slow down'))).toBe('rateLimited');
    expect(errorKind(new ApiError(503, 'down'))).toBe('server');
    expect(errorKind(new ApiError(404, 'missing'))).toBe('notFound');
    expect(errorKind(new ApiError(422, 'bad'))).toBe('unknown');
    expect(errorKind(new TypeError('Network request failed'))).toBe('offline');
  });

  it('reports offline first when the device has no connection', () => {
    expect(errorKind(new ApiError(500, 'x'), false)).toBe('offline');
  });
});

describe('isRetryable', () => {
  it('retries transient failures only', () => {
    expect(isRetryable(new TypeError('Network request failed'))).toBe(true);
    expect(isRetryable(new ApiError(429, ''))).toBe(true);
    expect(isRetryable(new ApiError(502, ''))).toBe(true);
    expect(isRetryable(new ApiError(408, ''))).toBe(true);
    expect(isRetryable(new ApiError(400, ''))).toBe(false);
    expect(isRetryable(new ApiError(401, ''))).toBe(false);
    expect(isRetryable(new ApiError(404, ''))).toBe(false);
  });
});
