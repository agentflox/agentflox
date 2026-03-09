/**
 * LangGraph State Machine for Agent Execution
 * 
 * This file defines the state machine that orchestrates the agent execution flow:
 * understandIntent → gatherContext → planActions → verifyPlan → (requestApproval?) → executeActions → storeMemory
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import type { AgentState, Context, Intent, ApprovalRequest, ExecutionPlan } from '../types/types';
import { randomUUID } from 'crypto';
import { understandIntent as understandIntentService } from '../inference/intentService';
import { gatherContext as gatherContextService } from '../context/contextService';
import { generatePlan } from './plannerService';
import { verifyPlan as verifyPlanService } from '../validation/verificationService';
import { createApprovalRequest } from '../safety/approvalService';
import { ToolInvocationGate } from '../core/toolInvocationGate';
import { storeMemory as storeMemoryService } from '../core/memoryService';
import { GuardrailService } from '../safety/guardrailService';
import { getAllTools } from '../registry/toolRegistry';
import { agentSkillService } from '../core/agentSkillService';
import { ModelService } from '../../ai/model.service';

const modelService = new ModelService();

/**
 * Agent State Interface
 * This defines the state that flows through the graph
 */
export interface AgentGraphState {
  // Input
  executionId?: string;
  userId: string;
  agentId?: string;
  message: string;
  conversationId?: string;
  workspaceId?: string;

  // Intent Understanding
  intent?: Intent;

  // Context
  context?: Context[];

  // Planning
  plan?: ExecutionPlan;

  // Verification
  verificationResult?: {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };

  // Approval
  approvalRequest?: ApprovalRequest;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';

  // Execution
  executionResults?: Array<{
    stepId: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;

  // Memory
  memoriesToStore?: Array<{
    type: string;
    category: string;
    key: string;
    content: string;
    importance: number;
  }>;

  // Output
  response?: string;
  error?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WAITING_APPROVAL';
}

/**
 * Node: Understand Intent
 * Converts natural language message to structured intent
 */
async function understandIntent(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  const conversationHistory: Array<{ role: string; content: string }> = [];
  const intent = await understandIntentService(
    state.message,
    conversationHistory,
    undefined, // No workspace context available yet
    state.userId,
    state.agentId,
    state.conversationId
  );

  // Deterministic local fallback: 
  // If we are in an agent's context and it didn't extract the ID, fill it.
  if (state.agentId && state.agentId !== 'chat-agent' && !intent.parameters.agentId) {
    intent.parameters.agentId = state.agentId;

    // If the only clarification question was about "which agent", we can proceed
    if (intent.requiresClarification && intent.clarificationQuestions?.length === 1 &&
      intent.clarificationQuestions[0].toLowerCase().includes('which agent')) {
      intent.requiresClarification = false;
      intent.clarificationQuestions = [];
    }
  }

  return {
    intent,
    status: 'RUNNING',
  };
}

/**
 * Node: Clarify Input
 * Returns clarification questions to the user
 */
async function clarifyInput(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  return {
    status: 'COMPLETED',
    response: state.intent?.clarificationQuestions?.join('\n') || 'Could you please clarify your request?',
  };
}

/**
 * Conditional Edge: Check if clarification is needed
 */
function afterIntent(state: AgentGraphState): string {
  if (state.intent?.requiresClarification) {
    return 'clarifyInput';
  }
  return 'gatherContext';
}

/**
 * Node: Gather Context
 * Retrieves relevant context from workspace, memory, and rules
 */
async function gatherContext(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  if (!state.intent) {
    return { error: 'Intent not found', status: 'FAILED' };
  }

  const context = await gatherContextService(
    state.userId,
    state.workspaceId,
    state.intent.action,
    state.intent.parameters,
    state.agentId
  );

  return {
    context,
  };
}

/**
 * Node: Plan Actions
 * Generates execution plan from intent and context
 */
async function planActions(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  if (!state.intent || !state.context) {
    return { error: 'Intent or context not found', status: 'FAILED' };
  }

  let skills: string[] = [];
  let tools: any[] = [];

  if (state.agentId) {
    try {
      // Fetch specifically what skills this agent has enabled
      const enabledSkills = await agentSkillService.getEnabledAgentSkills(state.agentId);
      skills = enabledSkills.map(s => s.name);

      // Fetch detailed tool metadata for these skills
      tools = await agentSkillService.getAvailableTools(state.agentId);

      console.log(`[AgentGraph] Planning with skills: ${skills.join(', ')} and ${tools.length} available tools`);

      if (tools.length === 0) {
        console.warn(`No tools found for agent ${state.agentId}, falling back to all tools`);
        tools = await getAllTools();
      }
    } catch (error) {
      console.error(`Error fetching skills/tools for agent ${state.agentId}:`, error);
      tools = await getAllTools();
    }
  } else {
    // No agent ID (System Context), use all tools
    tools = await getAllTools();
  }

  // Format tools for the planner to include metadata
  const toolInfos = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.functionSchema?.parameters || {}
  }));

  const plan = await generatePlan(
    state.intent,
    state.context,
    skills,
    toolInfos,
    state.userId
  );

  return {
    plan,
  };
}

// Deprecated verifyPlan removed. It is now defined as a closure in createAgentGraph to access services.

/**
 * Conditional Edge: Check if approval is required
 */
function requiresApproval(state: AgentGraphState): string {
  if (state.plan?.requiresApproval || state.verificationResult?.warnings?.length) {
    return 'requestApproval';
  }
  return 'executeActions';
}

/**
 * Node: Request Approval
 * Creates approval request and waits for user response
 * TERMINAL STATE: Returns immediately without executing tools
 */
async function requestApproval(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  if (!state.plan) {
    return { error: 'Plan not found', status: 'FAILED' };
  }

  if (!state.executionId) {
    return { error: 'Execution ID not found', status: 'FAILED' };
  }

  const approvalRequest = await createApprovalRequest(state.executionId, state.plan, state.userId);

  return {
    approvalRequest,
    status: 'WAITING_APPROVAL',
    response: `This action requires approval. ${approvalRequest.reason}`,
  };
}

/**
 * Conditional Edge: Check if approval was requested
 * If approval is needed, go to END (terminal state)
 * This removes the infinite loop - approval happens outside the graph
 */
function checkApprovalNeeded(state: AgentGraphState): string {
  if (state.approvalRequest) {
    return END; // Terminal: exit graph, wait for external approval
  }
  return 'executeActions';
}

/**
 * Node: Execute Actions
 * Executes the planned actions via tools through ToolInvocationGate
 * The gate enforces all safety/approval/rate-limit checks
 */
async function executeActions(state: AgentGraphState, guardrailService: GuardrailService): Promise<Partial<AgentGraphState>> {
  if (!state.plan) {
    return { error: 'Plan not found', status: 'FAILED' };
  }

  if (!state.executionId) {
    return { error: 'Execution ID not found', status: 'FAILED' };
  }

  if (!state.agentId) {
    return { error: 'Agent ID not found', status: 'FAILED' };
  }

  // Initialize gate
  const gate = new ToolInvocationGate(guardrailService);

  const executionResults: any[] = state.executionResults || [];
  const steps = [...state.plan.steps];
  const stepMap = new Map(steps.map(s => [s.id, s]));
  const completedStepIds = new Set<string>(
    steps.filter(s => s.status === 'COMPLETED' || s.status === 'SKIPPED').map(s => s.id)
  );
  const failedStepIds = new Set<string>();

  console.log(`[AgentGraph] Starting execution for ${steps.length} steps. Currently completed: ${completedStepIds.size}`);

  // Simple topological execution
  let hasProgress = true;
  while (steps.some(s => s.status !== 'COMPLETED' && s.status !== 'FAILED') && hasProgress) {
    hasProgress = false;

    // Find executable steps: (Not completed) AND (All dependencies completed)
    const executableSteps = steps.filter(step =>
      step.status !== 'COMPLETED' &&
      step.status !== 'FAILED' &&
      step.dependencies.every(depId => {
        const hasDep = completedStepIds.has(depId);
        return hasDep;
      })
    );

    console.log(`[AgentGraph] Step Iteration: ${steps.length} total, ${executableSteps.length} executable. Completed: ${Array.from(completedStepIds).join(', ')}`);

    if (executableSteps.length === 0) {
      if (steps.some(s => s.status === 'PENDING')) {
        console.warn('[AgentGraph] Deadlock detected or no executable steps found while some are still PENDING');
      }
      break;
    }

    // Execute in parallel through the gate
    const batchResults = await Promise.all(executableSteps.map(async (step) => {
      if (step.type !== 'EXECUTE' || !step.tool) {
        return {
          stepId: step.id,
          success: true,
          result: `Skipped: ${step.type} handled by platform`,
          status: 'SKIPPED' as const
        };
      }

      try {
        // IMPORTANT: ALL tool execution goes through the gate
        const gateResult = await gate.invoke({
          executionId: state.executionId!,
          agentId: state.agentId!,
          userId: state.userId,
          workspaceId: state.workspaceId,
          toolName: step.tool.name,
          parameters: step.tool.parameters || {},
          stepId: step.id,
        });

        // Check if approval is required
        if (gateResult.status === 'approval_required') {
          // Return special status to trigger approval flow
          return {
            stepId: step.id,
            success: false,
            requiresApproval: true,
            approvalReason: gateResult.approvalReason,
            error: 'Approval required',
          };
        }

        return {
          stepId: step.id,
          success: gateResult.status === 'success',
          result: gateResult.result,
          error: gateResult.error,
          toolCallId: gateResult.toolCallId,
          durationMs: gateResult.durationMs,
        };
      } catch (e) {
        return {
          stepId: step.id,
          success: false,
          error: e instanceof Error ? e.message : 'Unknown execution error',
        };
      }
    }));

    // Process results
    for (const res of batchResults) {
      executionResults.push(res);
      const step = stepMap.get(res.stepId)!;

      if (res.success) {
        step.status = (res as any).status || 'COMPLETED';
        step.result = res.result;
        completedStepIds.add(res.stepId);
      } else if ((res as any).requiresApproval) {
        // Approval required - halt execution and return to controller
        return {
          executionResults,
          status: 'WAITING_APPROVAL',
          response: `This action requires approval. ${(res as any).approvalReason}`,
          approvalRequest: {
            id: (res as any).approvalRequestId || randomUUID(), // Assuming gate returns ID or generate one
            executionId: state.executionId,
            planId: state.plan.id,
            reason: (res as any).approvalReason || 'Tool requires approval',
            actionSummary: {
              totalActions: 1,
              actionTypes: [stepMap.get(res.stepId!)?.tool?.name || 'unknown'],
              affectedResources: []
            },
            requiresApproval: true,
            approvalStatus: 'PENDING',
            requestedBy: state.userId,
            requestedAt: new Date().toISOString(),
          },
        };
      } else {
        step.status = 'FAILED';
        step.error = res.error;
        failedStepIds.add(res.stepId);
      }
      hasProgress = true;
    }

    // If any failed, do we stop? For now, yes, strict failure.
    if (failedStepIds.size > 0) {
      break;
    }
  }

  // Create a new plan object with the updated steps to ensure state updates
  const updatedPlan = {
    ...state.plan,
    steps: steps
  };

  return {
    executionResults,
    plan: updatedPlan,
    status: failedStepIds.size > 0 ? 'FAILED' : 'RUNNING',
  };
}

async function generateFinalResponse(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  if (!state.plan || !state.executionResults) {
    return { response: state.response || 'Execution completed.' };
  }

  const systemPrompt = `You are a summarization system for Agentflox, an AI agent platform. 
Your job is to look at an execution plan and its results, then write a concise, human-friendly summary for the user.

Rules:
1. Be clear about whether the overall task succeeded or failed.
2. Specifically mention what was ADDED (e.g., tasks created, files generated).
3. Specifically mention what was MODIFIED (e.g., status updates, field changes).
4. Use a helpful, professional tone.
5. If there were errors, explain them simply.
6. Keep the summary under 150 words.`;

  const userPrompt = `
Task: ${state.message}
Plan Steps:
${state.plan.steps.map(s => `- ${s.description} (Type: ${s.type}, Tool: ${s.tool?.name})`).join('\n')}

Execution Results:
${state.executionResults.map(r => `- Step ${r.stepId}: ${r.success ? 'SUCCESS' : 'FAILED'}. Result: ${JSON.stringify(r.result || r.error)}`).join('\n')}
`;

  try {
    const result = await modelService.generateText('gpt-4o', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return {
      response: result.content || 'Execution completed successfully.'
    };
  } catch (error) {
    console.error('[AgentGraph] Error generating final response:', error);
    return {
      response: `Execution completed successfully. ${state.executionResults.length} actions executed.`
    };
  }
}

/**
 * Node: Store Memory
 * Saves learnings to memory system
 */
async function storeMemory(state: AgentGraphState): Promise<Partial<AgentGraphState>> {
  if (!state.intent) {
    return { error: 'Intent not found', status: 'FAILED' };
  }

  // If no execution results, we just complete without storing memories
  if (!state.executionResults || state.executionResults.length === 0) {
    return {
      status: 'COMPLETED',
      response: state.response || 'Request processed.'
    };
  }

  const agentId = state.agentId || 'global';
  const memoriesToStore = [];

  // Store user preferences if detected
  if (state.intent.parameters.taskParams?.assigneeId) {
    await storeMemoryService(
      agentId,
      'USER_PREFERENCE',
      'assignment',
      `user_${state.userId}_preferred_assignee`,
      `User prefers assigning tasks to ${state.intent.parameters.taskParams.assigneeId}`,
      0.6
    );
    memoriesToStore.push({
      type: 'USER_PREFERENCE',
      category: 'assignment',
      key: `user_${state.userId}_preferred_assignee`,
      content: `User prefers assigning tasks to ${state.intent.parameters.taskParams.assigneeId}`,
      importance: 0.6,
    });
  }

  // Store recent state
  if (state.executionResults && state.executionResults.length > 0) {
    await storeMemoryService(
      agentId,
      'RECENT_STATE',
      'execution',
      `execution_${Date.now()}`,
      `Executed ${state.executionResults.length} actions: ${state.intent.action}`,
      0.5,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days TTL
    );
  }

  return {
    memoriesToStore,
    status: 'COMPLETED',
  };
}

/**
 * Build the LangGraph state machine
 */
export function createAgentGraph(guardrailService: GuardrailService) {
  const workflow = new StateGraph<AgentGraphState>({
    channels: {
      // Define state channels
      executionId: { reducer: (x: string | undefined, y?: string) => y ?? x },
      userId: { reducer: (x: string, y?: string) => y ?? x },
      agentId: { reducer: (x: string | undefined, y?: string) => y ?? x },
      message: { reducer: (x: string, y?: string) => y ?? x },
      conversationId: { reducer: (x: string | undefined, y?: string) => y ?? x },
      workspaceId: { reducer: (x: string | undefined, y?: string) => y ?? x },
      intent: { reducer: (x: Intent | undefined, y?: Intent) => y ?? x },
      context: { reducer: (x: Context[] | undefined, y?: Context[]) => y ?? x },
      plan: { reducer: (x: any, y?: any) => y ?? x },
      verificationResult: { reducer: (x: any, y?: any) => y ?? x },
      approvalRequest: { reducer: (x: ApprovalRequest | undefined, y?: ApprovalRequest) => y ?? x },
      approvalStatus: { reducer: (x: any, y?: any) => y ?? x },
      executionResults: { reducer: (x: any[] | undefined, y?: any[]) => y ?? x },
      memoriesToStore: { reducer: (x: any[] | undefined, y?: any[]) => y ?? x },
      response: { reducer: (x: string | undefined, y?: string) => y ?? x },
      error: { reducer: (x: string | undefined, y?: string) => y ?? x },
      status: { reducer: (x: string, y?: string) => y ?? x },
    },
  } as any);

  // Re-define nodes that need closure access to services
  const verifyPlanWithService = async (state: AgentGraphState): Promise<Partial<AgentGraphState>> => {
    if (!state.plan) {
      return { error: 'Plan not found', status: 'FAILED' };
    }

    // Check guardrails first
    const guardrailCheck = await guardrailService.checkGuardrails(state.plan, state.userId, state.workspaceId);
    if (!guardrailCheck.passed) {
      return {
        verificationResult: {
          valid: false,
          errors: guardrailCheck.errors,
          warnings: guardrailCheck.warnings,
        },
        error: guardrailCheck.errors.join('; '),
        status: 'FAILED',
      };
    }

    // Verify plan details
    const verificationResult = await verifyPlanService(state.plan, state.userId, state.workspaceId);

    return {
      verificationResult,
    };
  };

  // Add nodes
  workflow.addNode('understandIntent', understandIntent);
  workflow.addNode('clarifyInput', clarifyInput);
  workflow.addNode('gatherContext', gatherContext);
  workflow.addNode('planActions', planActions);
  workflow.addNode('verifyPlan', verifyPlanWithService);
  workflow.addNode('requestApproval', requestApproval);
  workflow.addNode('executeActions', (state) => executeActions(state, guardrailService));
  workflow.addNode('generateFinalResponse', generateFinalResponse);
  workflow.addNode('storeMemory', storeMemory);


  // Define edges
  workflow.addEdge(START as any, 'understandIntent' as any);
  workflow.addConditionalEdges('understandIntent' as any, afterIntent, {
    clarifyInput: 'clarifyInput',
    gatherContext: 'gatherContext',
  } as any);
  workflow.addEdge('clarifyInput' as any, END as any);
  workflow.addEdge('gatherContext' as any, 'planActions' as any);
  workflow.addEdge('planActions' as any, 'verifyPlan' as any);
  workflow.addConditionalEdges('verifyPlan' as any, requiresApproval, {
    requestApproval: 'requestApproval',
    executeActions: 'executeActions',
  } as any);
  workflow.addConditionalEdges('requestApproval' as any, checkApprovalNeeded, {
    [END as any]: END,
    executeActions: 'executeActions',
  } as any);
  workflow.addEdge('executeActions' as any, 'generateFinalResponse' as any);
  workflow.addEdge('generateFinalResponse' as any, 'storeMemory' as any);
  workflow.addEdge('storeMemory' as any, END);

  return workflow.compile();
}



