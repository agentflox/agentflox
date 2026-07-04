-- Patch: rename ai_agents.created_by -> owner_id, drop department_id
--        rename workforces.created_by -> owner_id
-- Idempotent — safe to run more than once.

-- =============================================================================
-- ai_agents
-- =============================================================================

ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;

UPDATE "ai_agents"
SET "owner_id" = "created_by"
WHERE "owner_id" IS NULL
  AND "created_by" IS NOT NULL;

-- Fail fast if any row still has no owner (fix data before re-running).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ai_agents"
    WHERE "owner_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'ai_agents: % row(s) have NULL owner_id after backfill from created_by',
      (SELECT COUNT(*) FROM "ai_agents" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "ai_agents" DROP CONSTRAINT IF EXISTS "ai_agents_created_by_fkey";
DROP INDEX IF EXISTS "ai_agents_created_by_idx";
ALTER TABLE "ai_agents" DROP COLUMN IF EXISTS "created_by";

ALTER TABLE "ai_agents" DROP CONSTRAINT IF EXISTS "ai_agents_department_id_fkey";
DROP INDEX IF EXISTS "ai_agents_department_id_idx";
ALTER TABLE "ai_agents" DROP COLUMN IF EXISTS "department_id";

ALTER TABLE "ai_agents" ALTER COLUMN "owner_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_agents_owner_id_fkey'
  ) THEN
    ALTER TABLE "ai_agents"
      ADD CONSTRAINT "ai_agents_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ai_agents_owner_id_idx" ON "ai_agents"("owner_id");

-- =============================================================================
-- workforces (table may not exist in older databases)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workforces'
  ) THEN
    RAISE NOTICE 'workforces table not found — skipping workforce owner_id patch';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE "workforces" ADD COLUMN IF NOT EXISTS "owner_id" TEXT';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workforces'
      AND column_name = 'created_by'
  ) THEN
    EXECUTE '
      UPDATE "workforces"
      SET "owner_id" = "created_by"
      WHERE "owner_id" IS NULL
        AND "created_by" IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "workforces" WHERE "owner_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'workforces: % row(s) have NULL owner_id after backfill from created_by',
      (SELECT COUNT(*) FROM "workforces" WHERE "owner_id" IS NULL);
  END IF;

  EXECUTE 'ALTER TABLE "workforces" DROP CONSTRAINT IF EXISTS "workforces_created_by_fkey"';
  EXECUTE 'DROP INDEX IF EXISTS "workforces_created_by_idx"';
  EXECUTE 'ALTER TABLE "workforces" DROP COLUMN IF EXISTS "created_by"';

  EXECUTE 'ALTER TABLE "workforces" ALTER COLUMN "owner_id" SET NOT NULL';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workforces_owner_id_fkey'
  ) THEN
    EXECUTE '
      ALTER TABLE "workforces"
        ADD CONSTRAINT "workforces_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ';
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS "workforces_owner_id_idx" ON "workforces"("owner_id")';
END $$;
