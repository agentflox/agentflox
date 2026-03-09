import { AgentDraft } from '../state/agentBuilderStateService';

import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';

export interface SimulationResult {
    output: string;
    toolCalls: Array<{
        toolId: string;
        params: any;
        simulatedResult: any;
    }>;
    logs: string[];
}

export class SimulationService {
    async simulateExecution(
        draft: AgentDraft,
        userMessage: string,
        mockContext: any = {}
    ): Promise<SimulationResult> {
        const logs: string[] = [];
        logs.push("Starting simulation...");

        // 1. Construct Simulation Prompt
        const systemPrompt = `You are a SIMULATED version of the agent "${draft.name}".
    
SYSTEM PROMPT:
${draft.systemPrompt}

TOOLS AVAILABLE:
${JSON.stringify(draft.tools)}

INSTRUCTIONS:
- Do not actually execute tools. Instead, emit tool calls.
- Respond to the user as if you were the agent.
`;

        logs.push("Context prepared. Invoking AI...");

        try {
            const model = await fetchModel();
            const completion = await openai.chat.completions.create({
                model: model.name,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                tools: draft.tools?.map(t => ({ // Mock mapping of internal tool definitions to OpenAI format
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description || "Simulated Tool",
                        parameters: t.config || {}
                    }
                })),
                temperature: 0.7
            });

            const choice = completion.choices[0];
            const toolCalls = choice.message.tool_calls || [];

            logs.push(`AI Response received. Generated ${toolCalls.length} tool calls.`);

            return {
                output: choice.message.content || "",
                toolCalls: toolCalls.map(tc => ({
                    toolId: tc.function.name,
                    params: JSON.parse(tc.function.arguments),
                    simulatedResult: { success: true, message: "Simulated success" }
                })),
                logs
            };

        } catch (error) {
            logs.push(`Error during simulation: ${error}`);
            return { output: "Simulation Error", toolCalls: [], logs };
        }
    }
}
