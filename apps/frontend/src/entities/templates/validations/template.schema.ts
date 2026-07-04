import { z } from "zod";

// ─── Save / Update template form ─────────────────────────────────────────────

export const saveTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(150),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional().default([]),
  category: z.string().optional(),
  complexity: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  entityType: z.enum([
    "SPACE", "FOLDER", "LIST", "TASK", "DOC", "VIEW", "AGENT", "WORKFORCE", "PROPOSAL",
  ]),
  shareWith: z.enum(["everyone", "members", "admins", "me", "custom"]).default("me"),
  publicSharing: z.boolean().default(false),
  /** "everything" = include all, "customize" = use captureConfig */
  importMode: z.enum(["everything", "customize"]).default("everything"),
  /** Flexible JSON bag; structure depends on entityType. */
  captureConfig: z.record(z.string(), z.unknown()).optional(),
  /** The actual snapshot data content */
  content: z.record(z.string(), z.unknown()).optional().default({}),
  /** Custom invitees when shareWith === "custom" */
  shares: z.array(z.object({
    type: z.enum(["user", "team", "workspace"]),
    id: z.string(),
  })).optional().default([]),
});

export type SaveTemplateFormValues = z.infer<typeof saveTemplateSchema>;

// ─── Task capture config ─────────────────────────────────────────────────────

export const taskCaptureConfigSchema = z.object({
  dueDates:                z.boolean().default(true),
  assignees:               z.boolean().default(true),
  startDate:               z.boolean().default(true),
  attachments:             z.boolean().default(true),
  followers:               z.boolean().default(true),
  comments:                z.boolean().default(true),
  commentAttachments:      z.boolean().default(true),
  currentTaskStatuses:     z.boolean().default(true),
  recurringSettings:       z.boolean().default(true),
  dependencies:            z.boolean().default(true),
  tags:                    z.boolean().default(true),
  description:             z.boolean().default(true),
  priority:                z.boolean().default(true),
  copySettingsForStatuses: z.boolean().default(true),
  customFields:            z.boolean().default(true),
  timeEstimate:            z.boolean().default(true),
  subtasks:                z.boolean().default(true),
  checklists:              z.boolean().default(true),
  keepCheckedItems:        z.boolean().default(false),
  taskTypes:               z.boolean().default(true),
  relationships:           z.boolean().default(true),
  duration:                z.boolean().default(true),
  links:                   z.boolean().default(true),
});

export type TaskCaptureConfig = z.infer<typeof taskCaptureConfigSchema>;

// ─── Container (Space / Folder / List) capture config ────────────────────────

export const containerCaptureConfigSchema = z.object({
  automations: z.boolean().default(true),
  views:       z.boolean().default(true),
  tasks:       z.boolean().default(true),
  /** Nested task props – only meaningful when tasks = true. */
  taskConfig:  taskCaptureConfigSchema.optional(),
});

export type ContainerCaptureConfig = z.infer<typeof containerCaptureConfigSchema>;
