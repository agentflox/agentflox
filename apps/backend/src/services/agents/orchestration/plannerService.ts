/**
 * Planner Service
 * 
 * Generates execution plans from intents and context
 * Plans consist of steps, not direct API calls
 */

import { Intent, ExecutionPlan, ExecutionStep, Context } from '../types/types';

import {
  checkAgentTokenLimit,
  updateAgentUsage,
  estimateTokens,
  countAgentTokens,
} from '@/utils/ai/agentUsageTracking';
import { prisma } from '@/lib/prisma';
import { ModelService } from '../../ai/model.service';
import { extractJson } from '@/utils/ai/jsonParsing';

const PLANNING_MODEL = 'gpt-4o';
const modelService = new ModelService();

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          order: { type: 'number' },
          description: { type: 'string' },
          type: {
            type: 'string',
            enum: ['GATHER_CONTEXT', 'VALIDATE', 'EXECUTE', 'CONFIRM', 'STORE_MEMORY']
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' }
          },
          estimatedTime: { type: 'number' },
          tool: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              parameters: { type: 'object' }
            },
            required: ['name', 'parameters']
          }
        },
        required: ['id', 'description', 'type', 'order']
      }
    },
    totalEstimatedTime: { type: 'number' },
    requiresApproval: { type: 'boolean' },
    approvalReason: { type: 'string' }
  },
  required: ['steps', 'totalEstimatedTime', 'requiresApproval']
};

export interface ToolInfo {
  name: string;
  description: string;
  parameters: any;
}

export async function generatePlan(
  intent: Intent,
  context: Context[],
  skills: string[],
  tools: ToolInfo[],
  userId?: string
): Promise<ExecutionPlan> {
  const systemPrompt = `You are a skill-aware planning system for Agentflox, an AI agent platform. 
Your goal is to complete the user's task by utilizing the agent's specific skills and mapping them to available tools.

Skill-based Planning Rules:
1. Identify the core requirements of the task.
2. Match those requirements to the agent's enabled skills: ${skills.join(', ')}.
3. Select the appropriate tool for each step from the available toolset.
4. Focus ONLY on EXECUTE steps using the available tools.
5. Do not plan GATHER_CONTEXT, VALIDATE, or STORE_MEMORY, as the platform handles these automatically.
6. Steps should be atomic and well-defined.
7. Dependencies must reference step IDs.
8. Estimated time should be in milliseconds.

Orchestration Hints:
The platform handles context gathering and memory storage. Your plan should jump straight to the specific tool calls needed to satisfy the request.

Available Tools (Name: Description):
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Context available:
${context.map((c) => `- ${c.type}: ${c.content.substring(0, 100)}...`).join('\n')}

Generate a detailed, step-by-step execution plan that leverages the agent's skills.
The output MUST be a valid JSON object matching the provided schema. Do not include any text before or after the JSON.`;

  const userPrompt = `Intent: ${intent.action}
Parameters: ${JSON.stringify(intent.parameters, null, 2)}
Reasoning: ${intent.reasoning || 'N/A'}

Generate an execution plan for this intent.`;

  try {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // Use strong reasoning model for Planning phase
    const planningModel = 'gpt-4o';

    // Estimate tokens and check limit if userId provided
    if (userId) {
      const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 2000; // Add buffer for response
      const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
      if (!tokenCheck.allowed) {
        throw new Error(
          `Insufficient tokens. You have ${tokenCheck.remaining} tokens remaining, but need approximately ${estimatedTokens} tokens. Please upgrade your plan or purchase more tokens.`
        );
      }
    }

    // Use ModelService to generate plan
    const result = await modelService.generateText(PLANNING_MODEL, messages, {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'execution_plan', schema: PLAN_SCHEMA as any },
      },
      temperature: 0.3,
    });

    const content = result.content;
    if (!content) {
      throw new Error('No response from AI Model');
    }

    // Track usage if userId provided
    if (userId) {
      countAgentTokens(
        messages as Array<{ role: string; content: string }>,
        content,
        planningModel // Use the model we actually used
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
          console.error('Failed to update agent usage for plan generation:', error);
        }
      }).catch(() => {
        // Ignore errors for background tracking
      });
    }

    const planData = extractJson(content);

    // Generate unique IDs for steps if not provided
    const steps: ExecutionStep[] = planData.steps.map((step: any, index: number) => ({
      id: step.id || `step_${index + 1}`,
      order: step.order ?? index + 1,
      description: step.description,
      type: step.type,
      dependencies: step.dependencies || [],
      estimatedTime: step.estimatedTime || 1000,
      tool: step.tool,
      status: 'PENDING' as const,
    }));

    const plan: ExecutionPlan = {
      id: `plan_${Date.now()}`,
      steps,
      totalEstimatedTime: planData.totalEstimatedTime || steps.reduce((sum, s) => sum + s.estimatedTime, 0),
      requiresApproval: planData.requiresApproval || false,
      approvalReason: planData.approvalReason,
      contextUsed: context.map((c) => ({
        contextId: c.id,
        usedIn: 'planning',
        relevanceScore: c.metadata.relevanceScore,
        explanation: `Used ${c.type} context: ${c.content.substring(0, 50)}...`,
      })),
      createdAt: new Date().toISOString(),
    };

    return plan;
  } catch (error) {
    console.error('Error generating plan:', error);

    // Fallback: return a simple plan
    const fallbackSteps: ExecutionStep[] = [
      {
        id: 'step_1',
        order: 1,
        description: 'Process the request',
        type: 'EXECUTE',
        dependencies: [],
        estimatedTime: 5000,
        status: 'PENDING',
      }
    ];

    // If it's an execution task, try to guess the tool
    if (intent.action === 'EXECUTE_TASK' && tools.length > 0) {
      fallbackSteps[0].tool = {
        name: tools[0].name, // Fallback to first available tool
        parameters: intent.parameters.taskParams || intent.parameters
      };
    }

    return {
      id: `plan_${Date.now()}`,
      steps: fallbackSteps,
      totalEstimatedTime: 5000,
      requiresApproval: false,
      contextUsed: [],
      createdAt: new Date().toISOString(),
    };
  }
}


