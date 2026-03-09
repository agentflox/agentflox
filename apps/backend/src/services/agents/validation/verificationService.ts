/**
 * Verification Service
 * 
 * Validates execution plans against guardrails and rules
 */

import { prisma } from '@/lib/prisma';
import { ExecutionPlan, ValidationResult } from '../types/types';


export async function verifyPlan(
  plan: ExecutionPlan,
  userId: string,
  workspaceId?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check each execution step
  for (const step of plan.steps) {
    if (step.type === 'EXECUTE' && step.tool) {
      // Verify assignee exists (if assigneeId is in parameters)
      if (step.tool.parameters.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: step.tool.parameters.assigneeId },
        });
        if (!assignee) {
          errors.push(`Assignee not found: ${step.tool.parameters.assigneeId}`);
        } else if (workspaceId) {
          // Verify assignee is in workspace
          const member = await prisma.workspaceMember.findFirst({
            where: {
              workspaceId,
              userId: step.tool.parameters.assigneeId,
            },
          });
          if (!member) {
            errors.push(`Assignee ${assignee.name} is not a member of this workspace`);
          }
        }
      }

      // Verify due date is valid
      if (step.tool.parameters.dueDate) {
        const dueDate = new Date(step.tool.parameters.dueDate);
        const now = new Date();
        if (dueDate < now) {
          errors.push(`Due date ${dueDate.toISOString()} is in the past`);
        }
        // Check if date is within current sprint (if sprint info available)
        // This would require sprint/workspace configuration
      }

      // Check action count limits
      if (step.tool.name === 'createTask') {
        const bulkCount = plan.steps.filter(
          (s) => s.tool?.name === 'createTask'
        ).length;
        if (bulkCount > 5) {
          warnings.push(`Bulk creation detected: ${bulkCount} tasks. Approval required.`);
        }
      }

      // Check for destructive actions
      if (step.tool.name === 'deleteTask') {
        warnings.push('Destructive action detected: task deletion. Approval required.');
      }
    }
  }

  // Check permission limits
  if (workspaceId) {
    // Count recent actions by user
    const recentExecutions = await prisma.agentExecution.count({
      where: {
        triggerUserId: userId,
        startedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentExecutions > 20) {
      errors.push('Rate limit exceeded: too many executions in the last hour');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

