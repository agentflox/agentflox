import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from '@trpc/server';

const MARKETPLACE_SUBMISSION_PREFIX = "__AF_MARKETPLACE_SUBMISSION__";

function parseMarketplaceListingTitle(content: string): string | null {
  if (!content.startsWith(MARKETPLACE_SUBMISSION_PREFIX)) return null;
  try {
    const parsed = JSON.parse(content.slice(MARKETPLACE_SUBMISSION_PREFIX.length)) as {
      listing?: { title?: string };
    };
    const title = parsed?.listing?.title;
    return typeof title === "string" && title.trim() ? title.trim() : null;
  } catch {
    return null;
  }
}

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

      /** Recent DM threads (peer users with at least one message). Capped for merge performance. */
      const list = await prisma.conversation.findMany({
        where: {
          participantIds: { has: userId },
          // Exclude conversations this user has blocked
          NOT: { blockedBy: { has: userId } },
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      });

      const total = await prisma.conversation.count({
        where: { participantIds: { has: userId } },
      });

      // Manual join for listings since Prisma Client update failed due to file lock
      const listingIds = [...new Set(list.map(c => c.marketplaceListingId).filter(Boolean))] as string[];
      const listings = await prisma.marketplaceListing.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, title: true }
      });
      const listingMap = new Map(listings.map(l => [l.id, l.title]));

      // Get user details for all participants except current user
      const peerIds = [...new Set(list.flatMap(c => c.participantIds).filter(id => id !== userId))];
      const peers = await prisma.user.findMany({
        where: { id: { in: peerIds } },
        select: { id: true, name: true, email: true, username: true, avatar: true },
      });
      const peerMap = new Map(peers.map(p => [p.id, p]));

      const items = list
        .filter((c) => {
          // Skip conversations where this user is the only participant (other party deleted)
          const peerId = c.participantIds.find(id => id !== userId);
          if (!peerId) return false;
          // Also skip if peer's user record no longer exists in DB
          const peer = peerMap.get(peerId);
          if (!peer && !c.marketplaceListingId) return false;
          return true;
        })
        .map((c) => {
        const peerId = c.participantIds.find((id) => id !== userId);
        const peer = peerId ? peerMap.get(peerId) : null;
        const lastMsg = c.messages[0];
        // Best available display name
        const displayName = peer?.name || peer?.username || (peer?.email ? peer.email.split('@')[0] : null) || null;

        return {
          id: c.id,
          user_id: peerId,
          name: displayName,
          email: peer?.email,
          username: peer?.username,
          avatar: peer?.avatar,
          marketplace_listing_id: c.marketplaceListingId,
          marketplace_listing_title: c.marketplaceListingId ? listingMap.get(c.marketplaceListingId) : null,
          content: lastMsg?.content,
          last_at: c.updatedAt,
          unread: 0,
          connection_only: false,
          is_pinned: c.pinnedBy.includes(userId),
          is_archived: c.archivedBy.includes(userId),
          is_muted: c.mutedBy.includes(userId),
          is_hidden_status: c.hiddenStatusBy.includes(userId),
          is_blocked: c.blockedBy.includes(userId),
        };
      });

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          listing: { select: { id: true, title: true } }
        }
      });

      if (!conversation || !conversation.participantIds.includes(userId)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const peerId = conversation.participantIds.find(id => id !== userId);
      const peer = peerId ? await prisma.user.findUnique({
        where: { id: peerId },
        select: { id: true, name: true, username: true, avatar: true, email: true }
      }) : null;

      return {
        id: conversation.id,
        userId: peerId,
        name: peer?.name || "User",
        avatar: peer?.avatar,
        marketplaceListingId: conversation.marketplaceListingId,
        marketplaceListingTitle: conversation.listing?.title,
      };
    }),

  listByConversationId: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
        select: { participantIds: true }
      });

      if (!conversation || !conversation.participantIds.includes(me)) {
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }

      const [total, items] = await Promise.all([
        prisma.message.count({ where: { conversationId: input.conversationId, NOT: { deletedFor: { has: me } } } }),
        prisma.message.findMany({
          where: { conversationId: input.conversationId, NOT: { deletedFor: { has: me } } },
          orderBy: { createdAt: "asc" },
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

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  listWithUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        marketplaceListingId: z.string().nullish(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const skip = (input.page - 1) * input.pageSize;
      const take = input.pageSize;

      // Use raw SQL to find the conversation ID to avoid Prisma Client staleness issues
      const [conversationRow] = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversations
        WHERE participant_ids @> ARRAY[${me}, ${input.userId}]::text[]
        AND array_length(participant_ids, 1) = 2
        AND (marketplace_listing_id = ${input.marketplaceListingId} OR (marketplace_listing_id IS NULL AND ${input.marketplaceListingId}::text IS NULL))
        LIMIT 1
      `;

      if (!conversationRow) {
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }

      const conversationId = conversationRow.id;

      const [total, items] = await Promise.all([
        prisma.message.count({ where: { conversationId, NOT: { deletedFor: { has: me } } } }),
        prisma.message.findMany({
          where: { conversationId, NOT: { deletedFor: { has: me } } },
          orderBy: { createdAt: "asc" },
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

  getOrCreateConversation: protectedProcedure
    .input(z.object({
      userId: z.string(),
      marketplaceListingId: z.string().nullish()
    }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      if (me === input.userId) throw new Error("Cannot message yourself");

      const listingId = input.marketplaceListingId || null;

      const [conversationRow] = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversations
        WHERE participant_ids @> ARRAY[${me}, ${input.userId}]::text[]
        AND array_length(participant_ids, 1) = 2
        AND (marketplace_listing_id = ${listingId} OR (marketplace_listing_id IS NULL AND ${listingId}::text IS NULL))
        LIMIT 1
      `;

      if (conversationRow?.id) {
        return { conversationId: conversationRow.id, isNew: false };
      }

      // Check connection
      if (!listingId) {
        const connection = await prisma.connection.findFirst({
          where: {
            OR: [
              { requesterId: me, receiverId: input.userId, status: "ACCEPTED" },
              { requesterId: input.userId, receiverId: me, status: "ACCEPTED" },
            ],
          },
        });
        if (!connection) {
          throw new Error("You must be connected with this user to send a message.");
        }
      }

      const newConv = await prisma.conversation.create({
        data: {
          participantIds: [me, input.userId].sort(),
          marketplaceListingId: listingId,
        },
      });

      return { conversationId: newConv.id, isNew: true };
    }),

  send: protectedProcedure
    .input(z.object({
      toUserId: z.string(),
      content: z.string().min(1).max(4000),
      attachments: z.array(z.string()).optional(),
      marketplaceListingId: z.string().nullish()
    }))
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.session!.user!.id;
      if (senderId === input.toUserId) throw new Error("Cannot message yourself");

      const listingId = input.marketplaceListingId || null;

      // Use raw SQL to find conversation to avoid stale Prisma Client issues
      const [conversationRow] = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversations
        WHERE participant_ids @> ARRAY[${senderId}, ${input.toUserId}]::text[]
        AND array_length(participant_ids, 1) = 2
        AND (marketplace_listing_id = ${listingId} OR (marketplace_listing_id IS NULL AND ${listingId}::text IS NULL))
        LIMIT 1
      `;

      let conversationId = conversationRow?.id;

      if (!conversationId) {
        // Double check connections for non-listing threads
        if (!listingId) {
          const connection = await prisma.connection.findFirst({
            where: {
              OR: [
                { requesterId: senderId, receiverId: input.toUserId, status: "ACCEPTED" },
                { requesterId: input.toUserId, receiverId: senderId, status: "ACCEPTED" },
              ],
            },
          });
          if (!connection) {
            throw new Error("You must be connected with this user to send a message.");
          }
        }

        const newConv = await prisma.conversation.create({
          data: {
            participantIds: [senderId, input.toUserId].sort(),
            marketplaceListingId: listingId,
          },
        });
        conversationId = newConv.id;
      }

      const msg = await prisma.message.create({
        data: {
          senderId,
          receiverId: input.toUserId,
          conversationId,
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
    .input(z.object({ messageId: z.string(), mode: z.enum(['everyone', 'for_me']).optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const message = await prisma.message.findUnique({
        where: { id: input.messageId },
      });
      if (!message) throw new Error('Message not found');

      const mode = input.mode || 'for_me';

      if (mode === 'everyone') {
        if (message.senderId !== me) throw new Error('Not authorized to delete this message for everyone');
        await prisma.message.delete({
          where: { id: input.messageId },
        });
      } else {
        // Delete for me
        const currentDeletedFor = message.deletedFor || [];
        if (!currentDeletedFor.includes(me)) {
          await prisma.message.update({
            where: { id: input.messageId },
            data: { deletedFor: { push: me } },
          });
        }
      }
      return { ok: true } as const;
    }),

  conversationAction: protectedProcedure
    .input(z.object({ 
      conversationId: z.string(), 
      action: z.enum(['pin', 'archive', 'mute', 'hide_status', 'delete', 'block']), 
      value: z.boolean() 
    }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const conv = await prisma.conversation.findUnique({ where: { id: input.conversationId } });
      if (!conv) throw new Error('Conversation not found');

      let updateData = {};
      const addToList = (list: string[], val: string, add: boolean) => {
        const s = new Set(list || []);
        if (add) s.add(val); else s.delete(val);
        return Array.from(s);
      };

      if (input.action === 'pin') {
        updateData = { pinnedBy: addToList(conv.pinnedBy, me, input.value) };
      } else if (input.action === 'archive') {
        updateData = { archivedBy: addToList(conv.archivedBy, me, input.value) };
      } else if (input.action === 'mute') {
        updateData = { mutedBy: addToList(conv.mutedBy, me, input.value) };
      } else if (input.action === 'hide_status') {
        updateData = { hiddenStatusBy: addToList(conv.hiddenStatusBy, me, input.value) };
      } else if (input.action === 'delete') {
        updateData = { participantIds: conv.participantIds.filter(id => id !== me) };
      } else if (input.action === 'block') {
        updateData = { blockedBy: addToList((conv as any).blockedBy || [], me, true) };
      }

      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: updateData,
      });

      return { ok: true } as const;
    }),

  messageAction: protectedProcedure
    .input(z.object({ messageId: z.string(), action: z.enum(['pin', 'unpin']) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.message.update({
        where: { id: input.messageId },
        data: { isPinned: input.action === 'pin' },
      });
      return { ok: true } as const;
    }),

  listBlocked: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session!.user!.id;

      const list = await prisma.conversation.findMany({
        where: {
          participantIds: { has: userId },
          blockedBy: { has: userId },
        },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const peerIds = [...new Set(list.flatMap(c => c.participantIds).filter(id => id !== userId))];
      const peers = await prisma.user.findMany({
        where: { id: { in: peerIds } },
        select: { id: true, name: true, email: true, username: true, avatar: true },
      });
      const peerMap = new Map(peers.map(p => [p.id, p]));

      return list.map(c => {
        const peerId = c.participantIds.find(id => id !== userId);
        const peer = peerId ? peerMap.get(peerId) : null;
        const lastMsg = c.messages[0];
        const displayName = peer?.name || peer?.username || (peer?.email ? peer.email.split('@')[0] : null) || 'Unknown';
        return {
          id: c.id,
          user_id: peerId,
          name: displayName,
          avatar: peer?.avatar,
          content: lastMsg?.content,
          last_at: c.updatedAt,
        };
      });
    }),

  unblock: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session!.user!.id;
      const conv = await prisma.conversation.findUnique({ where: { id: input.conversationId } });
      if (!conv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });

      const blockedBy = ((conv as any).blockedBy || []) as string[];
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { blockedBy: blockedBy.filter(id => id !== me) },
      });
      return { ok: true } as const;
    }),
});

export type MessagesRouter = typeof messagesRouter;


