import { Injectable } from '@nestjs/common';
import { IAiProvider, AiGenerationResult, MultimodalMessage, AiImageGenerationResult } from './types';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';

@Injectable()
export class ModelService {
    private providers: Record<string, IAiProvider> = {};

    constructor() {
        this.providers['openai'] = new OpenAIProvider();
        // Only initialize if keys are present to avoid startup errors
        if (process.env.ANTHROPIC_API_KEY) {
            this.providers['anthropic'] = new AnthropicProvider();
        }
        if (process.env.GOOGLE_API_KEY) {
            this.providers['google'] = new GoogleProvider();
        }
    }

    getProvider(modelId: string): IAiProvider {
        const providerKey = this.detectProvider(modelId);
        const provider = this.providers[providerKey];

        if (!provider) {
            if (providerKey !== 'openai') {
                console.warn(`Provider ${providerKey} not configured. Falling back to OpenAI.`);
                return this.providers['openai'];
            }
            // If even OpenAI is missing (unlikely given app structure), throw
            if (!this.providers['openai']) throw new Error('No AI providers configured.');
            return this.providers['openai'];
        }
        return provider;
    }

    private detectProvider(modelId: string): string {
        if (modelId.startsWith('claude')) return 'anthropic';
        if (modelId.startsWith('gemini')) return 'google';
        if (modelId.startsWith('gemma')) return 'google'; // Sometimes hosted on Google
        return 'openai'; // Default
    }

    async generateText(modelId: string, prompt: MultimodalMessage[], options: any = {}): Promise<AiGenerationResult> {
        const provider = this.getProvider(modelId);
        return provider.generateText(prompt, { ...options, model: modelId });
    }

    async streamText(modelId: string, prompt: MultimodalMessage[], options: any = {}): Promise<ReadableStream> {
        const provider = this.getProvider(modelId);
        return provider.streamText(prompt, { ...options, model: modelId });
    }

    async generateImage(modelId: string, prompt: string, options: any = {}): Promise<AiImageGenerationResult> {
        const provider = this.getProvider(modelId);
        if (!provider.generateImage) {
            throw new Error(`Model ${modelId} does not support image generation.`);
        }
        return provider.generateImage(prompt, { ...options, model: modelId });
    }
}
