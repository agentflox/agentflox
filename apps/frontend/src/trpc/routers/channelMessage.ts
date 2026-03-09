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
          attachments: input.attachments ?? [],
          parentId: input.parentId ?? null,
          reactions: [],
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
        select: { channelId: true, reactions: true },
      });
      if (!message) throw new Error("Message not found");
      const member = await prisma.channelMember.findFirst({
        where: { channelId: message.channelId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!member) throw new Error("Not a channel member");

      const reactions = Array.isArray(message.reactions) ? [...(message.reactions as any[])] : [];
      const idx = reactions.findIndex((r: any) => r.userId === ctx.session.user.id && r.emoji === input.emoji);
      if (idx >= 0) reactions.splice(idx, 1);
      else reactions.push({ userId: ctx.session.user.id, emoji: input.emoji });

      await prisma.channelMessage.update({
        where: { id: input.messageId },
        data: { reactions },
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

