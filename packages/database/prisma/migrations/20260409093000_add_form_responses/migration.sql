-- CreateTable
CREATE TABLE "form_responses" (
    "id" TEXT NOT NULL,
    "view_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "values" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_responses_view_id_submitted_at_idx" ON "form_responses"("view_id", "submitted_at");

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "views"("id") ON DELETE CASCADE ON UPDATE CASCADE;
