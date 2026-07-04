-- Patch: ownership transfer + status columns for core entities.
-- Idempotent — safe to run more than once.

-- =============================================================================
-- Enums
-- =============================================================================

DO $$ BEGIN CREATE TYPE "WorkspaceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SpaceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FolderStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ListStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ViewStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AutomationEntityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Helper: recreate owner FK as RESTRICT
-- =============================================================================

CREATE OR REPLACE FUNCTION patch_owner_fk_restrict(p_table regclass, p_constraint text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_col text := 'owner_id';
BEGIN
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', p_table, p_constraint);
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_constraint
  ) THEN
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE',
      p_table, p_constraint, v_col
    );
  END IF;
END;
$$;

-- =============================================================================
-- workspaces
-- =============================================================================

ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "status" "WorkspaceStatus";

UPDATE "workspaces"
SET "status" = CASE
  WHEN "is_archived" THEN 'ARCHIVED'::"WorkspaceStatus"
  ELSE 'ACTIVE'::"WorkspaceStatus"
END
WHERE "status" IS NULL;

ALTER TABLE "workspaces" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "workspaces" ALTER COLUMN "status" SET NOT NULL;

SELECT patch_owner_fk_restrict('workspaces'::regclass, 'workspaces_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_previous_owner_id_fkey') THEN
    ALTER TABLE "workspaces"
      ADD CONSTRAINT "workspaces_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "workspaces_previous_owner_id_idx" ON "workspaces"("previous_owner_id");
CREATE INDEX IF NOT EXISTS "workspaces_status_idx" ON "workspaces"("status");

CREATE TABLE IF NOT EXISTS "workspace_ownership_transfers" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "workspace_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_ownership_transfers_acceptance_token_hash_key"
  ON "workspace_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfers_workspace_id_idx" ON "workspace_ownership_transfers"("workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfers_from_owner_id_idx" ON "workspace_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfers_to_owner_id_idx" ON "workspace_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfers_requested_by_idx" ON "workspace_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfers_status_idx" ON "workspace_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfers_workspace_id_fkey') THEN
    ALTER TABLE "workspace_ownership_transfers"
      ADD CONSTRAINT "workspace_ownership_transfers_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "workspace_ownership_transfers"
      ADD CONSTRAINT "workspace_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "workspace_ownership_transfers"
      ADD CONSTRAINT "workspace_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "workspace_ownership_transfers"
      ADD CONSTRAINT "workspace_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_workspace"
  ON "workspace_ownership_transfers"("workspace_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- spaces
-- =============================================================================

ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "status" "SpaceStatus";

UPDATE "spaces"
SET "owner_id" = "created_by"
WHERE "owner_id" IS NULL AND "created_by" IS NOT NULL;

UPDATE "spaces" s
SET "owner_id" = w."owner_id"
FROM "workspaces" w
WHERE s."workspace_id" = w."id" AND s."owner_id" IS NULL;

UPDATE "spaces"
SET "status" = CASE
  WHEN NOT "is_active" THEN 'ARCHIVED'::"SpaceStatus"
  ELSE 'ACTIVE'::"SpaceStatus"
END
WHERE "status" IS NULL;

ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "spaces_created_by_fkey";
DROP INDEX IF EXISTS "spaces_created_by_idx";
ALTER TABLE "spaces" DROP COLUMN IF EXISTS "created_by";

ALTER TABLE "spaces" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "spaces" ALTER COLUMN "status" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "spaces" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'spaces: % row(s) have NULL owner_id after backfill', (SELECT COUNT(*) FROM "spaces" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "spaces" ALTER COLUMN "owner_id" SET NOT NULL;

SELECT patch_owner_fk_restrict('spaces'::regclass, 'spaces_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spaces_previous_owner_id_fkey') THEN
    ALTER TABLE "spaces"
      ADD CONSTRAINT "spaces_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "spaces_owner_id_idx" ON "spaces"("owner_id");
CREATE INDEX IF NOT EXISTS "spaces_previous_owner_id_idx" ON "spaces"("previous_owner_id");
CREATE INDEX IF NOT EXISTS "spaces_status_idx" ON "spaces"("status");

CREATE TABLE IF NOT EXISTS "space_ownership_transfers" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "space_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "space_ownership_transfers_acceptance_token_hash_key"
  ON "space_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "space_ownership_transfers_space_id_idx" ON "space_ownership_transfers"("space_id");
CREATE INDEX IF NOT EXISTS "space_ownership_transfers_from_owner_id_idx" ON "space_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "space_ownership_transfers_to_owner_id_idx" ON "space_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "space_ownership_transfers_requested_by_idx" ON "space_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "space_ownership_transfers_status_idx" ON "space_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_ownership_transfers_space_id_fkey') THEN
    ALTER TABLE "space_ownership_transfers"
      ADD CONSTRAINT "space_ownership_transfers_space_id_fkey"
      FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "space_ownership_transfers"
      ADD CONSTRAINT "space_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "space_ownership_transfers"
      ADD CONSTRAINT "space_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "space_ownership_transfers"
      ADD CONSTRAINT "space_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_space"
  ON "space_ownership_transfers"("space_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- projects (mostly exists — patch ownership transfer + FKs)
-- =============================================================================

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);

SELECT patch_owner_fk_restrict('projects'::regclass, 'projects_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_previous_owner_id_fkey') THEN
    ALTER TABLE "projects"
      ADD CONSTRAINT "projects_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "projects_previous_owner_id_idx" ON "projects"("previous_owner_id");

ALTER TABLE "project_ownership_transfers" ADD COLUMN IF NOT EXISTS "requested_by" TEXT;
ALTER TABLE "project_ownership_transfers" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);
ALTER TABLE "project_ownership_transfers" ADD COLUMN IF NOT EXISTS "acceptance_token_hash" TEXT;

UPDATE "project_ownership_transfers"
SET "requested_by" = "from_owner_id"
WHERE "requested_by" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_ownership_transfers' AND column_name = 'acceptance_token'
  ) THEN
    UPDATE "project_ownership_transfers"
    SET "acceptance_token_hash" = "acceptance_token"
    WHERE "acceptance_token_hash" IS NULL AND "acceptance_token" IS NOT NULL;

    ALTER TABLE "project_ownership_transfers" DROP COLUMN IF EXISTS "acceptance_token";
    DROP INDEX IF EXISTS "project_ownership_transfers_acceptance_token_key";
  END IF;
END $$;

ALTER TABLE "project_ownership_transfers" ALTER COLUMN "requested_by" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "project_ownership_transfers_acceptance_token_hash_key"
  ON "project_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "project_ownership_transfers_requested_by_idx"
  ON "project_ownership_transfers"("requested_by");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "project_ownership_transfers"
      ADD CONSTRAINT "project_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_project"
  ON "project_ownership_transfers"("project_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- teams
-- =============================================================================

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);

SELECT patch_owner_fk_restrict('teams'::regclass, 'teams_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_previous_owner_id_fkey') THEN
    ALTER TABLE "teams"
      ADD CONSTRAINT "teams_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "teams_owner_id_idx" ON "teams"("owner_id");
CREATE INDEX IF NOT EXISTS "teams_previous_owner_id_idx" ON "teams"("previous_owner_id");

CREATE TABLE IF NOT EXISTS "team_ownership_transfers" (
  "id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "team_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_ownership_transfers_acceptance_token_hash_key"
  ON "team_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "team_ownership_transfers_team_id_idx" ON "team_ownership_transfers"("team_id");
CREATE INDEX IF NOT EXISTS "team_ownership_transfers_from_owner_id_idx" ON "team_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "team_ownership_transfers_to_owner_id_idx" ON "team_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "team_ownership_transfers_requested_by_idx" ON "team_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "team_ownership_transfers_status_idx" ON "team_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_ownership_transfers_team_id_fkey') THEN
    ALTER TABLE "team_ownership_transfers"
      ADD CONSTRAINT "team_ownership_transfers_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "team_ownership_transfers"
      ADD CONSTRAINT "team_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "team_ownership_transfers"
      ADD CONSTRAINT "team_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "team_ownership_transfers"
      ADD CONSTRAINT "team_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_team"
  ON "team_ownership_transfers"("team_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- automations
-- =============================================================================

ALTER TABLE "automations" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "automations" ADD COLUMN IF NOT EXISTS "status" "AutomationEntityStatus";

UPDATE "automations"
SET "owner_id" = "created_by"
WHERE "owner_id" IS NULL AND "created_by" IS NOT NULL;

UPDATE "automations"
SET "status" = CASE
  WHEN "is_active" THEN 'ACTIVE'::"AutomationEntityStatus"
  ELSE 'ARCHIVED'::"AutomationEntityStatus"
END
WHERE "status" IS NULL;

ALTER TABLE "automations" DROP CONSTRAINT IF EXISTS "automations_created_by_fkey";
DROP INDEX IF EXISTS "automations_created_by_idx";
ALTER TABLE "automations" DROP COLUMN IF EXISTS "created_by";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "automations" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'automations: % row(s) have NULL owner_id after backfill', (SELECT COUNT(*) FROM "automations" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "automations" ALTER COLUMN "owner_id" SET NOT NULL;
ALTER TABLE "automations" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "automations" ALTER COLUMN "status" SET NOT NULL;

SELECT patch_owner_fk_restrict('automations'::regclass, 'automations_owner_id_fkey');

CREATE INDEX IF NOT EXISTS "automations_owner_id_idx" ON "automations"("owner_id");
CREATE INDEX IF NOT EXISTS "automations_status_idx" ON "automations"("status");

-- =============================================================================
-- folders
-- =============================================================================

ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "status" "FolderStatus";

UPDATE "folders" f SET "owner_id" = w."owner_id" FROM "workspaces" w WHERE f."workspace_id" = w."id" AND f."owner_id" IS NULL;
UPDATE "folders" f SET "owner_id" = s."owner_id" FROM "spaces" s WHERE f."space_id" = s."id" AND f."owner_id" IS NULL;
UPDATE "folders" f SET "owner_id" = p."owner_id" FROM "projects" p WHERE f."project_id" = p."id" AND f."owner_id" IS NULL;
UPDATE "folders" f SET "owner_id" = t."owner_id" FROM "teams" t WHERE f."team_id" = t."id" AND f."owner_id" IS NULL;

UPDATE "folders"
SET "status" = CASE
  WHEN "is_archived" THEN 'ARCHIVED'::"FolderStatus"
  ELSE 'ACTIVE'::"FolderStatus"
END
WHERE "status" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "folders" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'folders: % row(s) have NULL owner_id after backfill', (SELECT COUNT(*) FROM "folders" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "folders" ALTER COLUMN "owner_id" SET NOT NULL;
ALTER TABLE "folders" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "folders" ALTER COLUMN "status" SET NOT NULL;

SELECT patch_owner_fk_restrict('folders'::regclass, 'folders_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folders_previous_owner_id_fkey') THEN
    ALTER TABLE "folders"
      ADD CONSTRAINT "folders_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "folders_owner_id_idx" ON "folders"("owner_id");
CREATE INDEX IF NOT EXISTS "folders_previous_owner_id_idx" ON "folders"("previous_owner_id");
CREATE INDEX IF NOT EXISTS "folders_status_idx" ON "folders"("status");

CREATE TABLE IF NOT EXISTS "folder_ownership_transfers" (
  "id" TEXT NOT NULL,
  "folder_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "folder_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "folder_ownership_transfers_acceptance_token_hash_key"
  ON "folder_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "folder_ownership_transfers_folder_id_idx" ON "folder_ownership_transfers"("folder_id");
CREATE INDEX IF NOT EXISTS "folder_ownership_transfers_from_owner_id_idx" ON "folder_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "folder_ownership_transfers_to_owner_id_idx" ON "folder_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "folder_ownership_transfers_requested_by_idx" ON "folder_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "folder_ownership_transfers_status_idx" ON "folder_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folder_ownership_transfers_folder_id_fkey') THEN
    ALTER TABLE "folder_ownership_transfers"
      ADD CONSTRAINT "folder_ownership_transfers_folder_id_fkey"
      FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folder_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "folder_ownership_transfers"
      ADD CONSTRAINT "folder_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folder_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "folder_ownership_transfers"
      ADD CONSTRAINT "folder_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folder_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "folder_ownership_transfers"
      ADD CONSTRAINT "folder_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_folder"
  ON "folder_ownership_transfers"("folder_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- lists
-- =============================================================================

ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "status" "ListStatus";
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "created_by" TEXT;

UPDATE "lists" SET "owner_id" = "created_by" WHERE "owner_id" IS NULL AND "created_by" IS NOT NULL;
UPDATE "lists" l SET "owner_id" = w."owner_id" FROM "workspaces" w WHERE l."workspace_id" = w."id" AND l."owner_id" IS NULL;
UPDATE "lists" l SET "owner_id" = s."owner_id" FROM "spaces" s WHERE l."space_id" = s."id" AND l."owner_id" IS NULL;
UPDATE "lists" l SET "owner_id" = f."owner_id" FROM "folders" f WHERE l."folder_id" = f."id" AND l."owner_id" IS NULL;
UPDATE "lists" l SET "owner_id" = p."owner_id" FROM "projects" p WHERE l."project_id" = p."id" AND l."owner_id" IS NULL;
UPDATE "lists" l SET "owner_id" = t."owner_id" FROM "teams" t WHERE l."team_id" = t."id" AND l."owner_id" IS NULL;

UPDATE "lists"
SET "status" = CASE
  WHEN "is_archived" THEN 'ARCHIVED'::"ListStatus"
  ELSE 'ACTIVE'::"ListStatus"
END
WHERE "status" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "lists" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'lists: % row(s) have NULL owner_id after backfill', (SELECT COUNT(*) FROM "lists" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "lists" ALTER COLUMN "owner_id" SET NOT NULL;
ALTER TABLE "lists" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "lists" ALTER COLUMN "status" SET NOT NULL;

SELECT patch_owner_fk_restrict('lists'::regclass, 'lists_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lists_previous_owner_id_fkey') THEN
    ALTER TABLE "lists"
      ADD CONSTRAINT "lists_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lists_created_by_fkey') THEN
    ALTER TABLE "lists"
      ADD CONSTRAINT "lists_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "lists_owner_id_idx" ON "lists"("owner_id");
CREATE INDEX IF NOT EXISTS "lists_previous_owner_id_idx" ON "lists"("previous_owner_id");
CREATE INDEX IF NOT EXISTS "lists_status_idx" ON "lists"("status");

CREATE TABLE IF NOT EXISTS "list_ownership_transfers" (
  "id" TEXT NOT NULL,
  "list_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "list_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "list_ownership_transfers_acceptance_token_hash_key"
  ON "list_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "list_ownership_transfers_list_id_idx" ON "list_ownership_transfers"("list_id");
CREATE INDEX IF NOT EXISTS "list_ownership_transfers_from_owner_id_idx" ON "list_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "list_ownership_transfers_to_owner_id_idx" ON "list_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "list_ownership_transfers_requested_by_idx" ON "list_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "list_ownership_transfers_status_idx" ON "list_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_ownership_transfers_list_id_fkey') THEN
    ALTER TABLE "list_ownership_transfers"
      ADD CONSTRAINT "list_ownership_transfers_list_id_fkey"
      FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "list_ownership_transfers"
      ADD CONSTRAINT "list_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "list_ownership_transfers"
      ADD CONSTRAINT "list_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'list_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "list_ownership_transfers"
      ADD CONSTRAINT "list_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_list"
  ON "list_ownership_transfers"("list_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- views
-- =============================================================================

ALTER TABLE "views" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "views" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "views" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);
ALTER TABLE "views" ADD COLUMN IF NOT EXISTS "status" "ViewStatus";

UPDATE "views" SET "owner_id" = "created_by" WHERE "owner_id" IS NULL AND "created_by" IS NOT NULL;
UPDATE "views" v SET "owner_id" = l."owner_id" FROM "lists" l WHERE v."list_id" = l."id" AND v."owner_id" IS NULL;
UPDATE "views" v SET "owner_id" = f."owner_id" FROM "folders" f WHERE v."folder_id" = f."id" AND v."owner_id" IS NULL;
UPDATE "views" v SET "owner_id" = w."owner_id" FROM "workspaces" w WHERE v."workspace_id" = w."id" AND v."owner_id" IS NULL;
UPDATE "views" v SET "owner_id" = s."owner_id" FROM "spaces" s WHERE v."space_id" = s."id" AND v."owner_id" IS NULL;
UPDATE "views" v SET "owner_id" = p."owner_id" FROM "projects" p WHERE v."project_id" = p."id" AND v."owner_id" IS NULL;
UPDATE "views" v SET "owner_id" = t."owner_id" FROM "teams" t WHERE v."team_id" = t."id" AND v."owner_id" IS NULL;

UPDATE "views" SET "status" = 'ACTIVE'::"ViewStatus" WHERE "status" IS NULL;

ALTER TABLE "views" DROP CONSTRAINT IF EXISTS "views_created_by_fkey";
DROP INDEX IF EXISTS "views_created_by_idx";
ALTER TABLE "views" DROP COLUMN IF EXISTS "created_by";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "views" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'views: % row(s) have NULL owner_id after backfill', (SELECT COUNT(*) FROM "views" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "views" ALTER COLUMN "owner_id" SET NOT NULL;
ALTER TABLE "views" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "views" ALTER COLUMN "status" SET NOT NULL;

SELECT patch_owner_fk_restrict('views'::regclass, 'views_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'views_previous_owner_id_fkey') THEN
    ALTER TABLE "views"
      ADD CONSTRAINT "views_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "views_owner_id_idx" ON "views"("owner_id");
CREATE INDEX IF NOT EXISTS "views_previous_owner_id_idx" ON "views"("previous_owner_id");
CREATE INDEX IF NOT EXISTS "views_status_idx" ON "views"("status");

CREATE TABLE IF NOT EXISTS "view_ownership_transfers" (
  "id" TEXT NOT NULL,
  "view_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "view_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "view_ownership_transfers_acceptance_token_hash_key"
  ON "view_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "view_ownership_transfers_view_id_idx" ON "view_ownership_transfers"("view_id");
CREATE INDEX IF NOT EXISTS "view_ownership_transfers_from_owner_id_idx" ON "view_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "view_ownership_transfers_to_owner_id_idx" ON "view_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "view_ownership_transfers_requested_by_idx" ON "view_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "view_ownership_transfers_status_idx" ON "view_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'view_ownership_transfers_view_id_fkey') THEN
    ALTER TABLE "view_ownership_transfers"
      ADD CONSTRAINT "view_ownership_transfers_view_id_fkey"
      FOREIGN KEY ("view_id") REFERENCES "views"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'view_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "view_ownership_transfers"
      ADD CONSTRAINT "view_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'view_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "view_ownership_transfers"
      ADD CONSTRAINT "view_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'view_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "view_ownership_transfers"
      ADD CONSTRAINT "view_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_view"
  ON "view_ownership_transfers"("view_id")
  WHERE "status" = 'PENDING';

-- =============================================================================
-- documents
-- =============================================================================

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "previous_owner_id" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "transferred_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "status" "DocumentStatus";

UPDATE "documents" SET "owner_id" = "created_by" WHERE "owner_id" IS NULL AND "created_by" IS NOT NULL;
UPDATE "documents" d SET "owner_id" = w."owner_id" FROM "workspaces" w WHERE d."workspace_id" = w."id" AND d."owner_id" IS NULL;
UPDATE "documents" d SET "owner_id" = s."owner_id" FROM "spaces" s WHERE d."space_id" = s."id" AND d."owner_id" IS NULL;
UPDATE "documents" d SET "owner_id" = p."owner_id" FROM "projects" p WHERE d."project_id" = p."id" AND d."owner_id" IS NULL;
UPDATE "documents" d SET "owner_id" = l."owner_id" FROM "lists" l WHERE d."list_id" = l."id" AND d."owner_id" IS NULL;
UPDATE "documents" d SET "owner_id" = f."owner_id" FROM "folders" f WHERE d."folder_id" = f."id" AND d."owner_id" IS NULL;
UPDATE "documents" d SET "owner_id" = t."owner_id" FROM "teams" t WHERE d."team_id" = t."id" AND d."owner_id" IS NULL;
UPDATE "documents" d SET "owner_id" = v."owner_id" FROM "views" v WHERE d."view_id" = v."id" AND d."owner_id" IS NULL;

UPDATE "documents"
SET "status" = CASE
  WHEN "is_archived" THEN 'ARCHIVED'::"DocumentStatus"
  WHEN "is_published" THEN 'ACTIVE'::"DocumentStatus"
  ELSE 'DRAFT'::"DocumentStatus"
END
WHERE "status" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "documents" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'documents: % row(s) have NULL owner_id after backfill', (SELECT COUNT(*) FROM "documents" WHERE "owner_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "documents" ALTER COLUMN "owner_id" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "documents" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_created_by_fkey";
SELECT patch_owner_fk_restrict('documents'::regclass, 'documents_owner_id_fkey');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_previous_owner_id_fkey') THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_previous_owner_id_fkey"
      FOREIGN KEY ("previous_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_created_by_fkey') THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_owner_id_idx" ON "documents"("owner_id");
CREATE INDEX IF NOT EXISTS "documents_previous_owner_id_idx" ON "documents"("previous_owner_id");
CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "documents"("status");

CREATE TABLE IF NOT EXISTS "document_ownership_transfers" (
  "id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "from_owner_id" TEXT NOT NULL,
  "to_owner_id" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
  "acceptance_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "document_ownership_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_ownership_transfers_acceptance_token_hash_key"
  ON "document_ownership_transfers"("acceptance_token_hash");
CREATE INDEX IF NOT EXISTS "document_ownership_transfers_document_id_idx" ON "document_ownership_transfers"("document_id");
CREATE INDEX IF NOT EXISTS "document_ownership_transfers_from_owner_id_idx" ON "document_ownership_transfers"("from_owner_id");
CREATE INDEX IF NOT EXISTS "document_ownership_transfers_to_owner_id_idx" ON "document_ownership_transfers"("to_owner_id");
CREATE INDEX IF NOT EXISTS "document_ownership_transfers_requested_by_idx" ON "document_ownership_transfers"("requested_by");
CREATE INDEX IF NOT EXISTS "document_ownership_transfers_status_idx" ON "document_ownership_transfers"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_ownership_transfers_document_id_fkey') THEN
    ALTER TABLE "document_ownership_transfers"
      ADD CONSTRAINT "document_ownership_transfers_document_id_fkey"
      FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_ownership_transfers_from_owner_id_fkey') THEN
    ALTER TABLE "document_ownership_transfers"
      ADD CONSTRAINT "document_ownership_transfers_from_owner_id_fkey"
      FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_ownership_transfers_to_owner_id_fkey') THEN
    ALTER TABLE "document_ownership_transfers"
      ADD CONSTRAINT "document_ownership_transfers_to_owner_id_fkey"
      FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_ownership_transfers_requested_by_fkey') THEN
    ALTER TABLE "document_ownership_transfers"
      ADD CONSTRAINT "document_ownership_transfers_requested_by_fkey"
      FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_pending_transfer_per_document"
  ON "document_ownership_transfers"("document_id")
  WHERE "status" = 'PENDING';

DROP FUNCTION IF EXISTS patch_owner_fk_restrict(regclass, text);
