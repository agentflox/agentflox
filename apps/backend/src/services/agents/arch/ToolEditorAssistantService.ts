import { prisma } from '@/lib/prisma';
import { checkAgentTokenLimit, estimateTokens } from '@/utils/ai/agentUsageTracking';
import { EditorAssistantResponseSchema, ToolOpSchema } from './editorOps';
import { explicitContextResolver } from '@/utils/utilities/explicitContextResolver';
import { BaseEditorAssistant, type EditorAssistantMessageInput, type EditorAssistantResponse, EditorAssistantError } from './BaseEditorAssistant';

/**
 * Specialized assistant for the Tool Builder.
 */
export class ToolEditorAssistant extends BaseEditorAssistant {
  async processMessage(input: EditorAssistantMessageInput): Promise<EditorAssistantResponse> {
    const { userId, conversationId, message, context, onToken, signal, options } = input;
    const overrideModelId = input.modelId ?? options?.modelId ?? null;

    await prisma.aiMessage.create({
      data: { conversationId, role: 'USER', content: message, attachments: options?.attachments },
    });

    const system = [
      'You are a senior in-app editor assistant for the Agentflox Tool Builder.',
      'Your goal is to help users modify their Tool steps and metadata through natural language.',
      '',
      '### CAPABILITIES',
      'You can propose the following operations by returning them in the `proposedOps` array:',
      '- `addStep`: Create a new step. You must specify `step.type` (LLM, API, or SYSTEM_TOOL) and `step.name`.',
      '- `deleteStep`: Remove a step by its `stepId`.',
      '- `updateStep`: Modify a step. Examples of `patch.config` properties:',
      '  - LLM: { "promptTemplate": string, "model": string, "temperature": number }',
      '  - API: { "url": string, "method": "GET"|"POST"|"PUT"|"DELETE", "headers": object, "bodyTemplate": string }',
      '  - SYSTEM_TOOL: { "toolId": string }',
      '- `moveStep`: Change the order of a step (direction: "up" or "down").',
      '- `replaceStep`: Replace a step with a new configuration.',
      '- `updateToolMeta`: Change tool-wide metadata like `name`, `description`, or `category`.',
      '',
      '### RESPONSE FORMAT',
      'Return ONLY a JSON object with this structure:',
      '{',
      '  "assistantText": "Self-correction or explanation of what you are doing",',
      '  "proposedOps": [',
      '    { "op": "updateToolMeta", "patch": { "name": "New Name" } },',
      '    { "op": "addStep", "step": { "name": "Extract Info", "type": "LLM" } }',
      '  ]',
      '}',
      '',
      '### CONTEXT',
      'The user will provide the current tool state in JSON format. Use this to find step IDs and current configurations.',
      'Always use semantic variable names for steps (camelCase).',
      'If you are unsure or the request is vague, ask for clarification in assistantText and return an empty proposedOps array.',
    ].join('\n');

    const explicitContextStr = await explicitContextResolver.resolve(userId, options);

    const userContent = [
      'Context represents the tool editor state (tool meta, inputs/outputs, ordered steps).',
      'Context JSON:',
      JSON.stringify(context),
      '',
      explicitContextStr,
      'User message:',
      message,
      '',
      'Return JSON only.',
    ].filter(Boolean).join('\n');

    const messages = [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: userContent },
    ];

    const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 800;
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed) {
      return {
        assistantText: `Remaining tokens: ${tokenCheck.remaining}. Request needs ~${estimatedTokens}.`,
        proposedOps: [],
      };
    }

    const opContext = {
      operation: onToken ? 'tool_assistant_stream' : 'tool_assistant_completion',
      conversationId,
      userId,
      modelId: overrideModelId,
    };

    let rawText = '';
    try {
      if (onToken) {
        const { stream, resolved } = await this.openStream(
          { temperature: 0.2, messages, response_format: { type: 'json_object' } },
          opContext,
          signal
        );

        const textRef = { value: '' };
        const streamUsage = await this.streamResponse(stream, onToken, textRef, signal);
        rawText = textRef.value;
        this.trackTokenUsage(messages, rawText, resolved, streamUsage, userId, {
          conversationId,
          source: 'ToolEditorAssistant',
        });
      } else {
        const { completion, resolved } = await this.runCompletion(
          { temperature: 0.2, messages, response_format: { type: 'json_object' } },
          opContext,
          signal
        );
        rawText = completion.choices[0]?.message?.content ?? '';
        this.trackTokenUsage(messages, rawText, resolved, completion.usage, userId, {
          conversationId,
          source: 'ToolEditorAssistant',
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return { assistantText: 'Request cancelled.', proposedOps: [] };
      if (err instanceof EditorAssistantError) return { assistantText: err.userMessage, proposedOps: [] };
      return { assistantText: 'An unexpected error occurred.', proposedOps: [] };
    }

    let parsed: any;
    try { parsed = JSON.parse(rawText || '{}'); } catch { return { assistantText: 'Invalid response format.', proposedOps: [] }; }

    const validated = EditorAssistantResponseSchema.safeParse(parsed);
    if (!validated.success) return { assistantText: 'Validation failed.', proposedOps: [] };

    const modeOps: any[] = [];
    for (const op of validated.data.proposedOps) {
      const ok = ToolOpSchema.safeParse(op);
      if (ok.success) modeOps.push(ok.data);
    }

    return { assistantText: validated.data.assistantText, proposedOps: modeOps.slice(0, 25) };
  }
}

export const toolEditorAssistant = new ToolEditorAssistant();
