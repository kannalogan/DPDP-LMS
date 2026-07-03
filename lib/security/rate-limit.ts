export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, limit, remaining: limit - 1, resetAt: new Date(resetAt) };
    }

    bucket.count += 1;

    return {
      allowed: bucket.count <= limit,
      limit,
      remaining: Math.max(limit - bucket.count, 0),
      resetAt: new Date(bucket.resetAt)
    };
  }
}

export const rateLimiter = new InMemoryRateLimiter();
