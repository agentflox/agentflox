/**
 * Self-Verification Loop
 * 
 * Implements reflection and self-verification for extracted configurations
 * to detect contradictions and improve accuracy.
 */

import { ExtractedConfiguration } from '../validation/configurationValidator';
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { estimateTokens, countAgentTokens, updateAgentUsage } from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const VerificationResultSchema = z.object({
  isValid: z.boolean(),
  contradictions: z.array(z.string()),
  corrections: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export interface VerificationResult {
  isValid: boolean;
  contradictions: string[];
  corrections?: Partial<ExtractedConfiguration>;
  confidence: number;
  reasoning: string;
}

export class SelfVerificationLoop {
  /**
   * Verify extracted configuration for contradictions
   */
  async verifyExtractedConfiguration(
    extracted: ExtractedConfiguration,
    userMessage: string,
    userId: string
  ): Promise<VerificationResult> {
    const verificationMessages = [
      {
        role: 'system' as const,
        content: `You are a configuration verification AI. Review the extracted agent configuration for contradictions, inconsistencies, and errors.

Your task:
1. Check for logical contradictions (e.g., capabilities that conflict with constraints)
2. Verify extracted values match user intent
3. Identify missing critical information
4. Suggest corrections if needed
5. Provide confidence score (0-100)`,
      },
      {
        role: 'user' as const,
        content: `User's original message: "${userMessage}"

Extracted configuration:
${JSON.stringify(extracted, null, 2)}

Review this configuration and identify any issues.`,
      },
    ];

    try {
      const model = await fetchModel();
      const estimatedTokens = estimateTokens(JSON.stringify(verificationMessages)) + 500;

      const completion = await openai.chat.completions.create({
        model: model.name,
        messages: verificationMessages,
        temperature: 0.3,
        max_tokens: 500,
        tools: [
          {
            type: 'function',
            function: {
              name: 'verify_configuration',
              description: 'Verify configuration for contradictions and errors',
              parameters: {
                type: 'object',
                properties: {
                  isValid: { type: 'boolean', description: 'Is configuration valid' },
                  contradictions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of contradictions found',
                  },
                  corrections: {
                    type: 'object',
                    description: 'Suggested corrections',
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Confidence in verification (0-100)',
                  },
                  reasoning: { type: 'string', description: 'Reasoning for verification' },
                },
                required: ['isValid', 'contradictions', 'confidence', 'reasoning'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'verify_configuration' } },
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'verify_configuration') {
        const parsed = JSON.parse(toolCall.function.arguments);
        const validated = VerificationResultSchema.parse(parsed);

        // Track usage
        countAgentTokens(
          verificationMessages as Array<{ role: string; content: string }>,
          toolCall.function.arguments,
          model.name
        ).then(async (tokenCount) => {
          try {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, email: true },
            });
            await updateAgentUsage(
              userId,
              user?.name || user?.email || 'User',
              tokenCount.inputTokens,
              tokenCount.outputTokens,
              user?.email || undefined
            );
          } catch (error) {
            console.error('Failed to update usage for verification:', error);
          }
        }).catch(() => {});

        return validated;
      }
    } catch (error) {
      console.error('[SelfVerification] Failed to verify configuration:', error);
    }

    // Fallback: assume valid if verification fails
    return {
      isValid: true,
      contradictions: [],
      confidence: 50,
      reasoning: 'Verification check failed, assuming valid',
    };
  }

  /**
   * Request corrections if contradictions detected
   */
  async requestCorrections(
    extracted: ExtractedConfiguration,
    contradictions: string[],
    userId: string
  ): Promise<Partial<ExtractedConfiguration> | null> {
    if (contradictions.length === 0) {
      return null;
    }

    const correctionMessages = [
      {
        role: 'system' as const,
        content: `You are a configuration correction AI. Given contradictions in the extracted configuration, provide corrected values.

Contradictions found:
${contradictions.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide only the corrected fields. Do not change fields that are correct.`,
      },
      {
        role: 'user' as const,
        content: `Original configuration:
${JSON.stringify(extracted, null, 2)}

Provide corrections for the contradictions listed above.`,
      },
    ];

    try {
      const model = await fetchModel();
      const completion = await openai.chat.completions.create({
        model: model.name,
        messages: correctionMessages,
        temperature: 0.3,
        max_tokens: 500,
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_corrections',
              description: 'Provide corrected configuration values',
              parameters: {
                type: 'object',
                properties: {
                  corrections: {
                    type: 'object',
                    description: 'Corrected configuration fields',
                  },
                  reasoning: { type: 'string', description: 'Reasoning for corrections' },
                },
                required: ['corrections', 'reasoning'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'provide_corrections' } },
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'provide_corrections') {
        const parsed = JSON.parse(toolCall.function.arguments);
        return parsed.corrections as Partial<ExtractedConfiguration>;
      }
    } catch (error) {
      console.error('[SelfVerification] Failed to request corrections:', error);
    }

    return null;
  }
}

