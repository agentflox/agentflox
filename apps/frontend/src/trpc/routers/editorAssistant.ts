import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/trpc/init";
import { initializeOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { ConversationType } from "@agentflox/database/src/generated/prisma";
import {
  EditorAssistantResponseSchema,
  ToolOpSchema,
  WorkforceOpSchema,
} from "@/components/assistant/editorOps";

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
    const openai = initializeOpenAI();
    const db: any = prisma as any;
    const userId = ctx.session.user.id;

    const conv = await db.aiConversation.findFirst({
      where: { id: input.conversationId, userId },
      select: { id: true },
    });
    if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

    const system = [
      "You are an in-app editor assistant for AgentFlox.",
      "You help users understand and modify either a Tool (step-based workflow tool) or a Workforce (node/edge graph).",
      "You must return STRICT JSON that matches this TypeScript shape:",
      '{ "assistantText": string, "proposedOps": Array<object> }',
      "Only propose operations that are directly supported by the product and are safe.",
      "If the user asks for changes, prefer proposing a small, correct set of ops.",
      "If you are unsure, ask a question in assistantText and return proposedOps as an empty array.",
    ].join("\n");

    const contextHint =
      input.mode === "tool"
        ? "Context is a JSON object representing the tool editor state (tool meta, inputs/outputs, ordered steps)."
        : "Context is a JSON object representing the workforce canvas state (nodes, edges, selection).";

    // Keep prompt small; rely on schema validation + UI confirmation.
    const user = [
      `Mode: ${input.mode}`,
      contextHint,
      "Context JSON:",
      JSON.stringify(input.context),
      "",
      "User message:",
      input.message,
      "",
      "Return JSON only. No markdown.",
    ].join("\n");

    try {
      // Persist the user message first
      await db.aiMessage.create({
        data: {
          conversationId: input.conversationId,
          role: "USER",
          content: input.message,
        },
      });

      // Load recent conversation context for the model (last 20 messages)
      const recent = await db.aiMessage.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { role: true, content: true },
      });

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          ...recent.map((m: any) => ({
            role: m.role === "ASSISTANT" ? ("assistant" as const) : ("user" as const),
            content: m.content as string,
          })),
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });

      const text = completion.choices[0]?.message?.content ?? "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new TRPCError({
          code: "PARSE_ERROR",
          message: "Assistant returned invalid JSON.",
        });
      }

      let validated = EditorAssistantResponseSchema.safeParse(parsed);
      if (!validated.success) {
        // Fallback: if the model returned a plain object that does not match
        // the strict schema, try to coerce it into a safe shape instead of
        // failing the whole request.
        const fallback: unknown = {
          assistantText:
            typeof (parsed as any)?.assistantText === "string"
              ? (parsed as any).assistantText
              : typeof parsed === "string"
                ? parsed
                : "",
          proposedOps: Array.isArray((parsed as any)?.proposedOps)
            ? (parsed as any).proposedOps
            : [],
        };

        const retry = EditorAssistantResponseSchema.safeParse(fallback);
        if (!retry.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assistant response failed validation.",
          });
        }
        validated = retry;
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

      await db.aiMessage.create({
        data: {
          conversationId: input.conversationId,
          role: "ASSISTANT",
          content: capped.assistantText,
          metadata: { proposedOps: capped.proposedOps },
        },
      });

      await db.aiConversation.update({
        where: { id: input.conversationId },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date(),
        },
      });

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

