ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "headers" JSONB DEFAULT '[]';
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "url_params" JSONB DEFAULT '[]';
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'automation';
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "source_id" TEXT;

ALTER TABLE "webhooks" ALTER COLUMN "url" SET DEFAULT '';

ALTER TABLE "webhooks" DROP CONSTRAINT IF EXISTS "webhooks_workspace_id_fkey";
DROP INDEX IF EXISTS "webhooks_workspace_id_idx";
ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "workspace_id";

CREATE INDEX IF NOT EXISTS "webhooks_type_idx" ON "webhooks"("type");
CREATE INDEX IF NOT EXISTS "webhooks_created_by_idx" ON "webhooks"("created_by");
CREATE INDEX IF NOT EXISTS "webhooks_source_id_idx" ON "webhooks"("source_id");
