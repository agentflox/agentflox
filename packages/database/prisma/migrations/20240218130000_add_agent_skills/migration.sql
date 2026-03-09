-- Migration: 20240218130000_add_agent_skills
-- Generated from schema.prisma
-- Mark as --applied if tables already exist in DB

-- ============================================================
-- 1. Create agent_skills  (maps to AgentSkill model)
-- ============================================================
CREATE TABLE "agent_skills" (
    "id"           TEXT        NOT NULL,
    "name"         TEXT        NOT NULL,
    "display_name" TEXT        NOT NULL,
    "description"  TEXT,
    "category"     TEXT        NOT NULL,
    "icon"         TEXT,
    "is_active"    BOOLEAN     NOT NULL DEFAULT true,
    "is_built_in"  BOOLEAN     NOT NULL DEFAULT false,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "agent_skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_skills_name_key"        ON "agent_skills" ("name");
CREATE INDEX        "agent_skills_category_idx"    ON "agent_skills" ("category");
CREATE INDEX        "agent_skills_is_active_idx"   ON "agent_skills" ("is_active");
CREATE INDEX        "agent_skills_is_built_in_idx" ON "agent_skills" ("is_built_in");

-- ============================================================
-- 2. Create skill_to_tools  (maps to SkillToTool model)
--    References system_tools — must exist before agent_to_skills
-- ============================================================
CREATE TABLE "skill_to_tools" (
    "id"         TEXT    NOT NULL,
    "skill_id"   TEXT    NOT NULL,
    "tool_id"    TEXT    NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skill_to_tools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_to_tools_skill_id_tool_id_key" ON "skill_to_tools" ("skill_id", "tool_id");
CREATE INDEX        "skill_to_tools_skill_id_idx"         ON "skill_to_tools" ("skill_id");
CREATE INDEX        "skill_to_tools_tool_id_idx"          ON "skill_to_tools" ("tool_id");

ALTER TABLE "skill_to_tools"
    ADD CONSTRAINT "skill_to_tools_skill_id_fkey"
        FOREIGN KEY ("skill_id") REFERENCES "agent_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skill_to_tools"
    ADD CONSTRAINT "skill_to_tools_tool_id_fkey"
        FOREIGN KEY ("tool_id") REFERENCES "system_tools" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 3. Create agent_to_skills  (maps to AgentToSkill model)
--    References ai_agents(id) UUID
-- ============================================================
CREATE TABLE "agent_to_skills" (
    "id"         TEXT        NOT NULL,
    "agent_id"   UUID        NOT NULL,
    "skill_id"   TEXT        NOT NULL,
    "is_enabled" BOOLEAN     NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "agent_to_skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_to_skills_agent_id_skill_id_key" ON "agent_to_skills" ("agent_id", "skill_id");
CREATE INDEX        "agent_to_skills_agent_id_idx"          ON "agent_to_skills" ("agent_id");
CREATE INDEX        "agent_to_skills_skill_id_idx"          ON "agent_to_skills" ("skill_id");
CREATE INDEX        "agent_to_skills_is_enabled_idx"        ON "agent_to_skills" ("is_enabled");

ALTER TABLE "agent_to_skills"
    ADD CONSTRAINT "agent_to_skills_agent_id_fkey"
        FOREIGN KEY ("agent_id") REFERENCES "ai_agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_to_skills"
    ADD CONSTRAINT "agent_to_skills_skill_id_fkey"
        FOREIGN KEY ("skill_id") REFERENCES "agent_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 4. folders.workspace_id -> Nullable
-- ============================================================
ALTER TABLE "folders" ALTER COLUMN "workspace_id" DROP NOT NULL;

-- ============================================================
-- 5. lists.workspace_id -> Nullable
-- ============================================================
ALTER TABLE "lists" ALTER COLUMN "workspace_id" DROP NOT NULL;

-- ============================================================
-- 6. tasks table changes
-- ============================================================
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_workspace_id_fkey";
DROP INDEX IF EXISTS "tasks_parent_id_position_idx";

ALTER TABLE "tasks" ALTER COLUMN "workspace_id" DROP NOT NULL;

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_workspace_id_fkey"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tasks_parent_id_order_idx" ON "tasks" ("parent_id", "order");