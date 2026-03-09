/**
 * @deprecated SkillInferenceService is deprecated.
 *
 * Skill inference has been merged into ConfigurationExtractor, where it runs in
 * parallel with the main configuration extraction LLM call.  The results are
 * returned as `suggestedSkills`, `skillInferenceConfidence`, and
 * `skillInferenceReasoning` fields on `ExtractedConfiguration`.
 *
 * AgentBuilderService.processMessage no longer calls this service directly.
 * This file is kept for backwards compatibility ONLY — do NOT add new callers.
 */

import { z } from 'zod';
import { openai } from '@/lib/openai';
import { extractJson } from '@/utils/ai/jsonParsing';
import { BUILT_IN_SKILLS, SkillDefinition } from '../registry/skillRegistry';

export const InferredSkillsSchema = z.object({
    suggestedSkills: z.array(z.string()),
    confidence: z.number(),
    reasoning: z.string(),
});

export type InferredSkills = z.infer<typeof InferredSkillsSchema>;

/** @deprecated Use ConfigurationExtractor.extract() — skill inference is now built in. */
export class SkillInferenceService {
    /**
     * Infer appropriate skills based on user input and context.
     * returning a list of skill IDs (names) from the available skills.
     */
    async inferSkills(
        text: string,
        context: string,
        availableSkills: SkillDefinition[] = BUILT_IN_SKILLS
    ): Promise<InferredSkills> {
        try {
            const skillsDescription = availableSkills
                .map(s => `- ${s.name}: ${s.description}`)
                .join('\n');

            const systemPrompt = `You are an expert AI agent architect.
Your task is to analyze the user's request and the agent's context to determine which SKILLS are required for the agent to fulfill its purpose.

Available Skills:
${skillsDescription}

Output JSON with:
- suggestedSkills: array of skill names (must match available skills exactly)
- confidence: number 0-1 indicating certainty
- reasoning: brief explanation of why these skills were chosen

If no specific skills are strongly indicated, return empty array.
Prioritize 'content_creation' for writing tasks, 'code_operations' for coding, 'browser_automation' for web tasks.
`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Context: ${context}\n\nUser Request: ${text}` }
                ],
                temperature: 0,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                return { suggestedSkills: [], confidence: 0, reasoning: 'No response from LLM' };
            }

            const parsed = extractJson(content);
            const result = InferredSkillsSchema.safeParse(parsed);

            if (result.success) {
                // Filter out non-existent skills just in case
                const validSkills = result.data.suggestedSkills.filter(s =>
                    availableSkills.some(as => as.name === s)
                );
                return { ...result.data, suggestedSkills: validSkills };
            }

            return { suggestedSkills: [], confidence: 0, reasoning: 'Failed to parse response' };

        } catch (error) {
            console.error('Skill inference failed:', error);
            return { suggestedSkills: [], confidence: 0, reasoning: 'Error during inference' };
        }
    }
}

/** @deprecated Use ConfigurationExtractor.extract() — skill inference is now built in. */
export const skillInferenceService = new SkillInferenceService();

