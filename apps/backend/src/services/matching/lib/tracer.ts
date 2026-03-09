import { trace, SpanStatusCode, Span, context } from '@opentelemetry/api';

// Get the tracer for matching service
const tracer = trace.getTracer('matching-service', '1.0.0');

export { tracer };

/**
 * Helper to create a span for an operation
 */
export async function withSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean> = {},
    operation: (span: Span) => Promise<T>
): Promise<T> {
    return tracer.startActiveSpan(name, async (span) => {
        try {
            // Add attributes
            Object.entries(attributes).forEach(([key, value]) => {
                span.setAttribute(key, value);
            });

            const result = await operation(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error: any) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message || 'Unknown error',
            });
            span.recordException(error);
            throw error;
        } finally {
            span.end();
        }
    });
}

/**
 * Add attributes to the current active span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>) {
    const span = trace.getActiveSpan();
    if (span) {
        Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
        });
    }
}

/**
 * Record an event in the current span
 */
export function recordSpanEvent(name: string, attributes?: Record<string, string | number | boolean>) {
    const span = trace.getActiveSpan();
    if (span) {
        span.addEvent(name, attributes);
    }
}
