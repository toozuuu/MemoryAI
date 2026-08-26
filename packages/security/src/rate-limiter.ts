export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private defaultConfig: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
  ) {}

  public isAllowed(key: string, customConfig?: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
  } {
    const config = customConfig || this.defaultConfig;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldest = timestamps[0];
      const resetMs = oldest + config.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs)
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      resetMs: config.windowMs
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  // Periodic cleanup
  public cleanup(olderThanMs = 300000): void {
    const cutoff = Date.now() - olderThanMs;
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}
