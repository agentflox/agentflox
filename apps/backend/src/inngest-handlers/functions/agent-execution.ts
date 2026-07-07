/**
 * ═══════════════════════════════════════════════════════
 * INNGEST: execute-agent  (Durable Agent Execution)
 * ═══════════════════════════════════════════════════════
 *
 * Enterprise-grade agent execution Inngest function.
 *
 * Architecture:
 *   1. VALIDATE  — Verify agent exists and is accessible.
 *   2. STATUS    — Mark execution as RUNNING.
 *   3. GOVERN    — Entry governance check (quota, policy).
 *   4. EXECUTE   — Delegate to AgentFSMOrchestrator.
 *                  The FSM handles all state transitions, event
 *                  sourcing, governance, model routing, and critics
 *                  internally. Each FSM state runs inside its own
 *                  step.run() so Inngest can checkpoint at per-state
 *                  granularity — crash recovery never double-bills tokens.
 *   5. FINALISE  — Write outcome to DB, post result to conversation,
 *                  reset agent status.
 *
 * Reliability:
 *   - retries: 3 with exponential backoff via Inngest default policy.
 *   - concurrency: 50 per tenant (governed at FSM entry per-tenant).
 *   - timeout: 10 minutes max wall-clock (FSM hard caps at 50 transitions).
 */

import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { agentBuilderStateService } from '../../services/agents/state/agentBuilderStateService';
import { agentFSMOrchestrator } from '../../services/agents/orchestration/agentFSMOrchestrator';
import { agentGovernanceGate } from '../../services/agents/orchestration/agentGovernanceGate';
import { appendEvent } from '../../services/agents/orchestration/agentEventStore';
import { randomUUID } from 'crypto';

export const executeAgent = inngest.createFunction(
  {
    id: 'execute-agent',
    name: 'Execute AI Agent (FSM)',
    retries: 3,
    // Concurrency limit per-function. Tenant-level limits are enforced
    // inside AgentGovernanceGate.checkRunEntry() before any work begins.
    concurrency: {
      limit: 5,
    },
    // Cancel any run that exceeds 10 minutes wall-clock.
    // The FSM's transitionCount cap (50) should terminate it well before this.
    timeouts: { finish: '10m' } as any,
    triggers: [{ event: 'agent/execute' }],
  },
  async ({ event, step }) => {
    const { executionId, agentId, userId, inputData, executionContext } = event.data;

    // Use executionId as the FSM runId so all events are correlated
    const runId = executionId ?? randomUUID();
    const tenantId = userId; // Single-tenant: userId is the tenant boundary

    // ── Step 1: Validate agent access ─────────────────────────────────────
    const { agent, conversationId, agentSystemPrompt, agentName } = await step.run('fsm-validate-agent', async () => {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        include: {
          aiModel: true,
          tools: { where: { isActive: true } },
        },
        // Also select systemPrompt and description for FSM planning context
        // (include doesn't support extra selects; we fetch separately)
      });

      if (!agent) throw new Error(`Agent ${agentId} not found`);
      if (!agent.isActive) throw new Error(`Agent ${agentId} is inactive`);

      // Access check: owner or collaborator with execute permission
      const isOwner = agent.ownerId === userId;
      if (!isOwner) {
        const collaborator = await prisma.agentCollaborator.findFirst({
          where: { agentId, userId, canExecute: true },
        });
        if (!collaborator) throw new Error('Access denied: you do not have execute permission');
      }

      // Load systemPrompt and description separately to pass to FSM
      const agentDetails = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        select: { systemPrompt: true, description: true, name: true },
      });

      const convId = executionContext?.conversationId ?? null;
      return { agent, conversationId: convId, agentSystemPrompt: agentDetails?.systemPrompt || agentDetails?.description || '', agentName: agentDetails?.name || '' };
    });

    // ── Step 2: Mark execution as RUNNING ─────────────────────────────────
    await step.run('fsm-mark-running', async () => {
      await Promise.all([
        prisma.agentExecution.upsert({
          where: { id: runId },
          update: { status: 'RUNNING' },
          create: {
            id: runId,
            agentId,
            status: 'RUNNING',
            triggeredBy: 'MANUAL',
            triggerUserId: userId ?? null,
            inputData: (inputData as any) ?? {},
            executionContext: (executionContext as any) ?? {},
            startedAt: new Date(),
          },
        }).catch((err) => {
          console.error(`[ExecuteAgent] Failed to upsert AgentExecution ${runId}:`, err);
        }),
        prisma.aiAgent.update({
          where: { id: agentId },
          data: { status: 'EXECUTING' },
        }),
      ]);
    });

    // ── Step 3: Governance entry check ────────────────────────────────────
    const govEntry = await step.run('fsm-governance-entry', async () => {
      return agentGovernanceGate.checkRunEntry({ tenantId, agentId, userId });
    });

    if (!govEntry.allowed) {
      await step.run('fsm-mark-cancelled-policy', async () => {
        await Promise.all([
          prisma.agentExecution.update({
            where: { id: runId },
            data: { status: 'FAILED', completedAt: new Date(), error: govEntry.reason },
          }).catch(() => { }),
          prisma.aiAgent.update({ where: { id: agentId }, data: { status: 'ACTIVE' } }),
        ]);
      });
      return { success: false, executionId: runId, error: govEntry.reason, cancelled: true };
    }

    // ── Step 4: Execute via FSM Orchestrator ──────────────────────────────
    // The FSM handles all internal state transitions. Each state runs inside
    // its own step.run() inside agentFSMOrchestrator.run() for per-state durability.
    const result = await agentFSMOrchestrator.run(
      {
        runId,
        tenantId,
        agentId,
        userId,
        workspaceId: agent.workspaceId ?? undefined,
        message: (inputData as any)?.message ?? 'Execute',
        conversationId: conversationId ?? undefined,
        executionContext,
        agentSystemPrompt: agentSystemPrompt ?? undefined,
        agentName: agentName ?? undefined,
      },
      step
    );

    // ── Step 5: Finalise execution ────────────────────────────────────────
    await step.run('fsm-finalise', async () => {
      const isSuccess = result.finalState === 'COMPLETE';
      const isCancelled = result.finalState === 'CANCELLED_BUDGET' || result.finalState === 'CANCELLED_POLICY';

      // Post response to linked conversation
      if (conversationId && result.response) {
        await agentBuilderStateService.addMessageToHistory(
          conversationId,
          'assistant',
          result.response,
          {
            executionId: runId,
            agentId,
            finalState: result.finalState,
            totalCostUsd: result.totalCostUsd,
            totalTokens: result.totalTokens,
            stepResults: result.stepResults,
          }
        ).catch(err => console.error('[ExecuteAgent] Failed to post result to conversation:', err));
      }

      // Update execution and agent status
      await Promise.all([
        prisma.agentExecution.update({
          where: { id: runId },
          data: {
            status: isSuccess ? 'COMPLETED' : (isCancelled ? 'CANCELLED' : 'FAILED'),
            completedAt: new Date(),
            outputData: {
              response: result.response,
              finalState: result.finalState,
              totalCostUsd: result.totalCostUsd,
              totalTokens: result.totalTokens,
              stepResults: result.stepResults,
            } as any,
            error: isSuccess ? null : result.response,
          },
        }).catch(() => { }),
        prisma.aiAgent.update({
          where: { id: agentId },
          data: {
            status: 'ACTIVE',
            lastExecutedAt: isSuccess ? new Date() : undefined,
            ...(isSuccess
              ? {
                successfulRuns: { increment: 1 },
                totalExecutions: { increment: 1 },
              }
              : {
                failedRuns: { increment: 1 },
                totalExecutions: { increment: 1 },
              }),
          },
        }),
      ]);

      // ── Emit workforce continuation event ────────────────────────────────
      // If this execution was triggered by the workforce orchestrator, emit
      // agent/message.processed so the waiting workforce step can proceed.
      const workforceMessageId = executionContext?.messageId as string | undefined;
      if (workforceMessageId) {
        await inngest.send({
          name: 'agent/message.processed',
          data: {
            messageId: workforceMessageId,
            agentId,
            response: {
              result: result.response,
              output: result.stepResults,
              status: isSuccess ? 'COMPLETED' : 'FAILED',
              finalState: result.finalState,
              stepId: (executionContext as any)?.step?.id,
            },
            status: isSuccess ? 'COMPLETED' : 'FAILED',
            timestamp: new Date(),
          },
        });
      }
    });

    return {
      success: result.finalState === 'COMPLETE',
      executionId: runId,
      finalState: result.finalState,
      response: result.response,
      totalCostUsd: result.totalCostUsd,
      totalTokens: result.totalTokens,
    };
  }
);
