import { z } from "zod";

export const projectSchema = z
  .object({
    // Basic Info
    name: z
      .string()
      .min(1, "Project name is required")
      .max(100, "Name must be less than 100 characters"),
    description: z.string().min(1, "Description is required"),
    tagline: z
      .string()
      .max(150, "Tagline must be less than 150 characters")
      .optional(),
    logo: z
      .any()
      .optional()
      .refine(
        (file?: File | null) =>
          !file ||
          (file instanceof File &&
            typeof file.type === "string" &&
            file.type.startsWith("image/")),
        { message: "Logo must be an image" }
      )
      .refine((file?: File | null) => !file || file.size <= 5 * 1024 * 1024, {
        message: "Logo must be less than 5MB",
      }),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),

    // Project Details
    stage: z.enum([
      "IDEA",
      "MVP",
      "BETA",
      "LAUNCHED",
      "GROWTH",
      "SCALE",
      "EXIT",
    ]),
    industry: z.array(z.string()).min(1, "At least one industry must be selected"),
    tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),

    // Business Model
    revenueModel: z.array(z.string()).optional(),
    targetMarket: z.string().min(1, "Target market description is required"),
    competitiveEdge: z.string().optional(),

    // Funding Info
    fundingGoal: z.number().min(0, "Funding goal must be positive").optional(),
    fundingRaised: z.number().min(0, "Funding raised must be positive").optional(),
    valuationCap: z.number().min(0, "Valuation cap must be positive").optional(),

    // Team & Hiring
    teamSize: z
      .number()
      .int()
      .min(1, "Team size must be at least 1")
      .max(1000, "Team size cannot exceed 1000"),
    isHiring: z.boolean().default(false),

    // Location & Remote
    location: z.string().optional(),
    isRemoteFriendly: z.boolean().default(true),

    // Project Status
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(true),
    launchedAt: z
      .string()
      .optional()
      .refine((date) => !date || !isNaN(Date.parse(date)), {
        message: "Invalid launch date",
      }),
  })
  .refine(
    (data) => {
      if (
        data.fundingGoal &&
        data.fundingRaised &&
        data.fundingRaised > data.fundingGoal
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Funding raised cannot exceed funding goal",
      path: ["fundingRaised"],
    }
  );
