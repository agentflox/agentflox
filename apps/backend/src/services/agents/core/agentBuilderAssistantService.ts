/**
 * Agent Builder Assistant Service
 * 
 * Provides conversational assistance for editing agents in Builder View
 */

import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { agentBuilderContextService, UserContext } from '../state/agentBuilderContextService';

import {
  checkAgentTokenLimit,
  updateAgentUsage,
  estimateTokens,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';

export interface BuilderAssistantContext {
  agent: any;
  userContext: UserContext;
  recentChanges: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
  }>;
  commonQuestions: string[];
  suggestedImprovements: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}

export class AgentBuilderAssistantService {
  async processBuilderAssistantMessage(
    agentId: string,
    userId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<{
    response: string;
    suggestedActions?: Array<{
      type: 'navigate' | 'edit' | 'test' | 'view';
      target: string;
      label: string;
      description?: string;
    }>;
    contextAwareGuidance?: {
      section?: string;
      field?: string;
      explanation?: string;
    };
  }> {
    // Get agent
    const agent = await prisma.aiAgent.findFirst({
      where: {
        id: agentId,
        OR: [
          { createdBy: userId },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
    });

    if (!agent) {
      throw new Error('Agent not found or access denied');
    }

    // Get user context
    const userContext = await agentBuilderContextService.fetchUserContext(userId);

    // Build prompt
    const prompt = this.buildBuilderAssistantPrompt(
      agent,
      userContext,
      message,
      conversationHistory
    );

    // Estimate tokens and check limit
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a helpful AI agent builder assistant. Help users understand and modify their existing agents. Be conversational and educational.',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const model = await fetchModel();
    const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 1000; // Add buffer for response

    // Check token limit
    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed) {
      throw new Error(
        `Insufficient tokens. You have ${tokenCheck.remaining} tokens remaining, but need approximately ${estimatedTokens} tokens. Please upgrade your plan or purchase more tokens.`
      );
    }

    // Call LLM
    const completion = await openai.chat.completions.create({
      model: model.name,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I encountered an error.';

    // Track usage
    countAgentTokens(
      messages as Array<{ role: string; content: string }>,
      response,
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
        console.error('Failed to update agent usage for builder assistant:', error);
      }
    }).catch(() => {
      // Ignore errors for background tracking
    });

    // Parse response for suggested actions
    const suggestedActions = this.extractSuggestedActions(response, message);

    // Extract context-aware guidance
    const contextAwareGuidance = this.extractGuidance(response, agent);

    return {
      response,
      suggestedActions,
      contextAwareGuidance,
    };
  }

  private buildBuilderAssistantPrompt(
    agent: any,
    userContext: UserContext,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): string {
    return `You are the Agentflox Agent Builder Assistant. You help users understand and modify their existing agents.

AGENT BEING CONFIGURED:
- Name: ${agent.name}
- Type: ${agent.agentType}
- Status: ${agent.status}
- Description: ${agent.description || 'No description'}

CURRENT CONFIGURATION:
${JSON.stringify(
      {
        systemPrompt: agent.systemPrompt?.substring(0, 500) + (agent.systemPrompt?.length > 500 ? '...' : ''),
        capabilities: agent.capabilities,
        tools: 'See tools section',
        triggers: agent.triggerConfig,
        rules: (agent.metadata as any)?.rules,
      },
      null,
      2
    )}

USER WORKSPACE CONTEXT:
- Workspace: ${userContext.workspace?.name || 'N/A'}
- Available Lists: ${userContext.workspace?.spaces?.flatMap((s) => s.allLists || []).map((l) => l.name).join(', ') || 'N/A'}
- Team Members: ${userContext.teamMembers?.map((m) => m.name).join(', ') || 'N/A'}

CONVERSATION HISTORY:
${conversationHistory.slice(-5).map((m) => `${m.role}: ${m.content}`).join('\n')}

USER'S QUESTION:
"${userMessage}"

INSTRUCTIONS:
1. Help users understand their agent's current configuration
2. Guide them to the correct section for making changes
3. Explain how their agent works and what it does
4. Suggest improvements based on best practices
5. Answer questions about agent capabilities
6. If user wants to make changes, guide them to the appropriate UI section or offer to help conversationally
7. Be helpful and educational, not just directive
8. Reference specific parts of their configuration when relevant

IMPORTANT: This is the BUILDER view - users are editing/understanding the agent, not using it. If they ask about using the agent, redirect them to the Chat view.

Respond helpfully to assist with agent configuration.`;
  }

  private extractSuggestedActions(
    response: string,
    userMessage: string
  ): Array<{
    type: 'navigate' | 'edit' | 'test' | 'view';
    target: string;
    label: string;
    description?: string;
  }> {
    const actions: Array<any> = [];
    const messageLower = userMessage.toLowerCase();

    // Detect navigation needs
    if (messageLower.includes('system prompt') || messageLower.includes('instructions')) {
      actions.push({
        type: 'navigate' as const,
        target: 'prompt',
        label: 'Go to System Prompt',
        description: 'Edit the agent instructions',
      });
    }

    if (messageLower.includes('tool') || messageLower.includes('capability')) {
      actions.push({
        type: 'navigate' as const,
        target: 'tools',
        label: 'Go to Tools',
        description: 'Configure agent tools',
      });
    }

    if (messageLower.includes('trigger') || messageLower.includes('automation')) {
      actions.push({
        type: 'navigate' as const,
        target: 'triggers',
        label: 'Go to Triggers',
        description: 'Set up automation triggers',
      });
    }

    if (messageLower.includes('test') || messageLower.includes('try')) {
      actions.push({
        type: 'test' as const,
        target: 'test',
        label: 'Test Agent',
        description: 'Test the agent with a sample scenario',
      });
    }

    return actions;
  }

  private extractGuidance(
    response: string,
    agent: any
  ): {
    section?: string;
    field?: string;
    explanation?: string;
  } {
    // Simple extraction - in production, use more sophisticated parsing
    return {
      explanation: response.substring(0, 200),
    };
  }
}

export const agentBuilderAssistantService = new AgentBuilderAssistantService();

