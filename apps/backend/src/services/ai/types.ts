export interface AiGenerationResult {
    content: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}

export interface AiImageGenerationResult {
    url?: string;
    base64?: string;
    revisedPrompt?: string;
}

export interface AiStreamResult {
    stream: ReadableStream;
    metadata?: any;
}

export type MultimodalContent =
    | { type: 'text'; text: string }
    | { type: 'image_url'; imageUrl: { url: string; detail?: 'low' | 'high' | 'auto' } }
    | { type: 'image_base64'; mediaType: string; data: string }
    | { type: 'video_base64'; mediaType: string; data: string } // Gemini supports this
    | { type: 'file_url'; fileUrl: string }; // For storage references

export interface MultimodalMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | MultimodalContent[];
}

export interface IAiProvider {
    generateText(prompt: string | MultimodalMessage[], options?: any): Promise<AiGenerationResult>;
    streamText(prompt: string | MultimodalMessage[], options?: any): Promise<ReadableStream>;
    generateImage?(prompt: string, options?: any): Promise<AiImageGenerationResult>;
    countTokens(text: string | MultimodalMessage[]): Promise<number>;
}
