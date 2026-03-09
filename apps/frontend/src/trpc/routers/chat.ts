import { ConversationType, ModelName } from '@agentflox/database';
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { initializeOpenAI } from '@/lib/openai'
import { ensureChatContext, type ChatContextType } from '@/entities/chats/utils'
import { LimitGuard } from '@/features/usage/utils/limitGuard'
import { protectedProcedure, router } from '@/trpc/init'

export const chatRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        contextType: z.enum(['project', 'profile', 'proposal', 'team', 'workspace', 'space', 'channel', 'task', 'list', 'folder']),
        entityId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = prisma as any

      const where: any = {
        userId: ctx.session.user.id,
      }

      switch (input.contextType) {
        case 'project':
          where.projectId = input.entityId
          break
        case 'proposal':
          where.proposalId = input.entityId
          break
        case 'team':
          where.teamId = input.entityId
          break
        case 'workspace':
          where.workspaceId = input.entityId
          break
        case 'space':
          where.spaceId = input.entityId
          break
        case 'channel':
          where.channelId = input.entityId
          break
        case 'task':
          where.taskId = input.entityId
          break
        case 'list':
          where.listId = input.entityId
          break
        case 'folder':
          where.folderId = input.entityId
          break
        case 'profile':
          where.userId = input.entityId
          where.projectId = null
          where.proposalId = null
          where.teamId = null
          where.workspaceId = null
          where.spaceId = null
          where.channelId = null
          where.taskId = null
          where.listId = null
          where.folderId = null
          break
      }

      const conversations = await db.aiConversation.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          proposalId: true,
          teamId: true,
          workspaceId: true,
          spaceId: true,
          channelId: true,
          taskId: true,
          listId: true,
          folderId: true,
          conversationType: true,
          lastMessageAt: true,
          createdAt: true,
          messageCount: true,
          totalTokensUsed: true,
        },
      })

      return conversations
    }),

  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = prisma as any

      const conversations = await db.aiConversation.findMany({
        where: {
          userId: ctx.session.user.id,
          projectId: input.projectId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          conversationType: true,
          lastMessageAt: true,
          createdAt: true,
          messageCount: true,
          totalTokensUsed: true,
        },
      })

      return conversations
    }),

  getModel: protectedProcedure
    .query(async ({ ctx }) => {
      const db = prisma;
      const model = await db.aiModel.findFirst();
      return model;
    }),

  getModelConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = prisma;
    const userId = ctx.session!.user!.id;

    const subscription = await db.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { updatedAt: "desc" },
      include: {
        plan: {
          include: { feature: true },
        },
      },
    });
    if (!subscription) {
      throw new Error("No active subscription found");
    }
    const maxRPM = subscription.plan?.feature?.maxRPM ?? 0;
    const maxRPD = subscription.plan?.feature?.maxRPD ?? 0;
    return { maxRPM, maxRPD };
  }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = prisma as any

      const conversation = await db.aiConversation.findFirst({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
          title: true,
          projectId: true,
        },
      })

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const messages = await db.aiMessage.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          metadata: true,
          feedback: {
            where: {
              userId: ctx.session.user.id,
            },
            select: {
              isHelpful: true,
            },
          },
        },
      })

      // Transform messages to include feedback data and follow-ups from metadata
      const messagesWithFeedback = messages.map((message) => {
        // Extract follow-ups from metadata if present
        let followups: Array<{ id: string; label: string }> | undefined;
        const metadata = message.metadata && typeof message.metadata === 'object' ? (message.metadata as any) : {};

        if (metadata.followups && Array.isArray(metadata.followups)) {
          followups = metadata.followups;
        }

        return {
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          feedback: message.feedback[0] ? { isHelpful: message.feedback[0].isHelpful } : null,
          followups,
          metadata, // Include full metadata so frontend can check followupsConsumed
        };
      })

      return {
        conversation,
        messages: messagesWithFeedback,
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        contextType: z.enum(['project', 'profile', 'proposal', 'team', 'workspace', 'space', 'channel', 'task', 'list', 'folder']),
        entityId: z.string(),
        modelId: z.string(),
        title: z.string().optional(),
        systemPrompt: z.string().optional(),
        conversationType: z.nativeEnum(ConversationType).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await LimitGuard.ensureWithinChatLimit(
        ctx.session.user.id,
        input.contextType as ChatContextType,
        input.entityId
      )

      const db = prisma as any
      const openai = initializeOpenAI()

      const data: any = {
        userId: ctx.session.user.id,
        title: input.title || 'New chat',
        conversationType: input.conversationType ?? ConversationType.GENERAL,
        systemPrompt: input.systemPrompt,
        modelId: input.modelId
      }

      switch (input.contextType) {
        case 'project':
          data.projectId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.PROJECT_HELP
          break
        case 'proposal':
          data.proposalId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'team':
          data.teamId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.TEAM_COORDINATION
          break
        case 'workspace':
          data.workspaceId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'space':
          data.spaceId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'channel':
          data.channelId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'task':
          data.taskId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'list':
          data.listId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'folder':
          data.folderId = input.entityId
          data.conversationType = input.conversationType ?? ConversationType.GENERAL
          break
        case 'profile':
          data.conversationType = input.conversationType ?? ConversationType.MENTORSHIP
          break
      }

      const conversation = await db.aiConversation.create({
        data,
        include: {
          model: true,
        },
      })

      await ensureChatContext(conversation.id, input.contextType as ChatContextType, input.entityId, openai)

      return {
        id: conversation.id,
        title: conversation.title,
        projectId: conversation.projectId,
        proposalId: conversation.proposalId,
        teamId: conversation.teamId,
        model: conversation.model?.name,
        conversationType: conversation.conversationType,
      }
    }),

  rename: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        title: z.string().min(1).max(120),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any

      const existing = await db.aiConversation.findFirst({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
        },
      })

      if (!existing) {
        throw new Error('Conversation not found')
      }

      const conversation = await db.aiConversation.update({
        where: {
          id: input.conversationId,
        },
        data: {
          title: input.title,
        },
        select: {
          id: true,
          title: true,
        },
      })

      return conversation
    }),

  delete: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any

      const existing = await db.aiConversation.findFirst({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
        },
      })

      if (!existing) {
        throw new Error('Conversation not found')
      }

      await db.aiConversation.delete({
        where: {
          id: input.conversationId,
        },
      })

      return { success: true }
    }),

  archive: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        archived: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any

      const existing = await db.aiConversation.findFirst({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
        },
      })

      if (!existing) {
        throw new Error('Conversation not found')
      }

      // Note: You may need to add an 'archived' field to your schema
      // For now, we'll use a soft delete pattern or you can add the field
      const conversation = await db.aiConversation.update({
        where: {
          id: input.conversationId,
        },
        data: {
          // If you have an archived field: archived: input.archived
          // For now, we'll just return success
        },
        select: {
          id: true,
        },
      })

      return conversation
    }),

  // Message feedback endpoints
  toggleMessageFeedback: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        isHelpful: z.boolean(), // true = like, false = dislike
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any
      const userId = ctx.session.user.id

      // Verify message exists and belongs to user's conversation
      const message = await db.aiMessage.findFirst({
        where: {
          id: input.messageId,
          conversation: {
            userId,
          },
        },
        select: {
          id: true,
        },
      })

      if (!message) {
        throw new Error('Message not found')
      }

      // Check if feedback already exists
      const existingFeedback = await db.aiMessageFeedback.findUnique({
        where: {
          messageId_userId: {
            messageId: input.messageId,
            userId,
          },
        },
      })

      if (existingFeedback) {
        // If the same feedback is clicked, remove it
        if (existingFeedback.isHelpful === input.isHelpful) {
          await db.aiMessageFeedback.delete({
            where: {
              id: existingFeedback.id,
            },
          })
          return { action: 'removed', isHelpful: null }
        } else {
          // If different feedback, update it
          const updated = await db.aiMessageFeedback.update({
            where: {
              id: existingFeedback.id,
            },
            data: {
              isHelpful: input.isHelpful,
            },
          })
          return { action: 'updated', isHelpful: updated.isHelpful }
        }
      } else {
        // Create new feedback
        const created = await db.aiMessageFeedback.create({
          data: {
            messageId: input.messageId,
            userId,
            isHelpful: input.isHelpful,
          },
        })
        return { action: 'added', isHelpful: created.isHelpful }
      }
    }),

  getMessageFeedback: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = prisma as any
      const userId = ctx.session.user.id

      const feedback = await db.aiMessageFeedback.findUnique({
        where: {
          messageId_userId: {
            messageId: input.messageId,
            userId,
          },
        },
        select: {
          isHelpful: true,
        },
      })

      return feedback ? { isHelpful: feedback.isHelpful } : { isHelpful: null }
    }),

  // ─── Workforce Execution conversations ─────────────────────────────────────

  /** List existing WORKFORCE_EXECUTION conversations for a given workforce. */
  listWorkforceConversations: protectedProcedure
    .input(
      z.object({
        workforceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = prisma as any
      const userId = ctx.session.user.id

      const conversations = await db.aiConversation.findMany({
        where: {
          userId,
          conversationType: ConversationType.WORKFORCE_EXECUTION,
          metadata: {
            path: ['workforceId'],
            equals: input.workforceId,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          lastMessageAt: true,
          messageCount: true,
        },
      })

      return conversations
    }),

  /** Create a fresh WORKFORCE_EXECUTION conversation for a workforce run. */
  createWorkforceConversation: protectedProcedure
    .input(
      z.object({
        workforceId: z.string(),
        workforceName: z.string().optional(),
        modelId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any
      const userId = ctx.session.user.id

      // Resolve a default model if none supplied
      let modelId = input.modelId
      if (!modelId) {
        const defaultModel = await (prisma as any).aiModel.findFirst()
        modelId = defaultModel?.id ?? undefined
      }

      const conversation = await db.aiConversation.create({
        data: {
          userId,
          title: input.workforceName ? `${input.workforceName} – run` : 'Workforce run',
          conversationType: ConversationType.WORKFORCE_EXECUTION,
          modelId: modelId ?? null,
          metadata: { workforceId: input.workforceId },
        },
        select: { id: true, title: true, conversationType: true },
      })

      return conversation
    }),

  /** Persist a user task + execution result as messages in a WORKFORCE_EXECUTION conversation. */
  persistWorkforceMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        userMessage: z.string(),
        assistantContent: z.string(),  // e.g. "Execution started (ID: …)"
        metadata: z.record(z.string(), z.any()).optional(), // e.g. { executionId, workflowId, status }
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any
      const userId = ctx.session.user.id

      // Verify the conversation belongs to this user
      const conv = await db.aiConversation.findFirst({
        where: { id: input.conversationId, userId },
        select: { id: true, messageCount: true },
      })
      if (!conv) throw new Error('Conversation not found')

      const now = new Date()

      // Insert user message
      await db.aiMessage.create({
        data: {
          conversationId: input.conversationId,
          role: 'USER',
          content: input.userMessage,
        },
      })

      // Insert assistant message
      await db.aiMessage.create({
        data: {
          conversationId: input.conversationId,
          role: 'ASSISTANT',
          content: input.assistantContent,
          metadata: input.metadata ?? null,
        },
      })

      // Bump conversation counters
      await db.aiConversation.update({
        where: { id: input.conversationId },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: now,
          updatedAt: now,
        },
      })

      return { success: true }
    }),

  // Mark follow-ups as consumed for a message
  markFollowupsConsumed: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = prisma as any
      const userId = ctx.session.user.id

      // Verify message exists and belongs to user's conversation
      const message = await db.aiMessage.findFirst({
        where: {
          id: input.messageId,
          conversation: {
            userId,
          },
        },
        select: {
          id: true,
          metadata: true,
        },
      })

      if (!message) {
        throw new Error('Message not found')
      }

      // Update metadata to mark follow-ups as consumed
      const currentMetadata = (message.metadata as any) || {}
      const updatedMetadata = {
        ...currentMetadata,
        followupsConsumed: true,
        followupsConsumedAt: new Date().toISOString(),
      }

      await db.aiMessage.update({
        where: { id: input.messageId },
        data: {
          metadata: updatedMetadata,
        },
      })

      return { success: true }
    }),
})
