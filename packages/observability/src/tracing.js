export class SimpleTracer {
    startSpan(name, attributes = {}) {
        const startTime = Date.now();
        return {
            name,
            startTime,
            attributes: { ...attributes },
            end: () => {
                return Date.now() - startTime;
            }
        };
    }
}
export const tracer = new SimpleTracer();
//# sourceMappingURL=tracing.js.map