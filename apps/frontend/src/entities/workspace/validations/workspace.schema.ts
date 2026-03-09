import { z } from "zod";

export const workspaceFormSchema = z.object({
	id: z.string().optional(),
	name: z
		.string({ message: "Workspace name is required" })
		.min(2, "Workspace name must be at least 2 characters")
		.max(120, "Workspace name must be less than 120 characters"),
	description: z
		.string()
		.max(500, "Description must be shorter than 500 characters")
		.optional()
		.nullable(),
	isActive: z.boolean().optional(),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;



