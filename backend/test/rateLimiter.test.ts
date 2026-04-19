import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/api/middleware/rateLimiter';

function createMockResponse() {
  const headers = new Map<string, string>();

  return {
    headers,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

test('rate limiter allows requests inside the configured window', () => {
  const limiter = createRateLimiter({
    scope: 'tickers',
    windowMs: 1_000,
    maxRequests: 2,
  });
  const req = { ip: '127.0.0.1' };
  const firstResponse = createMockResponse();
  const secondResponse = createMockResponse();
  let nextCalls = 0;

  limiter(req as never, firstResponse as never, () => {
    nextCalls += 1;
  });
  limiter(req as never, secondResponse as never, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 2);
  assert.equal(firstResponse.headers.get('X-RateLimit-Limit'), '2');
  assert.equal(secondResponse.headers.get('X-RateLimit-Remaining'), '0');
});

test('rate limiter returns a structured 429 response after the limit is exceeded', () => {
  const limiter = createRateLimiter({
    scope: 'auth',
    windowMs: 60_000,
    maxRequests: 1,
  });
  const req = { ip: '127.0.0.1' };
  const firstResponse = createMockResponse();
  const blockedResponse = createMockResponse();
  let nextCalls = 0;

  limiter(req as never, firstResponse as never, () => {
    nextCalls += 1;
  });
  limiter(req as never, blockedResponse as never, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(blockedResponse.statusCode, 429);
  assert.equal(blockedResponse.headers.get('Retry-After') !== undefined, true);
  assert.deepEqual(blockedResponse.body, {
    version: 'v1',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message:
        'Too many requests. Please retry after the current rate limit window resets.',
      details: [
        {
          field: 'rateLimit',
          message: 'Exceeded 1 requests in 60000ms for auth.',
          value: {
            scope: 'auth',
            retryAfterSeconds: 60,
          },
        },
      ],
    },
  });
});
