import Anthropic from '@anthropic-ai/sdk';
import { IAiProvider, AiGenerationResult } from '../types';

export class AnthropicProvider implements IAiProvider {
    private anthropic: Anthropic;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    async generateText(prompt: string | any[], options: any = {}): Promise<AiGenerationResult> {
        const { system, messages } = this.extractSystemMessage(prompt);

        const response = await this.anthropic.messages.create({
            model: options.model || 'claude-3-5-sonnet-20240620',
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            system: system,
            messages: messages,
        });

        return {
            content: (response.content[0] as any).text || '',
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
        };
    }

    async streamText(prompt: string | any[], options: any = {}): Promise<ReadableStream> {
        const { system, messages } = this.extractSystemMessage(prompt);

        const stream = await this.anthropic.messages.create({
            model: options.model || 'claude-3-5-sonnet-20240620',
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            system: system,
            messages: messages,
            stream: true,
        });

        const textEncoder = new TextEncoder();
        return new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                        controller.enqueue(textEncoder.encode(chunk.delta.text));
                    }
                }
                controller.close();
            },
        });
    }

    async countTokens(text: string | any[]): Promise<number> {
        const input = typeof text === 'string' ? text : JSON.stringify(text); // Basic approx
        return Math.ceil(input.length / 4);
    }

    private extractSystemMessage(prompt: string | any[]): { system?: string, messages: any[] } {
        let system: string | undefined = undefined;
        let messages: any[] = [];

        if (typeof prompt === 'string') {
            messages = [{ role: 'user', content: prompt }];
        } else {
            // Filter out system message and format others
            const rawMessages = prompt as import('../types').MultimodalMessage[];

            messages = rawMessages.reduce((acc: any[], msg) => {
                if (msg.role === 'system') {
                    system = typeof msg.content === 'string' ? msg.content : (msg.content as any[]).map((c: any) => c.text).join('\n');
                    return acc;
                }

                let content: any = msg.content;
                if (Array.isArray(msg.content)) {
                    content = msg.content.map((c: any) => {
                        if (c.type === 'text') return { type: 'text', text: c.text };
                        if (c.type === 'image_base64') {
                            return {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: c.mediaType as any, // Anthropic strict types e.g. "image/jpeg"
                                    data: c.data,
                                }
                            };
                        }
                        // Anthropic doesn't support URL images directly in messages API usually, requires base64
                        // Ignoring URL/Video for now or falling back to text description
                        if (c.type === 'image_url') {
                            return { type: 'text', text: `[Image URL: ${c.imageUrl.url}]` };
                        }
                        return null;
                    }).filter(Boolean);
                }

                acc.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: content
                });
                return acc;
            }, []);
        }

        return { system, messages };
    }
}
