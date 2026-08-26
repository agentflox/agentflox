import { z } from "zod";

export const skillWorkflowStepFormSchema = z.object({
  step: z.union([z.number(), z.string()]),
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional(),
});

export const skillFormSchema = z.object({
  displayName: z.string().min(2, "Skill name must be at least 2 characters").max(100),
  name: z
    .string()
    .min(2, "Identifier must be at least 2 characters")
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Identifier can only contain lowercase letters, numbers, and underscores"),
  description: z.string().max(500, "Description must be under 500 characters").optional().default(""),
  category: z.string().min(1, "Category is required").default("creative"),
  icon: z.string().optional().default("⚡"),
  color: z.string().optional().default("#6366f1"),
  version: z.string().default("1.0.0"),
  tags: z.array(z.string()).default([]),
  purpose: z.string().min(5, "Purpose description must be at least 5 characters"),
  workflow: z.array(skillWorkflowStepFormSchema).default([]),
  safetyAndSideEffects: z.string().optional().default(""),
  outputTemplate: z.string().optional().default(""),
  triggerExamples: z.array(z.string()).default([]),
  visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).default("PRIVATE"),
  isActive: z.boolean().default(true),
  status: z.string().default("ACTIVE"),
});

export type SkillFormData = z.infer<typeof skillFormSchema>;
