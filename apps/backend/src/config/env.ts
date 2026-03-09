import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3002'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Redis (Upstash or Sentinel)
  REDIS_URL: z.string().optional(), // Make optional if using Sentinels
  REDIS_PASSWORD: z.string().optional(),
  REDIS_SENTINEL_1: z.string().optional(),
  REDIS_SENTINEL_2: z.string().optional(),
  REDIS_SENTINEL_3: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Security
  JWT_SECRET: z.string().optional(),

  // OpenAI for embeddings
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Matching system
  MATCHING_INTERVAL_DAYS: z.string().default('3'),
  MATCHING_SCORE_THRESHOLD: z.string().default('0.85'),
  MATCHING_BATCH_SIZE: z.string().default('200'),
  MATCHING_NOTIFICATION_CONCURRENCY: z.string().default('10'),
  MATCHING_WORKER_CONCURRENCY: z.string().default('5'),
  MATCHING_WORKER_LIMITER_MAX: z.string().default('200'),
  MATCHING_WORKER_LIMITER_DURATION_MS: z.string().default('60000'),
  MATCHING_DB_POOL_MAX: z.string().default('100'),
  MATCHING_DB_POOL_MIN: z.string().default('10'),
  MATCHING_DB_POOL_IDLE_TIMEOUT_MS: z.string().default('30000'),
  MATCHING_DB_POOL_CONNECTION_TIMEOUT_MS: z.string().default('10000'),
  MATCHING_DB_STATEMENT_TIMEOUT_MS: z.string().default('30000'),
  MATCHING_DB_QUERY_TIMEOUT_MS: z.string().default('30000'),
  DATABASE_URL: z.string(),

  // Inngest (optional)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_BASE_URL: z.string().optional(),

  // Worker configuration
  WORKER_HEALTH_PORT: z.string().optional(),

  // Billing - PayPal
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

  // Billing - Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Application URLs
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  APP_BRAND_NAME: z.string().default('Agentflox'),
});

export const env = envSchema.parse(process.env);

export default env;