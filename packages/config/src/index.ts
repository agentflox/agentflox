import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Base environment schema - shared across all services
 */
const baseEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_PRETTY: z.string().transform(v => v === 'true').default('false'),
});

/**
 * Database configuration schema
 */
const databaseSchema = z.object({
    DATABASE_URL: z.string().url().describe('PostgreSQL connection URL'),
    DIRECT_URL: z.string().url().optional().describe('Direct connection URL for migrations'),
    DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
    DATABASE_POOL_MAX: z.coerce.number().min(1).default(10),
    DATABASE_TIMEOUT_MS: z.coerce.number().min(1000).default(30000),
});

/**
 * Redis configuration schema
 */
const redisSchema = z.object({
    REDIS_URL: z.string().url().describe('Redis connection URL'),
    REDIS_CLUSTER_MODE: z.string().transform(v => v === 'true').default('false'),
    REDIS_TLS_ENABLED: z.string().transform(v => v === 'true').default('false'),
});

/**
 * API server configuration schema
 */
const apiServerSchema = z.object({
    PORT: z.coerce.number().min(1).max(65535).default(3001),
    HOST: z.string().default('0.0.0.0'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    API_RATE_LIMIT: z.coerce.number().min(1).default(100),
    API_RATE_WINDOW_MS: z.coerce.number().min(1000).default(60000),
});

/**
 * Authentication configuration schema
 */
const authSchema = z.object({
    JWT_SECRET: z.string().min(32).describe('JWT signing secret'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

/**
 * AI/LLM configuration schema
 */
const aiSchema = z.object({
    OPENAI_API_KEY: z.string().optional().describe('OpenAI API key'),
    OPENAI_ORG_ID: z.string().optional(),
    OPENAI_DEFAULT_MODEL: z.string().default('gpt-4o-mini'),
    AI_MAX_TOKENS: z.coerce.number().min(100).default(4000),
    AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
    AI_TIMEOUT_MS: z.coerce.number().min(5000).default(60000),
});

/**
 * Payment/Billing configuration schema
 */
const billingSchema = z.object({
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),
});

/**
 * Queue/Background jobs configuration schema
 */
const queueSchema = z.object({
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    BULLMQ_CONCURRENCY: z.coerce.number().min(1).default(5),
});

/**
 * Observability configuration schema
 */
const observabilitySchema = z.object({
    SENTRY_DSN: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_SERVICE_NAME: z.string().default('agentflox'),
    METRICS_ENABLED: z.string().transform(v => v === 'true').default('true'),
});

/**
 * Complete service-server environment schema
 */
export const serviceServerEnvSchema = baseEnvSchema
    .merge(databaseSchema)
    .merge(redisSchema)
    .merge(apiServerSchema)
    .merge(authSchema)
    .merge(aiSchema)
    .merge(billingSchema)
    .merge(queueSchema)
    .merge(observabilitySchema);

/**
 * Frontend/Next.js environment schema
 */
export const frontendEnvSchema = z.object({
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_WS_URL: z.string().default('ws://localhost:3001'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

/**
 * Worker-specific environment schema
 */
export const workerEnvSchema = baseEnvSchema
    .merge(databaseSchema)
    .merge(redisSchema)
    .merge(aiSchema)
    .merge(queueSchema)
    .merge(observabilitySchema);

// Export type helpers
export type ServiceServerEnv = z.infer<typeof serviceServerEnvSchema>;
export type FrontendEnv = z.infer<typeof frontendEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/**
 * Validate and parse environment variables
 * Throws detailed error if validation fails
 */
export function parseEnv<T extends z.ZodTypeAny>(
    schema: T,
    env: Record<string, string | undefined> = process.env
): z.infer<T> {
    const result = schema.safeParse(env);

    if (!result.success) {
        const formatted = result.error.format();
        const messages = Object.entries(formatted)
            .filter(([key]) => key !== '_errors')
            .map(([key, value]) => {
                const errors = (value as { _errors?: string[] })._errors || [];
                return `  ${key}: ${errors.join(', ')}`;
            })
            .join('\n');

        throw new Error(`❌ Environment validation failed:\n${messages}`);
    }

    return result.data;
}

/**
 * Get validated service-server config
 */
let _serverConfig: ServiceServerEnv | null = null;

export function getServerConfig(): ServiceServerEnv {
    if (!_serverConfig) {
        _serverConfig = parseEnv(serviceServerEnvSchema);
    }
    return _serverConfig;
}

/**
 * Get validated worker config
 */
let _workerConfig: WorkerEnv | null = null;

export function getWorkerConfig(): WorkerEnv {
    if (!_workerConfig) {
        _workerConfig = parseEnv(workerEnvSchema);
    }
    return _workerConfig;
}

/**
 * Feature flags configuration
 */
export const featureFlags = {
    MULTI_AGENT_ENABLED: process.env.FF_MULTI_AGENT === 'true',
    NEW_MATCHING_ALGORITHM: process.env.FF_NEW_MATCHING === 'true',
    AI_CACHING_ENABLED: process.env.FF_AI_CACHING !== 'false',
    RATE_LIMITING_V2: process.env.FF_RATE_LIMITING_V2 === 'true',
} as const;

export type FeatureFlags = typeof featureFlags;

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
    return process.env.NODE_ENV === 'test';
}

// Re-export schemas for extension
export {
    baseEnvSchema,
    databaseSchema,
    redisSchema,
    apiServerSchema,
    authSchema,
    aiSchema,
    billingSchema,
    queueSchema,
    observabilitySchema,
};
