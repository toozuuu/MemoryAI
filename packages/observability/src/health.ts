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

export class HealthService {
  private startTime = Date.now();
  private healthChecks: Map<string, () => Promise<ComponentHealth> | ComponentHealth> = new Map();

  public registerCheck(name: string, check: () => Promise<ComponentHealth> | ComponentHealth): void {
    this.healthChecks.set(name, check);
  }

  public async getLiveness(): Promise<{ status: 'ok'; uptime: number }> {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  public async getReadiness(): Promise<SystemHealthReport> {
    const components: Record<string, ComponentHealth> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const [name, check] of this.healthChecks.entries()) {
      try {
        const result = await check();
        components[name] = result;
        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (err: unknown) {
        components[name] = {
          status: 'unhealthy',
          message: (err as Error).message
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components
    };
  }
}

export const healthService = new HealthService();
