import { z } from "zod";

export const materialFormSchema = z.object({
	id: z.string().optional(),
	title: z
		.string({ message: "Material title is required" })
		.min(3, "Material title must be at least 3 characters"),
	description: z.string().max(2000, "Description should be shorter than 2000 characters").optional().nullable(),
	category: z
		.string({ message: "Category is required" })
		.min(2, "Category must be at least 2 characters")
		.max(80, "Category name must be shorter than 80 characters"),
	priceUsd: z.number().min(0, "Price cannot be negative").default(0),
	fileUrl: z.string().url("Provide a valid URL").optional().nullable(),
	externalUrl: z.string().url("Provide a valid URL").optional().nullable(),
	isPublic: z.boolean().default(true),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;




