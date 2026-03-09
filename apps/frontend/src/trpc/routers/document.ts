import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const documentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        parentId: z.string().optional().nullable(),
        isArchived: z.boolean().optional().default(false),
        isTemplate: z.boolean().optional(),
        query: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = {
        isArchived: input.isArchived,
      };

      // Filter by workspace
      if (input.workspaceId) {
        where.workspaceId = input.workspaceId;
      }

      // Filter by parent (for nested documents)
      if (input.parentId !== undefined) {
        where.parentId = input.parentId;
      }

      // Filter templates
      if (input.isTemplate !== undefined) {
        where.isTemplate = input.isTemplate;
      }

      // Filter by creator or collaborator
      where.OR = [
        { createdBy: userId },
        { collaborators: { some: { userId } } },
      ];

      // Search query
      if (input.query) {
        where.AND = [
          {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { content: { contains: input.query, mode: "insensitive" } },
            ],
          },
        ];
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.document.count({ where }),
        prisma.document.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            collaborators: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
            children: {
              select: {
                id: true,
                title: true,
                icon: true,
              },
            },
          },
          orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
          skip,
          take,
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const document = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          children: {
            where: { isArchived: false },
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              icon: true,
              position: true,
            },
          },
          parent: {
            select: {
              id: true,
              title: true,
              icon: true,
            },
          },
          versions: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              version: true,
              createdAt: true,
              creator: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      return document;
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        title: z.string().min(1, "Title is required"),
        content: z.string().optional().default(""),
        parentId: z.string().optional().nullable(),
        icon: z.string().optional(),
        coverImage: z.string().optional(),
        isTemplate: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Get the max position for siblings
      const maxPosition = await prisma.document.aggregate({
        where: {
          workspaceId: input.workspaceId,
          parentId: input.parentId ?? null,
        },
        _max: { position: true },
      });

      const document = await prisma.document.create({
        data: {
          workspaceId: input.workspaceId,
          createdBy: userId,
          title: input.title,
          content: input.content,
          parentId: input.parentId,
          icon: input.icon,
          coverImage: input.coverImage,
          isTemplate: input.isTemplate,
          position: (maxPosition._max.position ?? 0) + 1,
          version: 1,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      // Create initial version
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          createdBy: userId,
          version: 1,
          title: document.title,
          content: document.content,
        },
      });

      return document;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        icon: z.string().optional().nullable(),
        coverImage: z.string().optional().nullable(),
        isPublished: z.boolean().optional(),
        parentId: z.string().optional().nullable(),
        createVersion: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const existing = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: {
                  userId,
                  permission: { in: ["EDIT", "ADMIN"] },
                },
              },
            },
          ],
        },
      });

      if (!existing) {
        throw new Error("Document not found or insufficient permissions");
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.coverImage !== undefined) updateData.coverImage = input.coverImage;
      if (input.isPublished !== undefined) {
        updateData.isPublished = input.isPublished;
        if (input.isPublished) {
          updateData.publishedAt = new Date();
        }
      }
      if (input.parentId !== undefined) updateData.parentId = input.parentId;

      // Create version if requested
      if (input.createVersion) {
        const newVersion = existing.version + 1;
        updateData.version = newVersion;

        await prisma.documentVersion.create({
          data: {
            documentId: input.id,
            createdBy: userId,
            version: newVersion,
            title: input.title ?? existing.title,
            content: input.content ?? existing.content,
          },
        });
      }

      const updated = await prisma.document.update({
        where: { id: input.id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check if user is the creator
      const document = await prisma.document.findFirst({
        where: {
          id: input.id,
          createdBy: userId,
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      await prisma.document.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string(), isArchived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const document = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: {
                  userId,
                  permission: "ADMIN",
                },
              },
            },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      const updated = await prisma.document.update({
        where: { id: input.id },
        data: { isArchived: input.isArchived },
      });

      return updated;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        position: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const document = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: {
                  userId,
                  permission: { in: ["EDIT", "ADMIN"] },
                },
              },
            },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      const updated = await prisma.document.update({
        where: { id: input.id },
        data: { position: input.position },
      });

      return updated;
    }),

  addCollaborator: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        userId: z.string(),
        permission: z.enum(["VIEW", "COMMENT", "EDIT", "ADMIN"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check if current user is admin
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: {
                  userId,
                  permission: "ADMIN",
                },
              },
            },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      const collaborator = await prisma.documentCollaborator.upsert({
        where: {
          documentId_userId: {
            documentId: input.documentId,
            userId: input.userId,
          },
        },
        create: {
          documentId: input.documentId,
          userId: input.userId,
          permission: input.permission,
        },
        update: {
          permission: input.permission,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      return collaborator;
    }),

  removeCollaborator: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check if current user is admin
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: {
                  userId,
                  permission: "ADMIN",
                },
              },
            },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      await prisma.documentCollaborator.delete({
        where: {
          documentId_userId: {
            documentId: input.documentId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),

  getVersions: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check access
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or access denied");
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, versions] = await Promise.all([
        prisma.documentVersion.count({ where: { documentId: input.documentId } }),
        prisma.documentVersion.findMany({
          where: { documentId: input.documentId },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { version: "desc" },
          skip,
          take,
        }),
      ]);

      return { versions, total, page: input.page, pageSize: input.pageSize };
    }),

  restoreVersion: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        versionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          OR: [
            { createdBy: userId },
            {
              collaborators: {
                some: {
                  userId,
                  permission: { in: ["EDIT", "ADMIN"] },
                },
              },
            },
          ],
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      const version = await prisma.documentVersion.findUnique({
        where: { id: input.versionId },
      });

      if (!version || version.documentId !== input.documentId) {
        throw new Error("Version not found");
      }

      // Create new version with current content before restoring
      const newVersion = document.version + 1;
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          createdBy: userId,
          version: newVersion,
          title: version.title,
          content: version.content,
        },
      });

      // Update document with version content
      const updated = await prisma.document.update({
        where: { id: input.documentId },
        data: {
          title: version.title,
          content: version.content,
          version: newVersion,
        },
      });

      return updated;
    }),
});
