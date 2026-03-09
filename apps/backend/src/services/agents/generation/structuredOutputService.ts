import { openai } from '@/lib/openai';
import { z } from 'zod';

/**
 * Structured Output Enforcer
 * Wraps OpenAI calls to enforce JSON schema validation
 */

export interface StructuredOutputConfig<T extends z.ZodType> {
    schema: T;
    name: string;
    description?: string;
    strict?: boolean;
}

export class StructuredOutputService {
    /**
     * Call OpenAI with enforced structured output
     */
    async generateStructured<T extends z.ZodType>(
        config: StructuredOutputConfig<T>,
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        options: {
            model?: string;
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): Promise<z.infer<T>> {
        // Convert Zod schema to JSON Schema
        const jsonSchema = this.zodToJsonSchema(config.schema);

        const completion = await openai.chat.completions.create({
            model: options.model || 'gpt-4o-mini',
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: config.name,
                    description: config.description,
                    schema: jsonSchema,
                    strict: config.strict ?? true,
                },
            },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content returned from OpenAI');
        }

        // Parse and validate
        const parsed = JSON.parse(content);
        return config.schema.parse(parsed);
    }

    /**
     * Convert Zod schema to JSON Schema (simplified)
     * For production, use zod-to-json-schema library
     */
    private zodToJsonSchema(schema: z.ZodType): any {
        // This is a simplified version. In production, use:
        // import { zodToJsonSchema } from 'zod-to-json-schema';
        // return zodToJsonSchema(schema);

        // For now, we'll just return a basic structure
        // The actual implementation would need to handle all Zod types
        return {
            type: 'object',
            additionalProperties: false,
        };
    }
}

export const structuredOutputService = new StructuredOutputService();
