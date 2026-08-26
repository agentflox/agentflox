import { z } from 'zod';

/**
 * Zod schema for a workflow step within an Agent Skill
 */
export const SkillWorkflowStepSchema = z.object({
  step: z.union([z.number(), z.string()]),
  title: z.string(),
  description: z.string().optional(),
  guidelines: z.array(z.string()).optional(),
  template: z.string().optional(),
});

export type SkillWorkflowStep = z.infer<typeof SkillWorkflowStepSchema>;

/**
 * Reference Schema defining the structured content of an AI Skill (shared across Agents & AI Chat)
 * Accommodates purpose, multi-step workflows, safety constraints, templates, and trigger examples.
 */
export const AiSkillContentSchema = z.object({
  /** High-level goal / purpose of the skill */
  purpose: z.string().min(1),

  /** Step-by-step workflow or instructions */
  workflow: z.union([
    z.array(SkillWorkflowStepSchema),
    z.string(),
    z.record(z.string(), z.any()),
  ]).optional(),

  /** Safety constraints, execution guards, and side-effect policies */
  safetyAndSideEffects: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.string(), z.any()),
  ]).optional(),

  /** Formatted markdown or structure for final response/output */
  outputTemplate: z.string().optional(),

  /** Example user prompts or phrasing that should trigger this skill */
  triggerExamples: z.array(z.string()).optional(),

  /** Input parameters or variables configuration schema */
  parameters: z.record(z.string(), z.any()).optional(),

  /** Additional metadata or custom flags */
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AiSkillContent = z.infer<typeof AiSkillContentSchema>;

// Aliases for backward compatibility
export const AgentSkillContentSchema = AiSkillContentSchema;
export type AgentSkillContent = AiSkillContent;

/**
 * Example Reference Skill definition (e.g., Task Standardization & Cleanup Skill)
 */
export const TASK_CLEANUP_SKILL_EXAMPLE: AgentSkillContent = {
  purpose: 'Turn vague or inconsistent ClickUp tasks into clear, actionable work without inventing missing details.',
  workflow: [
    {
      step: 1,
      title: 'Confirm the task context',
      description: 'Read the task title, description, status, assignee, due date, list, custom fields, comments, and subtasks when available. Preserve confirmed facts and flag gaps.',
    },
    {
      step: 2,
      title: 'Standardize the title',
      description: 'Use [Action] + [deliverable] + [context] when the context is known. Start with a specific verb such as Define, Fix, Review, Draft, Ship, Test, or Set up. Keep it short enough to scan. Do not add unsupported scope, dates, owners, or outcomes. If the task is a bug, use Fix [symptom] in [area]; if it is a decision, use Decide [choice] for [context].',
    },
    {
      step: 3,
      title: 'Set priority',
      description: 'Apply the highest priority supported by evidence:\n- Urgent: immediate impact, active incident, or time-critical deadline.\n- High: meaningful delivery, customer, revenue, compliance, or dependency impact, or a near deadline.\n- Normal: important planned work with no immediate risk.\n- Low: useful but deferrable work with limited impact.\nIf urgency or impact is unclear, leave priority unchanged and explain what is missing.',
    },
    {
      step: 4,
      title: 'Add or improve the Summary field',
      description: 'Write 1-2 sentences covering the purpose, expected result, and the most important known constraint. Use only confirmed information. If the Summary field exists, update it rather than creating a duplicate.',
    },
    {
      step: 5,
      title: 'Apply the reusable task template',
      description: 'When the task is missing structure, use this format in description:\nOutcome\n[What will be true when this is complete?]\nScope\n[What is included, and what is explicitly out of scope?]\nNext action\n[The smallest concrete next step]\nDependencies\n[People, decisions, systems, or inputs needed; write None identified if verified]\nDone criteria\n[Observable completion condition]\n[Validation or handoff condition]\n\nFill only what is known. Keep placeholders for unknowns rather than guessing.',
    },
    {
      step: 6,
      title: 'Report the result',
      description: 'Show the original and proposed title, priority decision, summary, and any template sections left open. Call out uncertainty and data gaps.',
    },
  ],
  safetyAndSideEffects: 'Default to a draft for multiple tasks or whenever the user says "draft" or "test." Do not modify tasks, create templates, or post messages until the user explicitly asks to apply the changes. For a single task with a direct apply request, make only evidence-backed edits and preserve existing information.',
  outputTemplate: `Task: [linked task name]

Title: [original] → [proposed]

Priority: [keep / change to Urgent, High, Normal, or Low] with one-line rationale.

Summary: [proposed summary]

Reusable structure:
[Outcome, Scope, Next action, Dependencies, Done criteria]

Open gaps: [unknowns that need confirmation]`,
  triggerExamples: [
    'Clean up this task.',
    'Triage these rough tasks.',
    'Standardize the titles and priorities.',
    'Add summaries and use the task template.',
    'Test the cleanup skill on these tasks.',
  ],
};
