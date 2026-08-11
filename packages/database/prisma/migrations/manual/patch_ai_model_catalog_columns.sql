-- Idempotent follow-up for ai_model_catalog when enums already exist

DO $$ BEGIN
  CREATE TYPE "AiModelProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AiModelAuthType" AS ENUM ('API_KEY', 'OAUTH_TOKEN', 'SERVICE_ACCOUNT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "provider" "AiModelProvider";
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "api_model_id" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "is_custom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "auth_type" "AiModelAuthType";
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "credentials_encrypted" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "context_window" INTEGER;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "max_output_tokens" INTEGER;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "credits_per_1k_input" DOUBLE PRECISION;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "credits_per_1k_output" DOUBLE PRECISION;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "credit_tier" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "input_file_types" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "supports_thinking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_models' AND column_name = 'name'
      AND udt_name = 'ModelName'
  ) THEN
    ALTER TABLE "ai_models" ALTER COLUMN "name" TYPE TEXT USING "name"::text;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

ALTER TABLE "ai_models" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "ai_models" ALTER COLUMN "version" SET DEFAULT '1.0.0';

UPDATE "ai_models"
SET
  "slug" = COALESCE("slug", replace(lower(COALESCE("name", 'unknown')), '_', '-')),
  "display_name" = COALESCE("display_name", replace(COALESCE("name", 'Unknown'), '_', ' ')),
  "api_model_id" = COALESCE(
    "api_model_id",
    replace(replace(lower(COALESCE("name", 'gpt-4o-mini')), '_', '-'), 'claude-3-5', 'claude-3.5')
  ),
  "provider" = COALESCE(
    "provider",
    CASE
      WHEN COALESCE("name", '') ILIKE '%claude%' THEN 'ANTHROPIC'::"AiModelProvider"
      WHEN COALESCE("name", '') ILIKE '%gemini%' OR COALESCE("name", '') ILIKE '%gemma%' THEN 'GOOGLE'::"AiModelProvider"
      ELSE 'OPENAI'::"AiModelProvider"
    END
  ),
  "is_system" = true
WHERE "slug" IS NULL OR "display_name" IS NULL OR "api_model_id" IS NULL OR "provider" IS NULL;

ALTER TABLE "ai_models" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "ai_models" ALTER COLUMN "display_name" SET NOT NULL;
ALTER TABLE "ai_models" ALTER COLUMN "provider" SET NOT NULL;
ALTER TABLE "ai_models" ALTER COLUMN "api_model_id" SET NOT NULL;

ALTER TABLE "ai_models" DROP CONSTRAINT IF EXISTS "ai_models_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ai_models_one_default"
  ON "ai_models" ("is_default") WHERE "is_default" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ai_models_system_slug"
  ON "ai_models" ("slug") WHERE "is_system" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ai_models_custom_user_slug"
  ON "ai_models" ("user_id", "slug") WHERE "is_custom" = true AND "user_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ai_models_user_id_idx" ON "ai_models"("user_id");
CREATE INDEX IF NOT EXISTS "ai_models_workspace_id_idx" ON "ai_models"("workspace_id");
CREATE INDEX IF NOT EXISTS "ai_models_provider_idx" ON "ai_models"("provider");
CREATE INDEX IF NOT EXISTS "ai_models_is_system_is_custom_idx" ON "ai_models"("is_system", "is_custom");
CREATE INDEX IF NOT EXISTS "ai_models_is_default_idx" ON "ai_models"("is_default");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_models_user_id_fkey'
  ) THEN
    ALTER TABLE "ai_models"
      ADD CONSTRAINT "ai_models_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_models_workspace_id_fkey'
  ) THEN
    ALTER TABLE "ai_models"
      ADD CONSTRAINT "ai_models_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ai_agents" DROP CONSTRAINT IF EXISTS "ai_agents_model_id_fkey";
ALTER TABLE "ai_agents"
  ADD CONSTRAINT "ai_agents_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_conversations" DROP CONSTRAINT IF EXISTS "ai_conversations_model_id_fkey";
ALTER TABLE "ai_conversations"
  ADD CONSTRAINT "ai_conversations_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ai_conversations_model_id_idx" ON "ai_conversations"("model_id");

ALTER TABLE "workforces" ADD COLUMN IF NOT EXISTS "model_id" TEXT;
CREATE INDEX IF NOT EXISTS "workforces_model_id_idx" ON "workforces"("model_id");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workforces_model_id_fkey'
  ) THEN
    ALTER TABLE "workforces"
      ADD CONSTRAINT "workforces_model_id_fkey"
      FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ai_usage_logs" ADD COLUMN IF NOT EXISTS "model_id" TEXT;
ALTER TABLE "ai_usage_logs" ADD COLUMN IF NOT EXISTS "input_tokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_usage_logs" ADD COLUMN IF NOT EXISTS "output_tokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_usage_logs" ADD COLUMN IF NOT EXISTS "is_custom" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "ai_usage_logs_model_id_idx" ON "ai_usage_logs"("model_id");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_is_custom_user_id_created_at_idx"
  ON "ai_usage_logs"("is_custom", "user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_model_id_fkey'
  ) THEN
    ALTER TABLE "ai_usage_logs"
      ADD CONSTRAINT "ai_usage_logs_model_id_fkey"
      FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
