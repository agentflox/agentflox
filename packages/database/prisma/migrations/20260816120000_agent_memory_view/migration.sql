-- AlterTable
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "memory_view_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_agents_memory_view_id_idx" ON "ai_agents"("memory_view_id");

-- One AGENT_MEMORY relationship per agent (partial unique)
-- Note: DocumentRelationship.targetType has no @map, so the DB column is "targetType" (camelCase).
-- targetId is mapped to "target_id".
CREATE UNIQUE INDEX IF NOT EXISTS "document_relationships_agent_memory_unique"
  ON "document_relationships" ("targetType", "target_id")
  WHERE "targetType" = 'AGENT_MEMORY';
