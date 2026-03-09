import { Injectable } from '@nestjs/common';
import { ModelService } from './model.service';
import { prisma } from '@/lib/prisma';
import { UsageManager } from '@/services/billing/managers/usage.manager';

const SYSTEM_PROMPTS: Record<string, string> = {
    enhance:
        'You are a helpful writing assistant. Improve the grammar, clarity, and style of the text while maintaining the original meaning. Return only the improved text without any additional commentary.',
    expand:
        'You are a helpful writing assistant. Expand on the given text with more details, examples, and context. Return only the expanded text without any additional commentary.',
    summarize:
        'You are a helpful writing assistant. Create a concise summary of the text. Return only the summary without any additional commentary.',
    simplify:
        'You are a helpful writing assistant. Simplify the text to make it easier to understand. Return only the simplified text without any additional commentary.',
    professional:
        'You are a helpful writing assistant. Rewrite the text in a more professional tone. Return only the rewritten text without any additional commentary.',
    casual:
        'You are a helpful writing assistant. Rewrite the text in a more casual, friendly tone. Return only the rewritten text without any additional commentary.',
    fixSpelling:
        'You are a helpful writing assistant. Fix spelling and grammar in the text. Return only the corrected text without any additional commentary.',
    makeLonger:
        'You are a helpful writing assistant. Make the text longer by adding relevant detail and explanation. Return only the expanded text without any additional commentary.',
    makeShorter:
        'You are a helpful writing assistant. Make the text shorter while keeping the main points. Return only the shortened text without any additional commentary.',
    actionItems:
        'You are a helpful writing assistant. From the given text, generate a clear list of action items (tasks to do). Return only the list, one item per line or as a bullet list, without any additional commentary.',
    writeDescription:
        'You are a helpful writing assistant. Write a clear, structured description based on the user\'s input or topic. Return only the description without any additional commentary.',
    createPlan:
        'You are a helpful writing assistant. Create a structured plan (steps, phases, or outline) based on the user\'s input. Return only the plan without any additional commentary.',
    explain:
        'You are a helpful writing assistant. Explain the given text in a clear and understandable way. Return only the explanation without any additional commentary.',
    translate:
        'You are a helpful writing assistant. Translate the given text to clear, natural English (or preserve the language if already in English). Return only the translated text without any additional commentary.',
    custom:
        'You are a helpful writing assistant. Apply the user\'s instruction to the given text. Return only the modified text without any additional commentary.',
};

const MODEL = 'gpt-4o-mini';
const ESTIMATE_CHARS_PER_TOKEN = 4;
const OUTPUT_BUFFER_TOKENS = 500;

export interface AiTextContextEntity {
    type: 'list' | 'project' | 'space';
    id: string;
}

export type CreativityLevel = 'low' | 'medium' | 'high';

export interface AiTextInput {
    text: string;
    operation: string;
    userInstruction?: string;
    tone?: string;
    creativity?: CreativityLevel;
    contextIds?: AiTextContextEntity[];
}

export interface AiTextSuccess {
    result: string;
}

export interface AiTextTokenError {
    error: 'Insufficient tokens';
    remaining: number;
    required: number;
}

export type AiTextOutput = AiTextSuccess | AiTextTokenError;

function estimateInputTokens(text: string, systemPrompt: string): number {
    return Math.ceil((text.length + systemPrompt.length) / ESTIMATE_CHARS_PER_TOKEN);
}

function estimateOutputTokens(text: string): number {
    return Math.ceil(text.length / ESTIMATE_CHARS_PER_TOKEN) + OUTPUT_BUFFER_TOKENS;
}

@Injectable()
export class AiTextService {
    private modelService: ModelService;

    constructor() {
        this.modelService = new ModelService();
    }

    private static readonly TONE_INSTRUCTIONS: Record<string, string> = {
        default: '',
        professional: 'Use a professional, formal tone.',
        straightforward: 'Use a direct, straightforward tone.',
        inspirational: 'Use an uplifting, inspirational tone.',
        optimistic: 'Use a positive, optimistic tone.',
        casual: 'Use a casual, friendly tone.',
        confident: 'Use a confident, assertive tone.',
        friendly: 'Use a warm, friendly tone.',
        humorous: 'Use a light, humorous tone when appropriate.',
    };

    async processText(userId: string, input: AiTextInput): Promise<AiTextOutput> {
        const { text, operation, userInstruction, tone, creativity, contextIds } = input;
        const op = operation && SYSTEM_PROMPTS[operation] ? operation : 'enhance';
        let systemPrompt = SYSTEM_PROMPTS[op];

        if (op === 'custom' && userInstruction) {
            systemPrompt = `You are a helpful writing assistant. The user has provided this instruction: "${userInstruction}". Apply it to the given text. Return only the modified text without any additional commentary.`;
        }

        const toneKey = (tone || 'default').toLowerCase().replace(/\s+/g, '');
        const toneInstruction = AiTextService.TONE_INSTRUCTIONS[toneKey] ?? (tone ? `Use a ${tone} tone.` : '');
        if (toneInstruction) {
            systemPrompt = `${systemPrompt}\n\n${toneInstruction}`;
        }

        const temperature = creativity === 'high' ? 0.9 : creativity === 'low' ? 0.3 : 0.7;

        let contextBlock = '';
        if (contextIds && contextIds.length > 0) {
            const contextParts: string[] = [];
            for (const ctx of contextIds) {
                try {
                    if (ctx.type === 'list') {
                        const list = await prisma.list.findUnique({
                            where: { id: ctx.id },
                            include: { tasks: { take: 10 } },
                        });
                        if (list) {
                            const taskPreviews = (list.tasks || [])
                                .map((t: any) => `- ${t.title || 'Untitled'}`)
                                .join('\n');
                            contextParts.push(`List "${list.name}":\n${taskPreviews || '(no tasks)'}`);
                        }
                    } else if (ctx.type === 'project') {
                        const project = await prisma.project.findUnique({
                            where: { id: ctx.id },
                            select: { name: true, description: true },
                        });
                        if (project) {
                            contextParts.push(`Project "${project.name}": ${project.description || '(no description)'}`);
                        }
                    } else if (ctx.type === 'space') {
                        const space = await prisma.space.findUnique({
                            where: { id: ctx.id },
                            select: { name: true, description: true },
                        });
                        if (space) {
                            contextParts.push(`Space "${space.name}": ${space.description || '(no description)'}`);
                        }
                    }
                } catch (e) {
                    console.warn('AiTextService: failed to fetch context', ctx, e);
                }
            }
            if (contextParts.length > 0) {
                contextBlock = `\n\nRelevant context the user has referenced (use this to inform your response):\n${contextParts.join('\n\n')}`;
            }
        }

        const userContent = contextBlock ? `${text}${contextBlock}` : text;
        const estimatedInput = estimateInputTokens(userContent, systemPrompt);
        const estimatedOutput = 2000;
        const requiredTokens = estimatedInput + estimatedOutput;

        const limitCheck = await UsageManager.checkTokenLimit(userId, requiredTokens);
        if (!limitCheck.allowed) {
            return {
                error: 'Insufficient tokens',
                remaining: limitCheck.remaining,
                required: requiredTokens,
            };
        }

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: text },
        ];

        const result = await this.modelService.generateText(MODEL, messages as any, {
            temperature,
            maxTokens: 2000,
        });

        const resultText = (result.content || '').trim();
        const inputTokens = estimateInputTokens(userContent, systemPrompt);
        const outputTokens = Math.ceil(resultText.length / ESTIMATE_CHARS_PER_TOKEN);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });
        const userName = user?.name || user?.email || 'User';

        try {
            await UsageManager.updateChatUsage(
                userId,
                userName,
                inputTokens,
                outputTokens,
                1,
                user?.email ?? undefined
            );
        } catch (err) {
            console.error('AiTextService: failed to update chat usage', err);
            // Don't fail the request; usage tracking is best-effort
        }

        return { result: resultText };
    }
}
