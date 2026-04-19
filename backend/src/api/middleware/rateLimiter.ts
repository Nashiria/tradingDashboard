import { RequestHandler } from 'express';
import { sendError } from '../contracts/apiResponse';

interface RateLimitPolicy {
  maxRequests: number;
  windowMs: number;
  scope: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(policy: RateLimitPolicy): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();

  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${policy.scope}:${req.ip ?? 'unknown'}`;
    const currentBucket = buckets.get(bucketKey);
    const bucket =
      !currentBucket || currentBucket.resetAt <= now
        ? { count: 0, resetAt: now + policy.windowMs }
        : currentBucket;

    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    const remaining = Math.max(policy.maxRequests - bucket.count, 0);
    const resetInSeconds = Math.max(
      Math.ceil((bucket.resetAt - now) / 1000),
      0,
    );

    res.setHeader('X-RateLimit-Limit', String(policy.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(bucket.resetAt / 1000)),
    );

    if (bucket.count > policy.maxRequests) {
      res.setHeader('Retry-After', String(resetInSeconds));
      sendError(
        res,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please retry after the current rate limit window resets.',
        [
          {
            field: 'rateLimit',
            message: `Exceeded ${policy.maxRequests} requests in ${policy.windowMs}ms for ${policy.scope}.`,
            value: {
              scope: policy.scope,
              retryAfterSeconds: resetInSeconds,
            },
          },
        ],
      );
      return;
    }

    next();
  };
}
