import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

const listInput = z.object({
  query: z.string().optional(),
});

const createInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const joinLeaveInput = z.object({
  groupId: z.string(),
});
const removeMemberInput = z.object({
  groupId: z.string(),
  memberUserId: z.string(),
});
const blockMemberInput = z.object({
  groupId: z.string(),
  memberUserId: z.string(),
  reason: z.string().optional(),
  blockJoin: z.boolean().optional().default(false),
  blockPost: z.boolean().optional().default(true),
  removeFromGroup: z.boolean().optional().default(false),
});
const unblockMemberInput = z.object({
  groupId: z.string(),
  memberUserId: z.string(),
});
const createAppealInput = z.object({
  groupId: z.string(),
  message: z.string().min(1),
});
const listAppealsInput = z.object({
  groupId: z.string(),
});
const respondAppealInput = z.object({
  appealId: z.string(),
  status: z.enum(["RESPONDED", "REJECTED"]),
  responseMessage: z.string().optional(),
});
const reportAppealInput = z.object({
  appealId: z.string(),
});
const deleteGroupInput = z.object({
  groupId: z.string(),
});

const listPostsInput = z.object({
  groupId: z.string(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(20),
});

const createPostInput = z.object({
  groupId: z.string(),
  title: z.string().min(1),
  content: z.string().optional(),
  attachments: z.array(z.any()).optional(),
});

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function ensureOwner(groupId: string, userId: string) {
  const group = await prisma.communityGroup.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) throw new Error("Group not found.");
  if (group.ownerId !== userId) throw new Error("Only group owner can perform this action.");
  return group;
}

export const communityGroupRouter = router({
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const where: any = { isActive: true };
    if (input.query?.trim()) {
      where.OR = [
        { name: { contains: input.query.trim(), mode: "insensitive" } },
        { description: { contains: input.query.trim(), mode: "insensitive" } },
      ];
    }

    const groups = await prisma.communityGroup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        members: {
          where: { isActive: true },
          select: { userId: true },
        },
        _count: {
          select: {
            posts: true,
            members: true,
          },
        },
      },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      owner: group.owner,
      memberCount: group._count.members,
      postCount: group._count.posts,
      isMember: group.members.some((m) => m.userId === userId),
      createdAt: group.createdAt,
    }));
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const group = await prisma.communityGroup.findFirst({
      where: { id: input.id, isActive: true },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { joinedAt: "asc" },
        },
        bans: {
          where: { isActive: true },
          select: { userId: true, blockJoin: true, blockPost: true, reason: true },
        },
      },
    });
    if (!group) return null;

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      owner: group.owner,
      isMember: group.members.some((m) => m.userId === userId),
      myBan:
        group.bans.find((b) => b.userId === userId) ?? null,
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
        ban: group.bans.find((b) => b.userId === m.userId) ?? null,
      })),
    };
  }),

  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const baseSlug = slugify(input.name) || "community-group";
    let slug = baseSlug;
    let i = 1;
    while (await prisma.communityGroup.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${i++}`;
    }

    return prisma.communityGroup.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
            isActive: true,
          },
        },
      },
      select: { id: true, name: true, slug: true },
    });
  }),

  join: protectedProcedure.input(joinLeaveInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const activeBan = await prisma.communityGroupBan.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      select: { isActive: true, blockJoin: true, reason: true },
    });
    if (activeBan?.isActive && activeBan.blockJoin) {
      throw new Error(activeBan.reason || "You are blocked from joining this group.");
    }
    await prisma.communityGroupMember.upsert({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      update: { isActive: true, leftAt: null },
      create: { groupId: input.groupId, userId, role: "MEMBER", isActive: true },
    });
    return { joined: true as const };
  }),

  leave: protectedProcedure.input(joinLeaveInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const membership = await prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      select: { role: true },
    });
    if (!membership) return { left: true as const };
    if (membership.role === "OWNER") {
      throw new Error("Owner cannot leave the group.");
    }
    await prisma.communityGroupMember.update({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      data: { isActive: false, leftAt: new Date() },
    });
    return { left: true as const };
  }),

  removeMember: protectedProcedure.input(removeMemberInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const group = await ensureOwner(input.groupId, userId);
    if (input.memberUserId === group.ownerId) throw new Error("Cannot remove the group owner.");

    await prisma.communityGroupMember.updateMany({
      where: {
        groupId: input.groupId,
        userId: input.memberUserId,
        isActive: true,
      },
      data: { isActive: false, leftAt: new Date() },
    });
    return { removed: true as const };
  }),

  blockMember: protectedProcedure.input(blockMemberInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const group = await ensureOwner(input.groupId, userId);
    if (input.memberUserId === group.ownerId) throw new Error("Cannot block the group owner.");
    if (!input.blockJoin && !input.blockPost) {
      throw new Error("Select at least one block type.");
    }

    await prisma.communityGroupBan.upsert({
      where: { groupId_userId: { groupId: input.groupId, userId: input.memberUserId } },
      update: {
        isActive: true,
        blockJoin: input.blockJoin,
        blockPost: input.blockPost,
        reason: input.reason?.trim() || null,
        blockedByUserId: userId,
      },
      create: {
        groupId: input.groupId,
        userId: input.memberUserId,
        blockedByUserId: userId,
        reason: input.reason?.trim() || null,
        blockJoin: input.blockJoin,
        blockPost: input.blockPost,
        isActive: true,
      },
    });

    if (input.removeFromGroup || input.blockJoin) {
      await prisma.communityGroupMember.updateMany({
        where: { groupId: input.groupId, userId: input.memberUserId, isActive: true },
        data: { isActive: false, leftAt: new Date() },
      });
    }
    return { blocked: true as const };
  }),

  unblockMember: protectedProcedure.input(unblockMemberInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    await ensureOwner(input.groupId, userId);
    await prisma.communityGroupBan.updateMany({
      where: { groupId: input.groupId, userId: input.memberUserId, isActive: true },
      data: { isActive: false },
    });
    return { unblocked: true as const };
  }),

  listPosts: protectedProcedure.input(listPostsInput).query(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const membership = await prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      select: { id: true, isActive: true },
    });
    if (!membership?.isActive) {
      throw new Error("Join group to view posts.");
    }

    const skip = (input.page - 1) * input.pageSize;
    const take = input.pageSize;
    const where = { communityGroupId: input.groupId, type: "POST" as const };
    const [total, items] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { user: { select: { id: true, name: true, image: true } } },
      }),
    ]);
    return { items, total, page: input.page, pageSize: input.pageSize };
  }),

  createPost: protectedProcedure.input(createPostInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const membership = await prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      select: { isActive: true },
    });
    if (!membership?.isActive) {
      throw new Error("Join group before posting.");
    }
    const activeBan = await prisma.communityGroupBan.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      select: { isActive: true, blockPost: true, reason: true },
    });
    if (activeBan?.isActive && activeBan.blockPost) {
      throw new Error(activeBan.reason || "You are blocked from posting in this group.");
    }

    const attachments = (input.attachments || []).map((a) =>
      typeof a === "string" ? a : JSON.stringify(a)
    );

    return prisma.post.create({
      data: {
        userId,
        title: input.title.trim(),
        content: input.content?.trim() || input.title.trim(),
        type: "POST",
        topic: "OTHERS",
        visibility: "PUBLIC",
        tags: ["community", `community-group:${input.groupId}`],
        attachments,
        communityGroupId: input.groupId,
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }),

  createAppeal: protectedProcedure.input(createAppealInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const ban = await prisma.communityGroupBan.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
      select: { isActive: true, blockJoin: true, blockPost: true },
    });
    if (!ban?.isActive) {
      throw new Error("No active block found.");
    }
    return prisma.communityGroupAppeal.create({
      data: {
        groupId: input.groupId,
        userId,
        message: input.message.trim(),
        status: "PENDING",
      },
      select: { id: true },
    });
  }),

  listAppeals: protectedProcedure.input(listAppealsInput).query(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const group = await prisma.communityGroup.findUnique({
      where: { id: input.groupId },
      select: { ownerId: true },
    });
    if (!group) throw new Error("Group not found.");
    const isOwner = group.ownerId === userId;
    const appeals = await prisma.communityGroupAppeal.findMany({
      where: isOwner ? { groupId: input.groupId } : { groupId: input.groupId, userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
    return {
      isOwner,
      items: appeals,
    };
  }),

  respondAppeal: protectedProcedure.input(respondAppealInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const appeal = await prisma.communityGroupAppeal.findUnique({
      where: { id: input.appealId },
      select: { id: true, groupId: true, userId: true },
    });
    if (!appeal) throw new Error("Appeal not found.");
    await ensureOwner(appeal.groupId, userId);

    const updated = await prisma.communityGroupAppeal.update({
      where: { id: input.appealId },
      data: {
        status: input.status,
        responseMessage: input.responseMessage?.trim() || null,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      },
    });

    if (input.status === "RESPONDED") {
      await prisma.communityGroupBan.updateMany({
        where: { groupId: appeal.groupId, userId: appeal.userId, isActive: true },
        data: { isActive: false },
      });
    }
    return updated;
  }),

  reportAppeal: protectedProcedure.input(reportAppealInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    const appeal = await prisma.communityGroupAppeal.findUnique({
      where: { id: input.appealId },
      select: { groupId: true },
    });
    if (!appeal) throw new Error("Appeal not found.");
    await ensureOwner(appeal.groupId, userId);
    return prisma.communityGroupAppeal.update({
      where: { id: input.appealId },
      data: { reportedToAdmin: true },
    });
  }),

  delete: protectedProcedure.input(deleteGroupInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session!.user!.id;
    await ensureOwner(input.groupId, userId);
    await prisma.communityGroup.delete({ where: { id: input.groupId } });
    return { deleted: true as const };
  }),
});

