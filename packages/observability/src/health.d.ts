export interface ComponentHealth {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latencyMs?: number;
}
export interface SystemHealthReport {
    status: 'healthy' | 'unhealthy' | 'degraded';
    uptimeSeconds: number;
    timestamp: string;
    version: string;
    components: Record<string, ComponentHealth>;
}
export declare class HealthService {
    private startTime;
    private healthChecks;
    registerCheck(name: string, check: () => Promise<ComponentHealth> | ComponentHealth): void;
    getLiveness(): Promise<{
        status: 'ok';
        uptime: number;
    }>;
    getReadiness(): Promise<SystemHealthReport>;
}
export declare const healthService: HealthService;
//# sourceMappingURL=health.d.ts.map