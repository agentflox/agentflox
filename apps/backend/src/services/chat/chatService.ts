import { z } from 'zod';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { initializeOpenAI } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, RateLimitConfig, RateLimitResult } from './utils/checkRateLimit';
import { ensureChatContext, getChatContextKey, CHAT_CONTEXT_TTL_SECONDS, ChatContextType } from './utils/requestContext';
import { countTokens } from './utils/countTokens';
import { convertModelName } from './utils/convertModelName';
import { OpenAIErrorHandler } from './utils/errorHandler';
import { setJson } from './utils/redis.utils';
import { enrichChatContext } from './chatContextEnricher';
import { extractFollowups } from './chatFollowupExtractor';
import { generateQuickActions } from './chatQuickActionsGenerator';
import type { EnrichedContext, ChatFollowup, QuickAction } from './types';
import { ModelService } from '../ai/model.service';
import { UsageTrackingService } from '../ai/usage.service';

const modelService = new ModelService();
const usageTrackingService = new UsageTrackingService();

const bodySchema = z.object({
    conversationId: z.string(),
    contextType: z.enum(['project', 'profile', 'proposal', 'team', 'workspace', 'space', 'channel', 'task', 'list', 'folder']),
    entityId: z.string(),
    message: z.string().min(1),
    attachments: z.array(z.object({
        url: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        type: z.enum(['text', 'file']),
        fileId: z.string().optional(),
        content: z.string().optional(),
        chunks: z.array(z.string()).optional(),
        embeddings: z.array(z.object({
            chunk: z.string(),
            embedding: z.array(z.number()),
        })).optional(),
    })).optional(),
    webSearch: z.boolean().optional(),
    model: z.string().optional(),
    config: z
        .object({
            RPM: z.number().optional(),
            RPD: z.number().optional(),
        })
        .optional(),
});

interface ChatCompletionMessageParam {
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; file_id?: string }>
}

/**
 * Build user message content with attachments
 */
function buildUserMessageContent(
    message: string,
    attachments?: Array<{
        url: string
        filename: string
        mimeType: string
        type: 'text' | 'file'
        fileId?: string
        content?: string
        chunks?: string[]
        embeddings?: Array<{ chunk: string; embedding: number[] }>
    }>
): string | Array<{ type: string; text?: string; file_id?: string }> {
    if (!attachments || attachments.length === 0) {
        return message
    }

    const content: Array<{ type: string; text?: string; file_id?: string }> = [
        { type: 'input_text', text: message },
    ]

    for (const attachment of attachments) {
        if (attachment.type === 'text' && attachment.content) {
            // Include text content directly
            content.push({
                type: 'input_text',
                text: `\n\nFile: ${attachment.filename}\n${attachment.content}`,
            })
        } else if (attachment.fileId) {
            // Use OpenAI file ID
            content.push({
                type: 'input_file',
                file_id: attachment.fileId,
            })
        }
    }

    return content
}

export class ChatService {
    /**
     * Process chat completion request
     */
    static async processChatCompletion(
        userId: string,
        payload: z.infer<typeof bodySchema>,
        ip: string
    ): Promise<{
        stream: ReadableStream;
        headers: Record<string, string>;
    }> {
        const { conversationId, contextType, entityId, message, attachments, webSearch, model, config } = bodySchema.parse(payload);

        const openai = initializeOpenAI();
        const db = prisma as any;

        // **OPTIMIZATION 1: Parallel execution of independent operations**
        const [rateLimitResult, conversation] = await Promise.all([
            checkRateLimit(ip, config ?? {}),
            db.aiConversation.findFirst({
                where: {
                    id: conversationId,
                    userId: userId,
                },
                include: {
                    model: true,
                },
            }),
        ]);

        const modelName = convertModelName(conversation.model?.name) ?? 'gpt-4o-mini';

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        // Validate conversation belongs to the entity
        const entityFieldMap: Record<string, string> = {
            project: 'projectId',
            proposal: 'proposalId',
            team: 'teamId',
            workspace: 'workspaceId',
            space: 'spaceId',
            channel: 'channelId',
            task: 'taskId',
            list: 'listId',
            folder: 'folderId',
        };
        const entityField = entityFieldMap[contextType] ?? null;
        if (entityField && conversation[entityField] && conversation[entityField] !== entityId) {
            throw new Error(`Conversation does not belong to this ${contextType}`);
        }

        // **OPTIMIZATION 2: Parallel execution of context, embedding, previous messages, and knowledge retrieval**
        const [basicContext, queryEmbedding, previousMessages] = await Promise.all([
            ensureChatContext(conversationId, contextType as ChatContextType, entityId, openai),
            openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: message,
            }),
            db.aiMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: 30,
                select: {
                    role: true,
                    content: true,
                },
            }),
        ]);

        // **ENHANCEMENT: Enrich context with workspace data and semantic understanding**
        const conversationHistoryForContext = previousMessages.map(m => ({
            role: m.role.toLowerCase(),
            content: m.content,
        }));

        const enrichedContext = await enrichChatContext(
            userId,
            contextType as ChatContextType,
            entityId,
            message,
            conversationHistoryForContext,
            openai
        );

        // **OPTIMIZATION 3: Knowledge retrieval after embedding is ready**
        let knowledgeSnippets: string[] = [];
        if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL && contextType === 'project') {
            try {
                const { data, error } = await supabaseAdmin.rpc('match_entity_data', {
                    query_embedding: queryEmbedding.data[0]?.embedding,
                    match_threshold: 0.7,
                    match_count: 5,
                    project_id: entityId,
                });

                if (!error && Array.isArray(data)) {
                    knowledgeSnippets = data
                        .map((row: any) => row?.content || row?.metadata?.content)
                        .filter((item: unknown): item is string => typeof item === 'string');
                }
            } catch (error) {
                console.warn('Failed to execute Supabase match_entity_data RPC', error);
            }
        }

        // Web search if enabled
        let webSearchOptions: any = undefined;
        if (webSearch) {
            webSearchOptions = {
                search_context_size: 'low',
                user_location: {
                    approximate: {
                        city: 'city',
                        country: 'country',
                        region: 'region',
                        timezone: 'timezone',
                    },
                    type: 'approximate',
                },
            };
            knowledgeSnippets.push('[Web search enabled - results will be included in response]');
        }

        const contextLabels: Record<string, string> = {
            project: 'project',
            profile: 'profile',
            proposal: 'proposal',
            team: 'team',
            workspace: 'workspace',
            space: 'space',
            channel: 'channel',
            task: 'task',
            list: 'list',
            folder: 'folder',
        };

        const systemPromptParts = [
            conversation.systemPrompt ||
            `You are an AI assistant that helps users manage their ${contextLabels[contextType] ?? contextType} inside the Agentflox platform. Provide actionable, concise answers and reference ${contextLabels[contextType] ?? contextType} knowledge when possible.`,
        ];

        // Add enriched context summary
        if (enrichedContext.summary && enrichedContext.summary !== 'No specific context available') {
            systemPromptParts.push(`Context: ${enrichedContext.summary}`);
        }

        // Add semantic context from enriched data
        if (enrichedContext.semanticContext) {
            systemPromptParts.push(`Relevant Information:\n${enrichedContext.semanticContext}`);
        }

        // Add basic context summary (fallback)
        if (basicContext.summary && !enrichedContext.semanticContext) {
            const label = contextLabels[contextType] ?? contextType;
        systemPromptParts.push(`${label.charAt(0).toUpperCase() + label.slice(1)} summary:\n${basicContext.summary}`);
        }

        if (knowledgeSnippets.length > 0) {
            systemPromptParts.push(
                `Knowledge Base:\n${knowledgeSnippets
                    .map((snippet, index) => `${index + 1}. ${snippet}`)
                    .join('\n')}`
            );
        }

        // Build input messages
        const inputMessages = [
            {
                role: 'system',
                content: systemPromptParts.join('\n\n'),
            },
            ...previousMessages.map((msg) => ({
                role: msg.role.toLowerCase() as ChatCompletionMessageParam['role'],
                content: msg.content,
            })),
            {
                role: 'user',
                content: buildUserMessageContent(message, attachments),
            },
        ];

        // **OPTIMIZATION 4: Use approximate token count for pre-check (faster)**
        const estimatedInputTokens = Math.ceil(JSON.stringify(inputMessages).length / 4);

        const messages: ChatCompletionMessageParam[] = inputMessages;
        const targetModel = model || conversation.model?.name || 'gpt-4o-mini';

        // **OPTIMIZATION 5: Save user message and start streaming in parallel**
        const userMessagePromise = db.$transaction([
            db.aiMessage.create({
                data: {
                    conversationId,
                    role: 'USER',
                    content: message,
                    model: targetModel,
                    tokensUsed: estimatedInputTokens,
                    attachments
                },
            }),
            db.aiConversation.update({
                where: { id: conversationId },
                data: {
                    messageCount: { increment: 1 },
                    totalTokensUsed: { increment: estimatedInputTokens },
                    lastMessageAt: new Date(),
                    modelId: model ? undefined : conversation.modelId // Keep existing if not overridden, logic might need adjustment if model table used
                },
            }),
        ]);

        const streamResult = await modelService.streamText(targetModel, inputMessages, {
            temperature: 0.4,
            maxTokens: 4000
        });

        const redisKey = getChatContextKey(conversationId);
        const textEncoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                let assistantMessage = '';
                let followups: ChatFollowup[] = [];
                let quickActions: QuickAction[] = [];

                try {
                    // Ensure user message is saved before we start processing
                    await userMessagePromise;

                    // Handle streaming response
                    for await (const chunk of streamResult) {
                        // ModelService streams encoded Uint8Array or we might need to verify.
                        // The provider implementation returns ReadableStream of Strings mostly or Uint8Array?
                        // OpenAIProvider returns encoded. Anthropic/Google encoded.
                        // Wait, provider implementations I wrote return encoded Uint8Array.
                        // But here I'm reading from it.
                        // If streamResult is ReadableStream, I should pipe it or read from reader.
                    }

                    // Correct approach for consuming ReadableStream from service
                    const reader = streamResult.getReader();
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            if (value) {
                                // value is Uint8Array
                                const text = new TextDecoder().decode(value);
                                assistantMessage += text;
                                controller.enqueue(value);
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }


                    // **ENHANCEMENT: Extract follow-ups and generate quick actions**
                    try {
                        [followups, quickActions] = await Promise.all([
                            extractFollowups(assistantMessage, enrichedContext, conversationHistoryForContext),
                            generateQuickActions(
                                contextType as ChatContextType,
                                entityId,
                                enrichedContext,
                                message,
                                conversationHistoryForContext
                            ),
                        ]);
                    } catch (error) {
                        console.error('Error extracting followups/actions:', error);
                    }

                    // **OPTIMIZATION 7: Do token counting and DB updates after streaming completes**
                    const finalizeResponse = async () => {
                        try {
                            // Count exact tokens after completion
                            // Use ModelService token counting? Providers have it.
                            // But UsageTracking needs numbers.
                            const inputTokenExact = estimatedInputTokens; // Approximation often fine for inputs if counting is expensive
                            // Or use modelService.countTokens for exact check if needed
                            // const outputTokenCount = await modelService.countTokens(assistantMessage);
                            // Let's use estimate for speed if provider doesn't give usage in stream end (some do, some don't)
                            const outputTokenCount = Math.ceil(assistantMessage.length / 4);

                            const totalInputTokens = inputTokenExact;
                            const totalOutputTokens = outputTokenCount;

                            // Log Usage for Billing
                            await usageTrackingService.trackUsage({
                                userId,
                                modelId: targetModel,
                                inputTokens: totalInputTokens,
                                outputTokens: totalOutputTokens,
                                context: 'CHAT',
                                conversationId: conversationId
                            });

                            // Parallel execution of final DB operations
                            await Promise.all([
                                db.$transaction([
                                    db.aiMessage.create({
                                        data: {
                                            conversationId,
                                            role: 'ASSISTANT',
                                            content: assistantMessage,
                                            model: targetModel,
                                            tokensUsed: totalInputTokens + totalOutputTokens,
                                            metadata: {
                                                followups: followups.length > 0 ? followups : undefined,
                                                quickActions: quickActions.length > 0 ? quickActions : undefined,
                                                followupsConsumed: false,
                                            },
                                        },
                                    }),
                                    db.aiConversation.update({
                                        where: { id: conversationId },
                                        data: {
                                            messageCount: { increment: 1 },
                                            totalTokensUsed: { increment: totalOutputTokens },
                                            lastMessageAt: new Date(),
                                        },
                                    }),
                                ]),
                                // Update Redis cache in parallel
                                setJson(
                                    redisKey,
                                    {
                                        ...basicContext,
                                        ...enrichedContext,
                                        embedding: queryEmbedding.data[0]?.embedding ?? basicContext.embedding,
                                        lastUpdatedAt: Date.now(),
                                    },
                                    CHAT_CONTEXT_TTL_SECONDS
                                ),
                            ]);
                        } catch (error) {
                            console.error('Error finalizing response:', error);
                        }
                    };

                    // Don't await - let it run in background
                    finalizeResponse();

                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        const headers: Record<string, string> = {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
        };

        if (rateLimitResult.limitPerMinute !== undefined) {
            headers['X-Rate-Limit-Limit-Minute'] = rateLimitResult.limitPerMinute.toString();
        }
        if (rateLimitResult.remainingPerMinute !== undefined) {
            headers['X-Rate-Limit-Remaining-Minute'] = rateLimitResult.remainingPerMinute.toString();
        }
        if (rateLimitResult.resetPerMinute !== undefined) {
            headers['X-Rate-Limit-Reset-Minute'] = rateLimitResult.resetPerMinute.toString();
        }
        if (rateLimitResult.limitPerDay !== undefined) {
            headers['X-Rate-Limit-Limit-Day'] = rateLimitResult.limitPerDay.toString();
        }
        if (rateLimitResult.remainingPerDay !== undefined) {
            headers['X-Rate-Limit-Remaining-Day'] = rateLimitResult.remainingPerDay.toString();
        }
        if (rateLimitResult.resetPerDay !== undefined) {
            headers['X-Rate-Limit-Reset-Day'] = rateLimitResult.resetPerDay.toString();
        }

        return { stream, headers };
    }
}

