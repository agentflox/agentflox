/**
 * Agent Orchestration Tool Executor
 * Implements logic for hierarchical multi-agent coordination
 */
import { prisma } from '@/lib/prisma';
import { agentTaskOrchestrator } from '../orchestration/agentTaskOrchestrator';
import { agentCommunicationService } from '../orchestration/agentCommunication';
import { AgentTaskStatus, TaskPriority } from '@agentflox/database';

export async function executeAgentOrchestrationTool(
    toolName: string,
    params: any,
    userId: string,
    workspaceId?: string,
    callerAgentId?: string
): Promise<any> {
    try {
        switch (toolName) {
            case 'assignTaskToAgent':
                return executeAssignTaskToAgent(params, userId, callerAgentId);
            case 'sendMessageToAgent':
                return executeSendMessageToAgent(params, userId, callerAgentId);
            case 'getAvailableSwarmTasks':
                return executeGetAvailableSwarmTasks(params, userId, workspaceId);
            case 'claimSwarmTask':
                return executeClaimSwarmTask(params, userId, callerAgentId);
            case 'triggerWorkflow':
                return executeTriggerWorkflow(params, userId);
            default:
                throw new Error(`Unknown orchestration tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Orchestration tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function executeClaimSwarmTask(params: any, _userId: string, callerAgentId?: string) {
    if (!callerAgentId) {
        throw new Error('Only agents can claim swarm tasks.');
    }

    const { taskId } = params;
    const success = await agentTaskOrchestrator.claimTask(taskId, callerAgentId);

    return {
        success,
        taskId,
        message: success
            ? `Successfully claimed task ${taskId}`
            : `Failed to claim task ${taskId}. It may already be assigned or no longer available.`
    };
}

async function executeGetAvailableSwarmTasks(params: any, userId: string, workspaceId?: string) {
    const wsId = params.workspaceId || workspaceId;

    // Call the orchestrator service to get available swarm tasks (pass null for pooled)
    const tasks = await agentTaskOrchestrator.getAvailableTasks(undefined, wsId);

    return {
        success: true,
        count: tasks.length,
        tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            createdAt: t.createdAt
        }))
    };
}

async function executeTriggerWorkflow(params: any, userId: string) {
    const { workflowId, inputData } = params;

    const { workflowOrchestrationService } = await import('../orchestration/workflowOrchestrator');
    const execution = await workflowOrchestrationService.startWorkflow(workflowId, inputData, userId);

    return {
        success: true,
        executionId: execution.id,
        status: execution.status,
        message: `Workflow ${workflowId} initiated successfully (Execution ID: ${execution.id})`
    };
}

async function executeAssignTaskToAgent(params: any, userId: string, callerAgentId?: string) {
    const { taskId, agentId, priority, instructions } = params;

    // 1. Role Validation: Only certain agent types can assign tasks.
    if (callerAgentId) {
        const caller = await prisma.aiAgent.findUnique({
            where: { id: callerAgentId },
            select: { agentType: true }
        });

        // Strict role enforcement for enterprise grade orchestration
        const managerTypes = ['PROJECT_MANAGER', 'STRATEGIST', 'RESEARCHER'];
        if (caller && !managerTypes.includes(caller.agentType)) {
            throw new Error(`Agent type ${caller.agentType} is not authorized to assign tasks. Only Manager types can delegate.`);
        }
    }

    // 2. Task Update
    const task = await prisma.agentTask.update({
        where: { id: taskId },
        data: {
            agentId: agentId,
            priority: (priority as TaskPriority) || undefined,
            status: AgentTaskStatus.PENDING, // Reset to pending if it was blocked/failed
            assignedBy: callerAgentId || userId,
            metadata: instructions ? { instructions } : undefined
        }
    });

    // 3. Trigger Orchestration via internal service
    // This will handle Inngest event emission to actually wake up the worker agent.
    await agentTaskOrchestrator.triggerTaskProcessing(taskId);

    return {
        success: true,
        taskId: task.id,
        assignedTo: agentId,
        message: `Task ${taskId} has been successfully assigned to agent ${agentId}.`
    };
}

async function executeSendMessageToAgent(params: any, userId: string, callerAgentId?: string) {
    const { agentId, message, type } = params;

    const response = await agentCommunicationService.sendMessage(
        callerAgentId || 'system',
        agentId,
        {
            content: message,
            type: type === 'COMMAND' ? 'REQUEST' : 'NOTIFICATION',
            data: {
                originalSender: userId,
                commType: type
            }
        },
        {
            synchronous: false // Async by default for tools to avoid blocking the ReAct loop
        }
    );

    return {
        success: response.status !== 'FAILED',
        messageId: response.messageId,
        recipient: agentId,
        status: response.status,
        error: response.error
    };
}
