import { z } from "zod";

export const documentFormSchema = z.object({
	id: z.string().optional(),
	workspaceId: z.string({ message: "Workspace is required" }),
	title: z
		.string({ message: "Document title is required" })
		.min(1, "Document title cannot be empty")
		.max(255, "Document title must be shorter than 255 characters"),
	description: z.string().max(500, "Description must be shorter than 500 characters").optional().nullable(),
	content: z.string().optional(),
	parentId: z.string().optional().nullable(),
	icon: z.string().optional().nullable(),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;


