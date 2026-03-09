import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PrismaInstrumentation } from '@prisma/instrumentation';

/**
 * Distributed Tracing Service
 * Full OpenTelemetry integration for production observability
 */

class DistributedTracingService {
    private tracer: any;
    private provider: NodeTracerProvider | null = null;

    /**
     * Initialize OpenTelemetry tracing
     */
    initialize(serviceName: string = 'agentflox-socket-server') {
        // Create provider with resource attributes
        this.provider = new NodeTracerProvider({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
            }),
        });

        // Configure Jaeger exporter (can switch to OTLP for other backends)
        const jaegerExporter = new JaegerExporter({
            endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        });

        // Add batch processor for efficient export
        this.provider.addSpanProcessor(
            new BatchSpanProcessor(jaegerExporter, {
                maxQueueSize: 1000,
                maxExportBatchSize: 100,
                scheduledDelayMillis: 5000,
            })
        );

        // Register provider
        this.provider.register();

        // Auto-instrument common libraries
        registerInstrumentations({
            instrumentations: [
                new HttpInstrumentation(),
                new ExpressInstrumentation(),
                new IORedisInstrumentation(),
                new PrismaInstrumentation(),
            ],
        });

        this.tracer = trace.getTracer(serviceName);

        console.log(`📊 Distributed tracing initialized: ${serviceName}`);
    }

    /**
     * Get current tracer
     */
    getTracer() {
        return this.tracer;
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
        operation: (span: Span) => Promise<T>,
        attributes?: Record<string, any>
    ): Promise<T> {
        const span = this.tracer.startSpan(name, { attributes });

        return context.with(trace.setSpan(context.active(), span), async () => {
            try {
                const result = await operation(span);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error: any) {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error.message,
                });
                span.recordException(error);
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Trace a Socket.IO event handler
     */
    async traceSocketEvent<T>(
        eventName: string,
        userId: string,
        workspaceId: string,
        handler: (span: Span) => Promise<T>
    ): Promise<T> {
        return this.traceOperation(
            `socket.${eventName}`,
            handler,
            {
                'socket.event': eventName,
                'user.id': userId,
                'workspace.id': workspaceId,
                'component': 'socket-handler',
            }
        );
    }

    /**
     * Trace a database operation
     */
    async traceDbOperation<T>(
        operationType: 'query' | 'mutation' | 'transaction',
        modelName: string,
        operation: (span: Span) => Promise<T>
    ): Promise<T> {
        return this.traceOperation(
            `db.${operationType}.${modelName}`,
            operation,
            {
                'db.system': 'postgresql',
                'db.operation': operationType,
                'db.model': modelName,
            }
        );
    }

    /**
     * Trace a Redis operation
     */
    async traceRedisOperation<T>(
        command: string,
        key: string,
        operation: (span: Span) => Promise<T>
    ): Promise<T> {
        return this.traceOperation(
            `redis.${command}`,
            operation,
            {
                'db.system': 'redis',
                'db.operation': command,
                'redis.key': key,
            }
        );
    }

    /**
     * Add custom attributes to current span
     */
    addSpanAttributes(attributes: Record<string, any>) {
        const currentSpan = trace.getActiveSpan();
        if (currentSpan) {
            Object.entries(attributes).forEach(([key, value]) => {
                currentSpan.setAttribute(key, value);
            });
        }
    }

    /**
     * Record an event in current span
     */
    recordEvent(name: string, attributes?: Record<string, any>) {
        const currentSpan = trace.getActiveSpan();
        if (currentSpan) {
            currentSpan.addEvent(name, attributes);
        }
    }

    /**
     * Shutdown tracing (for graceful shutdown)
     */
    async shutdown() {
        if (this.provider) {
            await this.provider.shutdown();
            console.log('📊 Distributed tracing shut down');
        }
    }
}

// Singleton instance
export const distributedTracing = new DistributedTracingService();

/**
 * Decorator for tracing class methods
 */
export function Trace(spanName?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const name = spanName || `${target.constructor.name}.${propertyKey}`;
            return distributedTracing.traceOperation(
                name,
                async (span) => {
                    span.setAttribute('method', propertyKey);
                    span.setAttribute('class', target.constructor.name);
                    return await originalMethod.apply(this, args);
                }
            );
        };

        return descriptor;
    };
}
