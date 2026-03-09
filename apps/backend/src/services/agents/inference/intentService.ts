/**
 * Intent Understanding Service
 * 
 * Converts natural language messages into structured intent JSON
 */

import { Intent } from '../types/types';

import { openai } from '@/lib/openai';
import {
  checkAgentTokenLimit,
  updateAgentUsage,
  estimateTokens,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';
import { fetchModel } from '@/utils/ai/fetchModel';
import { ResponseCache } from '../cache/responseCache';
import { agentBuilderContextService } from '../state/agentBuilderContextService';
import { agentBuilderStateService } from '../state/agentBuilderStateService';

const responseCache = new ResponseCache();

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['CREATE_AGENT', 'UPDATE_AGENT', 'EXECUTE_TASK', 'PLAN_WORKFLOW', 'CLARIFY'],
      description: 'The primary action the user wants to perform',
    },
    parameters: {
      type: 'object',
      properties: {
        // Agent creation parameters
        name: { type: 'string', description: 'Agent name' },
        description: { type: 'string', description: 'Agent description' },
        systemPrompt: { type: 'string', description: 'System prompt/instructions for the agent' },
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tool IDs the agent can use',
        },
        context: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['project', 'team', 'workspace', 'task', 'document'],
              },
              id: { type: 'string' },
            },
          },
          description: 'Context items to provide to the agent',
        },
        autonomyLevel: {
          type: 'string',
          enum: ['FULL', 'SEMI_AUTONOMOUS', 'MANUAL'],
          description: 'Level of autonomy for the agent',
        },
        requiresApproval: {
          type: 'boolean',
          description: 'Whether agent requires approval before executing actions',
        },
        // Task execution parameters
        taskAction: {
          type: 'string',
          enum: ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'LIST'],
          description: 'Task action to perform',
        },
        taskParams: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            assigneeId: { type: 'string' },
            dueDate: { type: 'string' },
            projectId: { type: 'string' },
            teamId: { type: 'string' },
            workspaceId: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
            },
            status: { type: 'string' },
          },
        },
        // Workflow planning parameters
        workflowParams: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            goal: { type: 'string', description: 'The overall goal of the workflow' },
            steps: {
              type: 'array',
              items: { type: 'string' },
              description: 'High-level steps or phases for the workflow'
            },
            trigger: { type: 'string', description: 'What triggers this workflow' }
          }
        },
        bulkCount: {
          type: 'number',
          description: 'Number of items in bulk operation',
        },
        agentId: {
          type: 'string',
          description: 'Agent ID for updates or execution',
        },
      },
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for this intent classification',
    },
    requiresClarification: {
      type: 'boolean',
      description: 'Whether clarification is needed from the user',
    },
    clarificationQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Questions to ask the user for clarification',
    },
    reasoning: {
      type: 'string',
      description: 'Explanation of why this intent was chosen',
    },
  },
  required: ['action', 'parameters', 'confidence', 'requiresClarification'],
};

export async function understandIntent(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  workspaceContext?: {
    projects?: Array<{ id: string; name: string }>;
    teams?: Array<{ id: string; name: string }>;
    tasks?: Array<{ id: string; title: string }>;
  },
  userId?: string,
  agentId?: string,
  conversationId?: string
): Promise<Intent> {
  const contextString = workspaceContext ? JSON.stringify(workspaceContext, null, 2) : 'No workspace context available';

  // Fetch comprehensive agent context if agentId is provided
  let agentContext = 'No specific agent context.';
  if (agentId && agentId !== 'chat-agent') {
    try {
      // Fetch agent details and tasks in parallel
      const [agent, assignedTasks] = await Promise.all([
        prisma.aiAgent.findUnique({
          where: { id: agentId },
          select: {
            id: true,
            name: true,
            description: true,
            systemPrompt: true,
            agentType: true,
            capabilities: true,
            tools: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
              },
            },
            triggers: {
              select: {
                id: true,
                name: true,
                triggerType: true,
              },
            },
          },
        }),
        // Tasks directly assigned to this agent via TaskAssignee
        prisma.task.findMany({
          where: {
            assignees: {
              some: { agentId },
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            statusId: true,
            dueDate: true,
            status: { select: { name: true } },
            list: { select: { name: true } },
            project: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        }),
      ]);

      if (agent) {
        // Tasks that mention the agent by name in title or description
        const mentionedTasks = await prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: agent.name, mode: 'insensitive' } },
              { description: { contains: agent.name, mode: 'insensitive' } },
            ],
            // Exclude tasks already assigned to the agent to avoid duplication
            NOT: {
              assignees: { some: { agentId } },
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            statusId: true,
            dueDate: true,
            status: { select: { name: true } },
            list: { select: { name: true } },
            project: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        });

        const formatTask = (t: typeof assignedTasks[0]) =>
          `  • [${t.id}] "${t.title}" | Status: ${t.status?.name ?? t.statusId ?? 'Unknown'} | Priority: ${t.priority} | List: ${t.list?.name ?? 'N/A'} | Project: ${t.project?.name ?? 'N/A'}${t.dueDate ? ` | Due: ${t.dueDate.toISOString().split('T')[0]}` : ''}`;

        const assignedSection = assignedTasks.length > 0
          ? `\n- Assigned Tasks (${assignedTasks.length}):\n${assignedTasks.map(formatTask).join('\n')}`
          : '\n- Assigned Tasks: None';

        const mentionedSection = mentionedTasks.length > 0
          ? `\n- Tasks Mentioning This Agent (${mentionedTasks.length}):\n${mentionedTasks.map(formatTask).join('\n')}`
          : '\n- Tasks Mentioning This Agent: None';

        agentContext = `Current Agent Context:
- Name: ${agent.name}
- Description: ${agent.description || 'None'}
- Type: ${agent.agentType}
- System Prompt: ${agent.systemPrompt?.substring(0, 200) || 'None'}${agent.systemPrompt && agent.systemPrompt.length > 200 ? '...' : ''}
- Capabilities: ${agent.capabilities?.join(', ') || 'None'}
- Tools: ${agent.tools.map(t => `${t.name} (${t.category})`).join(', ') || 'None'}
- Triggers: ${agent.triggers.map(t => `${t.name} (${t.triggerType})`).join(', ') || 'None'}
- Agent ID: ${agentId}${assignedSection}${mentionedSection}`;
      }
    } catch (error) {
      console.error('Error fetching agent data for intent:', error);
    }
  }

  // Fetch conversation history from database if conversationId provided and conversationHistory is empty
  let fullConversationHistory = conversationHistory;
  if (conversationId && conversationHistory.length === 0) {
    try {
      const conversationState = await agentBuilderStateService.getConversationState(conversationId);
      if (conversationState && conversationState.conversationHistory) {
        fullConversationHistory = conversationState.conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
      }
    } catch (error) {
      console.error('Error fetching conversation history for intent:', error);
    }
  }

  // Fetch user context if userId provided for additional agent and workspace information
  let userContextData = null;
  if (userId) {
    try {
      userContextData = await agentBuilderContextService.fetchUserContext(userId);
    } catch (error) {
      console.error('Error fetching user context for intent:', error);
    }
  }

  // Truncate context if it's too large to avoid token limits
  const truncatedContext = contextString.length > 5000
    ? contextString.substring(0, 5000) + '... (truncated)'
    : contextString;

  // Build enhanced agent context with user's existing agents for reference
  let enhancedAgentContext = agentContext;
  if (userContextData && userContextData.existingAgents && userContextData.existingAgents.length > 0) {
    const otherAgents = userContextData.existingAgents
      .filter(a => a.id !== agentId)
      .slice(0, 5) // Limit to 5 other agents to avoid token bloat
      .map(a => `  - ${a.name} (${a.agentType}): ${a.description || 'No description'}`)
      .join('\n');

    if (otherAgents) {
      enhancedAgentContext += `\n\nOther Agents Available:\n${otherAgents}`;
    }
  }

  const systemPrompt = `You are an intent understanding system for Agentflox, an enterprise AI agent creation platform. Your job is to analyze user messages and extract structured intent information.

Available actions:
- CREATE_AGENT: User wants to create a new AI agent
- UPDATE_AGENT: User wants to modify an existing agent
- EXECUTE_TASK: User wants to perform task management actions
- PLAN_WORKFLOW: User wants to plan a multi-step workflow or process
- CLARIFY: Need more information from user

Workspace context:
${truncatedContext}

${enhancedAgentContext}

Analyze the user's message and extract the intent with all relevant parameters. Be thorough and extract all mentioned details. For workflows, try to identify the goal and high-level steps. IF the user says "Execute", "Run", or similar and an agent is in context, set that agent's ID as the target agentId.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...fullConversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    // Check cache first
    const cacheContext = {
      userId,
      workspaceProjects: workspaceContext?.projects?.map(p => p.id).sort().join(','),
      workspaceTeams: workspaceContext?.teams?.map(t => t.id).sort().join(','),
    };
    const cacheKey = responseCache.generateCacheKey(message, cacheContext);

    const cachedIntent = await responseCache.getCachedResponse<Intent>(cacheKey);
    if (cachedIntent) {
      return cachedIntent;
    }

    // Estimate tokens and check limit if userId provided
    if (userId) {
      const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 1000; // Add buffer for response
      const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
      if (!tokenCheck.allowed) {
        throw new Error(
          `Insufficient tokens. You have ${tokenCheck.remaining} tokens remaining, but need approximately ${estimatedTokens} tokens. Please upgrade your plan or purchase more tokens.`
        );
      }
    }

    const model = await fetchModel();

    const response = await openai.chat.completions.create({
      model: model.name,
      messages,
      response_format: { type: 'json_schema', json_schema: { name: 'intent', schema: INTENT_SCHEMA as any } },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Track usage if userId provided
    if (userId) {
      countAgentTokens(
        messages.map(m => ({ role: m.role, content: m.content })),
        content,
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
          console.error('Failed to update agent usage for intent understanding:', error);
        }
      }).catch(() => {
        // Ignore errors for background tracking
      });
    }

    const intent = JSON.parse(content) as Intent;

    // Validate intent structure
    if (!intent.action || !intent.parameters || typeof intent.confidence !== 'number') {
      throw new Error('Invalid intent structure returned from OpenAI');
    }

    // Cache the successful result
    await responseCache.cacheResponse(cacheKey, intent);

    return intent;
  } catch (error) {
    console.error('Error understanding intent:', error);

    // Fallback: return a CLARIFY intent
    return {
      action: 'CLARIFY',
      parameters: {},
      confidence: 0.5,
      requiresClarification: true,
      clarificationQuestions: [
        "I'm having trouble understanding your request. Could you please rephrase it or provide more details?",
      ],
      reasoning: `Error occurred during intent understanding: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}


