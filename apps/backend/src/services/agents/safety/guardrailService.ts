/**
 * Guardrail Service
 * 
 * Enforces hard restrictions, rate limits, and safety checks
 */

import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { ExecutionPlan } from './types';
import { PermissionService } from '../../permissions/permission.service';
import { Capability } from '../../permissions/capabilities.constant';

export interface GuardrailCheck {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class GuardrailService {
  constructor(private permissionService: PermissionService) { }

  /**
   * Check guardrails for an execution plan
   */
  async checkGuardrails(
    plan: ExecutionPlan,
    userId: string,
    workspaceId?: string
  ): Promise<GuardrailCheck> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Hard restrictions
    const deleteSteps = plan.steps.filter((s) => s.tool?.name === 'deleteTask');
    if (deleteSteps.length > 1) {
      errors.push('Bulk task deletion is not allowed. Maximum 1 task per deletion.');
    }

    // Check action quotas
    const executeSteps = plan.steps.filter((s) => s.type === 'EXECUTE');
    if (executeSteps.length > 20) {
      errors.push('Action quota exceeded: maximum 20 actions per execution');
    }

    // Rate limiting
    if (workspaceId) {
      const recentExecutions = await prisma.agentExecution.count({
        where: {
          triggerUserId: userId,
          aiAgent: {
            workspaceId,
          },
          startedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
          status: { not: 'FAILED' },
        },
      });

      if (recentExecutions >= 20) {
        errors.push('Rate limit exceeded: maximum 20 executions per hour');
      }
    }

    // Check for destructive actions
    if (deleteSteps.length > 0) {
      // Enforce permission check for destructive actions
      const canApproveDestructive = await this.permissionService.checkCapability(
        userId,
        Capability.AGENT_APPROVE_DESTRUCTIVE,
        { workspaceId }
      );

      if (!canApproveDestructive) {
        errors.push('Permission denied: You do not have permission to execute destructive actions (task deletion).');
      } else {
        warnings.push('Destructive action detected: task deletion requires approval');
      }
    }

    // Check for bulk operations
    const createSteps = plan.steps.filter((s) => s.tool?.name === 'createTask');
    if (createSteps.length > 5) {
      warnings.push(`Bulk operation detected: ${createSteps.length} tasks will be created. Approval required.`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Audit log an execution
   */
  async auditLog(
    executionId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    // Store in execution metadata
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
    });

    if (execution) {
      const metadata = (execution.metadata as Record<string, any>) || {};
      const auditLog = metadata.auditLog || [];

      auditLog.push({
        timestamp: new Date().toISOString(),
        action,
        details,
      });

      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          metadata: {
            ...metadata,
            auditLog,
          },
        },
      });
    }
  }
}

