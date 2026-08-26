export class HealthService {
    startTime = Date.now();
    healthChecks = new Map();
    registerCheck(name, check) {
        this.healthChecks.set(name, check);
    }
    async getLiveness() {
        return {
            status: 'ok',
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }
    async getReadiness() {
        const components = {};
        let overallStatus = 'healthy';
        for (const [name, check] of this.healthChecks.entries()) {
            try {
                const result = await check();
                components[name] = result;
                if (result.status === 'unhealthy') {
                    overallStatus = 'unhealthy';
                }
                else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (err) {
                components[name] = {
                    status: 'unhealthy',
                    message: err.message
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
//# sourceMappingURL=health.js.map