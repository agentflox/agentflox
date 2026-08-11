import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { ConversationType } from '@agentflox/database';
import type { Response as ExpressResponse } from 'express';
import {
  completeWithDefaultModel,
  resolveModel,
  createChatCompletion,
  recordUsage,
  fromOpenAIUsage,
} from '@/services/models';

@Injectable()
export class SupportService {
    async initializeSupportAssistant(userId: string, title?: string) {
        const db: any = prisma as any;

        const existing = await db.aiConversation.findFirst({
            where: {
                userId,
                conversationType: ConversationType.SUPPORT,
            },
            orderBy: { updatedAt: 'desc' },
            select: { id: true },
        });

        if (existing?.id) {
            return { conversationId: existing.id, created: false };
        }

        const conv = await db.aiConversation.create({
            data: {
                userId,
                title: title || 'Support Chat',
                conversationType: ConversationType.SUPPORT,
            },
            select: { id: true },
        });

        const welcome =
            "Hello! I'm your Agentflox AI assistant. How can I help you today? I can help with community questions, platform features, or technical support.";

        await db.aiMessage.create({
            data: {
                conversationId: conv.id,
                role: 'ASSISTANT',
                content: welcome,
                metadata: { kind: 'welcome' },
            },
        });

        await db.aiConversation.update({
            where: { id: conv.id },
            data: { messageCount: 1, lastMessageAt: new Date() },
        });

        return { conversationId: conv.id, created: true };
    }

    async sendMessageToSupportAssistant(
        userId: string,
        conversationId: string,
        message: string,
        modelId?: string | null,
    ) {
        const db: any = prisma as any;

        const conv = await db.aiConversation.findFirst({
            where: { id: conversationId, userId },
            select: { id: true, modelId: true },
        });

        if (!conv) {
            throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
        }

        const resolvedModelId = modelId ?? conv.modelId ?? null;
        if (modelId) {
            await db.aiConversation.update({
                where: { id: conversationId },
                data: { modelId },
            }).catch(() => { /* non-fatal */ });
        }

        try {
            await db.aiMessage.create({
                data: { conversationId, role: 'USER', content: message },
            });

            const recent = await db.aiMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: 20,
                select: { role: true, content: true },
            });

            const { completion } = await completeWithDefaultModel({
                userId,
                modelId: resolvedModelId,
                request: {
                    temperature: 0.7,
                    messages: [
                        { role: 'system', content: this.buildSystemPrompt() },
                        ...recent.map((m: any) => ({
                            role: m.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
                            content: m.content as string,
                        })),
                    ],
                    stream: false,
                },
                usageContext: {
                    action: 'CHAT',
                    conversationId,
                    metadata: { source: 'support.service' },
                },
                skipEntitlement: true,
            });

            const assistantContent =
                completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";

            await db.aiMessage.create({
                data: { conversationId, role: 'ASSISTANT', content: assistantContent },
            });

            await db.aiConversation.update({
                where: { id: conversationId },
                data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
            });

            return { content: assistantContent };
        } catch (err: any) {
            throw new HttpException(
                err?.message || 'Failed to generate assistant response.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Streaming version — emits SSE frames (thinking → token → complete | error).
     * Compatible with the frontend `useSSEStream` hook.
     */
    async streamMessageToSupportAssistant(
        userId: string,
        conversationId: string,
        message: string,
        res: ExpressResponse,
        modelId?: string | null,
    ) {
        const emit = (type: string, data: Record<string, unknown>) => {
            res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
        };

        const db: any = prisma as any;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        try {
            const conv = await db.aiConversation.findFirst({
                where: { id: conversationId, userId },
                select: { id: true, modelId: true },
            });

            if (!conv) {
                emit('error', { message: 'Conversation not found' });
                res.end();
                return;
            }

            const resolvedModelId = modelId ?? conv.modelId ?? null;
            if (modelId) {
                await db.aiConversation.update({
                    where: { id: conversationId },
                    data: { modelId },
                }).catch(() => { /* non-fatal */ });
            }

            emit('thinking', { step: 'Processing your message…', node: 'SUPPORT' });

            await db.aiMessage.create({
                data: { conversationId, role: 'USER', content: message },
            });

            const recent = await db.aiMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: 20,
                select: { role: true, content: true },
            });

            const resolved = await resolveModel({
                modelId: resolvedModelId,
                userId,
                skipEntitlement: true,
            });

            const started = Date.now();
            const stream = await createChatCompletion(resolved, {
                temperature: 0.7,
                stream: true,
                messages: [
                    { role: 'system', content: this.buildSystemPrompt() },
                    ...recent.map((m: any) => ({
                        role: m.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
                        content: m.content as string,
                    })),
                ],
            });

            let fullText = '';
            let streamUsage: any;
            for await (const chunk of stream as any) {
                if (chunk.usage) streamUsage = chunk.usage;
                const text = chunk.choices[0]?.delta?.content ?? '';
                if (text) {
                    fullText += text;
                    emit('token', { text });
                }
            }

            await recordUsage({
                resolved,
                usage: streamUsage
                    ? fromOpenAIUsage(streamUsage)
                    : {
                        inputTokens: 0,
                        outputTokens: Math.ceil(fullText.length / 4),
                        totalTokens: Math.ceil(fullText.length / 4),
                        usageEstimated: true,
                    },
                userId,
                context: {
                    action: 'GENERATE',
                    metadata: { source: 'support.service.stream' },
                    requestDurationMs: Date.now() - started,
                    success: true,
                },
            });

            await db.aiMessage.create({
                data: { conversationId, role: 'ASSISTANT', content: fullText },
            });

            await db.aiConversation.update({
                where: { id: conversationId },
                data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
            });

            emit('complete', { payload: { content: fullText } });
        } catch (err: any) {
            console.error('[SupportService] Stream error:', err);
            emit('error', { message: err?.message || 'Failed to generate response.' });
        } finally {
            res.end();
        }
    }

    private buildSystemPrompt(): string {
        return [
            'You are a premium AI support assistant for Agentflox.',
            'Agentflox is a powerful agentic AI platform for building intelligent tools and workforces.',
            'You are helpful, professional, and friendly.',
            'Your goal is to assist users with any questions they have about the platform.',
            'Provide clear, concise, and accurate information.',
        ].join('\n');
    }
}
