import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { generateKeyBetween } from "fractional-indexing";
import { Prisma } from "@agentflox/database/src/generated/prisma";
import { isPreferencesMemoryDoc, mergeDocumentSettings } from "@/lib/agentMemory/memoryPolicy";

function assertNotPreferencesMemoryDoc(settings: unknown, action: string) {
  if (isPreferencesMemoryDoc(settings)) {
    throw new Error(`Cannot ${action} the Agent Preferences memory page`);
  }
}

// Recursively fetch document children up to `maxDepth` levels
async function fetchDocumentChildren(parentId: string, depth = 0, maxDepth = 5): Promise<any[]> {
  if (depth >= maxDepth) return [];
  const children = await prisma.document.findMany({
    where: { parentId, isArchived: false },
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      icon: true,
      coverImage: true,
      content: true,
      position: true,
      parentId: true,
      settings: true,
      viewId: true,
      isArchived: true,
    },
  });
  return Promise.all(
    children.map(async (child) => ({
      ...child,
      children: await fetchDocumentChildren(child.id, depth + 1, maxDepth),
    }))
  );
}

// Helper to recursively get all descendant IDs for deletion or archiving
async function getAllDescendantIds(parentId: string): Promise<string[]> {
  const children = await prisma.document.findMany({
    where: { parentId },
    select: { id: true },
  });

  if (children.length === 0) return [];

  const ids = children.map(c => c.id);
  const nested = await Promise.all(children.map(c => getAllDescendantIds(c.id)));
  return ids.concat(nested.flat());
}

export const documentRouter = router({
  /** Returns a deep recursive snapshot of a document's children tree (for template saving). */
  getChildrenSnapshot: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      // Verify user has access to this document
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
            { collaborators: { some: { userId } } },
          ],
        },
        select: { id: true },
      });
      if (!doc) throw new Error("Document not found or access denied");
      return fetchDocumentChildren(input.id);
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        parentId: z.string().optional().nullable(),
        viewId: z.string().optional(),
        spaceId: z.string().optional(),
        projectId: z.string().optional(),
        teamId: z.string().optional(),
        listId: z.string().optional(),
        folderId: z.string().optional(),
        contextId: z.string().optional(),
        contextType: z.string().optional(),
        isArchived: z.boolean().optional().default(false),
        isTemplate: z.boolean().optional(),
        query: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(50),
        includeChildren: z.boolean().optional().default(false),
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

      // Filter by viewId
      if (input.viewId) {
        where.viewId = input.viewId;
      }
      
      if (input.listId) {
        where.listId = input.listId;
      }

      if (input.folderId) {
        where.folderId = input.folderId;
      }

      if (input.contextId && input.contextType) {
        const cType = input.contextType.toUpperCase();
        if (cType === "WORKSPACE") where.workspaceId = input.contextId;
        if (cType === "SPACE") where.spaceId = input.contextId;
        if (cType === "PROJECT") where.projectId = input.contextId;
        if (cType === "TEAM") where.teamId = input.contextId;
        if (cType === "LIST") where.listId = input.contextId;
        if (cType === "FOLDER") where.folderId = input.contextId;
      }

      if (input.spaceId) {
        where.spaceId = input.spaceId;
      }

      if (input.projectId) {
        where.projectId = input.projectId;
      }

      if (input.teamId) {
        where.teamId = input.teamId;
      }

      // Filter templates
      if (input.isTemplate !== undefined) {
        where.isTemplate = input.isTemplate;
      }

      // Filter by creator or collaborator, or allow workspace members to view workspace docs
      where.OR = [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
        {
          workspace: {
            members: { some: { userId, status: "ACTIVE" } }
          }
        },
      ];

      // Search query
      if (input.query) {
        where.AND = [
          {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { description: { contains: input.query, mode: "insensitive" } },
              { content: { contains: input.query, mode: "insensitive" } },
            ],
          },
        ];
      }

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      let items;
      let total;

      if (input.page === 1) {
        items = await prisma.document.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            coverImage: true,
            position: true,
            parentId: true,
            workspaceId: true,
            spaceId: true,
            projectId: true,
            teamId: true,
            viewId: true,
            isTemplate: true,
            isArchived: true,
            settings: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            collaborators: {
              select: {
                id: true,
                userId: true,
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
          orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
          skip,
          take,
        });
        total = items.length < take ? items.length : await prisma.document.count({ where });
      } else {
        [total, items] = await Promise.all([
          prisma.document.count({ where }),
          prisma.document.findMany({
            where,
            select: {
              id: true,
              title: true,
              description: true,
              icon: true,
              coverImage: true,
              position: true,
              parentId: true,
              workspaceId: true,
              spaceId: true,
              projectId: true,
              teamId: true,
              viewId: true,
              isTemplate: true,
              isArchived: true,
              settings: true,
              ownerId: true,
              createdAt: true,
              updatedAt: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
              collaborators: {
                select: {
                  id: true,
                  userId: true,
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
            orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
            skip,
            take,
          }),
        ]);
      }
      const itemsWithChildren = input.includeChildren
        ? await Promise.all(
            items.map(async (item) => ({
              ...item,
              children: await fetchDocumentChildren(item.id),
            }))
          )
        : items.map((item) => ({ ...item, children: [] }));

      return { items: itemsWithChildren, total, page: input.page, pageSize: input.pageSize };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const document = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
            { collaborators: { some: { userId } } },
            // Also allow any workspace member to view documents in their workspace
            {
              workspace: {
                members: { some: { userId, status: "ACTIVE" } }
              }
            },
          ],
        },
        include: {
          owner: {
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
              description: true,
              icon: true,
              coverImage: true,
              content: true,
              position: true,
              parentId: true,
            },
          },
          parent: {
            select: {
              id: true,
              title: true,
              description: true,
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

      // Replace flat children with recursively-fetched nested tree (up to 5 levels)
      const nestedChildren = await fetchDocumentChildren(document.id);

      return { ...document, children: nestedChildren };
    }),

  applyTemplate: protectedProcedure
    .input(
      z.object({
        targetDocId: z.string().cuid(),
        templateId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const existing = await prisma.document.findFirst({
        where: {
          id: input.targetDocId,
          OR: [
            { ownerId: userId },
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

      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
      });

      if (!template || template.entityType !== "DOC") {
        throw new Error("Invalid document template");
      }

      const tContent = (template.content as Record<string, any>) || {};

      const newTitle = tContent.title || template.name;
      const newContent = tContent.content || tContent.body || "";
      const newCoverImage = tContent.coverImage || null;
      const newIcon = tContent.icon || template.icon || null;

      await prisma.document.update({
        where: { id: input.targetDocId },
        data: {
          title: newTitle,
          content: newContent,
          coverImage: newCoverImage,
          icon: newIcon,
        },
      });

      // Handle subpages: use ONLY the stored children snapshot from the template.
      // Never live-fetch via sourceDocId — that would pick up changes made to the
      // original document after the template was saved, which is unwanted.
      const childrenToCreate = Array.isArray(tContent.children) ? tContent.children : [];

      if (childrenToCreate.length > 0) {
        const createSubpages = async (children: any[], parentId: string) => {
          let prevPos: string | null = null;
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const pos = generateKeyBetween(prevPos, null);
            const childDoc = await prisma.document.create({
              data: {
                title: child.title || "Untitled",
                content: child.content || child.body || "",
                coverImage: child.coverImage || null,
                icon: child.icon || null,
                parentId: parentId,
                workspaceId: existing.workspaceId,
                spaceId: existing.spaceId,
                projectId: existing.projectId,
                listId: existing.listId,
                folderId: existing.folderId,
                teamId: existing.teamId,
                ownerId: userId,
                position: pos,
              },
            });
            prevPos = pos;
            if (child.children?.length > 0) {
              await createSubpages(child.children, childDoc.id);
            }
          }
        };

        await createSubpages(childrenToCreate, input.targetDocId);
      }

      await prisma.templateAuditLog.create({
        data: {
          templateId: template.id,
          actorId: userId,
          event: "APPLIED",
          status: "SUCCESS",
          targetEntityType: "DOC",
          targetEntityId: existing.id,
          targetEntityName: newTitle,
          metadata: { overwritten: true } as Prisma.InputJsonValue,
        },
      });

      await prisma.template.update({ where: { id: template.id }, data: { useCount: { increment: 1 } } });

      return { success: true };
    }),

  create: protectedProcedure
    .input(
      z.object({
        viewId: z.string().optional().nullable(),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional().nullable(),
        content: z.string().optional().default(""),
        parentId: z.string().optional().nullable(),
        workspaceId: z.string().optional().nullable(),
        spaceId: z.string().optional().nullable(),
        projectId: z.string().optional().nullable(),
        listId: z.string().optional().nullable(),
        folderId: z.string().optional().nullable(),
        teamId: z.string().optional().nullable(),
        icon: z.string().optional().nullable(),
        coverImage: z.string().optional().nullable(),
        isTemplate: z.boolean().optional().default(false),
        children: z.any().optional(),
        sourceDocId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      let view = input.viewId
        ? await prisma.view.findUnique({
            where: { id: input.viewId },
            select: {
              id: true,
              workspaceId: true,
              spaceId: true,
              projectId: true,
              teamId: true,
              folderId: true,
              listId: true,
            },
          })
        : null;

      if (!view && (input.listId || input.projectId || input.spaceId || input.workspaceId)) {
        view = await prisma.view.findFirst({
          where: {
            type: "DOC",
            ...(input.listId
              ? { listId: input.listId }
              : input.projectId
              ? { projectId: input.projectId }
              : input.spaceId
              ? { spaceId: input.spaceId }
              : input.workspaceId
              ? { workspaceId: input.workspaceId }
              : {}),
          },
          select: {
            id: true,
            workspaceId: true,
            spaceId: true,
            projectId: true,
            teamId: true,
            folderId: true,
            listId: true,
          },
        });
      }

      const resolvedWorkspaceId = input.workspaceId || view?.workspaceId || null;
      const spaceId = input.spaceId || view?.spaceId || null;
      const projectId = input.projectId || view?.projectId || null;
      const teamId = input.teamId || view?.teamId || null;
      const folderId = input.folderId || view?.folderId || null;
      const listId = input.listId || view?.listId || null;

      // Get the last item to compute the next position within this view
      const lastItem = await prisma.document.findFirst({
        where: {
          ...(view ? { viewId: view.id } : {}),
          parentId: input.parentId ?? null,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const document = await prisma.document.create({
        data: {
          workspaceId: resolvedWorkspaceId,
          ownerId: userId,
          title: input.title,
          description: input.description,
          content: input.content,
          parentId: input.parentId,
          viewId: view?.id ?? input.viewId ?? null,
          spaceId,
          projectId,
          listId,
          folderId,
          teamId,
          icon: input.icon,
          coverImage: input.coverImage,
          isTemplate: input.isTemplate,
          position: generateKeyBetween(lastItem?.position || null, null),
          version: 1,
        },
        include: {
          owner: {
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

      // Handle subpages: use sourceDocId for live recursive fetch, fallback to stored children
      const sourceDocId = input.sourceDocId;
      const childrenToCreate = sourceDocId
        ? await fetchDocumentChildren(sourceDocId)
        : (Array.isArray(input.children) ? input.children : []);

      if (childrenToCreate.length > 0) {
        const createSubpages = async (children: any[], parentId: string) => {
          let prevPos: string | null = null;
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const pos = generateKeyBetween(prevPos, null);
            const childDoc = await prisma.document.create({
              data: {
                title: child.title || "Untitled",
                content: child.content || child.body || "",
                coverImage: child.coverImage || null,
                icon: child.icon || null,
                parentId: parentId,
                workspaceId: resolvedWorkspaceId,
                spaceId: input.spaceId,
                projectId: input.projectId,
                listId: input.listId,
                folderId: input.folderId,
                teamId: input.teamId,
                ownerId: userId,
                position: pos,
              },
            });
            prevPos = pos;
            if (child.children?.length > 0) {
              await createSubpages(child.children, childDoc.id);
            }
          }
        };

        await createSubpages(childrenToCreate, document.id);
      }

      return document;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        content: z.string().optional(),
        icon: z.string().optional().nullable(),
        coverImage: z.string().optional().nullable(),
        isPublished: z.boolean().optional(),
        parentId: z.string().optional().nullable(),
        position: z.string().optional(),
        createVersion: z.boolean().optional().default(false),
        settings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const existing = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
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

      if (input.parentId !== undefined && isPreferencesMemoryDoc(existing.settings)) {
        // Preferences must stay under its memory view (including parentId: null root moves)
        if (input.parentId === null) {
          // Root of same view is OK
        } else {
          const newParent = await prisma.document.findUnique({
            where: { id: input.parentId },
            select: { viewId: true },
          });
          if (!newParent || newParent.viewId !== existing.viewId) {
            throw new Error("Cannot move the Agent Preferences memory page out of its memory document");
          }
        }
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
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
      if (input.position !== undefined) updateData.position = input.position;

      // Deep-merge settings so agentMemory / pageSettings cannot clobber each other
      if (input.settings !== undefined) {
        if (input.settings === null) {
          if (isPreferencesMemoryDoc(existing.settings)) {
            throw new Error("Cannot clear settings on the Agent Preferences memory page");
          }
          updateData.settings = Prisma.DbNull;
        } else {
          updateData.settings = mergeDocumentSettings(
            existing.settings,
            input.settings as Record<string, unknown>
          ) as Prisma.InputJsonValue;
        }
      }

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
          owner: {
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
          ownerId: userId,
        },
      });

      if (!document) {
        throw new Error("Document not found or insufficient permissions");
      }

      assertNotPreferencesMemoryDoc(document.settings, "delete");

      const descendantIds = await getAllDescendantIds(input.id);
      const idsToDelete = [input.id, ...descendantIds];

      await prisma.document.deleteMany({
        where: { id: { in: idsToDelete } },
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
            { ownerId: userId },
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

      if (input.isArchived) {
        assertNotPreferencesMemoryDoc(document.settings, "archive");
      }

      const descendantIds = await getAllDescendantIds(input.id);
      const idsToArchive = [input.id, ...descendantIds];

      await prisma.document.updateMany({
        where: { id: { in: idsToArchive } },
        data: { isArchived: input.isArchived },
      });

      return { success: true };
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        position: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // Check permission
      const document = await prisma.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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
            { ownerId: userId },
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

  getWatchers: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input }) => {
      const watchers = await prisma.documentWatcher.findMany({
        where: { documentId: input.documentId },
        select: { userId: true, teamId: true }
      });
      return {
        userIds: watchers.filter(w => w.userId).map(w => w.userId as string),
        teamIds: watchers.filter(w => w.teamId).map(w => w.teamId as string),
      };
    }),

  toggleWatcher: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        targetId: z.string(),
        targetType: z.enum(["USER", "TEAM"]),
        action: z.enum(["FOLLOW", "UNFOLLOW"]),
      })
    )
    .mutation(async ({ input }) => {
      const whereCondition =
        input.targetType === "USER"
          ? { documentId_userId: { documentId: input.documentId, userId: input.targetId } }
          : { documentId_teamId: { documentId: input.documentId, teamId: input.targetId } };

      if (input.action === "UNFOLLOW") {
        try {
          await prisma.documentWatcher.delete({ where: whereCondition as any });
        } catch (e) {
          // Ignore if it doesn't exist
        }
      } else {
        const data =
          input.targetType === "USER"
            ? { documentId: input.documentId, userId: input.targetId }
            : { documentId: input.documentId, teamId: input.targetId };

        await prisma.documentWatcher.upsert({
          where: whereCondition as any,
          create: data,
          update: {},
        });
      }
      return { success: true };
    }),

  // ─── Comments ───────────────────────────────────────────────────────────────

  listComments: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(200).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = { documentId: input.documentId };

      const [total, comments] = await Promise.all([
        prisma.documentComment.count({ where }),
        prisma.documentComment.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            assignee: { select: { id: true, name: true, avatar: true } },
            resolvedBy: { select: { id: true, name: true, avatar: true } },
            reactions: true,
            attachments: true,
          },
          orderBy: { createdAt: "asc" },
          skip,
          take: input.pageSize,
        }),
      ]);

      return {
        items: comments,
        total,
        page: input.page,
        pageSize: input.pageSize,
        hasMore: skip + comments.length < total,
      };
    }),

  createComment: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      content: z.string(),
      parentId: z.string().optional().nullable(),
      assigneeId: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const comment = await prisma.documentComment.create({
        data: {
          documentId: input.documentId,
          userId,
          content: input.content,
          parentId: input.parentId,
          assigneeId: input.assigneeId,
        },
        include: { user: true, assignee: true, resolvedBy: true, reactions: true, attachments: true },
      });

      let notifiedUserIds: string[] = [];
      try {
        const watchers = await prisma.documentWatcher.findMany({
          where: { documentId: input.documentId },
          include: { team: { include: { members: true } } },
        });
        const usersToNotify = new Set<string>();
        watchers.forEach((watcher) => {
          if (watcher.userId && watcher.userId !== userId) usersToNotify.add(watcher.userId);
          watcher.team?.members.forEach((m) => { if (m.userId !== userId) usersToNotify.add(m.userId); });
        });
        const notifications = Array.from(usersToNotify).map((uId) => ({
          userId: uId,
          type: "POST_COMMENTED" as any,
          title: "New Comment on Document",
          message: `${comment.user?.name || "Someone"} left a comment: "${input.content.substring(0, 50)}${input.content.length > 50 ? "..." : ""}"`,
          actorIds: [userId],
          entityType: "DOCUMENT",
          entityId: input.documentId,
          metadata: { documentId: input.documentId, commentId: comment.id },
          aggregateKey: `doc_comment:${input.documentId}:${comment.id}:${uId}`,
        }));
        if (notifications.length > 0) {
          await prisma.notification.createMany({ data: notifications });
          notifiedUserIds = Array.from(usersToNotify);
        }
      } catch (e) {
        console.error("Failed to send document comment notifications", e);
      }
      return { comment, notifiedUserIds };
    }),

  updateComment: protectedProcedure
    .input(z.object({ commentId: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.documentComment.update({
        where: { id: input.commentId, userId },
        data: { content: input.content, isEdited: true, editedAt: new Date() },
        include: { user: true, assignee: true, resolvedBy: true, reactions: true, attachments: true },
      });
    }),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await prisma.documentComment.delete({ where: { id: input.commentId, userId } });
      return { success: true };
    }),

  resolveComment: protectedProcedure
    .input(z.object({ commentId: z.string(), isResolved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.documentComment.update({
        where: { id: input.commentId },
        data: { isResolved: input.isResolved, resolvedById: input.isResolved ? userId : null, resolvedAt: input.isResolved ? new Date() : null },
        include: { user: true, assignee: true, resolvedBy: true, reactions: true, attachments: true },
      });
    }),

  assignComment: protectedProcedure
    .input(z.object({ commentId: z.string(), assigneeId: z.string().optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.documentComment.update({
        where: { id: input.commentId },
        data: { assigneeId: input.assigneeId },
        include: { user: true, assignee: true, resolvedBy: true, reactions: true, attachments: true },
      });
    }),

  reactComment: protectedProcedure
    .input(z.object({ commentId: z.string(), emoji: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const existing = await prisma.documentCommentReaction.findUnique({
        where: { commentId_userId_emoji: { commentId: input.commentId, userId, emoji: input.emoji } },
      });
      if (existing) {
        await prisma.documentCommentReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.documentCommentReaction.create({ data: { commentId: input.commentId, userId, emoji: input.emoji } });
      }
      return prisma.documentComment.findUnique({
        where: { id: input.commentId },
        include: { user: true, assignee: true, resolvedBy: true, reactions: true, attachments: true },
      });
    }),

  addCommentAttachment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      filename: z.string(),
      url: z.string(),
      mimeType: z.string(),
      size: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.documentCommentAttachment.create({
        data: {
          commentId: input.commentId,
          filename: input.filename,
          url: input.url,
          mimeType: input.mimeType,
          size: BigInt(input.size),
        },
      });
    }),

  // ─── Relationships ──────────────────────────────────────────────────────────

  listRelationships: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const relationships = await prisma.documentRelationship.findMany({
        where: { documentId: input.documentId },
        orderBy: { createdAt: "desc" },
      });
      const taskIds = relationships.filter(r => r.targetType === "TASK").map(r => r.targetId);
      const docIds = relationships.filter(r => r.targetType === "DOCUMENT").map(r => r.targetId);
      const tasks = taskIds.length > 0 ? await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true, status: true } }) : [];
      const docs = docIds.length > 0 ? await prisma.document.findMany({ where: { id: { in: docIds } }, select: { id: true, title: true, icon: true } }) : [];
      return relationships.map(rel => ({
        ...rel,
        target: rel.targetType === "TASK" ? tasks.find(t => t.id === rel.targetId) : docs.find(d => d.id === rel.targetId),
      }));
    }),

  createRelationship: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      targetType: z.enum(["TASK", "DOCUMENT"]),
      targetId: z.string(),
      applyToEntireDoc: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      let documentIds = [input.documentId];

      if (input.applyToEntireDoc) {
        // Recursive function to fetch all descendants
        const fetchDescendants = async (parentId: string): Promise<string[]> => {
          const children = await prisma.document.findMany({
            where: { parentId },
            select: { id: true }
          });
          let ids = children.map(c => c.id);
          for (const child of children) {
            const childIds = await fetchDescendants(child.id);
            ids = [...ids, ...childIds];
          }
          return ids;
        };

        const descendantIds = await fetchDescendants(input.documentId);
        documentIds = [...documentIds, ...descendantIds];
      }

      const results: any[] = [];
      for (const id of documentIds) {
        const existing = await prisma.documentRelationship.findUnique({
          where: { documentId_targetType_targetId: { documentId: id, targetType: input.targetType, targetId: input.targetId } },
        });
        if (!existing) {
          const created = await prisma.documentRelationship.create({ data: { documentId: id, targetType: input.targetType, targetId: input.targetId } });
          results.push(created);
        } else {
          results.push(existing);
        }
      }

      return results[0]; // Return the main relationship
    }),

  deleteRelationship: protectedProcedure
    .input(z.object({ relationshipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.documentRelationship.delete({ where: { id: input.relationshipId } });
      return { success: true };
    }),

  // ─── Activity ────────────────────────────────────────────────────────────────

  logView: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await prisma.activityLog.create({
        data: { userId, entityType: "DOCUMENT", entityId: input.documentId, action: "DOCUMENT_VIEW", category: "CONTENT", title: "Document Viewed", metadata: { timestamp: new Date().toISOString() } },
      });
      return { success: true };
    }),

  getActivity: protectedProcedure
    .input(z.object({ documentId: z.string(), page: z.number().int().min(1).optional().default(1), pageSize: z.number().int().min(1).max(50).optional().default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const document = await prisma.document.findFirst({
        where: { id: input.documentId, OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] },
      });
      if (!document) throw new Error("Document not found or access denied");
      const skip = (input.page - 1) * input.pageSize;
      const [total, activities] = await Promise.all([
        prisma.activityLog.count({ where: { entityType: "DOCUMENT", entityId: input.documentId } }),
        prisma.activityLog.findMany({
          where: { entityType: "DOCUMENT", entityId: input.documentId },
          include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.pageSize,
        }),
      ]);
      return { activities, total, page: input.page, pageSize: input.pageSize };
    }),

  getAnalytics: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const document = await prisma.document.findFirst({ where: { id: input.documentId, ownerId: userId } });
      if (!document) throw new Error("Document not found or access denied");
      const [totalViews, uniqueViewers, recentActivity] = await Promise.all([
        prisma.activityLog.count({ where: { entityType: "DOCUMENT", entityId: input.documentId, action: "DOCUMENT_VIEW" } }),
        prisma.activityLog.groupBy({ by: ["userId"], where: { entityType: "DOCUMENT", entityId: input.documentId, action: "DOCUMENT_VIEW" } }),
        prisma.activityLog.findMany({
          where: { entityType: "DOCUMENT", entityId: input.documentId },
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);
      return { totalViews, uniqueViewers: uniqueViewers.length, recentActivity };
    }),

  transferOwnership: protectedProcedure
    .input(z.object({ id: z.string(), newOwnerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const document = await prisma.document.findFirst({
        where: { id: input.id, ownerId: userId },
      });
      if (!document) {
        throw new Error("Document not found or you are not the owner");
      }
      if (input.newOwnerId === userId) {
        throw new Error("Cannot transfer ownership to yourself");
      }

      const newOwner = await prisma.user.findUnique({
        where: { id: input.newOwnerId },
        select: { id: true },
      });
      if (!newOwner) {
        throw new Error("New owner not found");
      }

      if (document.workspaceId) {
        const membership = await prisma.workspaceMember.findFirst({
          where: { workspaceId: document.workspaceId, userId: input.newOwnerId },
        });
        if (!membership) {
          throw new Error("New owner must be a member of the document workspace");
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.documentOwnershipTransfer.create({
          data: {
            documentId: input.id,
            fromOwnerId: userId,
            toOwnerId: input.newOwnerId,
            requestedBy: userId,
            status: "COMPLETED",
            requiresAcceptance: false,
            completedAt: new Date(),
            acceptedAt: new Date(),
          },
        });

        return tx.document.update({
          where: { id: input.id },
          data: {
            previousOwnerId: userId,
            ownerId: input.newOwnerId,
            transferredAt: new Date(),
          },
          include: {
            owner: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        });
      });

      return updated;
    }),
});
