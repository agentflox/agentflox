import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@agentflox/database/src/generated/prisma";
import { Visibility, WorkspaceRole, PermissionLevel } from "@agentflox/database/src/generated/prisma";
import { permissionsService } from "@/services/permissions.service";
import { generateKeyBetween } from "fractional-indexing";
import { randomUUID } from "crypto";

// ─── Constants ───────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  "SPACE", "FOLDER", "LIST", "TASK", "DOC",
  "VIEW", "AGENT", "WORKFORCE", "PROPOSAL", "LISTING",
] as const;

const COMPLEXITY_TYPES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const SHARE_WITH_TYPES = ["user", "team"] as const;
const SHARE_SCOPE_TYPES = ["everyone", "members", "admins", "me", "custom"] as const;

const TEMPLATE_AUDIT_EVENTS = [
  "CREATED", "UPDATED", "DELETED", "ARCHIVED", "RESTORED",
  "PUBLISHED", "UNPUBLISHED", "APPLIED", "MERGED",
  "SHARED", "UNSHARED", "VERSION_CREATED", "VERSION_RESTORED",
] as const;

const TEMPLATE_AUDIT_STATUSES = ["SUCCESS", "FAILED", "PARTIAL"] as const;

// ─── Selects ─────────────────────────────────────────────────────────────────

const TEMPLATE_SELECT = {
  id: true,
  name: true,
  description: true,
  icon: true,
  coverImage: true,
  color: true,
  tags: true,
  category: true,
  complexity: true,
  entityType: true,
  isPublic: true,
  isFeatured: true,
  isSystem: true,
  isArchived: true,
  useCount: true,
  viewCount: true,
  version: true,
  workspaceId: true,
  organizationId: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  visibility: true,
  shareUserIds: true,
  shareTeamIds: true,
  creator: { select: { id: true, name: true, image: true } },
} as const;

const AUDIT_LOG_SELECT = {
  id: true,
  event: true,
  status: true,
  targetEntityType: true,
  targetEntityId: true,
  targetEntityName: true,
  metadata: true,
  errorMessage: true,
  createdAt: true,
  template: { select: { id: true, name: true, entityType: true, icon: true } },
  actor: { select: { id: true, name: true, image: true } },
} as const;

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const templateSharesSchema = z.array(
  z.object({ type: z.enum(SHARE_WITH_TYPES), id: z.string().cuid() })
);

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(150),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  category: z.string().max(100).optional(),
  complexity: z.enum(COMPLEXITY_TYPES).optional(),
  entityType: z.enum(ENTITY_TYPES),
  shareWith: z.enum(SHARE_SCOPE_TYPES).default("me"),
  publicSharing: z.boolean().default(false),
  captureConfig: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()).optional().default({}),
  shares: templateSharesSchema.optional().default([]),
  workspaceId: z.string().cuid().optional(),
});

const updateTemplateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(2048).nullable().optional(),
  coverImage: z.string().max(2048).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(100).optional(),
  complexity: z.enum(COMPLEXITY_TYPES).optional(),
  entityType: z.enum(ENTITY_TYPES).optional(),
  shareWith: z.enum(SHARE_SCOPE_TYPES).optional(),
  publicSharing: z.boolean().optional(),
  captureConfig: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  shares: templateSharesSchema.optional(),
});

// ─── Permission Helpers ───────────────────────────────────────────────────────

/** Team IDs the user belongs to within a workspace. */
async function getWorkspaceTeamIds(userId: string, workspaceId: string): Promise<string[]> {
  const rows = await prisma.teamMember.findMany({
    where: { userId, team: { workspaceId } },
    select: { teamId: true },
  });
  return rows.map((r) => r.teamId);
}

/**
 * Whether a workspace role can VIEW a given visibility level.
 * Used for listing/reading templates.
 */
function roleCanView(
  visibility: (typeof Visibility)[keyof typeof Visibility],
  role: WorkspaceRole
): boolean {
  switch (visibility) {
    case Visibility.PUBLIC:
    case Visibility.EVERYONE:
      return true;
    case Visibility.MEMBERS:
      return (
        role === WorkspaceRole.OWNER ||
        role === WorkspaceRole.ADMIN ||
        role === WorkspaceRole.MEMBER ||
        role === WorkspaceRole.LIMITED_MEMBER ||
        role === WorkspaceRole.LIMITED_MEMBER_VIEW_ONLY
      );
    case Visibility.ADMINS:
      return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
    case Visibility.PRIVATE:
    default:
      return false;
  }
}

/**
 * Whether a workspace role can EDIT a given visibility level.
 * More restrictive than view — VIEW_ONLY members cannot edit.
 */
function roleCanEdit(
  visibility: (typeof Visibility)[keyof typeof Visibility],
  role: WorkspaceRole
): boolean {
  switch (visibility) {
    case Visibility.PUBLIC:
    case Visibility.EVERYONE:
      return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
    case Visibility.MEMBERS:
      return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN || role === WorkspaceRole.MEMBER;
    case Visibility.ADMINS:
      return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
    case Visibility.PRIVATE:
    default:
      return false;
  }
}

/**
 * Converts shareWith + shares array → visibility fields for DB write.
 */
function resolveShareFields(
  shareWith: (typeof SHARE_SCOPE_TYPES)[number],
  shares: { type: string; id: string }[]
): {
  visibility: (typeof Visibility)[keyof typeof Visibility];
  shareUserIds: string[];
  shareTeamIds: string[];
} {
  switch (shareWith) {
    case "everyone":
      return { visibility: Visibility.EVERYONE, shareUserIds: [], shareTeamIds: [] };
    case "members":
      return { visibility: Visibility.MEMBERS, shareUserIds: [], shareTeamIds: [] };
    case "admins":
      return { visibility: Visibility.ADMINS, shareUserIds: [], shareTeamIds: [] };
    case "me":
      return { visibility: Visibility.PRIVATE, shareUserIds: [], shareTeamIds: [] };
    case "custom": {
      const shareUserIds = shares.filter((s) => s.type === "user").map((s) => s.id);
      const shareTeamIds = shares.filter((s) => s.type === "team").map((s) => s.id);
      return { visibility: Visibility.PRIVATE, shareUserIds, shareTeamIds };
    }
    default:
      return { visibility: Visibility.PRIVATE, shareUserIds: [], shareTeamIds: [] };
  }
}

type TemplateTaskNode = Record<string, any> & {
  other_tasks?: TemplateTaskNode[];
  subtasks?: TemplateTaskNode[];
};

function asDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getTemplateSubtasks(node: TemplateTaskNode): TemplateTaskNode[] {
  if (Array.isArray(node.other_tasks)) return node.other_tasks;
  if (Array.isArray(node.subtasks)) return node.subtasks;
  return [];
}

function shiftDateByMs(date: Date | null, shiftMs?: number): Date | null {
  if (!date) return null;
  if (!shiftMs) return date;
  return new Date(date.getTime() + shiftMs);
}

function makeListingSlugBase(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "listing";
}

async function generateUniqueListingSlug(input: string): Promise<string> {
  const base = makeListingSlugBase(input);
  const existing = await prisma.marketplaceListing.findUnique({
    where: { slug: base },
    select: { id: true },
  });
  if (!existing) return base;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    const match = await prisma.marketplaceListing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!match) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function isCaptureEnabled(
  importMode: "everything" | "customize",
  taskChecks: Record<string, boolean> | undefined,
  key: string
): boolean {
  if (importMode === "everything") return true;
  return !!taskChecks?.[key];
}

async function overwriteTaskFromTemplateNode(params: {
  tx: Prisma.TransactionClient;
  taskId: string;
  source: TemplateTaskNode;
  currentUserId: string;
  rootNameOverride?: string;
  importMode: "everything" | "customize";
  taskChecks?: Record<string, boolean>;
  dueDateShiftMs?: number;
}) {
  const { tx, taskId, source, currentUserId, rootNameOverride, importMode, taskChecks, dueDateShiftMs } = params;
  const patch: any = {};

  if (rootNameOverride || isCaptureEnabled(importMode, taskChecks, "title")) {
    patch.title = (rootNameOverride ?? source.title ?? source.name ?? "").toString().trim() || "Untitled task";
  }
  if (isCaptureEnabled(importMode, taskChecks, "description")) patch.description = source.description ?? null;
  if (isCaptureEnabled(importMode, taskChecks, "priority")) patch.priority = source.priority ?? undefined;
  if (isCaptureEnabled(importMode, taskChecks, "dueDates")) patch.dueDate = shiftDateByMs(asDateOrNull(source.dueDate), dueDateShiftMs);
  if (isCaptureEnabled(importMode, taskChecks, "startDate")) patch.startDate = shiftDateByMs(asDateOrNull(source.startDate), dueDateShiftMs);
  if (isCaptureEnabled(importMode, taskChecks, "duration")) patch.timeEstimate = source.timeEstimate ?? null;
  if (isCaptureEnabled(importMode, taskChecks, "duration")) patch.noStartTime = !!source.noStartTime;
  if (isCaptureEnabled(importMode, taskChecks, "duration")) patch.noEndTime = !!source.noEndTime;
  if (isCaptureEnabled(importMode, taskChecks, "tags")) patch.tags = Array.isArray(source.tags) ? source.tags : [];
  if (isCaptureEnabled(importMode, taskChecks, "taskTypes")) patch.taskTypeId = source.taskTypeId ?? null;
  if (isCaptureEnabled(importMode, taskChecks, "copySettingsForStatuses")) patch.visibility = source.visibility ?? undefined;
  if (isCaptureEnabled(importMode, taskChecks, "copySettingsForStatuses")) patch.isPublic = !!source.isPublic;
  if (isCaptureEnabled(importMode, taskChecks, "currentTaskStatuses")) {
    patch.statusId = typeof source.statusId === "string" && !source.statusId.startsWith("system:") ? source.statusId : null;
  }

  await tx.task.update({ where: { id: taskId }, data: patch as any });

  if (isCaptureEnabled(importMode, taskChecks, "assignees")) {
    await tx.taskAssignee.deleteMany({ where: { taskId } });
    const assignees = Array.isArray(source.assignees) ? source.assignees : [];
    if (assignees.length) {
      await tx.taskAssignee.createMany({
        data: assignees.map((a: any) => ({
          taskId,
          userId: a.userId ?? null,
          teamId: a.teamId ?? null,
          agentId: a.agentId ?? null,
          assigned_by: currentUserId,
        })),
        skipDuplicates: true,
      });
      const firstUser = assignees.find((a: any) => !!a.userId)?.userId ?? null;
      await tx.task.update({ where: { id: taskId }, data: { assigneeId: firstUser } });
    } else {
      await tx.task.update({ where: { id: taskId }, data: { assigneeId: null } });
    }
  }

  if (isCaptureEnabled(importMode, taskChecks, "checklists")) {
    await tx.checklist.deleteMany({ where: { taskId } });
    const checklists = Array.isArray(source.checklists) ? source.checklists : [];
    for (const c of checklists) {
      await tx.checklist.create({
        data: {
          taskId,
          name: c.name ?? "Checklist",
          position: c.position ?? 0,
          items: {
            create: Array.isArray(c.items)
              ? c.items.map((i: any) => ({
                name: i.name ?? "Item",
                isCompleted: !!i.isCompleted,
                position: i.position ?? 0,
                assigneeId: i.assigneeId ?? null,
              }))
              : [],
          },
        },
      });
    }
  }

  if (isCaptureEnabled(importMode, taskChecks, "customFields")) {
    await tx.customFieldValue.deleteMany({ where: { taskId } });
    const fieldValues = Array.isArray(source.customFieldValues) ? source.customFieldValues : [];
    if (fieldValues.length) {
      await tx.customFieldValue.createMany({
        data: fieldValues.map((f: any) => ({
          taskId,
          customFieldId: f.customFieldId,
          value: f.value ?? {},
          projectId: f.projectId ?? null,
        })),
      });
    }
  }

  if (isCaptureEnabled(importMode, taskChecks, "attachments")) {
    await tx.taskAttachment.deleteMany({ where: { taskId } });
    const attachments = Array.isArray(source.attachments) ? source.attachments : [];
    if (attachments.length) {
      await tx.taskAttachment.createMany({
        data: attachments.map((a: any) => ({
          taskId,
          filename: a.filename ?? "attachment",
          url: a.url ?? "",
          size: BigInt(a.size ?? 0),
          mimeType: a.mimeType ?? null,
          uploadedBy: currentUserId,
        })),
      });
    }
  }

  if (isCaptureEnabled(importMode, taskChecks, "dependencies") || isCaptureEnabled(importMode, taskChecks, "relationships")) {
    await tx.taskDependency.deleteMany({ where: { taskId } });
    const dependencies = Array.isArray(source.dependencies) ? source.dependencies : [];
    if (dependencies.length) {
      await tx.taskDependency.createMany({
        data: dependencies
          .filter((d: any) => typeof d?.dependsOnId === "string")
          .map((d: any) => ({
            taskId,
            dependsOnId: d.dependsOnId,
            type: d.type ?? "BLOCKS",
          })),
      });
    }
  }
}

async function syncSubtasksAtSameLevel(params: {
  tx: Prisma.TransactionClient;
  parentTaskId: string;
  sourceParentNode: TemplateTaskNode;
  currentUserId: string;
  importMode: "everything" | "customize";
  taskChecks?: Record<string, boolean>;
  dueDateShiftMs?: number;
}) {
  const { tx, parentTaskId, sourceParentNode, currentUserId, importMode, taskChecks, dueDateShiftMs } = params;
  const sourceSubs = getTemplateSubtasks(sourceParentNode);
  const targetSubs = await tx.task.findMany({
    where: { parentId: parentTaskId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, listId: true, statusId: true, order: true, position: true },
  });

  for (let idx = 0; idx < sourceSubs.length; idx += 1) {
    const sourceSub = sourceSubs[idx]!;
    const targetSub = targetSubs[idx];
    if (targetSub) {
      await overwriteTaskFromTemplateNode({
        tx,
        taskId: targetSub.id,
        source: sourceSub,
        currentUserId,
        importMode,
        taskChecks,
        dueDateShiftMs,
      });
      await syncSubtasksAtSameLevel({
        tx,
        parentTaskId: targetSub.id,
        sourceParentNode: sourceSub,
        currentUserId,
        importMode,
        taskChecks,
        dueDateShiftMs,
      });
      continue;
    }

    const previous = idx > 0 ? targetSubs[idx - 1] : null;
    const order = generateKeyBetween(previous?.order ?? null, null);
    const position = generateKeyBetween(previous?.position ?? null, null);
    const created = await tx.task.create({
      data: {
        title: (sourceSub.title ?? sourceSub.name ?? "Untitled task").toString(),
        description: sourceSub.description ?? null,
        priority: sourceSub.priority ?? undefined,
        dueDate: shiftDateByMs(asDateOrNull(sourceSub.dueDate), dueDateShiftMs),
        startDate: shiftDateByMs(asDateOrNull(sourceSub.startDate), dueDateShiftMs),
        timeEstimate: sourceSub.timeEstimate ?? null,
        tags: Array.isArray(sourceSub.tags) ? sourceSub.tags : [],
        statusId: typeof sourceSub.statusId === "string" && !sourceSub.statusId.startsWith("system:") ? sourceSub.statusId : undefined,
        taskTypeId: sourceSub.taskTypeId ?? undefined,
        createdBy: currentUserId,
        parentId: parentTaskId,
        listId: sourceSub.listId ?? targetSubs[0]?.listId ?? undefined,
        order,
        position,
      } as any,
    });
    await overwriteTaskFromTemplateNode({
      tx,
      taskId: created.id,
      source: sourceSub,
      currentUserId,
      importMode,
      taskChecks,
      dueDateShiftMs,
    });
    await syncSubtasksAtSameLevel({
      tx,
      parentTaskId: created.id,
      sourceParentNode: sourceSub,
      currentUserId,
      importMode,
      taskChecks,
      dueDateShiftMs,
    });
  }

  if (targetSubs.length > sourceSubs.length) {
    const extraIds = targetSubs.slice(sourceSubs.length).map((t) => t.id);
    await tx.task.deleteMany({ where: { id: { in: extraIds } } });
  }
}

/**
 * Builds the OR clause for templates a user can VIEW within a workspace.
 */
async function buildViewAccessOr(
  userId: string,
  workspaceId: string
): Promise<Prisma.TemplateWhereInput[]> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, status: true },
  });
  const teamIds = await getWorkspaceTeamIds(userId, workspaceId);

  // Always: own templates + explicitly shared with user/team
  const or: Prisma.TemplateWhereInput[] = [
    { createdBy: userId },
    {
      AND: [
        { visibility: Visibility.PRIVATE },
        {
          OR: [
            { shareUserIds: { has: userId } },
            ...(teamIds.length ? [{ shareTeamIds: { hasSome: teamIds } }] : []),
          ],
        },
      ],
    },
  ];

  if (!membership || membership.status !== "ACTIVE") return or;

  const { role } = membership;
  const visibilitiesToCheck = [
    Visibility.PUBLIC,
    Visibility.EVERYONE,
    Visibility.MEMBERS,
    Visibility.ADMINS,
  ] as const;

  for (const v of visibilitiesToCheck) {
    if (roleCanView(v, role)) or.push({ visibility: v });
  }

  return or;
}

/**
 * Builds the OR clause for templates a user can EDIT within a workspace.
 * Stricter than view — excludes VIEW_ONLY roles from broad visibility matches.
 */
async function buildEditAccessOr(
  userId: string,
  workspaceId: string
): Promise<Prisma.TemplateWhereInput[]> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, status: true },
  });
  const teamIds = await getWorkspaceTeamIds(userId, workspaceId);

  // Always: own templates + explicitly shared with user/team
  const or: Prisma.TemplateWhereInput[] = [
    { createdBy: userId },
    {
      AND: [
        { visibility: Visibility.PRIVATE },
        {
          OR: [
            { shareUserIds: { has: userId } },
            ...(teamIds.length ? [{ shareTeamIds: { hasSome: teamIds } }] : []),
          ],
        },
      ],
    },
  ];

  if (!membership || membership.status !== "ACTIVE") return or;

  const { role } = membership;
  const visibilitiesToCheck = [
    Visibility.PUBLIC,
    Visibility.EVERYONE,
    Visibility.MEMBERS,
    Visibility.ADMINS,
  ] as const;

  for (const v of visibilitiesToCheck) {
    if (roleCanEdit(v, role)) or.push({ visibility: v });
  }

  return or;
}

/**
 * Asserts the user has EDIT permission on a specific template.
 * Throws FORBIDDEN or NOT_FOUND if they don't.
 */
async function assertCanEdit(userId: string, templateId: string): Promise<void> {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      createdBy: true,
      workspaceId: true,
      visibility: true,
      shareUserIds: true,
      shareTeamIds: true,
    },
  });

  if (!template) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
  }

  // Creator always has full access
  if (template.createdBy === userId) return;

  // Global / system templates — only creator can edit
  if (!template.workspaceId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You cannot edit this template" });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: template.workspaceId, userId } },
    select: { role: true, status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "You cannot edit this template" });
  }

  const { role } = membership;
  const v = template.visibility;

  // Check role-based edit permission
  if (roleCanEdit(v, role)) return;

  // For PRIVATE: check explicit share lists
  if (v === Visibility.PRIVATE) {
    if (template.shareUserIds.includes(userId)) return;
    const teamIds = await getWorkspaceTeamIds(userId, template.workspaceId);
    if (teamIds.some((tid) => template.shareTeamIds.includes(tid))) return;
  }

  throw new TRPCError({ code: "FORBIDDEN", message: "You cannot edit this template" });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const templateRouter = router({
  /**
   * List templates by scope.
   * Scopes:
   *   featured  – isFeatured = true
   *   workspace – scoped to workspaceId with access control
   *   global    – workspaceId IS NULL, isSystem = false, isPublic = true
   *   builtin   – isSystem = true
   *   all       – no scope filter (global + builtin visible to all)
   */
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().cuid().optional(),
        scope: z
          .enum(["featured", "workspace", "global", "builtin", "all"])
          .optional()
          .default("all"),
        editableOnly: z.boolean().optional().default(false),
        entityTypes: z.array(z.enum(ENTITY_TYPES)).optional(),
        tags: z.array(z.string()).optional(),
        createdByIds: z.array(z.string().cuid()).optional(),
        categories: z.array(z.string()).optional(),
        complexity: z.enum(COMPLEXITY_TYPES).optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { scope, workspaceId, editableOnly, entityTypes, tags, createdByIds, categories, complexity, search } = input;

      const andParts: Prisma.TemplateWhereInput[] = [{ isArchived: false }];

      if (scope === "featured") {
        andParts.push({ isFeatured: true });
      } else if (scope === "workspace") {
        if (!workspaceId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "workspaceId required for workspace scope" });
        }
        const accessOr = editableOnly
          ? await buildEditAccessOr(userId, workspaceId)
          : await buildViewAccessOr(userId, workspaceId);
        andParts.push({ workspaceId });
        andParts.push({ OR: accessOr });
      } else if (scope === "global") {
        andParts.push({ workspaceId: null, isSystem: false, isPublic: true });
      } else if (scope === "builtin") {
        andParts.push({ isSystem: true });
      }

      if (entityTypes?.length) andParts.push({ entityType: { in: entityTypes } });
      if (tags?.length) andParts.push({ tags: { hasSome: tags } });
      if (createdByIds?.length) andParts.push({ createdBy: { in: createdByIds } });
      if (categories?.length) andParts.push({ category: { in: categories } });
      if (complexity) andParts.push({ complexity });
      if (search?.trim()) {
        const q = search.trim();
        andParts.push({
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        });
      }

      const where: Prisma.TemplateWhereInput =
        andParts.length === 1 ? andParts[0]! : { AND: andParts };

      const skip = (input.page - 1) * input.pageSize;

      const [total, items] = await Promise.all([
        prisma.template.count({ where }),
        prisma.template.findMany({
          where,
          select: TEMPLATE_SELECT,
          orderBy: [{ isFeatured: "desc" }, { useCount: "desc" }, { createdAt: "desc" }],
          skip,
          take: input.pageSize,
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * Counts per section for sidebar badges.
   */
  counts: protectedProcedure
    .input(z.object({ workspaceId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const workspaceWhere =
        input.workspaceId != null
          ? {
            isArchived: false,
            workspaceId: input.workspaceId,
            OR: await buildViewAccessOr(userId, input.workspaceId),
          }
          : null;

      const [featured, workspace, global, builtin] = await Promise.all([
        prisma.template.count({ where: { isFeatured: true, isArchived: false } }),
        workspaceWhere ? prisma.template.count({ where: workspaceWhere }) : Promise.resolve(0),
        prisma.template.count({ where: { workspaceId: null, isSystem: false, isPublic: true, isArchived: false } }),
        prisma.template.count({ where: { isSystem: true, isArchived: false } }),
      ]);

      return { featured, workspace, global, builtin };
    }),

  /**
   * All unique tags across templates the user can access.
   */
  tags: protectedProcedure
    .input(z.object({ workspaceId: z.string().cuid().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      const workspaceClause =
        input.workspaceId != null
          ? {
            AND: [
              { workspaceId: input.workspaceId },
              { OR: await buildViewAccessOr(userId, input.workspaceId) },
            ],
          }
          : null;

      const rows = await prisma.template.findMany({
        where: {
          isArchived: false,
          OR: [
            { isPublic: true },
            { isSystem: true },
            ...(workspaceClause ? [workspaceClause] : []),
          ],
        },
        select: { tags: true },
      });

      const tagSet = new Set<string>();
      for (const row of rows) {
        for (const tag of row.tags) tagSet.add(tag);
      }
      return Array.from(tagSet).sort();
    }),

  /**
   * Users who have created templates in this workspace + all workspace members.
   */
  createdByUsers: protectedProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const accessOr = await buildViewAccessOr(userId, input.workspaceId);

      const [creators, members] = await Promise.all([
        prisma.template.findMany({
          where: {
            isArchived: false,
            OR: [
              { isPublic: true },
              { isSystem: true },
              { AND: [{ workspaceId: input.workspaceId }, { OR: accessOr }] },
            ],
          },
          select: { creator: { select: { id: true, name: true, image: true } } },
          distinct: ["createdBy"],
        }),
        prisma.workspaceMember.findMany({
          where: { workspaceId: input.workspaceId },
          select: { user: { select: { id: true, name: true, image: true } } },
        }),
      ]);

      const userMap = new Map<string, { id: string; name: string | null; image: string | null }>();
      for (const t of creators) {
        if (t.creator) userMap.set(t.creator.id, t.creator);
      }
      for (const m of members) {
        if (m.user) userMap.set(m.user.id, m.user);
      }

      return Array.from(userMap.values());
    }),

  /**
   * Audit logs for templates in this workspace.
   */
  auditLogs: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().cuid().optional(),
        templateId: z.string().cuid().optional(),
        events: z.array(z.enum(TEMPLATE_AUDIT_EVENTS)).optional(),
        status: z.enum(TEMPLATE_AUDIT_STATUSES).optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const where: Prisma.TemplateAuditLogWhereInput = {};

      if (input.templateId) {
        where.templateId = input.templateId;
      } else if (input.workspaceId) {
        where.template = {
          OR: [
            { workspaceId: input.workspaceId },
            { isPublic: true },
            { isSystem: true },
          ],
        };
      }

      if (input.events?.length) where.event = { in: input.events };
      if (input.status) where.status = input.status;

      if (input.search?.trim()) {
        where.template = {
          ...(where.template as any),
          name: { contains: input.search.trim(), mode: "insensitive" },
        };
      }

      const skip = (input.page - 1) * input.pageSize;

      const [total, items] = await Promise.all([
        prisma.templateAuditLog.count({ where }),
        prisma.templateAuditLog.findMany({
          where,
          select: AUDIT_LOG_SELECT,
          orderBy: { createdAt: "desc" },
          skip,
          take: input.pageSize,
        }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * Record an audit event (e.g. when a template is applied/merged).
   */
  recordAuditEvent: protectedProcedure
    .input(
      z.object({
        templateId: z.string().cuid(),
        event: z.enum(TEMPLATE_AUDIT_EVENTS),
        targetEntityType: z.enum(ENTITY_TYPES).optional(),
        targetEntityId: z.string().optional(),
        targetEntityName: z.string().max(255).optional(),
        status: z.enum(TEMPLATE_AUDIT_STATUSES).optional().default("SUCCESS"),
        errorMessage: z.string().max(1000).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = ctx.session!.user!.id;

      // Verify template exists
      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
        select: { id: true },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const [log] = await Promise.all([
        prisma.templateAuditLog.create({
          data: {
            templateId: input.templateId,
            actorId,
            event: input.event,
            targetEntityType: input.targetEntityType,
            targetEntityId: input.targetEntityId,
            targetEntityName: input.targetEntityName,
            status: input.status,
            errorMessage: input.errorMessage,
            ...(input.metadata !== undefined && {
              metadata: input.metadata as Prisma.InputJsonValue,
            }),
          },
          select: AUDIT_LOG_SELECT,
        }),
        // Increment use count only on APPLIED / MERGED
        ...(["APPLIED", "MERGED"].includes(input.event)
          ? [prisma.template.update({
            where: { id: input.templateId },
            data: { useCount: { increment: 1 } },
          })]
          : []),
      ]);

      return log;
    }),

  applyToTask: protectedProcedure
    .input(
      z.object({
        templateId: z.string().cuid(),
        targetTaskId: z.string().cuid(),
        entityName: z.string().min(1).max(255).optional(),
        importMode: z.enum(["everything", "customize"]).default("everything"),
        taskChecks: z.record(z.string(), z.boolean()).optional(),
        dateMode: z.enum(["as-is", "remap"]).optional(),
        remapDueDate: z.string().optional(),
        archivedTasks: z.enum(["no", "yes-include", "yes-unarchive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const permission = await permissionsService.permissions.resolvePermission("task", input.targetTaskId, ctx.session);
      if (!permission || (permission !== PermissionLevel.FULL && permission !== PermissionLevel.EDIT)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update this task" });
      }

      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
        select: { id: true, entityType: true, content: true },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      if (template.entityType !== "TASK") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only task templates can be applied to tasks" });
      }

      const sourceNode = (template.content ?? {}) as TemplateTaskNode;
      const targetTask = await prisma.task.findUnique({
        where: { id: input.targetTaskId },
        select: { title: true },
      });
      const sourceRootDueDate = asDateOrNull(sourceNode.dueDate);
      const remapTargetDueDate = asDateOrNull(input.remapDueDate);
      const dueDateShiftMs =
        input.dateMode === "remap" && sourceRootDueDate && remapTargetDueDate
          ? remapTargetDueDate.getTime() - sourceRootDueDate.getTime()
          : undefined;

      await prisma.$transaction(async (tx) => {
        await overwriteTaskFromTemplateNode({
          tx,
          taskId: input.targetTaskId,
          source: sourceNode,
          currentUserId: userId,
          rootNameOverride: input.entityName?.trim() || undefined,
          importMode: input.importMode,
          taskChecks: input.taskChecks,
          dueDateShiftMs,
        });

        if (isCaptureEnabled(input.importMode, input.taskChecks, "subtasks")) {
          await syncSubtasksAtSameLevel({
            tx,
            parentTaskId: input.targetTaskId,
            sourceParentNode: sourceNode,
            currentUserId: userId,
            importMode: input.importMode,
            taskChecks: input.taskChecks,
            dueDateShiftMs,
          });
        }

        await tx.templateAuditLog.create({
          data: {
            templateId: input.templateId,
            actorId: userId,
            event: "APPLIED",
            status: "SUCCESS",
            targetEntityType: "TASK",
            targetEntityId: input.targetTaskId,
            targetEntityName: input.entityName?.trim() || targetTask?.title || "Task",
            metadata: {
              importMode: input.importMode,
              dateMode: input.dateMode,
              remapDueDate: input.remapDueDate,
              archivedTasks: input.archivedTasks,
              subtaskSync: "same-level-overwrite",
            } as Prisma.InputJsonValue,
          },
        });
      });

      return { success: true };
    }),

  createEntityFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().cuid(),
        entityName: z.string().min(1).max(255),
        destination: z.object({
          kind: z.enum(["workspace", "standalone", "space", "project", "team", "folder", "list"]),
          id: z.string().optional(),
          workspaceId: z.string().optional(),
          spaceId: z.string().optional(),
          projectId: z.string().optional(),
          teamId: z.string().optional(),
          folderId: z.string().optional(),
          listId: z.string().optional(),
        }),
        importMode: z.enum(["everything", "customize"]).optional(),
        taskChecks: z.record(z.string(), z.boolean()).optional(),
        dateMode: z.enum(["as-is", "remap"]).optional(),
        remapDueDate: z.string().optional(),
        archivedTasks: z.enum(["no", "yes-include", "yes-unarchive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const template = await prisma.template.findUnique({
        where: { id: input.templateId },
        select: { id: true, entityType: true, content: true, workspaceId: true, name: true },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const destination = input.destination;
      const entityType = String(template.entityType).toUpperCase();
      const workspaceOnlyTypes = new Set(["AGENT", "WORKFORCE", "PROPOSAL", "LISTING"]);
      if (workspaceOnlyTypes.has(entityType) && !["workspace", "standalone"].includes(destination.kind)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${entityType} templates can only target workspace or standalone` });
      }

      const resolvedWorkspaceId = destination.workspaceId ?? template.workspaceId ?? undefined;
      if (resolvedWorkspaceId) {
        const [workspace, membership] = await Promise.all([
          prisma.workspace.findUnique({ where: { id: resolvedWorkspaceId }, select: { id: true, ownerId: true } }),
          prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: resolvedWorkspaceId, userId } },
            select: { status: true },
          }),
        ]);
        if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
        const isWorkspaceOwner = workspace.ownerId === userId;
        const isActiveMember = membership?.status === "ACTIVE";
        if (!isWorkspaceOwner && !isActiveMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this workspace" });
        }
      }

      const content = (template.content ?? {}) as Record<string, any>;
      const name = input.entityName.trim() || template.name;
      let createdId: string | undefined;

      if (entityType === "SPACE") {
        if (!resolvedWorkspaceId) throw new TRPCError({ code: "BAD_REQUEST", message: "Space requires workspace destination" });
        const created = await prisma.space.create({
          data: {
            workspaceId: resolvedWorkspaceId,
            name,
            description: content.description ?? undefined,
            icon: content.icon ?? undefined,
            color: content.color ?? undefined,
            createdBy: userId,
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "PROJECT") {
        const created = await prisma.project.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            spaceId: destination.spaceId ?? undefined,
            ownerId: userId,
            name,
            description: String(content.description ?? ""),
            tags: Array.isArray(content.tags) ? content.tags : [],
            industry: Array.isArray(content.industry) ? content.industry : [],
            revenueModel: Array.isArray(content.revenueModel) ? content.revenueModel : [],
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "FOLDER") {
        const created = await prisma.folder.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            spaceId: destination.spaceId ?? undefined,
            projectId: destination.projectId ?? undefined,
            teamId: destination.teamId ?? undefined,
            parentId: destination.folderId ?? undefined,
            name,
            description: content.description ?? undefined,
            icon: content.icon ?? undefined,
            color: content.color ?? undefined,
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "LIST") {
        const created = await prisma.list.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            spaceId: destination.spaceId ?? undefined,
            projectId: destination.projectId ?? undefined,
            teamId: destination.teamId ?? undefined,
            folderId: destination.folderId ?? undefined,
            name,
            description: content.description ?? undefined,
            icon: content.icon ?? undefined,
            color: content.color ?? undefined,
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "TASK") {
        const created = await prisma.task.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            spaceId: destination.spaceId ?? undefined,
            projectId: destination.projectId ?? undefined,
            teamId: destination.teamId ?? undefined,
            listId: destination.listId ?? undefined,
            title: name,
            description: content.description ?? undefined,
            createdBy: userId,
            priority: content.priority ?? undefined,
            startDate: content.startDate ? new Date(content.startDate) : undefined,
            dueDate: content.dueDate ? new Date(content.dueDate) : undefined,
            tags: Array.isArray(content.tags) ? content.tags : undefined,
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "VIEW") {
        const created = await prisma.view.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            spaceId: destination.spaceId ?? undefined,
            projectId: destination.projectId ?? undefined,
            teamId: destination.teamId ?? undefined,
            folderId: destination.folderId ?? undefined,
            listId: destination.listId ?? undefined,
            createdBy: userId,
            name,
            type: content.type ?? "LIST",
            description: content.description ?? undefined,
            config: (content.config ?? undefined) as Prisma.InputJsonValue | undefined,
            filters: (content.filters ?? undefined) as Prisma.InputJsonValue | undefined,
            grouping: (content.grouping ?? undefined) as Prisma.InputJsonValue | undefined,
            sorting: (content.sorting ?? undefined) as Prisma.InputJsonValue | undefined,
            columns: (content.columns ?? undefined) as Prisma.InputJsonValue | undefined,
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "AGENT") {
        const created = await prisma.aiAgent.create({
          data: {
            id: randomUUID(),
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            createdBy: userId,
            name,
            description: content.description ?? undefined,
            agentType: content.agentType ?? "TASK_EXECUTOR",
            systemPrompt: content.systemPrompt ?? "",
            availableTools: Array.isArray(content.availableTools) ? content.availableTools : [],
            capabilities: Array.isArray(content.capabilities) ? content.capabilities : [],
            constraints: Array.isArray(content.constraints) ? content.constraints : [],
            tags: Array.isArray(content.tags) ? content.tags : [],
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "WORKFORCE") {
        const created = await prisma.workforce.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            createdBy: userId,
            name,
            description: content.description ?? undefined,
            mode: content.mode ?? "FLOW",
            status: "DRAFT",
          },
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "PROPOSAL") {
        const created = await (prisma as any).proposal.create({
          data: {
            workspaceId: destination.kind === "standalone" ? undefined : resolvedWorkspaceId,
            userId,
            createdBy: userId,
            title: name,
            shortSummary: content.shortSummary ?? "Created from template",
            detailedDesc: content.detailedDesc ?? content.description ?? "",
            category: content.category ?? "INVESTMENT",
            intent: content.intent ?? "OFFERING",
            status: "DRAFT",
            industry: Array.isArray(content.industry) ? content.industry : [],
            keywords: Array.isArray(content.keywords) ? content.keywords : [],
            tags: Array.isArray(content.tags) ? content.tags : [],
          } as any,
          select: { id: true },
        });
        createdId = created.id;
      } else if (entityType === "LISTING") {
        const listingTypeCandidates = new Set([
          "TASK",
          "PROJECT",
          "AGENT",
          "TOOL",
          "TEMPLATE",
          "TALENT",
          "TEAM",
          "DATASET",
          "INTEGRATION",
          "WORKFLOW",
        ]);
        const rawType = String(content.type ?? "TEMPLATE").toUpperCase();
        const listingType = listingTypeCandidates.has(rawType) ? rawType : "TEMPLATE";
        const selectedCategories = Array.isArray(content.selectedCategories) ? content.selectedCategories : [];
        const resolvedCategory =
          (typeof content.category === "string" && content.category.trim()) ||
          (typeof selectedCategories[0] === "string" && selectedCategories[0]) ||
          null;
        const resolvedDescription =
          (typeof content.polishedDescription === "string" && content.polishedDescription.trim()) ||
          (typeof content.roughDraft === "string" && content.roughDraft.trim()) ||
          (typeof content.description === "string" && content.description.trim()) ||
          "Created from template";
        const resolvedSkills = Array.isArray(content.suggestedSkills)
          ? content.suggestedSkills
          : Array.isArray(content.skills)
            ? content.skills
            : [];
        const isPaid = content.pricingType === "paid" || content.isFree === false;
        const resolvedCredits = isPaid
          ? Math.max(
            1,
            Number(
              content.creditAmount ??
              content.priceCredits ??
              1
            ) || 1
          )
          : null;
        const resolvedAllowClone = content.allowCloning ?? content.allowClone ?? true;
        const resolvedAllowRepublish = content.allowRepublishing ?? content.allowRepublish ?? false;
        const resolvedIntent =
          (typeof content.intent === "string" && content.intent.trim()) ? content.intent : null;
        const resolvedApplicationSchema = Array.isArray(content.customFields)
          ? {
            fields: content.customFields
              .filter((field: any) => typeof field?.label === "string" && field.label.trim())
              .map((field: any) => ({
                id: String(field.id ?? ""),
                type: String(field.type ?? "text"),
                label: String(field.label ?? ""),
                required: !!field.required,
                placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined,
                description: typeof field.description === "string" ? field.description : undefined,
                options: Array.isArray(field.options) ? field.options : undefined,
              })),
          }
          : null;
        const slug = await generateUniqueListingSlug(name);

        const created = await prisma.marketplaceListing.create({
          data: {
            authorId: userId,
            slug,
            title: name,
            description: resolvedDescription,
            type: listingType as any,
            status: "ACTIVE",
            category: resolvedCategory,
            isFree: !isPaid,
            priceCredits: resolvedCredits,
            skills: resolvedSkills,
            tags: Array.isArray(content.tags) ? content.tags : [],
            allowClone: !!resolvedAllowClone,
            allowRepublish: !!resolvedAllowRepublish,
            intent: resolvedIntent,
            proposalSchema: resolvedApplicationSchema as Prisma.InputJsonValue | null,
          } as any,
          select: { id: true },
        });
        createdId = created.id;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unsupported template entity type: ${entityType}` });
      }

      await prisma.templateAuditLog.create({
        data: {
          templateId: template.id,
          actorId: userId,
          event: "APPLIED",
          status: "SUCCESS",
          targetEntityType: entityType as any,
          targetEntityId: createdId,
          targetEntityName: name,
          metadata: {
            importMode: input.importMode,
            dateMode: input.dateMode,
            remapDueDate: input.remapDueDate,
            archivedTasks: input.archivedTasks,
            destination: input.destination,
          } as Prisma.InputJsonValue,
        },
      });
      await prisma.template.update({ where: { id: template.id }, data: { useCount: { increment: 1 } } });

      return { success: true, targetEntityId: createdId, targetEntityType: entityType };
    }),

  /**
   * Create a new template.
   */
  create: protectedProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      // If scoped to a workspace, verify access.
      // Owners may not always have an explicit workspace_members row in drifted/legacy data,
      // so allow either: ACTIVE member OR workspace owner.
      if (input.workspaceId) {
        const [workspace, membership] = await Promise.all([
          prisma.workspace.findUnique({
            where: { id: input.workspaceId },
            select: { ownerId: true },
          }),
          prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } },
            select: { status: true },
          }),
        ]);
        if (!workspace) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
        }
        const isWorkspaceOwner = workspace.ownerId === userId;
        const isActiveMember = membership?.status === "ACTIVE";
        if (!isWorkspaceOwner && !isActiveMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this workspace" });
        }
      }

      const { visibility, shareUserIds, shareTeamIds } = resolveShareFields(
        input.shareWith,
        input.shares
      );

      const template = await prisma.template.create({
        data: {
          name: input.name,
          description: input.description,
          tags: input.tags,
          category: input.category,
          complexity: input.complexity,
          entityType: input.entityType,
          workspaceId: input.workspaceId,
          createdBy: userId,
          isPublic: !!input.publicSharing,
          visibility,
          shareUserIds,
          shareTeamIds,
          captureConfig: (input.captureConfig ?? {}) as Prisma.InputJsonValue,
          content: (input.content ?? {}) as Prisma.InputJsonValue,
        },
        select: TEMPLATE_SELECT,
      });

      await prisma.templateAuditLog.create({
        data: {
          templateId: template.id,
          actorId: userId,
          event: "CREATED",
          status: "SUCCESS",
          targetEntityType: template.entityType as any,
          targetEntityName:
            ((input.content as any)?.name as string | undefined) ||
            ((input.content as any)?.title as string | undefined) ||
            undefined,
          metadata: {
            sourceEntityName:
              ((input.content as any)?.name as string | undefined) ||
              ((input.content as any)?.title as string | undefined) ||
              null,
          } as Prisma.InputJsonValue,
        },
      });

      return template;
    }),

  /**
   * Update an existing template.
   * Uses edit-specific permission check (stricter than view).
   */
  update: protectedProcedure
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const { id, ...data } = input;

      // Gate: throws FORBIDDEN / NOT_FOUND if user cannot edit
      await assertCanEdit(userId, id);

      const sharePatch =
        data.shareWith !== undefined
          ? resolveShareFields(data.shareWith, data.shares ?? [])
          : null;

      const template = await prisma.template.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.tags !== undefined && { tags: data.tags }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.complexity !== undefined && { complexity: data.complexity }),
          ...(data.entityType !== undefined && { entityType: data.entityType }),
          ...(data.publicSharing !== undefined && { isPublic: !!data.publicSharing }),
          ...(sharePatch && {
            visibility: sharePatch.visibility,
            shareUserIds: sharePatch.shareUserIds,
            shareTeamIds: sharePatch.shareTeamIds,
          }),
          ...(data.captureConfig !== undefined && {
            captureConfig: data.captureConfig as Prisma.InputJsonValue,
          }),
          ...(data.content !== undefined && {
            content: data.content as Prisma.InputJsonValue,
          }),
        },
        select: TEMPLATE_SELECT,
      });

      await prisma.templateAuditLog.create({
        data: { templateId: id, actorId: userId, event: "UPDATED", status: "SUCCESS" },
      });

      return template;
    }),

  /**
   * Archive a template (soft delete).
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      await assertCanEdit(userId, input.id);

      const template = await prisma.template.update({
        where: { id: input.id },
        data: { isArchived: true, archivedAt: new Date() },
        select: TEMPLATE_SELECT,
      });

      await prisma.templateAuditLog.create({
        data: { templateId: input.id, actorId: userId, event: "ARCHIVED", status: "SUCCESS" },
      });

      return template;
    }),

  /**
   * Restore an archived template.
   */
  restore: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;

      await assertCanEdit(userId, input.id);

      const template = await prisma.template.update({
        where: { id: input.id },
        data: { isArchived: false, archivedAt: null },
        select: TEMPLATE_SELECT,
      });

      await prisma.templateAuditLog.create({
        data: { templateId: input.id, actorId: userId, event: "RESTORED", status: "SUCCESS" },
      });

      return template;
    }),

  /**
   * Delete a template permanently.
   * Only the creator or workspace owner/admin can hard delete.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const template = await prisma.template.findUnique({
        where: { id: input.id },
        select: { createdBy: true, workspaceId: true },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      // Only creator OR workspace owner/admin can hard delete
      if (template.createdBy !== userId) {
        if (!template.workspaceId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the creator can delete this template" });
        }
        const membership = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: template.workspaceId, userId } },
          select: { role: true, status: true },
        });
        const canDelete =
          membership?.status === "ACTIVE" &&
          (membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN);

        if (!canDelete) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the creator or workspace admin can delete this template" });
        }
      }

      await prisma.templateAuditLog.create({
        data: { templateId: input.id, actorId: userId, event: "DELETED", status: "SUCCESS" },
      });

      await prisma.template.delete({ where: { id: input.id } });

      return { id: input.id };
    }),
});