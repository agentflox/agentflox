-- AlterTable
ALTER TABLE "custom_fields" ADD COLUMN     "folder_id" TEXT,
ADD COLUMN     "list_id" TEXT,
ADD COLUMN     "project_id" TEXT,
ADD COLUMN     "space_id" TEXT,
ADD COLUMN     "team_id" TEXT,
ALTER COLUMN "workspace_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "custom_fields_space_id_idx" ON "custom_fields"("space_id");

-- CreateIndex
CREATE INDEX "custom_fields_project_id_idx" ON "custom_fields"("project_id");

-- CreateIndex
CREATE INDEX "custom_fields_team_id_idx" ON "custom_fields"("team_id");

-- CreateIndex
CREATE INDEX "custom_fields_folder_id_idx" ON "custom_fields"("folder_id");

-- CreateIndex
CREATE INDEX "custom_fields_list_id_idx" ON "custom_fields"("list_id");

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
