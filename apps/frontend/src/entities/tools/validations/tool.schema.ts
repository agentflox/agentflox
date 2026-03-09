import { z } from "zod";

export const toolFormSchema = z.object({
	id: z.string().optional(),
	name: z
		.string({ message: "Tool name is required" })
		.min(2, "Tool name must be at least 2 characters")
		.max(160, "Tool name must be shorter than 160 characters"),
	description: z.string().max(2000, "Description should be shorter than 2000 characters").optional().nullable(),
	category: z
		.string({ message: "Category is required" })
		.min(2, "Category must be at least 2 characters")
		.max(80, "Category name must be shorter than 80 characters"),
	productUrl: z
		.string({ message: "Product URL is required" })
		.url("Provide a valid URL"),
	isPublic: z.boolean().default(true),
});

export type ToolFormValues = z.infer<typeof toolFormSchema>;



