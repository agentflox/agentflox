import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const skillRouter = router({
  /**
   * List all skills with filtering, search, pagination, and ownership scopes
   */
  list: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        scope: z.enum(["all", "builtIn", "owned", "custom"]).optional().default("all"),
        status: z.string().optional(),
        visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional(),
        isActive: z.boolean().optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(12),
        sortBy: z.enum(["updatedAt", "name", "displayName", "createdAt"]).optional().default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      const where: any = {
        deletedAt: null,
      };

      // Handle ownership and builtin visibility scopes
      if (input.scope === "builtIn") {
        where.isBuiltIn = true;
      } else if (input.scope === "owned" || input.scope === "custom") {
        where.ownerId = userId;
        where.isBuiltIn = false;
      } else {
        // scope === 'all': show system/builtin skills to all users, plus user-owned or public skills
        if (userId) {
          where.OR = [
            { isBuiltIn: true },
            { ownerId: userId },
            { visibility: "PUBLIC" },
            { isShared: true },
          ];
        } else {
          where.OR = [
            { isBuiltIn: true },
            { visibility: "PUBLIC" },
          ];
        }
      }

      if (input.category && input.category !== "all") {
        where.category = input.category;
      }

      if (input.status && input.status !== "all") {
        where.status = input.status;
      }

      if (input.visibility) {
        where.visibility = input.visibility;
      }

      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input.query) {
        const q = input.query.trim();
        const searchFilters = [
          { name: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ];

        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: searchFilters },
          ];
          delete where.OR;
        } else {
          where.OR = searchFilters;
        }
      }

      const orderBy: any = {};
      orderBy[input.sortBy] = input.sortOrder;

      const [total, items, stats] = await Promise.all([
        prisma.aiSkill.count({ where }),
        prisma.aiSkill.findMany({
          where,
          orderBy,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
                avatar: true,
                email: true,
              },
            },
            _count: {
              select: {
                agentSkills: true,
                conversationSkills: true,
              },
            },
          },
        }),
        // Aggregate scope counts for UI filter badges
        Promise.all([
          prisma.aiSkill.count({ where: { deletedAt: null, isBuiltIn: true } }),
          userId
            ? prisma.aiSkill.count({ where: { deletedAt: null, ownerId: userId, isBuiltIn: false } })
            : Promise.resolve(0),
        ]),
      ]);

      const [builtInCount, ownedCount] = stats;
      const totalPages = Math.ceil(total / input.pageSize);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages,
        builtInCount,
        ownedCount,
      };
    }),

  /**
   * Get single skill by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      const skill = await prisma.aiSkill.findFirst({
        where: {
          id: input.id,
          deletedAt: null,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
              avatar: true,
              email: true,
            },
          },
          agentSkills: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            take: 10,
          },
          _count: {
            select: {
              agentSkills: true,
              conversationSkills: true,
            },
          },
        },
      });

      if (!skill) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AI Skill not found",
        });
      }

      // Check permission if skill is private and owned by someone else
      if (!skill.isBuiltIn && skill.ownerId !== userId && skill.visibility === "PRIVATE" && !skill.isShared) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this skill",
        });
      }

      return skill;
    }),

  /**
   * Get single skill by Name
   */
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const skill = await prisma.aiSkill.findFirst({
        where: {
          name: input.name,
          deletedAt: null,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              agentSkills: true,
              conversationSkills: true,
            },
          },
        },
      });

      return skill;
    }),

  /**
   * Create custom AI Skill
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        displayName: z.string().min(2).max(100),
        description: z.string().optional(),
        category: z.string().optional().default("custom"),
        avatar: z.string().optional(),
        icon: z.string().optional().default("⚡"),
        color: z.string().optional().default("#6366f1"),
        version: z.string().optional().default("1.0.0"),
        schema: z.record(z.string(), z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
        tags: z.array(z.string()).optional().default([]),
        isActive: z.boolean().optional().default(true),
        isPaused: z.boolean().optional().default(false),
        isShared: z.boolean().optional().default(false),
        status: z.string().optional().default("ACTIVE"),
        visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional().default("PRIVATE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Generate a normalized unique name/slug
      const baseName = input.name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      let uniqueName = baseName;
      let counter = 1;

      while (await prisma.aiSkill.findUnique({ where: { name: uniqueName } })) {
        uniqueName = `${baseName}_${counter}`;
        counter++;
      }

      const created = await prisma.aiSkill.create({
        data: {
          name: uniqueName,
          displayName: input.displayName,
          description: input.description,
          category: input.category,
          avatar: input.avatar,
          icon: input.icon,
          color: input.color,
          version: input.version,
          ownerId: userId,
          schema: input.schema as any,
          metadata: input.metadata as any,
          tags: input.tags,
          isActive: input.isActive,
          isPaused: input.isPaused,
          isShared: input.isShared,
          isBuiltIn: false,
          status: input.status,
          visibility: input.visibility,
        },
      });

      return created;
    }),

  /**
   * Update AI Skill
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().min(2).max(100).optional(),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        avatar: z.string().optional().nullable(),
        icon: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
        version: z.string().optional(),
        schema: z.record(z.string(), z.any()).optional().nullable(),
        metadata: z.record(z.string(), z.any()).optional().nullable(),
        tags: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        isPaused: z.boolean().optional(),
        isShared: z.boolean().optional(),
        status: z.string().optional(),
        visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const { id, ...data } = input;

      const skill = await prisma.aiSkill.findUnique({
        where: { id },
      });

      if (!skill) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      if (skill.isBuiltIn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Built-in system skills cannot be edited directly. Please duplicate to customize.",
        });
      }

      if (skill.ownerId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own skills." });
      }

      const updated = await prisma.aiSkill.update({
        where: { id },
        data: {
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.version !== undefined && { version: data.version }),
          ...(data.schema !== undefined && { schema: data.schema as any }),
          ...(data.metadata !== undefined && { metadata: data.metadata as any }),
          ...(data.tags !== undefined && { tags: data.tags }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isPaused !== undefined && { isPaused: data.isPaused }),
          ...(data.isShared !== undefined && { isShared: data.isShared }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.visibility !== undefined && { visibility: data.visibility }),
        },
      });

      return updated;
    }),

  /**
   * Soft delete AI Skill
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      const skill = await prisma.aiSkill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      if (skill.isBuiltIn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Built-in system skills cannot be deleted.",
        });
      }

      if (skill.ownerId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own skills." });
      }

      await prisma.aiSkill.update({
        where: { id: input.id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
          isActive: false,
        },
      });

      return { success: true };
    }),

  /**
   * Duplicate a skill (creates a custom copy for current user)
   */
  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().optional(),
        newDisplayName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const sourceSkill = await prisma.aiSkill.findUnique({
        where: { id: input.id },
      });

      if (!sourceSkill) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source skill not found" });
      }

      const baseName = input.newName || `${sourceSkill.name}_copy`;
      let uniqueName = baseName;
      let counter = 1;

      while (await prisma.aiSkill.findUnique({ where: { name: uniqueName } })) {
        uniqueName = `${baseName}_${counter}`;
        counter++;
      }

      const duplicated = await prisma.aiSkill.create({
        data: {
          name: uniqueName,
          displayName: input.newDisplayName || `${sourceSkill.displayName} (Copy)`,
          description: sourceSkill.description,
          category: sourceSkill.category,
          avatar: sourceSkill.avatar,
          icon: sourceSkill.icon,
          color: sourceSkill.color,
          version: "1.0.0",
          ownerId: userId,
          schema: sourceSkill.schema as any,
          metadata: sourceSkill.metadata as any,
          tags: [...sourceSkill.tags],
          isActive: true,
          isPaused: false,
          isShared: false,
          isBuiltIn: false,
          status: "ACTIVE",
          visibility: "PRIVATE",
        },
      });

      return duplicated;
    }),

  /**
   * Toggle skill active status
   */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      const skill = await prisma.aiSkill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }

      if (skill.isBuiltIn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Built-in system skills cannot be disabled directly.",
        });
      }

      if (skill.ownerId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only update your own skills." });
      }

      return prisma.aiSkill.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  /**
   * Get unique categories with counts
   */
  categories: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;

    const skills = await prisma.aiSkill.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isBuiltIn: true },
          ...(userId ? [{ ownerId: userId }] : []),
          { visibility: "PUBLIC" },
        ],
      },
      select: {
        category: true,
        isBuiltIn: true,
      },
    });

    const categoryMap: Record<string, { count: number; builtIn: number; custom: number }> = {};

    for (const s of skills) {
      const cat = s.category || "uncategorized";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, builtIn: 0, custom: 0 };
      }
      categoryMap[cat].count++;
      if (s.isBuiltIn) {
        categoryMap[cat].builtIn++;
      } else {
        categoryMap[cat].custom++;
      }
    }

    return Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      ...stats,
    }));
  }),

  /**
   * Get overall skills statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;

    const [totalActive, builtInTotal, ownedTotal, categories] = await Promise.all([
      prisma.aiSkill.count({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { isBuiltIn: true },
            ...(userId ? [{ ownerId: userId }] : []),
            { visibility: "PUBLIC" },
          ],
        },
      }),
      prisma.aiSkill.count({
        where: { deletedAt: null, isBuiltIn: true },
      }),
      userId
        ? prisma.aiSkill.count({
            where: { deletedAt: null, ownerId: userId, isBuiltIn: false },
          })
        : Promise.resolve(0),
      prisma.aiSkill.groupBy({
        by: ["category"],
        where: {
          deletedAt: null,
          OR: [
            { isBuiltIn: true },
            ...(userId ? [{ ownerId: userId }] : []),
          ],
        },
      }),
    ]);

    return {
      total: builtInTotal + ownedTotal,
      active: totalActive,
      builtIn: builtInTotal,
      owned: ownedTotal,
      categoriesCount: categories.length,
    };
  }),
});
