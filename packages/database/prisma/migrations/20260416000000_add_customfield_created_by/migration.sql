-- Add created_by to custom_fields so each custom field can be traced to its creator.

ALTER TABLE "custom_fields" ADD COLUMN "created_by" TEXT;

-- FK to users; keep nullable to avoid breaking existing rows.
-- Use IF NOT EXISTS guards because some environments may already have the column.
ALTER TABLE "custom_fields" ADD COLUMN IF NOT EXISTS "created_by" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'custom_fields_created_by_fkey'
  ) THEN
    ALTER TABLE "custom_fields"
      ADD CONSTRAINT "custom_fields_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "custom_fields_created_by_idx" ON "custom_fields"("created_by");

