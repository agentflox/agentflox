/**
 * Approval Service
 * 
 * Manages approval workflow for bulk actions and destructive operations
 */

import { prisma } from '@/lib/prisma';
import { ExecutionPlan, ApprovalRequest } from '../types/types';


export async function createApprovalRequest(
  executionId: string,
  plan: ExecutionPlan,
  userId: string
): Promise<ApprovalRequest> {
  // Determine if approval is needed
  const requiresApproval = plan.requiresApproval ||
    plan.steps.filter((s) => s.tool?.name === 'deleteTask').length > 0 ||
    plan.steps.filter((s) => s.tool?.name === 'createTask').length > 5;

  if (!requiresApproval) {
    throw new Error('Approval not required for this plan');
  }

  // Count actions
  const actionTypes = [...new Set(plan.steps.map((s) => s.tool?.name).filter(Boolean))];
  const totalActions = plan.steps.filter((s) => s.type === 'EXECUTE').length;

  // Determine approval reason
  let reason = plan.approvalReason || 'Bulk action detected';
  if (plan.steps.filter((s) => s.tool?.name === 'deleteTask').length > 0) {
    reason = 'Destructive action detected: task deletion';
  } else if (totalActions > 5) {
    reason = `Bulk operation: ${totalActions} actions`;
  }

  const approvalRequest: ApprovalRequest = {
    id: `approval_${Date.now()}`,
    executionId,
    planId: plan.id,
    reason,
    actionSummary: {
      totalActions,
      actionTypes: actionTypes as string[],
      affectedResources: [], // Would be populated from plan analysis
    },
    requiresApproval: true,
    approvalStatus: 'PENDING',
    requestedBy: userId,
    requestedAt: new Date().toISOString(),
  };

  // Update execution record
  await prisma.agentExecution.update({
    where: { id: executionId },
    data: {
      requiresApproval: true,
      approvalStatus: 'PENDING',
    },
  });

  return approvalRequest;
}

export async function approveExecution(
  executionId: string,
  userId: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  const execution = await prisma.agentExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) {
    throw new Error('Execution not found');
  }

  if (execution.approvalStatus !== 'PENDING') {
    throw new Error(`Execution is not pending approval. Current status: ${execution.approvalStatus}`);
  }

  await prisma.agentExecution.update({
    where: { id: executionId },
    data: {
      approvalStatus: approved ? 'APPROVED' : 'REJECTED',
      approvedBy: approved ? userId : undefined,
      approvedAt: approved ? new Date() : undefined,
      rejectionReason: approved ? undefined : reason,
      status: approved ? 'QUEUED' : 'FAILED',
    },
  });
}

