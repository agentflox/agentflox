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
  METRICS_TOKEN: z.string().optional(),
  SKIP_PAYPAL_WEBHOOK_VERIFY: z.string().optional(),
  HTTP_REQUEST_TIMEOUT_MS: z.string().optional(),

  // OpenAI for embeddings
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  DATABASE_URL: z.string(),

  // Inngest (optional)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_BASE_URL: z.string().optional(),

  // Worker configuration
  WORKER_HEALTH_PORT: z.string().optional(),
  DISABLE_MESSAGE_DELIVERY_WORKER: z.string().optional(),
  DISABLE_API_SINGLETON_HOOKS: z.string().optional(),
  DISABLE_REDIS_REALTIME: z.string().optional(),
  IGNORE_REDIS_UNHANDLED_REJECTION: z.string().optional(),

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