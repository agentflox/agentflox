import { prisma } from '@/lib/prisma';
import { checkAgentTokenLimit, estimateTokens } from '@/utils/ai/agentUsageTracking';
import { EditorAssistantResponseSchema, WorkforceOpSchema } from './editorOps';
import { explicitContextResolver } from '@/utils/utilities/explicitContextResolver';
import { BaseEditorAssistant, type EditorAssistantMessageInput, type EditorAssistantResponse, EditorAssistantError } from './BaseEditorAssistant';

/**
 * Specialized assistant for the Workforce Canvas.
 */
export class WorkforceEditorAssistant extends BaseEditorAssistant {
  async processMessage(input: EditorAssistantMessageInput): Promise<EditorAssistantResponse> {
    const { userId, conversationId, message, context, onToken, signal, options } = input;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    await prisma.aiMessage.create({
      data: { conversationId, role: 'USER', content: message, attachments: options?.attachments },
    });

    const system = [
      'You are a senior in-app editor assistant for the Agentflox Workforce Canvas.',
      'Your goal is to help users design and modify node/edge workflow graphs.',
      '',
      '### CAPABILITIES',
      'You can propose the following operations by returning them in the `proposedOps` array:',
      '- `addNode`: Add a new node. Specify `node.type` (agentNode, toolNode, eventNode, conditionNode, taskNode).',
      '- `deleteNode`: Remove a node by `nodeId`. This automatically also removes its connected edges.',
      '- `updateNodeData`: Modify a node\'s `patch` record. Common patches:',
      '  - agentNode: { "label": string, "systemPrompt": string, "model": string, "role": string }',
      '  - toolNode: { "label": string, "description": string }',
      '  - taskNode: { "label": string, "description": string, "priority": "low"|"medium"|"high" }',
      '  - conditionNode: { "label": string, "expression": string }',
      '- `addEdge`: Connect two nodes. Specify `edge.source` and `edge.target`.',
      '- `deleteEdge`: Remove a connection using `edgeId`.',
      '- `updateEdgeData`: Modify an edge\'s attributes.',
      '- `replaceNode`: Swap one node type for another while keeping connections.',
      '- `updateWorkforceMeta`: Change workforce-wide metadata like `name`, `description`, or `icon`.',
      '',
      '### RESPONSE FORMAT',
      'Return ONLY a JSON object with this structure:',
      '{',
      '  "assistantText": "Explanation of what you are proposing",',
      '  "proposedOps": [',
      '    { "op": "addNode", "node": { "type": "agentNode", "data": { "label": "Search Analyst" } } },',
      '    { "op": "addEdge", "edge": { "source": "event-123", "target": "agent-456" } }',
      '  ]',
      '}',
      '',
      '### CONTEXT',
      'The current canvas state (nodes, edges, selection) will be provided. Use this to determine valid IDs.',
      'Always propose sensible positions (x, y) if creating new nodes so they don\'t overlap.',
      'If the user is vague, ask a clarifying question in assistantText and return an empty array.',
    ].join('\n');

    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { workforce: true },
    });

    let availableContext = '';
    if (conversation?.workforce?.workspaceId) {
      const workspaceId = conversation.workforce.workspaceId;
      const [agents, tools, tasks] = await Promise.all([
        prisma.aiAgent.findMany({ where: { workspaceId }, select: { id: true, name: true, description: true } }),
        prisma.compositeTool.findMany({ where: { workspaceId }, select: { id: true, name: true, description: true } }),
        prisma.task.findMany({ where: { workspaceId }, select: { id: true, title: true, description: true } })
      ]);

      availableContext = [
        '### AVAILABLE RESOURCES',
        'You can use the following available resources to add nodes:',
        'Available Agents: ' + JSON.stringify(agents),
        'Available Tools: ' + JSON.stringify(tools),
        'Available Tasks: ' + JSON.stringify(tasks),
        '',
      ].join('\n');
    }

    const explicitContextStr = await explicitContextResolver.resolve(userId, options);

    const userContent = [
      availableContext,
      'Context represents the workforce canvas state (nodes, edges, selection).',
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
      operation: onToken ? 'workforce_assistant_stream' : 'workforce_assistant_completion',
      conversationId,
      userId,
    };

    let rawText = '';
    try {
      if (onToken) {
        const stream = await this.openStream(
          { model, temperature: 0.2, messages, response_format: { type: 'json_object' } },
          opContext,
          signal
        );

        const textRef = { value: '' };
        const streamUsage = await this.streamResponse(stream, onToken, textRef, signal);
        rawText = textRef.value;
        this.trackTokenUsage(messages, rawText, model, streamUsage, userId);
      } else {
        const completion = await this.runCompletion(
          { model, temperature: 0.2, messages, response_format: { type: 'json_object' } },
          opContext,
          signal
        );
        rawText = completion.choices[0]?.message?.content ?? '';
        this.trackTokenUsage(messages, rawText, completion.model ?? model, completion.usage, userId);
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
      const ok = WorkforceOpSchema.safeParse(op);
      if (ok.success) modeOps.push(ok.data);
    }

    return { assistantText: validated.data.assistantText, proposedOps: modeOps.slice(0, 25) };
  }
}

export const workforceEditorAssistant = new WorkforceEditorAssistant();
