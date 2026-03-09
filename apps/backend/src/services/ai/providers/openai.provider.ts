import OpenAI from 'openai';
import { initializeOpenAI } from '@/lib/openai';
import { countTokens } from '../../chat/utils/countTokens';
import { IAiProvider, AiGenerationResult, AiImageGenerationResult, MultimodalMessage } from '../types';

export class OpenAIProvider implements IAiProvider {
    private openai: OpenAI;

    constructor() {
        this.openai = initializeOpenAI();
    }

    async generateText(prompt: string | any[], options: any = {}): Promise<AiGenerationResult> {
        const messages = this.formatMessages(prompt);

        const response = await this.openai.chat.completions.create({
            model: options.model || 'gpt-4o-mini',
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens,
            response_format: options.response_format,
        });

        return {
            content: response.choices[0]?.message?.content || '',
            usage: {
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
        };
    }

    async streamText(prompt: string | any[], options: any = {}): Promise<ReadableStream> {
        const messages = this.formatMessages(prompt);

        const stream = await this.openai.chat.completions.create({
            model: options.model || 'gpt-4o-mini',
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens,
            stream: true,
            response_format: options.response_format,
        });

        const textEncoder = new TextEncoder();
        return new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        controller.enqueue(textEncoder.encode(content));
                    }
                }
                controller.close();
            },
        });
    }

    async generateImage(prompt: string, options: any = {}): Promise<AiImageGenerationResult> {
        const response = await this.openai.images.generate({
            model: options.model || "dall-e-3",
            prompt: prompt,
            n: 1,
            size: options.size || "1024x1024",
            response_format: options.responseFormat || "url",
            quality: "standard"
        });

        const imageData = response.data?.[0];
        if (!imageData) {
            throw new Error('Image generation failed: No data returned');
        }

        return {
            url: imageData.url,
            base64: imageData.b64_json,
            revisedPrompt: imageData.revised_prompt
        };
    }

    async countTokens(text: string | any[]): Promise<number> {
        const input = typeof text === 'string' ? text : JSON.stringify(text); // Basic approx for now
        const result = await countTokens({ input: input, model: 'gpt-4o' });
        return result.inputTokens || 0;
    }

    private formatMessages(prompt: string | any[]): any[] {
        if (typeof prompt === 'string') {
            return [{ role: 'user', content: prompt }];
        }

        return prompt.map(msg => {
            if (typeof msg.content === 'string') return msg;

            // Transform simplified multimodal types to OpenAI format
            const openAIContent = msg.content.map((c: any) => {
                if (c.type === 'text') return { type: 'text', text: c.text };
                if (c.type === 'image_url') return { type: 'image_url', image_url: { url: c.imageUrl.url, detail: c.imageUrl.detail || 'auto' } };
                if (c.type === 'image_base64') return { type: 'image_url', image_url: { url: `data:${c.mediaType};base64,${c.data}` } };
                // OpenAI doesn't support video_base64 directly in chat yet, usually handled by frames or video file upload IDs.
                // Ignoring video for now in standard chat unless using detail: low hack.
                return null;
            }).filter(Boolean);

            return { role: msg.role, content: openAIContent };
        });
    }
}
