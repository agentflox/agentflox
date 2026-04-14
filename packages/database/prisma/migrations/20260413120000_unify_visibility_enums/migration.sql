-- Unify TemplateVisibility / AgentVisibility / WorkforceVisibility into shared "Visibility"
-- and replace legacy Visibility values (OWNERS_ONLY, OWNERS_ADMINS) with PRIVATE / ADMINS / etc.
-- Safe to re-run only once; assumes prior schema used Postgres enums named above.

CREATE TYPE "Visibility_prisma" AS ENUM ('PRIVATE', 'ADMINS', 'MEMBERS', 'EVERYONE', 'PUBLIC');

-- Baseline migrations created `templates` without `visibility` (later added via drift / push).
-- Add it on the *old* `Visibility` enum so the conversion loop below can migrate it to `Visibility_prisma`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'templates'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE "templates" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE'::"Visibility";
  END IF;
END $$;

-- Template custom shares (no longer use location_permissions for templates)
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "share_user_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "share_team_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "templates" t
SET
  "share_user_ids" = COALESCE(sub.uids, ARRAY[]::TEXT[]),
  "share_team_ids" = COALESCE(sub.tids, ARRAY[]::TEXT[])
FROM (
  SELECT
    "location_id",
    array_agg(DISTINCT "user_id"::TEXT) FILTER (WHERE "user_id" IS NOT NULL) AS uids,
    array_agg(DISTINCT "team_id"::TEXT) FILTER (WHERE "team_id" IS NOT NULL) AS tids
  FROM "location_permissions"
  WHERE "location_type" = 'template'
  GROUP BY "location_id"
) sub
WHERE t."id" = sub."location_id";

DELETE FROM "location_permissions" WHERE "location_type" = 'template';

-- All columns still backed by the old "Visibility" enum
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_catalog.pg_type t ON c.udt_name = t.typname
    WHERE c.table_schema = 'public'
      AND c.column_name = 'visibility'
      AND t.typname = 'Visibility'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_schema, r.table_name, r.column_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE "Visibility_prisma" USING (
        CASE %I::text
          WHEN ''OWNERS_ONLY'' THEN ''PRIVATE''::"Visibility_prisma"
          WHEN ''OWNERS_ADMINS'' THEN ''ADMINS''::"Visibility_prisma"
          WHEN ''MEMBERS'' THEN ''MEMBERS''::"Visibility_prisma"
          WHEN ''PUBLIC'' THEN ''PUBLIC''::"Visibility_prisma"
          WHEN ''PRIVATE'' THEN ''PRIVATE''::"Visibility_prisma"
          WHEN ''ADMINS'' THEN ''ADMINS''::"Visibility_prisma"
          WHEN ''EVERYONE'' THEN ''EVERYONE''::"Visibility_prisma"
          ELSE ''PRIVATE''::"Visibility_prisma"
        END
      )',
      r.table_schema, r.table_name, r.column_name, r.column_name
    );
  END LOOP;
END $$;

-- templates.visibility may use TemplateVisibility (after migrate-visibility.js) or Visibility
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_catalog.pg_type t ON c.udt_name = t.typname
    WHERE c.table_schema = 'public'
      AND c.table_name = 'templates'
      AND c.column_name = 'visibility'
      AND t.typname = 'TemplateVisibility'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_schema, r.table_name, r.column_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE "Visibility_prisma" USING (
        CASE %I::text
          WHEN ''WORKSPACE'' THEN ''MEMBERS''::"Visibility_prisma"
          WHEN ''PUBLIC'' THEN ''PUBLIC''::"Visibility_prisma"
          WHEN ''PRIVATE'' THEN ''PRIVATE''::"Visibility_prisma"
          ELSE ''PRIVATE''::"Visibility_prisma"
        END
      )',
      r.table_schema, r.table_name, r.column_name, r.column_name
    );
  END LOOP;
END $$;

-- ai_agents may use AgentVisibility
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_catalog.pg_type t ON c.udt_name = t.typname
    WHERE c.table_schema = 'public'
      AND c.table_name = 'ai_agents'
      AND c.column_name = 'visibility'
      AND t.typname = 'AgentVisibility'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_schema, r.table_name, r.column_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE "Visibility_prisma" USING (
        CASE %I::text
          WHEN ''WORKSPACE'' THEN ''MEMBERS''::"Visibility_prisma"
          WHEN ''PUBLIC'' THEN ''PUBLIC''::"Visibility_prisma"
          WHEN ''PRIVATE'' THEN ''PRIVATE''::"Visibility_prisma"
          ELSE ''PRIVATE''::"Visibility_prisma"
        END
      )',
      r.table_schema, r.table_name, r.column_name, r.column_name
    );
  END LOOP;
END $$;

-- workforces (table may exist only after prior pushes)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_catalog.pg_type t ON c.udt_name = t.typname
    WHERE c.table_schema = 'public'
      AND c.table_name = 'workforces'
      AND c.column_name = 'visibility'
      AND t.typname = 'WorkforceVisibility'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_schema, r.table_name, r.column_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE "Visibility_prisma" USING (
        CASE %I::text
          WHEN ''WORKSPACE'' THEN ''MEMBERS''::"Visibility_prisma"
          WHEN ''PUBLIC'' THEN ''PUBLIC''::"Visibility_prisma"
          WHEN ''PRIVATE'' THEN ''PRIVATE''::"Visibility_prisma"
          ELSE ''PRIVATE''::"Visibility_prisma"
        END
      )',
      r.table_schema, r.table_name, r.column_name, r.column_name
    );
  END LOOP;
END $$;

DROP TYPE IF EXISTS "Visibility";

ALTER TYPE "Visibility_prisma" RENAME TO "Visibility";

DROP TYPE IF EXISTS "TemplateVisibility";
DROP TYPE IF EXISTS "AgentVisibility";
DROP TYPE IF EXISTS "WorkforceVisibility";

-- Restore defaults aligned with Prisma schema (only if column exists — shadow DB may omit drift-only columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'visibility') THEN
    ALTER TABLE "spaces" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'visibility') THEN
    ALTER TABLE "tasks" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'visibility') THEN
    ALTER TABLE "projects" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'visibility') THEN
    ALTER TABLE "teams" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'visibility') THEN
    ALTER TABLE "proposals" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'visibility') THEN
    ALTER TABLE "materials" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tools' AND column_name = 'visibility') THEN
    ALTER TABLE "tools" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'visibility') THEN
    ALTER TABLE "resources" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'visibility') THEN
    ALTER TABLE "templates" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE'::"Visibility";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_agents' AND column_name = 'visibility') THEN
    ALTER TABLE "ai_agents" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE'::"Visibility";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'views' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE "views" ALTER COLUMN "visibility" SET DEFAULT 'ADMINS'::"Visibility";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workforces' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE "workforces" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE'::"Visibility";
  END IF;
END $$;
