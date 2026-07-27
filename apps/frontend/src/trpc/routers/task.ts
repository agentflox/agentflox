import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { PermissionLevel } from "@agentflox/database/src/generated/prisma";
import { permissionsService } from "@/services/permissions.service";
import { generateKeyBetween } from "fractional-indexing";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function recordTaskActivity(
  tx: Tx,
  params: { taskId: string; userId: string; action: "CREATED" | "UPDATED" | "STATUS_CHANGED" | "ASSIGNED" | "UNASSIGNED" | "PRIORITY_CHANGED" | "DUE_DATE_CHANGED" | "COMMENTED" | "ATTACHED" | "MOVED"; field?: string | null; oldValue?: unknown; newValue?: unknown }
) {
  await tx.taskActivity.create({
    data: {
      taskId: params.taskId,
      userId: params.userId,
      action: params.action,
      field: params.field ?? null,
      oldValue: params.oldValue != null ? (params.oldValue as object) : undefined,
      newValue: params.newValue != null ? (params.newValue as object) : undefined,
    },
  });
}

async function duplicateTaskInternal(
  tx: Tx,
  userId: string,
  params: {
    taskId: string;
    newTitle?: string;
    targetListId?: string;
    parentId?: string | null;
    options?: {
      copyActivity?: boolean;
      includeSubtasks?: boolean;
      includeAttachments?: boolean;
      includeAssignees?: boolean;
      includeDependencies?: boolean;
    };
  }
) {
  const sourceTask = await tx.task.findUnique({
    where: { id: params.taskId },
    include: {
      assignees: true,
      checklists: { include: { items: true } },
      customFieldValues: true,
      attachments: true,
      taskLinks: true,
      dependencies: true,
    }
  });

  if (!sourceTask) throw new Error("Task not found");

  const listId = params.targetListId || sourceTask.listId;

  // Calculate order for the duplicated task
  // Find max order for tasks with the same status/list
  const where: any = {
    listId,
  };
  if (sourceTask.statusId) where.statusId = sourceTask.statusId;
  if (params.parentId !== undefined) {
    where.parentId = params.parentId;
  } else if (sourceTask.parentId) {
    where.parentId = sourceTask.parentId;
  }

  const lastTaskByOrder = await tx.task.findFirst({
    where,
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const lastTaskByPosition = await tx.task.findFirst({
    where,
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const newOrderValue = generateKeyBetween(lastTaskByOrder?.order ?? null, null);
  const newPositionValue = generateKeyBetween(lastTaskByPosition?.position ?? null, null);

  const newTask = await tx.task.create({
    data: {
      title: params.newTitle || sourceTask.title,
      description: sourceTask.description,
      statusId: sourceTask.statusId,
      priority: sourceTask.priority,
      dueDate: sourceTask.dueDate,
      startDate: sourceTask.startDate,
      timeEstimate: sourceTask.timeEstimate,
      taskTypeId: sourceTask.taskTypeId,
      tags: sourceTask.tags as any,
      listId: listId,
      parentId: params.parentId !== undefined ? params.parentId : sourceTask.parentId,
      assigneeId: sourceTask.assigneeId,
      spaceId: sourceTask.spaceId,
      channelId: sourceTask.channelId,
      projectId: sourceTask.projectId,
      teamId: sourceTask.teamId,
      visibility: sourceTask.visibility,
      isPublic: sourceTask.isPublic,
      workspaceId: sourceTask.workspaceId,
      createdBy: userId,
      order: newOrderValue,
      position: newPositionValue,
      assignees: params.options?.includeAssignees ? {
        create: sourceTask.assignees.map(a => ({
          userId: a.userId,
          teamId: a.teamId,
          agentId: a.agentId,
          assigned_by: userId
        }))
      } : undefined,
      checklists: {
        create: sourceTask.checklists.map(c => ({
          name: c.name,
          position: c.position,
          items: {
            create: c.items.map(i => ({
              name: i.name,
              isCompleted: i.isCompleted,
              position: i.position,
              assigneeId: i.assigneeId
            }))
          }
        }))
      },
      customFieldValues: {
        create: sourceTask.customFieldValues.map(cf => ({
          customFieldId: cf.customFieldId,
          value: cf.value ?? {},
          projectId: cf.projectId
        }))
      },
      attachments: params.options?.includeAttachments ? {
        create: sourceTask.attachments.map(a => ({
          filename: a.filename,
          url: a.url,
          size: a.size,
          mimeType: a.mimeType,
          uploadedBy: userId
        }))
      } : undefined,
      dependencies: params.options?.includeDependencies ? {
        create: sourceTask.dependencies.map(d => ({
          dependsOnId: d.dependsOnId,
          type: d.type
        }))
      } : undefined
    }
  });

  await recordTaskActivity(tx, { taskId: newTask.id, userId, action: "CREATED" });

  if (params.options?.includeSubtasks) {
    const subtasks = await tx.task.findMany({
      where: { parentId: sourceTask.id }
    });
    for (const sub of subtasks) {
      await duplicateTaskInternal(tx, userId, {
        taskId: sub.id,
        targetListId: listId ?? undefined,
        parentId: newTask.id,
        options: params.options
      });
    }
  }

  return newTask;
}

function normalizeAiAgentImage<T extends { aiAgent?: any }>(assignee: T): T {
  if (!assignee?.aiAgent) return assignee;
  return {
    ...assignee,
    aiAgent: {
      ...assignee.aiAgent,
      // Keep backwards compatibility for clients expecting `image`
      image: assignee.aiAgent.image ?? assignee.aiAgent.avatar ?? null,
    },
  };
}

type TaskListRelationMode = boolean | "card";

function buildTaskListInclude(relationMode: TaskListRelationMode | undefined, userId: string) {
  const watchers = { where: { userId }, select: { id: true } } as const;

  if (!relationMode) {
    return { watchers };
  }

  const cardIncludes = {
    status: { select: { id: true, name: true, color: true } },
    taskType: { select: { id: true, name: true, icon: true, color: true } },
    project: { select: { id: true, name: true } },
    team: { select: { id: true, name: true } },
    workspace: { select: { id: true, name: true } },
    space: { select: { id: true, name: true, color: true } },
    list: {
      select: {
        id: true,
        name: true,
        locationType: true,
        folder: { select: { id: true, name: true } },
      },
    },
    tasks: { select: { id: true, title: true } },
    dependencies: { include: { dependsOn: { select: { title: true, id: true } } } },
    blockedDependencies: { include: { task: { select: { title: true, id: true } } } },
  } as const;

  if (relationMode === "card") {
    return {
      ...cardIncludes,
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          aiAgent: { select: { id: true, name: true, avatar: true } },
        },
      },
      watchers,
    };
  }

  return {
    ...cardIncludes,
    assignees: {
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        aiAgent: { select: { id: true, name: true, avatar: true } },
      },
    },
    channel: { select: { id: true, name: true } },
    attachments: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
    taskLinks: { select: { id: true, url: true, title: true, description: true, createdAt: true, creator: { select: { id: true, name: true, image: true } } } },
    list: {
      select: {
        id: true,
        name: true,
        locationType: true,
        folder: { select: { id: true, name: true } },
        statuses: { select: { id: true, name: true, color: true } },
      },
    },
    _count: {
      select: {
        comments: true,
        attachments: true,
        taskLinks: true,
        checklists: true,
        other_tasks: true,
        dependencies: true,
        blockedDependencies: true,
      },
    },
    watchers,
  } as const;
}

export const taskRouter = router({
  listTaskTypes: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      spaceId: z.string().optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const baseCondition = {
        ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      };

      return prisma.taskType.findMany({
        where: {
          isActive: true,
          OR: [
            {
              ...baseCondition,
              spaceId: input.spaceId || null,
              projectId: input.projectId || null,
              teamId: input.teamId || null,
            },
            {
              ...baseCondition,
              spaceId: null,
              projectId: null,
              teamId: null,
            }
          ]
        },
        orderBy: { position: 'asc' }
      });
    }),

  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      spaceId: z.string().optional(),
      channelId: z.string().optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      listId: z.string().optional(),
      assigneeId: z.string().optional(),
      status: z.array(z.string()).optional(),
      visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional(),
      query: z.string().optional(),
      page: z.number().int().min(1).optional().default(1),
      cursor: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(500).optional().default(12),
      scope: z.enum(["owned", "assigned", "all"]).optional().default("owned"),
      includeRelations: z.union([z.boolean(), z.literal("card")]).optional(),
      ids: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const where: any = {};

      if (input.workspaceId) where.workspaceId = input.workspaceId;
      if (input.channelId) where.channelId = input.channelId;
      if (input.ids?.length) where.id = { in: input.ids };
      if (input.spaceId) where.spaceId = input.spaceId;
      if (input.projectId) where.projectId = input.projectId;
      if (input.teamId) where.teamId = input.teamId;
      if (input.listId) where.listId = input.listId;
      // Support both legacy single assignee and multi-assignees
      if (input.assigneeId) {
        where.OR = [
          ...(where.OR || []),
          { assigneeId: input.assigneeId },
          { assignees: { some: { userId: input.assigneeId } } },
        ];
      }
      if (input.visibility) where.visibility = input.visibility as any;
      // `Task` stores status as `statusId` (relation to `Status`)
      if (input.status?.length) where.statusId = { in: input.status };

      if (input.scope === "owned") {
        where.createdBy = userId;
      } else if (input.scope === "assigned") {
        where.OR = [
          ...(where.OR || []),
          { assigneeId: userId },
          { assignees: { some: { userId } } },
        ];
      } else if (input.scope === "all") {
        where.OR = [
          ...(where.OR || []),
          { createdBy: userId },
          { assigneeId: userId },
          { assignees: { some: { userId } } },
        ];
      }

      if (input.query) {
        const q = input.query.trim();
        where.OR = [
          ...(where.OR || []),
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }

      const page = input.cursor ?? input.page ?? 1;
      const skip = (page - 1) * input.pageSize;
      const take = input.pageSize;

      const include = buildTaskListInclude(input.includeRelations, userId);

      let itemsRaw;
      let total;

      if (page === 1) {
        itemsRaw = await prisma.task.findMany({
          where,
          orderBy: [
            { order: "asc" },
            { updatedAt: "desc" },
          ],
          skip,
          take,
          include,
        });
        total = itemsRaw.length < take ? itemsRaw.length : await prisma.task.count({ where });
      } else {
        [total, itemsRaw] = await Promise.all([
          prisma.task.count({ where }),
          prisma.task.findMany({
            where,
            orderBy: [
              { order: "asc" },
              { updatedAt: "desc" },
            ],
            skip,
            take,
            include,
          }),
        ]);
      }

      const hasRelations = input.includeRelations === true || input.includeRelations === "card";

      const items = (itemsRaw as any[]).map((task) => {
        const { watchers, tasks: parentTask, ...rest } = task;
        const isStarred = (watchers?.length ?? 0) > 0;
        const normalizedAssignees =
          input.includeRelations === true || input.includeRelations === "card"
            ? (task.assignees ?? []).map(normalizeAiAgentImage)
            : task.assignees;

        // Don't leak the watchers rows to the client; expose `isStarred` instead.
        return {
          ...rest,
          ...(hasRelations ? { parent: parentTask ?? null } : {}),
          ...(input.includeRelations === true || input.includeRelations === "card"
            ? { assignees: normalizedAssignees }
            : {}),
          isStarred,
        };
      });

      return {
        items,
        total,
        page,
        pageSize: input.pageSize,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const task = await prisma.task.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdBy: userId },
            { assigneeId: userId },
            { assignees: { some: { userId } } },
            { workspace: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } },
            { project: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } },
          ],
        },
        include: {
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
              aiAgent: { select: { id: true, name: true, avatar: true } }
            }
          },
          status: { select: { id: true, name: true, color: true } },
          taskType: { select: { id: true, name: true, icon: true, color: true } },
          channel: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          list: { select: { id: true, name: true, locationType: true, folder: { select: { id: true, name: true } }, statuses: { select: { id: true, name: true, color: true } } } },
          sharedLists: { select: { id: true, name: true } },
          watchers: { where: { userId }, select: { id: true } },
          checklists: { include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } },
          comments: {
            where: { parentId: null },
            include: {
              user: { select: { id: true, name: true, image: true } },
              reactions: { include: { user: { select: { id: true, name: true, image: true } } } },
              replies: {
                include: {
                  user: { select: { id: true, name: true, image: true } },
                  reactions: { include: { user: { select: { id: true, name: true, image: true } } } },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          attachments: { include: { uploader: { select: { id: true, name: true, image: true } } } },
          taskLinks: { select: { id: true, url: true, title: true, description: true, createdAt: true, creator: { select: { id: true, name: true, image: true } } } },

          dependencies: {
            include: {
              dependsOn: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  startDate: true,
                  dueDate: true,
                  priority: true,
                  timeEstimate: true,
                  createdAt: true,
                  updatedAt: true,
                  createdBy: true,
                  creator: { select: { id: true, name: true, image: true } },
                  taskTypeId: true,
                  taskType: { select: { id: true, name: true, icon: true, color: true } },
                  assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
                },
              },
            },
          },
          blockedDependencies: {
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  startDate: true,
                  dueDate: true,
                  priority: true,
                  timeEstimate: true,
                  createdAt: true,
                  updatedAt: true,
                  createdBy: true,
                  creator: { select: { id: true, name: true, image: true } },
                  taskTypeId: true,
                  taskType: { select: { id: true, name: true, icon: true, color: true } },
                  assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
                },
              },
            },
          },
          activities: { include: { user: { select: { id: true, name: true, image: true } } } },
          _count: { select: { comments: true, attachments: true, checklists: true, other_tasks: true, dependencies: true, blockedDependencies: true } },
          other_tasks: {
            orderBy: { position: "asc" },
            include: {
              assignees: {
                include: {
                  user: { select: { id: true, name: true, email: true, image: true } },
                  aiAgent: { select: { id: true, name: true, avatar: true } }
                }
              },
              status: { select: { id: true, name: true, color: true } },
              taskType: { select: { id: true, name: true, icon: true, color: true } },
              _count: { select: { comments: true, attachments: true, checklists: true, other_tasks: true, dependencies: true, blockedDependencies: true } },
              other_tasks: {
                orderBy: { position: "asc" },
                include: {
                  assignees: {
                    include: {
                      user: { select: { id: true, name: true, email: true, image: true } },
                      aiAgent: { select: { id: true, name: true, avatar: true } }
                    }
                  },
                  status: { select: { id: true, name: true, color: true } },
                  taskType: { select: { id: true, name: true, icon: true, color: true } },
                  _count: { select: { comments: true, attachments: true, checklists: true, other_tasks: true, dependencies: true, blockedDependencies: true } },
                }
              }
            }
          },
          customFieldValues: { select: { id: true, customFieldId: true, value: true } },
        },
      });
      if (!task) return task;
      return {
        ...(task as any),
        assignees: (task as any).assignees?.map(normalizeAiAgentImage) ?? [],
        other_tasks: (task as any).other_tasks?.map((t: any) => ({
          ...t,
          assignees: t.assignees?.map(normalizeAiAgentImage) ?? [],
          other_tasks: t.other_tasks?.map((c: any) => ({
            ...c,
            assignees: c.assignees?.map(normalizeAiAgentImage) ?? []
          })) ?? []
        })) ?? [],
        isStarred: ((task as any).watchers?.length ?? 0) > 0,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string().optional(),
      spaceId: z.string().optional(),
      channelId: z.string().optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      assigneeId: z.string().optional(),
      assigneeIds: z.array(z.string()).optional().default([]),
      listId: z.string().optional(),
      parentId: z.string().optional().nullable(),
      title: z.string().min(1),
      description: z.string().optional(),
      statusId: z.string().optional(),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).optional(),
      dueDate: z.date().optional().nullable(),
      startDate: z.date().optional().nullable(),
      noStartTime: z.boolean().optional(),
      noEndTime: z.boolean().optional(),
      visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).default("PRIVATE"),
      isPublic: z.boolean().default(false),
      position: z.string().optional(),
      order: z.string().optional(),
      taskType: z.enum(["TASK", "MILESTONE", "FORM_RESPONSE", "MEETING_NOTE"]).optional(), // Deprecated
      taskTypeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const uniqueAssigneeIds = Array.from(new Set([
        ...(input.assigneeIds ?? []),
        ...(input.assigneeId ? [input.assigneeId] : []),
      ])).filter(Boolean);

      const data: any = {
        title: input.title,
        visibility: input.visibility as any,
        isPublic: input.isPublic,
        createdBy: userId,
      };

      if (input.workspaceId !== undefined) data.workspaceId = input.workspaceId;
      if (input.spaceId !== undefined) data.spaceId = input.spaceId;
      if (input.channelId !== undefined) data.channelId = input.channelId;
      if (input.projectId !== undefined) data.projectId = input.projectId;
      if (input.teamId !== undefined) data.teamId = input.teamId;

      // Keep legacy single assignee for backwards compatibility - only set if it's a user
      const firstUserId = uniqueAssigneeIds.find(id => id.startsWith('user:') || !id.includes(':'));
      if (input.assigneeId !== undefined) {
        data.assigneeId = input.assigneeId.startsWith('user:') ? input.assigneeId.replace('user:', '') : input.assigneeId;
      } else if (firstUserId) {
        data.assigneeId = firstUserId.startsWith('user:') ? firstUserId.replace('user:', '') : firstUserId;
      }

      if (input.listId !== undefined) data.listId = input.listId;
      if (input.parentId !== undefined) data.parentId = input.parentId ?? undefined;
      // Strip system: virtual status IDs — they are UI-only fallbacks with no DB record
      if (input.statusId !== undefined) {
        data.statusId = input.statusId?.startsWith('system:') ? undefined : input.statusId;
      }
      if (input.description !== undefined) data.description = input.description;
      if (input.priority !== undefined) data.priority = input.priority;
      if (input.dueDate !== undefined) data.dueDate = input.dueDate ?? undefined;
      if (input.startDate !== undefined) data.startDate = input.startDate ?? undefined;
      if (input.noStartTime !== undefined) data.noStartTime = input.noStartTime;
      if (input.noEndTime !== undefined) data.noEndTime = input.noEndTime;

      // Handle TaskType (Prioritize taskTypeId, fallback to looking up taskType enum name)
      if (input.taskTypeId) {
        data.taskTypeId = input.taskTypeId;
      } else if (input.taskType) {
        const found = await prisma.taskType.findFirst({
          where: {
            workspaceId: input.workspaceId,
            name: { equals: input.taskType, mode: 'insensitive' }
          }
        });
        if (found) {
          data.taskTypeId = found.id;
        } else {
          const defaultType = await prisma.taskType.findFirst({
            where: {
              workspaceId: input.workspaceId,
              name: 'Task'
            }
          });
          if (defaultType) data.taskTypeId = defaultType.id;
        }
      } else {
        const defaultType = await prisma.taskType.findFirst({
          where: {
            workspaceId: input.workspaceId,
            isDefault: true
          }
        });
        if (defaultType) data.taskTypeId = defaultType.id;
      }

      // Calculate order and position if not provided
      if (input.order !== undefined) {
        data.order = input.order;
      } else {
        const where: any = {};
        if (input.listId) where.listId = input.listId;
        if (input.statusId) where.statusId = input.statusId;
        if (input.listId != null) where.parentId = input.parentId ?? null;

        const lastTask = await prisma.task.findFirst({
          where,
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        data.order = generateKeyBetween(lastTask?.order ?? null, null);
      }

      if (input.position !== undefined) {
        data.position = input.position;
      } else {
        const where: any = {};
        if (input.listId) where.listId = input.listId;
        if (input.statusId) where.statusId = input.statusId;
        if (input.listId != null) where.parentId = input.parentId ?? null;

        const lastTask = await prisma.task.findFirst({
          where,
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        data.position = generateKeyBetween(lastTask?.position ?? null, null);
      }

      return prisma.$transaction(async (tx) => {
        const task = await tx.task.create({ data });
        await recordTaskActivity(tx, { taskId: task.id, userId, action: "CREATED" });

        if (uniqueAssigneeIds.length > 0) {
          const assigneeRecords = uniqueAssigneeIds.map((id) => {
            const baseRecord = {
              taskId: task.id,
              assigned_by: userId,
            };

            if (id.startsWith('user:')) {
              return { ...baseRecord, userId: id.replace('user:', '') };
            } else if (id.startsWith('team:')) {
              return { ...baseRecord, teamId: id.replace('team:', '') };
            } else if (id.startsWith('agent:')) {
              return { ...baseRecord, agentId: id.replace('agent:', '') };
            } else {
              return { ...baseRecord, userId: id };
            }
          });

          await tx.taskAssignee.createMany({
            data: assigneeRecords as any,
            skipDuplicates: true,
          });
        }

        return task;
      });
    }),

  publish: protectedProcedure
    .input(z.object({ taskId: z.string(), isPublic: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.task.update({
        where: { id: input.taskId },
        data: {
          isPublic: input.isPublic,
          visibility: input.isPublic ? ("PUBLIC" as any) : "PRIVATE",
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      status: z.string().optional(),
      statusId: z.string().optional().nullable(),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).optional().nullable(),
      dueDate: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      noStartTime: z.boolean().optional(),
      noEndTime: z.boolean().optional(),
      timeEstimate: z.number().optional().nullable(),
      tags: z.array(z.string()).optional(),
      listId: z.string().optional().nullable(),
      parentId: z.string().optional().nullable(),
      assigneeId: z.string().optional().nullable(),
      assigneeIds: z.array(z.string()).optional().nullable(),
      spaceId: z.string().optional().nullable(),
      channelId: z.string().optional().nullable(),
      projectId: z.string().optional().nullable(),
      teamId: z.string().optional().nullable(),
      visibility: z.enum(["PRIVATE", "ADMINS", "MEMBERS", "EVERYONE", "PUBLIC"]).optional(),
      isPublic: z.boolean().optional(),
      isStarred: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      position: z.string().optional(),
      order: z.string().optional(),
      taskType: z.enum(["TASK", "MILESTONE", "FORM_RESPONSE", "MEETING_NOTE"]).optional(), // Deprecated
      taskTypeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, isStarred, ...updateData } = input;

      // Check permission via backend API (respects visibility, location permissions, etc.)
      const perm = await permissionsService.permissions.resolvePermission("task", id, ctx.session);
      if (!perm || (perm !== PermissionLevel.FULL && perm !== PermissionLevel.EDIT)) {
        throw new Error("Task not found or permission denied");
      }

      const data: any = {};
      if (updateData.title !== undefined) data.title = updateData.title;
      if (updateData.description !== undefined) data.description = updateData.description ?? undefined;
      if (updateData.status !== undefined) data.statusId = updateData.status?.startsWith('system:') ? null : updateData.status;
      // statusId takes precedence; also strip system: IDs
      if (updateData.statusId !== undefined) data.statusId = updateData.statusId?.startsWith('system:') ? null : (updateData.statusId ?? null);
      if (updateData.priority !== undefined) data.priority = updateData.priority;
      if (updateData.dueDate !== undefined) data.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
      if (updateData.startDate !== undefined) data.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
      if (updateData.noStartTime !== undefined) data.noStartTime = updateData.noStartTime;
      if (updateData.noEndTime !== undefined) data.noEndTime = updateData.noEndTime;
      if (updateData.timeEstimate !== undefined) data.timeEstimate = updateData.timeEstimate ?? undefined;
      if (updateData.tags !== undefined) data.tags = updateData.tags;
      if (updateData.listId !== undefined) data.listId = updateData.listId ?? undefined;
      if (updateData.parentId !== undefined) data.parentId = updateData.parentId; // Allow null to unparent tasks
      if (updateData.assigneeId !== undefined) data.assigneeId = updateData.assigneeId ?? undefined;
      if (updateData.spaceId !== undefined) data.spaceId = updateData.spaceId ?? undefined;
      if (updateData.channelId !== undefined) data.channelId = updateData.channelId ?? undefined;
      if (updateData.projectId !== undefined) data.projectId = updateData.projectId ?? undefined;
      if (updateData.teamId !== undefined) data.teamId = updateData.teamId ?? undefined;
      if (updateData.visibility !== undefined) data.visibility = updateData.visibility;
      if (updateData.isPublic !== undefined) data.isPublic = updateData.isPublic;
      if (updateData.isArchived !== undefined) data.isArchived = updateData.isArchived;
      if (input.position !== undefined) data.position = input.position;
      if (input.order !== undefined) data.order = input.order;

      if (updateData.taskTypeId !== undefined) {
        data.taskTypeId = updateData.taskTypeId;
      } else if (updateData.taskType !== undefined) {
        const found = await prisma.taskType.findFirst({
          where: {
            name: { equals: updateData.taskType, mode: 'insensitive' }
          }
        });
        if (found) data.taskTypeId = found.id;
      }

      return prisma.$transaction(async (tx) => {
        const before = await tx.task.findUnique({ where: { id }, select: { title: true, statusId: true, priority: true, dueDate: true, assigneeId: true, listId: true, taskTypeId: true } });
        // Replace multi-assignees when provided
        if (updateData.assigneeIds !== undefined) {
          const ids = Array.from(new Set(updateData.assigneeIds ?? [])).filter(Boolean);
          await tx.taskAssignee.deleteMany({ where: { taskId: id } });
          if (ids.length > 0) {
            // Parse assigneeIds - they can be:
            // - "user:{userId}" for users (preferred)
            // - Plain user IDs (backwards compatible)
            // - "team:{teamId}" for teams
            // - "agent:{agentId}" for AI agents
            const assigneeRecords = ids.map((assigneeId) => {
              const baseRecord = {
                taskId: id,
                assigned_by: userId,
              };

              if (assigneeId.startsWith('user:')) {
                return { ...baseRecord, userId: assigneeId.replace('user:', '') };
              } else if (assigneeId.startsWith('team:')) {
                return { ...baseRecord, teamId: assigneeId.replace('team:', '') };
              } else if (assigneeId.startsWith('agent:')) {
                return { ...baseRecord, agentId: assigneeId.replace('agent:', '') };
              } else {
                // Plain ID = user ID (backwards compatible)
                return { ...baseRecord, userId: assigneeId };
              }
            });

            await tx.taskAssignee.createMany({
              data: assigneeRecords as any,
              skipDuplicates: true,
            });
          }
          // Keep legacy field in sync unless caller explicitly sets assigneeId
          // Only set to a user ID, not team or agent
          const firstUserId = ids.find(assigneeId => assigneeId.startsWith('user:') || !assigneeId.includes(':'));
          if (updateData.assigneeId === undefined) {
            if (firstUserId) {
              data.assigneeId = firstUserId.startsWith('user:') ? firstUserId.replace('user:', '') : firstUserId;
            } else {
              data.assigneeId = null;
            }
          }
        }

        if (isStarred !== undefined) {
          if (isStarred) {
            await tx.taskWatcher.upsert({
              where: { taskId_userId: { taskId: id, userId } },
              create: { taskId: id, userId },
              update: {},
            });
          } else {
            await tx.taskWatcher.deleteMany({ where: { taskId: id, userId } });
          }
        }

        const updated = await tx.task.update({
          where: { id },
          data: data as any,
          include: {
            assignees: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                aiAgent: { select: { id: true, name: true, avatar: true } },
              },
            },
            status: { select: { id: true, name: true, color: true } },
            taskType: { select: { id: true, name: true, icon: true, color: true } },
            list: {
              select: {
                id: true,
                name: true,
                statuses: { select: { id: true, name: true, color: true } },
              },
            },
          },
        });

        // Record activities for changed fields
        if (before) {
          if (data.title !== undefined && before.title !== data.title) {
            await recordTaskActivity(tx, { taskId: id, userId, action: "UPDATED", field: "title", oldValue: before.title, newValue: data.title });
          }
          if (data.statusId !== undefined && String(before.statusId ?? "") !== String(data.statusId ?? "")) {
            await recordTaskActivity(tx, { taskId: id, userId, action: "STATUS_CHANGED", field: "statusId", oldValue: before.statusId, newValue: data.statusId });
          }
          if (data.priority !== undefined && before.priority !== data.priority) {
            await recordTaskActivity(tx, { taskId: id, userId, action: "PRIORITY_CHANGED", field: "priority", oldValue: before.priority, newValue: data.priority });
          }
          if (data.dueDate !== undefined && String(before.dueDate ?? "") !== String(data.dueDate ?? "")) {
            await recordTaskActivity(tx, { taskId: id, userId, action: "DUE_DATE_CHANGED", field: "dueDate", oldValue: before.dueDate, newValue: data.dueDate });
          }
          if (data.assigneeId !== undefined && String(before.assigneeId ?? "") !== String(data.assigneeId ?? "")) {
            await recordTaskActivity(tx, { taskId: id, userId, action: data.assigneeId ? "ASSIGNED" : "UNASSIGNED", field: "assigneeId", oldValue: before.assigneeId, newValue: data.assigneeId });
          }
          if (data.listId !== undefined && String(before.listId ?? "") !== String(data.listId ?? "")) {
            await recordTaskActivity(tx, { taskId: id, userId, action: "MOVED", field: "listId", oldValue: before.listId, newValue: data.listId });
          }
          if (data.taskTypeId !== undefined && String(before.taskTypeId ?? "") !== String(data.taskTypeId ?? "")) {
            await recordTaskActivity(tx, { taskId: id, userId, action: "UPDATED", field: "taskTypeId", oldValue: before.taskTypeId, newValue: data.taskTypeId });
          }
        }

        return updated;
      });
    }),

  assign: protectedProcedure
    .input(z.object({
      id: z.string(),
      assigneeId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      // Check permission via backend API (respects visibility, location permissions, etc.)
      const perm = await permissionsService.permissions.resolvePermission("task", input.id, ctx.session);
      if (!perm || (perm !== PermissionLevel.FULL && perm !== PermissionLevel.EDIT)) {
        throw new Error("Task not found or permission denied");
      }

      const before = await prisma.task.findUnique({ where: { id: input.id }, select: { assigneeId: true } });
      const updated = await prisma.task.update({
        where: { id: input.id },
        data: { assigneeId: input.assigneeId ?? null },
      });
      if (before && String(before.assigneeId ?? "") !== String(input.assigneeId ?? "")) {
        await recordTaskActivity(prisma as Tx, {
          taskId: input.id,
          userId,
          action: input.assigneeId ? "ASSIGNED" : "UNASSIGNED",
          field: "assigneeId",
          oldValue: before.assigneeId,
          newValue: input.assigneeId,
        });
      }
      return updated;
    }),

  addToSharedList: protectedProcedure
    .input(z.object({ id: z.string(), listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const perm = await permissionsService.permissions.resolvePermission("task", input.id, ctx.session);
      if (!perm || (perm !== PermissionLevel.FULL && perm !== PermissionLevel.EDIT)) {
        throw new Error("Task not found or permission denied");
      }
      return prisma.task.update({
        where: { id: input.id },
        data: { sharedLists: { connect: { id: input.listId } } },
        select: { id: true, sharedLists: { select: { id: true, name: true } } },
      });
    }),

  removeFromSharedList: protectedProcedure
    .input(z.object({ id: z.string(), listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const perm = await permissionsService.permissions.resolvePermission("task", input.id, ctx.session);
      if (!perm || (perm !== PermissionLevel.FULL && perm !== PermissionLevel.EDIT)) {
        throw new Error("Task not found or permission denied");
      }
      return prisma.task.update({
        where: { id: input.id },
        data: { sharedLists: { disconnect: { id: input.listId } } },
        select: { id: true, sharedLists: { select: { id: true, name: true } } },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permission via backend API (respects visibility, location permissions, etc.)
      const perm = await permissionsService.permissions.resolvePermission("task", input.id, ctx.session);
      if (!perm || perm !== PermissionLevel.FULL) {
        throw new Error("Task not found or permission denied");
      }

      return prisma.task.delete({ where: { id: input.id } });
    }),

  duplicate: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      newTitle: z.string().optional(),
      targetListId: z.string().optional(),
      options: z.object({
        copyActivity: z.boolean().optional(),
        includeSubtasks: z.boolean().optional(),
        includeAttachments: z.boolean().optional(),
        includeAssignees: z.boolean().optional(),
        includeDependencies: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.$transaction(async (tx) => {
        return duplicateTaskInternal(tx as Tx, userId, input);
      });
    }),

  bulkDuplicate: protectedProcedure
    .input(z.object({
      taskIds: z.array(z.string()),
      targetListId: z.string().optional(),
      options: z.object({
        copyActivity: z.boolean().optional(),
        includeSubtasks: z.boolean().optional(),
        includeAttachments: z.boolean().optional(),
        includeAssignees: z.boolean().optional(),
        includeDependencies: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.$transaction(async (tx) => {
        const results: any[] = [];
        for (const taskId of input.taskIds) {
          const newTask = await duplicateTaskInternal(tx as Tx, userId, {
            taskId,
            targetListId: input.targetListId,
            options: input.options,
          });
          results.push(newTask);
        }
        return results;
      });
    }),

  merge: protectedProcedure
    .input(z.object({
      sourceId: z.string(),
      targetId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify permissions for both
      // 2. Move comments
      await prisma.taskComment.updateMany({
        where: { taskId: input.sourceId },
        data: { taskId: input.targetId }
      });
      // 3. Move attachments
      await prisma.taskAttachment.updateMany({
        where: { taskId: input.sourceId },
        data: { taskId: input.targetId }
      });
      // 4. Move time entries
      await prisma.timeEntry.updateMany({
        where: { taskId: input.sourceId },
        data: { taskId: input.targetId }
      });

      // 5. Append description
      const sourceTask = await prisma.task.findUnique({ where: { id: input.sourceId } });
      const targetTask = await prisma.task.findUnique({ where: { id: input.targetId } });

      if (sourceTask && targetTask) {
        await prisma.task.update({
          where: { id: input.targetId },
          data: {
            description: (targetTask.description || "") + "\n\n--- Merged Task: " + sourceTask.title + " ---\n\n" + (sourceTask.description || "")
          }
        });
      }

      // 6. Delete source
      await prisma.task.delete({ where: { id: input.sourceId } });
      return { success: true };
    }),

  addDependency: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      dependsOnId: z.string(),
      type: z.enum(["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH", "START_TO_FINISH"]).optional(),
      customRelationshipId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const dep = await prisma.taskDependency.create({
        data: {
          taskId: input.taskId,
          dependsOnId: input.dependsOnId,
          type: input.type || "FINISH_TO_START",
          customRelationshipId: input.customRelationshipId,
        }
      });
      await recordTaskActivity(prisma as Tx, { taskId: input.taskId, userId, action: "UPDATED", field: "dependencies", newValue: { dependsOnId: input.dependsOnId, type: input.type || "FINISH_TO_START" } });
      return dep;
    }),

  removeDependency: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      dependsOnId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const result = await prisma.taskDependency.deleteMany({
        where: {
          taskId: input.taskId,
          dependsOnId: input.dependsOnId
        }
      });
      await recordTaskActivity(prisma as Tx, { taskId: input.taskId, userId, action: "UPDATED", field: "dependencies", oldValue: { dependsOnId: input.dependsOnId } });
      return result;
    }),

  listLinkedDocs: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const links = await prisma.documentRelationship.findMany({
        where: { targetType: "TASK", targetId: input.taskId },
        include: { document: true }
      });
      return links.map(l => l.document);
    }),

  linkDoc: protectedProcedure
    .input(z.object({ taskId: z.string(), documentId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.documentRelationship.create({
        data: {
          documentId: input.documentId,
          targetType: "TASK",
          targetId: input.taskId
        }
      });
    }),

  unlinkDoc: protectedProcedure
    .input(z.object({ taskId: z.string(), documentId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.documentRelationship.deleteMany({
        where: {
          documentId: input.documentId,
          targetType: "TASK",
          targetId: input.taskId
        }
      });
    }),

  comment: router({
    create: protectedProcedure
      .input(z.object({ taskId: z.string(), content: z.string(), parentId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const comment = await prisma.taskComment.create({
          data: {
            taskId: input.taskId,
            userId,
            content: input.content,
            parentId: input.parentId ?? null,
          },
          include: {
            user: { select: { id: true, name: true, image: true } },
            reactions: true,
            replies: { include: { user: { select: { id: true, name: true, image: true } }, reactions: true } },
          },
        });
        const activity = await prisma.taskActivity.create({
          data: {
            taskId: input.taskId,
            userId,
            action: 'COMMENTED',
            field: 'comment',
            commentId: comment.id,
          },
        });
        return { ...comment, activityId: activity.id };
      }),

    update: protectedProcedure
      .input(z.object({ commentId: z.string(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        return prisma.taskComment.update({
          where: { id: input.commentId, userId },
          data: { content: input.content, isEdited: true, editedAt: new Date() },
          include: {
            user: { select: { id: true, name: true, image: true } },
            reactions: true,
            replies: { include: { user: { select: { id: true, name: true, image: true } }, reactions: true } },
          },
        });
      }),

    delete: protectedProcedure
      .input(z.object({ commentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        return prisma.taskComment.delete({
          where: { id: input.commentId, userId },
        });
      }),

    react: protectedProcedure
      .input(z.object({ commentId: z.string(), emoji: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const existing = await prisma.taskCommentReaction.findUnique({
          where: { commentId_userId_emoji: { commentId: input.commentId, userId, emoji: input.emoji } },
        });
        if (existing) {
          return prisma.taskCommentReaction.delete({
            where: { commentId_userId_emoji: { commentId: input.commentId, userId, emoji: input.emoji } },
          });
        }
        return prisma.taskCommentReaction.create({
          data: { commentId: input.commentId, userId, emoji: input.emoji },
        });
      }),
  }),

  // Watchers
  watchers: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        return prisma.taskWatcher.findMany({
          where: { taskId: input.taskId },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          },
          orderBy: { addedAt: 'desc' }
        });
      }),

    add: protectedProcedure
      .input(z.object({ taskId: z.string(), userId: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.taskWatcher.create({
          data: {
            taskId: input.taskId,
            userId: input.userId,
          },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        });
      }),

    remove: protectedProcedure
      .input(z.object({ taskId: z.string(), userId: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.taskWatcher.deleteMany({
          where: {
            taskId: input.taskId,
            userId: input.userId,
          }
        });
      }),
  }),

  // Checklists
  checklists: router({
    create: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        name: z.string(),
        position: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const checklist = await prisma.checklist.create({
          data: {
            taskId: input.taskId,
            name: input.name,
            position: input.position ?? 0,
          },
          include: { items: true }
        });
        await recordTaskActivity(prisma as Tx, { taskId: input.taskId, userId, action: "UPDATED", field: "checklists", newValue: { name: input.name } });
        return checklist;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        position: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const checklist = await prisma.checklist.findUnique({ where: { id: input.id }, select: { taskId: true } });
        const updated = await prisma.checklist.update({
          where: { id: input.id },
          data: { name: input.name, position: input.position },
          include: { items: true }
        });
        if (checklist?.taskId) {
          await recordTaskActivity(prisma as Tx, { taskId: checklist.taskId, userId, action: "UPDATED", field: "checklists", newValue: { id: input.id, name: input.name } });
        }
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const checklist = await prisma.checklist.findUnique({ where: { id: input.id }, select: { taskId: true, name: true } });
        const deleted = await prisma.checklist.delete({ where: { id: input.id } });
        if (checklist?.taskId) {
          await recordTaskActivity(prisma as Tx, { taskId: checklist.taskId, userId, action: "UPDATED", field: "checklists", oldValue: { id: input.id, name: checklist.name } });
        }
        return deleted;
      }),

    checkAll: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await prisma.checklistItem.updateMany({
          where: { checklistId: input.id },
          data: { isCompleted: true, completedAt: new Date() },
        });
        return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } });
      }),

    uncheckAll: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await prisma.checklistItem.updateMany({
          where: { checklistId: input.id },
          data: { isCompleted: false, completedAt: null },
        });
        return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } });
      }),

    assignAll: protectedProcedure
      .input(z.object({ id: z.string(), assigneeIds: z.array(z.string()).optional() }))
      .mutation(async ({ input }) => {
        const assigneeId = input.assigneeIds?.[0] ?? null;
        await prisma.checklistItem.updateMany({
          where: { checklistId: input.id },
          data: { assigneeId },
        });
        return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } });
      }),

    unassignAll: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await prisma.checklistItem.updateMany({
          where: { checklistId: input.id },
          data: { assigneeId: null },
        });
        return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } });
      }),

    moveUp: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const checklist = await prisma.checklist.findUnique({ where: { id: input.id }, select: { taskId: true, position: true } });
        if (!checklist) return null;
        const prev = await prisma.checklist.findFirst({
          where: { taskId: checklist.taskId, position: { lt: checklist.position } },
          orderBy: { position: 'desc' },
          select: { id: true, position: true },
        });
        if (!prev) return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: true } });
        await prisma.$transaction([
          prisma.checklist.update({ where: { id: input.id }, data: { position: prev.position } }),
          prisma.checklist.update({ where: { id: prev.id }, data: { position: checklist.position } }),
        ]);
        return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } });
      }),

    moveDown: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const checklist = await prisma.checklist.findUnique({ where: { id: input.id }, select: { taskId: true, position: true } });
        if (!checklist) return null;
        const next = await prisma.checklist.findFirst({
          where: { taskId: checklist.taskId, position: { gt: checklist.position } },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        });
        if (!next) return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: true } });
        await prisma.$transaction([
          prisma.checklist.update({ where: { id: input.id }, data: { position: next.position } }),
          prisma.checklist.update({ where: { id: next.id }, data: { position: checklist.position } }),
        ]);
        return prisma.checklist.findUnique({ where: { id: input.id }, include: { items: { include: { assignee: true }, orderBy: { position: 'asc' } } } });
      }),

    items: router({
      create: protectedProcedure
        .input(z.object({
          checklistId: z.string(),
          name: z.string(),
          position: z.number().optional(),
          assigneeId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return prisma.checklistItem.create({
            data: {
              checklistId: input.checklistId,
              name: input.name,
              position: input.position ?? 0,
              assigneeId: input.assigneeId,
            },
            include: {
              assignee: { select: { id: true, name: true, image: true } }
            }
          });
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.string(),
          name: z.string().optional(),
          isCompleted: z.boolean().optional(),
          position: z.number().optional(),
          assigneeId: z.string().optional().nullable(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return prisma.checklistItem.update({
            where: { id },
            data: {
              ...data,
              ...(input.isCompleted !== undefined && input.isCompleted
                ? { completedAt: new Date() }
                : input.isCompleted === false
                  ? { completedAt: null }
                  : {}),
            },
            include: {
              assignee: { select: { id: true, name: true, image: true } }
            }
          });
        }),

      toggle: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          const item = await prisma.checklistItem.findUnique({
            where: { id: input.id }
          });
          if (!item) throw new Error("Checklist item not found");

          return prisma.checklistItem.update({
            where: { id: input.id },
            data: {
              isCompleted: !item.isCompleted,
              completedAt: !item.isCompleted ? new Date() : null,
            }
          });
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          return prisma.checklistItem.delete({ where: { id: input.id } });
        }),

      reorder: protectedProcedure
        .input(z.object({
          checklistId: z.string(),
          itemIds: z.array(z.string()),
        }))
        .mutation(async ({ input }) => {
          await Promise.all(
            input.itemIds.map((id, index) =>
              prisma.checklistItem.update({
                where: { id },
                data: { position: index },
              })
            )
          );
          return prisma.checklistItem.findMany({
            where: { checklistId: input.checklistId },
            include: { assignee: { select: { id: true, name: true, image: true } } },
            orderBy: { position: 'asc' },
          });
        }),
    }),
  }),

  // Attachments
  attachments: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        return prisma.taskAttachment.findMany({
          where: { taskId: input.taskId },
          include: {
            uploader: { select: { id: true, name: true, image: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }),

    create: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        filename: z.string(),
        url: z.string(),
        size: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const attachment = await prisma.taskAttachment.create({
          data: {
            taskId: input.taskId,
            uploadedBy: userId,
            filename: input.filename,
            url: input.url,
            size: BigInt(input.size),
            mimeType: input.mimeType,
          },
          include: {
            uploader: { select: { id: true, name: true, image: true } }
          }
        });
        await recordTaskActivity(prisma as Tx, { taskId: input.taskId, userId, action: "ATTACHED", field: "attachments", newValue: { filename: input.filename } });
        return attachment;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.taskAttachment.delete({ where: { id: input.id } });
      }),
  }),

  // Task Links
  taskLinks: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        return prisma.taskLink.findMany({
          where: { taskId: input.taskId },
          include: {
            creator: { select: { id: true, name: true, image: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }),

    create: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        url: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session!.user!.id;
        const link = await prisma.taskLink.create({
          data: {
            taskId: input.taskId,
            createdBy: userId,
            url: input.url,
            title: input.title,
            description: input.description,
          },
          include: {
            creator: { select: { id: true, name: true, image: true } }
          }
        });
        await recordTaskActivity(prisma as Tx, { taskId: input.taskId, userId, action: "ATTACHED", field: "taskLinks", newValue: { url: input.url } });
        return link;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.taskLink.delete({ where: { id: input.id } });
      }),
  }),

  // Time Entries
  timeEntries: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        return prisma.timeEntry.findMany({
          where: { taskId: input.taskId },
          include: {
            user: { select: { id: true, name: true, image: true } }
          },
          orderBy: { startTime: 'desc' }
        });
      }),

    create: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        duration: z.number(),
        description: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        billable: z.boolean().optional(),
        userId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const currentUserId = ctx.session!.user!.id;
        const targetUserId = input.userId ?? currentUserId;
        if (targetUserId !== currentUserId) {
          const task = await prisma.task.findUnique({
            where: { id: input.taskId },
            select: { workspaceId: true },
          });
          if (!task?.workspaceId) throw new Error("Task not found");
          const isMember = await prisma.workspaceMember.findFirst({
            where: { workspaceId: task.workspaceId, userId: targetUserId },
          });
          if (!isMember) throw new Error("User is not a member of this workspace");
        }
        const entry = await prisma.timeEntry.create({
          data: {
            taskId: input.taskId,
            userId: targetUserId,
            duration: input.duration,
            description: input.description,
            startTime: input.startTime ? new Date(input.startTime) : new Date(),
            endTime: input.endTime ? new Date(input.endTime) : null,
            billable: input.billable ?? false,
          },
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        });
        await recordTaskActivity(prisma as Tx, { taskId: input.taskId, userId: currentUserId, action: "UPDATED", field: "time_tracked", newValue: { duration: input.duration, description: input.description } });
        return entry;
      }),

    start: protectedProcedure
      .input(z.object({ taskId: z.string(), description: z.string().optional(), userId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const currentUserId = ctx.session!.user!.id;
        const targetUserId = input.userId ?? currentUserId;
        if (targetUserId !== currentUserId) {
          const task = await prisma.task.findUnique({
            where: { id: input.taskId },
            select: { workspaceId: true },
          });
          if (!task?.workspaceId) throw new Error("Task not found");
          const isMember = await prisma.workspaceMember.findFirst({
            where: { workspaceId: task.workspaceId, userId: targetUserId },
          });
          if (!isMember) throw new Error("User is not a member of this workspace");
        }
        // Stop any running timers for this user
        await prisma.timeEntry.updateMany({
          where: { userId: targetUserId, isRunning: true },
          data: {
            isRunning: false,
            endTime: new Date(),
          }
        });

        return prisma.timeEntry.create({
          data: {
            taskId: input.taskId,
            userId: targetUserId,
            duration: 0,
            description: input.description,
            startTime: new Date(),
            isRunning: true,
          },
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        });
      }),

    stop: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const entry = await prisma.timeEntry.findUnique({
          where: { id: input.id }
        });
        if (!entry) throw new Error("Time entry not found");

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

        return prisma.timeEntry.update({
          where: { id: input.id },
          data: {
            isRunning: false,
            endTime,
            duration,
          },
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.timeEntry.delete({ where: { id: input.id } });
      }),

    getRunning: protectedProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.session!.user!.id;
        return prisma.timeEntry.findFirst({
          where: { userId, isRunning: true },
          include: {
            task: { select: { id: true, title: true } },
            user: { select: { id: true, name: true, image: true } }
          }
        });
      }),
  }),

  // Custom Fields
  customFields: router({
    update: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        customFieldId: z.string(),
        value: z.any(),
      }))
      .mutation(async ({ input }) => {
        const existing = await prisma.customFieldValue.findFirst({
          where: {
            taskId: input.taskId,
            customFieldId: input.customFieldId,
          }
        });

        if (existing) {
          return prisma.customFieldValue.update({
            where: { id: existing.id },
            data: { value: input.value },
            include: {
              customField: true
            }
          });
        }

        return prisma.customFieldValue.create({
          data: {
            taskId: input.taskId,
            customFieldId: input.customFieldId,
            value: input.value,
          },
          include: {
            customField: true
          }
        });
      }),

    delete: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        customFieldId: z.string(),
      }))
      .mutation(async ({ input }) => {
        return prisma.customFieldValue.deleteMany({
          where: {
            taskId: input.taskId,
            customFieldId: input.customFieldId,
          }
        });
      }),
  }),

  createProposalFromTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => ({ id: input.taskId, proposalId: input.taskId })),

});

