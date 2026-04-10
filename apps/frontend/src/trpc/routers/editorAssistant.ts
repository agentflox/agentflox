import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { ConversationType } from "@agentflox/database";
import {
  EditorAssistantResponseSchema,
  ToolOpSchema,
  WorkforceOpSchema,
} from "@/components/assistant/editorOps";
import { agentService } from "@/services/agent.service";

const initializeSchema = z.object({
  mode: z.enum(["tool", "workforce"]),
  entityId: z.string().min(1),
  entityName: z.string().optional(),
  modelId: z.string().optional(),
});

const messageSchema = z.object({
  mode: z.enum(["tool", "workforce"]),
  conversationId: z.string().min(1),
  message: z.string().min(1),
  context: z.unknown(),
});

export const editorAssistantRouter = router({
  /**
   * Ensure a single conversation exists per entity (tool/workforce) per user.
   * Creates a welcome assistant message on first creation.
   */
  initialize: protectedProcedure.input(initializeSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const db: any = prisma as any;

    // Resolve a default model if none supplied
    let modelId = input.modelId;
    if (!modelId) {
      const defaultModel = await db.aiModel.findFirst();
      modelId = defaultModel?.id ?? undefined;
    }

    const conversationType =
      input.mode === "tool"
        ? ConversationType.TOOL_BUILDER
        : ConversationType.WORKFORCE_BUILDER;

    const existing = await db.aiConversation.findFirst({
      where: {
        userId,
        conversationType,
        ...(input.mode === "tool"
          ? { compositeToolId: input.entityId }
          : { workforceId: input.entityId }),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (existing?.id) {
      return { conversationId: existing.id, created: false };
    }

    const title =
      input.mode === "tool"
        ? `${input.entityName || "Tool"} – assistant`
        : `${input.entityName || "Workforce"} – assistant`;

    const conv = await db.aiConversation.create({
      data: {
        userId,
        title,
        conversationType,
        modelId: modelId ?? null,
        ...(input.mode === "tool"
          ? { compositeToolId: input.entityId }
          : { workforceId: input.entityId }),
        metadata: { editorMode: input.mode },
      },
      select: { id: true },
    });

    const welcome =
      input.mode === "tool"
        ? "Hi — I can explain what this tool does and propose edits (add/update/delete/reorder steps). Ask me anything."
        : "Hi — I can explain this workforce and propose edits (add/update/delete/replace nodes and edges). Ask me anything.";

    await db.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: "ASSISTANT",
        content: welcome,
        metadata: { kind: "welcome" },
      },
    });

    await db.aiConversation.update({
      where: { id: conv.id },
      data: { messageCount: 1, lastMessageAt: new Date() },
    });

    return { conversationId: conv.id, created: true };
  }),

  message: protectedProcedure.input(messageSchema).mutation(async ({ ctx, input }) => {
    const db: any = prisma as any;
    const userId = ctx.session.user.id;

    const conv = await db.aiConversation.findFirst({
      where: { id: input.conversationId, userId },
      select: { id: true, conversationType: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

    try {
      // Delegate all AI + validation logic to backend HTTP service
      const backendResponse = await agentService.agents.editorAssistant[
        input.mode === "tool" ? "toolMessage" : "workforceMessage"
      ](
        {
          conversationId: input.conversationId,
          message: input.message,
          context: input.context,
        },
        ctx.session,
      );

      const text = await backendResponse.json();

      const validated = EditorAssistantResponseSchema.safeParse(text);
      if (!validated.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assistant response failed validation.",
        });
      }

      // Enforce ops match requested mode.
      const opSchema = input.mode === "tool" ? ToolOpSchema : WorkforceOpSchema;
      const modeOps: any[] = [];
      for (const op of validated.data.proposedOps) {
        const ok = opSchema.safeParse(op);
        if (ok.success) modeOps.push(ok.data);
      }

      // Hard cap to prevent runaway edits.
      const capped = {
        assistantText: validated.data.assistantText,
        proposedOps: modeOps.slice(0, 25),
      };
      return capped;
    } catch (err: any) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err?.message || "Failed to generate assistant response.",
      });
    }
  }),
});

