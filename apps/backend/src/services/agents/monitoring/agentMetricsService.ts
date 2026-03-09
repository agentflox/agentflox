import { Injectable } from '@nestjs/common';
import { prisma } from '@/lib/prisma';
import { metrics } from '@/monitoring/metrics';

export interface AgentExecutionMetrics {
    agentId: string;
    agentType: string;
    status: string;
    duration: number;
    tokenUsage?: number;
    cost?: number;
    timestamp: Date;
    userId: string;
}

/**
 * Agent Metrics Service
 * Records execution metrics for observability dashboards
 */
@Injectable()
export class AgentMetricsService {
    /**
     * Record agent execution metrics
     */
    async recordExecution(execution: AgentExecutionMetrics): Promise<void> {
        // Record to Prometheus metrics
        metrics.agentExecutionDuration.observe(
            {
                agent_id: execution.agentId,
                agent_type: execution.agentType,
                status: execution.status,
            },
            execution.duration / 1000 // Convert to seconds
        );

        metrics.agentExecutionTotal.inc({
            agent_id: execution.agentId,
            agent_type: execution.agentType,
            status: execution.status,
        });

        if (execution.tokenUsage) {
            metrics.agentTokenUsage.observe(
                { agent_id: execution.agentId },
                execution.tokenUsage
            );
        }

        if (execution.cost) {
            metrics.agentCost.observe(
                { agent_id: execution.agentId, user_id: execution.userId },
                execution.cost
            );
        }

        // Success rate counter
        if (execution.status === 'SUCCESS' || execution.status === 'COMPLETED') {
            metrics.agentExecutionSuccess.inc({ agent_id: execution.agentId });
        } else {
            metrics.agentExecutionFailure.inc({ agent_id: execution.agentId });
        }
    }

    /**
     * Record builder metrics
     */
    async recordBuilderInteraction(
        conversationId: string,
        userId: string,
        stage: string,
        duration: number,
        extractedFields: number
    ): Promise<void> {
        metrics.builderInteractionDuration.observe(
            { stage, user_id: userId },
            duration / 1000
        );

        metrics.builderFieldsExtracted.observe(
            { stage },
            extractedFields
        );
    }

    /**
     * Record tool invocation metrics
     */
    async recordToolInvocation(
        toolName: string,
        agentId: string,
        status: 'success' | 'failed' | 'approval_required',
        durationMs: number
    ): Promise<void> {
        metrics.toolInvocations.inc({
            tool_name: toolName,
            status,
            agent_id: agentId,
        });

        metrics.toolInvocationDuration.observe(
            { tool_name: toolName, status },
            durationMs / 1000
        );
    }

    /**
     * Get agent performance summary
     */
    async getAgentPerformanceSummary(
        agentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalExecutions: number;
        successRate: number;
        avgDuration: number;
        totalTokens: number;
        totalCost: number;
    }> {
        const executions = await prisma.agentExecution.findMany({
            where: {
                agentId,
                startedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const successful = executions.filter((e) => e.status === 'COMPLETED').length;
        const totalDuration = executions.reduce((sum, e) => {
            return sum + (e.completedAt && e.startedAt
                ? e.completedAt.getTime() - e.startedAt.getTime()
                : 0);
        }, 0);

        return {
            totalExecutions: executions.length,
            successRate: executions.length > 0 ? successful / executions.length : 0,
            avgDuration: executions.length > 0 ? totalDuration / executions.length : 0,
            totalTokens: 0, // Placeholder - would sum from metadata
            totalCost: 0, // Placeholder - would calculate from token usage
        };
    }
}

export const agentMetricsService = new AgentMetricsService();
