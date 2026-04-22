import { TRPCError } from "@trpc/server";
import { initializeOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { ConversationType } from "@agentflox/database";

export async function initializeSupportAssistant(userId: string, title?: string) {
  const db: any = prisma as any;

  const existing = await db.aiConversation.findFirst({
    where: {
      userId,
      conversationType: ConversationType.SUPPORT,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (existing?.id) {
    return { conversationId: existing.id, created: false };
  }

  const conv = await db.aiConversation.create({
    data: {
      userId,
      title: title || "Support Chat",
      conversationType: ConversationType.SUPPORT,
    },
    select: { id: true },
  });

  const welcome = "Hello! I'm your Agentflox AI assistant. How can I help you today? I can help with community questions, platform features, or technical support.";

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
}

export async function sendMessageToSupportAssistant(userId: string, conversationId: string, message: string) {
  const openai = initializeOpenAI();
  const db: any = prisma as any;

  const conv = await db.aiConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

  const system = [
    "You are a premium AI support assistant for Agentflox.",
    "Agentflox is a powerful agentic AI platform for building tools and workforces.",
    "You are helpful, professional, and friendly.",
    "Your goal is to assist users with any questions they have about the platform.",
    "Provide clear, concise, and accurate information.",
  ].join("\n");

  try {
    await db.aiMessage.create({
      data: {
        conversationId,
        role: "USER",
        content: message,
      },
    });

    const recent = await db.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        ...recent.map((m: any) => ({
          role: m.role === "ASSISTANT" ? ("assistant" as const) : ("user" as const),
          content: m.content as string,
        })),
      ],
    });

    const assistantContent = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";

    await db.aiMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: assistantContent,
      },
    });

    await db.aiConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 2 },
        lastMessageAt: new Date(),
      },
    });

    return { content: assistantContent };
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err?.message || "Failed to generate assistant response.",
    });
  }
}
