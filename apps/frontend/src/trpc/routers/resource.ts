import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const resourceRouter = router({
  // List resources with filtering and pagination
  list: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        isPublic: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]).optional(),
        scope: z.enum(["owned", "public", "all"]).default("owned"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = {};

      // Handle scope
      if (input.scope === "owned") {
        where.ownerId = userId;
      } else if (input.scope === "public") {
        where.isPublic = true;
      }

      // Apply filters
      if (input.query) {
        const q = input.query.trim();
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ];
      }

      if (input.category) where.category = input.category as any;
      if (typeof input.isPublic === "boolean") where.isPublic = input.isPublic;
      if (typeof input.isFeatured === "boolean") where.isFeatured = input.isFeatured;
      if (input.status) where.status = input.status;

      if (typeof input.minPrice === "number" || typeof input.maxPrice === "number") {
        where.priceUsd = {
          ...(typeof input.minPrice === "number" ? { gte: input.minPrice } : {}),
          ...(typeof input.maxPrice === "number" ? { lte: input.maxPrice } : {}),
        };
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.resource.count({ where }),
        prisma.resource.findMany({
          where,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take,
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  // Get a single resource by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      
      const resource = await prisma.resource.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
            { isPublic: true },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            },
            {
              space: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });

      if (!resource) {
        throw new Error("Resource not found or access denied");
      }

      return resource;
    }),

  // Create a new resource
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        content: z.any().optional(),
        category: z.string().optional(),
        priceUsd: z.number().min(0).default(0),
        isPublic: z.boolean().default(false),
        isFeatured: z.boolean().default(false),
        status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session!.user!.id;

      // Start a transaction to handle both resource and file creation
      return prisma.$transaction(async (tx) => {
        // Create the resource
        const resource = await tx.resource.create({
          data: {
            ownerId,
            title: input.title,
            description: input.description,
            content: input.content,
            category: (input.category as any) ?? undefined,
            priceUsd: input.priceUsd,
            isPublic: input.isPublic,
            isFeatured: input.isFeatured,
            status: input.status,
            workspaceId: input.workspaceId,
            spaceId: input.spaceId,
            publishedAt: input.status === "PUBLISHED" ? new Date() : null,
            fileUrl: input.files?.[0]?.url,
            fileName: input.files?.[0]?.name,
            fileSize: input.files?.[0]?.size,
            fileMimeType: input.files?.[0]?.mimeType,
            tags: input.tags ?? [],
          },
        });

        // Create initial version
        await tx.resourceVersion.create({
          data: {
            resourceId: resource.id,
            version: 1,
            title: input.title,
            content: input.content,
            changeLog: "Initial version",
            createdBy: ownerId,
          },
        });

        return resource;
      });
    }),

  // Update an existing resource
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        content: z.any().optional(),
        category: z.string().optional(),
        priceUsd: z.number().min(0).optional(),
        isPublic: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        changeLog: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, changeLog, ...updateData } = input;

      // Verify ownership or admin access
      const resource = await prisma.resource.findFirst({
        where: {
          id,
          ownerId: userId,
        },
      });

      if (!resource) {
        throw new Error("Resource not found or access denied");
      }

      // Start transaction
      return prisma.$transaction(async (tx) => {
        // Update the resource
        const updatedResource = await tx.resource.update({
          where: { id },
          data: {
            ...updateData,
            ...(updateData.status === "PUBLISHED" && !resource.publishedAt
              ? { publishedAt: new Date() }
              : {}),
          },
        });

        // Create a new version if content or title changed
        if (updateData.title || updateData.description || updateData.content) {
          // Get the latest version number
          const latestVersion = await tx.resourceVersion.findFirst({
            where: { resourceId: id },
            orderBy: { version: "desc" },
            select: { version: true },
          });

          const newVersion = (latestVersion?.version || 0) + 1;

          await tx.resourceVersion.create({
            data: {
              resourceId: id,
              version: newVersion,
              title: updateData.title || resource.title,
              content: updateData.content || resource.content,
              changeLog: changeLog || `Updated to version ${newVersion}`,
              createdBy: userId,
            },
          });
        }

        return updatedResource;
      });
    }),

  // Delete a resource (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Verify ownership or admin access
      const resource = await prisma.resource.findFirst({
        where: {
          id: input.id,
          ownerId: userId,
        },
      });

      if (!resource) {
        throw new Error("Resource not found or access denied");
      }

      // Soft delete by updating status
      return prisma.resource.update({
        where: { id: input.id },
        data: { status: "DELETED" },
      });
    }),

  // List all categories
  listCategories: protectedProcedure.query(async () => {
    return [
      { id: "LOCATION", name: "Location" },
      { id: "DOCUMENT", name: "Document" },
      { id: "TEMPLATE", name: "Template" },
      { id: "GUIDE", name: "Guide" },
      { id: "TUTORIAL", name: "Tutorial" },
      { id: "TOOL", name: "Tool" },
      { id: "ASSET", name: "Asset" },
      { id: "DATASET", name: "Dataset" },
      { id: "REFERENCE", name: "Reference" },
      { id: "OTHER", name: "Other" },
    ];
  }),


  // Get resource versions
  getVersions: protectedProcedure
    .input(z.object({ resourceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Verify access to the resource
      const resource = await prisma.resource.findFirst({
        where: {
          id: input.resourceId,
          OR: [
            { ownerId: userId },
            { isPublic: true },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            },
          ],
        },
      });

      if (!resource) {
        throw new Error("Resource not found or access denied");
      }

      return prisma.resourceVersion.findMany({
        where: { resourceId: input.resourceId },
        orderBy: { version: "desc" },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
    }),

  // Get a specific version of a resource
  getVersion: protectedProcedure
    .input(z.object({ resourceId: z.string(), version: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Verify access to the resource
      const resource = await prisma.resource.findFirst({
        where: {
          id: input.resourceId,
          OR: [
            { ownerId: userId },
            { isPublic: true },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            },
          ],
        },
      });

      if (!resource) {
        throw new Error("Resource not found or access denied");
      }

      return prisma.resourceVersion.findFirst({
        where: {
          resourceId: input.resourceId,
          version: input.version,
        },
      });
    }),
});
