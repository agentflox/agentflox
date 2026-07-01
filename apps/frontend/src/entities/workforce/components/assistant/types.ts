import { z } from "zod";

export const WorkforceOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("addNode"),
    node: z.object({
      id: z.string().optional(),
      type: z.string(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      data: z.record(z.string(), z.unknown()).default({}),
    }),
  }),
  z.object({
    op: z.literal("deleteNode"),
    nodeId: z.string(),
  }),
  z.object({
    op: z.literal("updateNodeData"),
    nodeId: z.string(),
    patch: z.record(z.string(), z.unknown()),
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
      data: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  z.object({
    op: z.literal("deleteEdge"),
    edgeId: z.string(),
  }),
  z.object({
    op: z.literal("updateEdgeData"),
    edgeId: z.string(),
    patch: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal("replaceNode"),
    nodeId: z.string(),
    replacement: z.object({
      type: z.string(),
      data: z.record(z.string(), z.unknown()).default({}),
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

export type WorkforceOp = z.infer<typeof WorkforceOpSchema>;

