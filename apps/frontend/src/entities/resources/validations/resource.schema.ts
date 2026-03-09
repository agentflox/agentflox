import { z } from "zod";

export const resourceFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().max(5000).optional().nullable(),
  content: z.any().optional(),
  category: z.string().optional(),
  priceUsd: z.number().min(0).default(0),
  isPublic: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  workspaceId: z.string().optional(),
  spaceId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number(),
        mimeType: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export const resourceFilterSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]).optional(),
  scope: z.enum(["owned", "public", "all"]).default("all"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});




