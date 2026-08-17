-- Add native automation trigger types from the When picker catalog.
DO $$ BEGIN
  ALTER TYPE "AutomationTriggerType" ADD VALUE 'TASK_OR_SUBTASK_UPDATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AutomationTriggerType" ADD VALUE 'DATE_CUSTOM_FIELD_ARRIVES';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AutomationTriggerType" ADD VALUE 'TASK_COMMENT_ADDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
