-- CreateEnum
CREATE TYPE "AutomationKind" AS ENUM ('CLASSIC', 'AGENT');

-- CreateEnum
CREATE TYPE "AutomationIdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "automations" ADD COLUMN IF NOT EXISTS "kind" "AutomationKind" NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE "automations" ADD COLUMN IF NOT EXISTS "list_id" TEXT;
ALTER TABLE "automations" ADD COLUMN IF NOT EXISTS "folder_id" TEXT;
ALTER TABLE "automations" ADD COLUMN IF NOT EXISTS "webhook_secret" TEXT;

-- Backfill existing rows to CLASSIC
UPDATE "automations" SET "kind" = 'CLASSIC' WHERE "kind" IS NULL;

-- Recreate agent FK with ON DELETE SET NULL
ALTER TABLE "automations" DROP CONSTRAINT IF EXISTS "automations_agent_id_fkey";
ALTER TABLE "automations" ADD CONSTRAINT "automations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automations" ADD CONSTRAINT "automations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automations" ADD CONSTRAINT "automations_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "automations_kind_idx" ON "automations"("kind");
CREATE INDEX IF NOT EXISTS "automations_workspace_id_is_active_kind_idx" ON "automations"("workspace_id", "is_active", "kind");
CREATE INDEX IF NOT EXISTS "automations_list_id_idx" ON "automations"("list_id");
CREATE INDEX IF NOT EXISTS "automations_folder_id_idx" ON "automations"("folder_id");

CREATE TABLE IF NOT EXISTS "automation_idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "AutomationIdempotencyStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "automation_idempotency_keys_key_key" ON "automation_idempotency_keys"("key");
CREATE INDEX IF NOT EXISTS "automation_idempotency_keys_status_created_at_idx" ON "automation_idempotency_keys"("status", "created_at");
