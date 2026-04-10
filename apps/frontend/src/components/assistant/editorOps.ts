import { z } from "zod";

export const StepTypeSchema = z.enum(["LLM", "API", "SYSTEM_TOOL"]);

export const ToolOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("addStep"),
    afterStepId: z.string().nullable().optional(),
    step: z.object({
      id: z.string().optional(),
      name: z.string(),
      type: StepTypeSchema,
      varName: z.string().optional(),
      config: z.unknown().optional(),
    }),
  }),
  z.object({
    op: z.literal("deleteStep"),
    stepId: z.string(),
  }),
  z.object({
    op: z.literal("updateStep"),
    stepId: z.string(),
    patch: z.object({
      name: z.string().optional(),
      type: StepTypeSchema.optional(),
      varName: z.string().optional(),
      config: z.unknown().optional(),
    }),
  }),
  z.object({
    op: z.literal("moveStep"),
    stepId: z.string(),
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    op: z.literal("replaceStep"),
    stepId: z.string(),
    replacement: z.object({
      name: z.string(),
      type: StepTypeSchema,
      config: z.unknown().optional(),
    }),
  }),
  z.object({
    op: z.literal("updateToolMeta"),
    patch: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    }),
  }),
]);

export const WorkforceOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("addNode"),
    node: z.object({
      id: z.string().optional(),
      type: z.string(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      data: z.record(z.unknown()).default({}),
    }),
  }),
  z.object({
    op: z.literal("deleteNode"),
    nodeId: z.string(),
  }),
  z.object({
    op: z.literal("updateNodeData"),
    nodeId: z.string(),
    patch: z.record(z.unknown()),
  }),
  z.object({
    op: z.literal("addEdge"),
    edge: z.object({
      id: z.string().optional(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
      type: z.string().optional(),
      data: z.record(z.unknown()).optional(),
    }),
  }),
  z.object({
    op: z.literal("deleteEdge"),
    edgeId: z.string(),
  }),
  z.object({
    op: z.literal("updateEdgeData"),
    edgeId: z.string(),
    patch: z.record(z.unknown()),
  }),
  z.object({
    op: z.literal("replaceNode"),
    nodeId: z.string(),
    replacement: z.object({
      type: z.string(),
      data: z.record(z.unknown()).default({}),
    }),
  }),
  z.object({
    op: z.literal("updateWorkforceMeta"),
    patch: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
    }),
  }),
]);

export const EditorAssistantResponseSchema = z.object({
  assistantText: z.string(),
  proposedOps: z.array(z.union([ToolOpSchema, WorkforceOpSchema])).default([]),
});

export type ToolOp = z.infer<typeof ToolOpSchema>;
export type WorkforceOp = z.infer<typeof WorkforceOpSchema>;
export type EditorAssistantResponse = z.infer<typeof EditorAssistantResponseSchema>;

