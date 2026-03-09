import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { IAiProvider, AiGenerationResult } from '../types';

export class GoogleProvider implements IAiProvider {
    private genAI: GoogleGenerativeAI;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    }

    async generateText(prompt: string | any[], options: any = {}): Promise<AiGenerationResult> {
        const { modelName, config, contents, systemInstruction } = this.prepareRequest(prompt, options);
        const model = this.genAI.getGenerativeModel({ model: modelName, systemInstruction });

        const result = await model.generateContent({
            contents,
            generationConfig: config,
        });

        const response = await result.response;
        const text = response.text();
        // Google doesn't always return token usage in the main response object easily for all models/versions 
        // but check usageMetadata if available
        const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

        return {
            content: text,
            usage: {
                inputTokens: usage.promptTokenCount,
                outputTokens: usage.candidatesTokenCount,
                totalTokens: usage.totalTokenCount,
            },
        };
    }

    async streamText(prompt: string | any[], options: any = {}): Promise<ReadableStream> {
        const { modelName, config, contents, systemInstruction } = this.prepareRequest(prompt, options);
        const model = this.genAI.getGenerativeModel({ model: modelName, systemInstruction });

        const result = await model.generateContentStream({
            contents,
            generationConfig: config,
        });

        const textEncoder = new TextEncoder();
        return new ReadableStream({
            async start(controller) {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        controller.enqueue(textEncoder.encode(chunkText));
                    }
                }
                controller.close();
            },
        });
    }

    async countTokens(text: string | any[]): Promise<number> {
        // Basic approx if object
        const input = typeof text === 'string' ? text : JSON.stringify(text);
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const { totalTokens } = await model.countTokens(input);
        return totalTokens;
    }

    private prepareRequest(prompt: string | any[], options: any) {
        const modelName = options.model || 'gemini-1.5-flash';

        // Configuration
        const config = {
            temperature: options.temperature,
            maxOutputTokens: options.maxTokens,
        };

        let contents: any[] = [];
        let systemInstruction: string | undefined = undefined;

        if (typeof prompt === 'string') {
            contents = [{ role: 'user', parts: [{ text: prompt }] }];
        } else {
            const rawMessages = prompt as import('../types').MultimodalMessage[];

            // Handle array of messages
            // Check for system prompt
            const systemMsg = rawMessages.find(m => m.role === 'system');
            if (systemMsg) {
                systemInstruction = typeof systemMsg.content === 'string'
                    ? systemMsg.content
                    : (systemMsg.content as any[]).map(c => c.text).join('\n');
            }

            contents = rawMessages
                .filter(m => m.role !== 'system')
                .map(m => {
                    let parts: any[] = [];
                    if (typeof m.content === 'string') {
                        parts = [{ text: m.content }];
                    } else {
                        parts = m.content.map((c: any) => {
                            if (c.type === 'text') return { text: c.text };
                            if (c.type === 'image_base64' || c.type === 'video_base64') {
                                // Gemini supports inline data for images and video (up to size limits)
                                return {
                                    inlineData: {
                                        mimeType: c.mediaType,
                                        data: c.data
                                    }
                                };
                            }
                            // For URLs, Gemini usually needs File API upload first (not inline). 
                            // Falling back to text description for now.
                            if (c.type === 'image_url') return { text: `[Image URL: ${c.imageUrl.url}]` };
                            if (c.type === 'file_url') return { text: `[File URL: ${c.fileUrl}]` };
                            return null;
                        }).filter(Boolean);
                    }

                    return {
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: parts
                    };
                });
        }

        return { modelName, config, contents, systemInstruction };
    }
}
