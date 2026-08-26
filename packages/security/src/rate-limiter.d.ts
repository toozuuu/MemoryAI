export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}
export declare class RateLimiter {
    private defaultConfig;
    private requests;
    constructor(defaultConfig?: RateLimitConfig);
    isAllowed(key: string, customConfig?: RateLimitConfig): {
        allowed: boolean;
        remaining: number;
        resetMs: number;
    };
    reset(key?: string): void;
    cleanup(olderThanMs?: number): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map