
import { trace, context, SpanStatusCode, Span, Tracer } from '@opentelemetry/api';

/**
 * Distributed Tracing Service
 * Wrapper around OpenTelemetry for consistent tracing across the Agent platform.
 */
export class TracingService {
    private tracer: Tracer;

    constructor(serviceName: string = 'agent-service') {
        this.tracer = trace.getTracer(serviceName);
    }

    /**
     * Start a new span
     */
    startSpan(name: string, attributes?: Record<string, any>): Span {
        return this.tracer.startSpan(name, { attributes });
    }

    /**
     * Trace an async operation
     */
    async traceOperation<T>(
        name: string,
        fn: (span: Span) => Promise<T>,
        attributes?: Record<string, any>
    ): Promise<T> {
        const span = this.tracer.startSpan(name, { attributes });

        return context.with(trace.setSpan(context.active(), span), async () => {
            try {
                const result = await fn(span);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.recordException(error as Error);
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : String(error),
                });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Get current trace ID
     */
    getTraceId(): string | undefined {
        return trace.getSpanContext(context.active())?.traceId;
    }
}

export const tracingService = new TracingService();
