import { z } from 'zod';

export const teamSchema = z.object({
  // Basic Info
  name: z.string().min(1, 'Team name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required'),
  avatar: z
    .any()
    .refine((file?: File) => !file || file instanceof File, { message: 'Invalid file type' })
    .refine((file?: File) => !file || file.size <= 3 * 1024 * 1024, { message: 'Avatar must be less than 3MB' })
    .refine((file?: File) => !file || file.type.startsWith('image/'), { message: 'Avatar must be an image' })
    .optional(),

  // Team Details
  teamType: z.enum(['DEVELOPMENT', 'MARKETING', 'SALES', 'DESIGN', 'ADVISORY', 'GENERAL']),
  industry: z.array(z.string()).optional(),
  skills: z.array(z.string()).max(15, 'Maximum 15 skills allowed').optional(),

  // Team Status
  isActive: z.boolean().default(true),
  isHiring: z.boolean().default(false),
  size: z.number().int().min(1, 'Team size must be at least 1').max(100, 'Team size cannot exceed 100'),
  maxSize: z.number().int().min(1, 'Maximum size must be at least 1').max(500, 'Maximum size cannot exceed 500').optional(),

  // Location
  location: z.string().optional(),
  isRemote: z.boolean().default(true),
}).refine((data) => {
  // Custom validation: current size cannot exceed maximum size
  if (data.maxSize && data.size > data.maxSize) {
    return false;
  }
  return true;
}, {
  message: 'Current team size cannot exceed maximum team size',
  path: ['size']
});
