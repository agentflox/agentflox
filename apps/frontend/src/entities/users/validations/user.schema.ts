import { z } from "zod";

export const userUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscores only").optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional(),
  location: z.string().max(200).optional(),
  timezone: z.string().max(100).optional(),
}).strict();

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;


