import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const messagesRouter = router({
  listConversations: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(50).optional().default(20)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const items = await prisma.$queryRaw<any[]>`
        SELECT
          u.id as user_id,
          u.name as name,
          u.email as email,
          u.username as username,
          u.avatar as avatar,
          MAX(m.created_at) as last_at,
          COUNT(CASE 
            WHEN m.receiver_id = ${userId} AND m.is_read = false 
            THEN 1 
          END)::int as unread
        FROM messages m
        JOIN users u ON (
          CASE 
            WHEN m.sender_id = ${userId} THEN m.receiver_id
            ELSE m.sender_id
          END
        ) = u.id
        WHERE (m.sender_id = ${userId} OR m.receiver_id = ${userId})
        GROUP BY u.id, u.name, u.email, u.username, u.avatar
        ORDER BY last_at DESC
        LIMIT ${take}
        OFFSET ${skip}
      `;

      return { items, page: input.page, pageSize: input.pageSize };
    }),

  listWithUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;

      const where = {
        OR: [
          { senderId: me, receiverId: input.userId },
          { senderId: input.userId, receiverId: me },
        ],
      };

      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const [total, items] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip,
          take,
          include: {
            replyTo: {
              include: {
                sender: {
                  select: { id: true, name: true, username: true, avatar: true, email: true },
                },
              },
            },
            sender: {
              select: { id: true, name: true, username: true, avatar: true, email: true },
            },
            receiver: {
              select: { id: true, name: true, username: true, avatar: true, email: true },
            },
          },
        }),
      ]);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
      } as const;
    }),

  send: protectedProcedure
    .input(z.object({ toUserId: z.string(), content: z.string().min(1).max(4000), attachments: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.session!.user!.id;
      if (senderId === input.toUserId) throw new Error("Cannot message yourself");
      const msg = await prisma.message.create({
        data: {
          senderId,
          receiverId: input.toUserId,
          content: input.content,
          attachments: input.attachments || [],
        },
      });
      return { id: msg.id } as const;
    }),

  markRead: protectedProcedure
    .input(z.object({ fromUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      await prisma.message.updateMany({
        where: { senderId: input.fromUserId, receiverId: me, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return { ok: true } as const;
    }),

  delete: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const message = await prisma.message.findUnique({
        where: { id: input.messageId },
      });
      if (!message) throw new Error('Message not found');
      if (message.senderId !== me) throw new Error('Not authorized to delete this message');
      await prisma.message.delete({
        where: { id: input.messageId },
      });
      return { ok: true } as const;
    }),
});

export type MessagesRouter = typeof messagesRouter;


