export interface Span {
    name: string;
    startTime: number;
    attributes: Record<string, unknown>;
    end: () => number;
}
export declare class SimpleTracer {
    startSpan(name: string, attributes?: Record<string, unknown>): Span;
}
export declare const tracer: SimpleTracer;
//# sourceMappingURL=tracing.d.ts.map