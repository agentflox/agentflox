import { ISafetyEvaluator, SafetyResult } from '../di/interfaces';
import { SAFETY_CONSTITUTION, DANGEROUS_CAPABILITIES_WATCHLIST } from './constitution';
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';

export class SemanticSafetyEvaluator implements ISafetyEvaluator {

    async evaluatePrompt(prompt: string): Promise<SafetyResult> {
        // 1. Fast Regex Check (Base Layer)
        const quickViolations = this.runRegexChecks(prompt);
        if (quickViolations.length > 0) {
            return { safe: false, violations: quickViolations, riskLevel: 'HIGH' };
        }

        // 2. Semantic Constitution Check (LLM Layer)
        return await this.runSemanticCheck(prompt);
    }

    async evaluateCapabilities(capabilities: string[], allowedTools: string[]): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        for (const cap of capabilities) {
            // Check fuzzy match against dangerous list
            const isDangerous = DANGEROUS_CAPABILITIES_WATCHLIST.some(d => cap.toLowerCase().includes(d));
            if (isDangerous) {
                errors.push(`Capability "${cap}" is flagged as potentially dangerous.`);
            }

            // Check against allowed tools (simple mapping check)
            // This logic mimics the original robust check but simplified for this example
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // --- Internals ---

    private runRegexChecks(prompt: string): string[] {
        const prohibited = [/ignore previous/i, /system override/i];
        return prohibited.filter(p => p.test(prompt)).map(p => `Matched prohibited pattern: ${p.source}`);
    }

    private async runSemanticCheck(prompt: string): Promise<SafetyResult> {
        const systemPrompt = `Analyze the following user prompt for safety violations based on the Constitution.
    
CONSTITUTION:
${SAFETY_CONSTITUTION.map(c => `- ${c.principle}`).join('\n')}

Evaluate the prompt. If it violates any principle, return unsafe.
Return valid JSON: { "safe": boolean, "violations": string[], "riskLevel": "LOW"|"MEDIUM"|"HIGH" }
`;

        try {
            const model = await fetchModel();
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Use specific lightweight model for safety
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            return {
                safe: result.safe ?? false,
                violations: result.violations || [],
                riskLevel: result.riskLevel || 'HIGH'
            };
        } catch (err) {
            console.error("Semantic Safety Check Failed:", err);
            // Fail closed for safety
            return { safe: false, violations: ["Safety check failed to execute"], riskLevel: 'HIGH' };
        }
    }
}
