import { z } from "zod";

export const spaceFormSchema = z.object({
	id: z.string().optional(),
	workspaceId: z.string({ message: "Workspace is required" }),
	name: z
		.string({ message: "Space name is required" })
		.min(2, "Space name must be at least 2 characters")
		.max(140, "Space name must be shorter than 140 characters"),
	description: z.string().max(500, "Description must be shorter than 500 characters").optional().nullable(),
	isActive: z.boolean().optional(),
});

export type SpaceFormValues = z.infer<typeof spaceFormSchema>;


