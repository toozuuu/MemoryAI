export interface Span {
  name: string;
  startTime: number;
  attributes: Record<string, unknown>;
  end: () => number;
}

export class SimpleTracer {
  public startSpan(name: string, attributes: Record<string, unknown> = {}): Span {
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
