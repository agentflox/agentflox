import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const channelMessageRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        cursor: z.string().nullish(),
        take: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const take = input.take;
      const cursor = input.cursor ? { id: input.cursor } : undefined;
      const items = await prisma.channelMessage.findMany({
        where: { channelId: input.channelId },
        orderBy: { createdAt: "asc" },
        take,
        skip: cursor ? 1 : 0,
        cursor,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          attachments: true,
          reactions: true,
          parent: {
            select: {
              id: true,
              content: true,
              userId: true,
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      });
      return {
        items,
        nextCursor: items.length === take ? items[items.length - 1].id : null,
      };
    }),

  send: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        channelId: z.string(),
        content: z.string().min(1),
        type: z.string().optional(),
        title: z.string().optional(),
        attachments: z.array(z.any()).optional(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Authorization: ensure member
      const member = await prisma.channelMember.findFirst({
        where: { channelId: input.channelId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!member) throw new Error("Not a channel member");

      const message = await prisma.channelMessage.create({
        data: {
          id: input.id,
          channelId: input.channelId,
          userId: ctx.session.user.id,
          content: input.content,
          type: input.type || "MESSAGE",
          title: input.title || null,
          attachments: input.attachments?.length ? {
            create: input.attachments.map(a => ({
              filename: a.filename || a.name || "attachment",
              url: a.url || (typeof a === 'string' ? a : ''),
              mimeType: a.mimeType || a.type || "application/octet-stream",
              size: a.size || 0,
            }))
          } : undefined,
          parentId: input.parentId ?? null,
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          parent: {
            select: {
              id: true,
              content: true,
              userId: true,
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      });
      return message;
    }),

  react: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const message = await prisma.channelMessage.findUnique({
        where: { id: input.messageId },
        select: { channelId: true },
      });
      if (!message) throw new Error("Message not found");
      const member = await prisma.channelMember.findFirst({
        where: { channelId: message.channelId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!member) throw new Error("Not a channel member");

      const existing = await prisma.channelMessageReaction.findFirst({
        where: {
          messageId: input.messageId,
          userId: ctx.session.user.id,
          emoji: input.emoji,
        }
      });

      if (existing) {
        await prisma.channelMessageReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.channelMessageReaction.create({
          data: {
            messageId: input.messageId,
            userId: ctx.session.user.id,
            emoji: input.emoji,
          }
        });
      }

      const reactions = await prisma.channelMessageReaction.findMany({
        where: { messageId: input.messageId }
      });

      return { messageId: input.messageId, reactions };
    }),

  markRead: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.channelMember.updateMany({
        where: { channelId: input.channelId, userId: ctx.session.user.id },
        data: { lastReadAt: new Date() },
      });
      return { success: true };
    }),
});

