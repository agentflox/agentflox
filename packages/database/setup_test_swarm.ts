import { prisma } from './index';
import { randomUUID } from 'crypto';

async function main() {
    const userId = 'cmkdvej3n0000w57cnvfjud6o';
    const workspaceId = 'cmkgxq0u50000w51gn96tfzxo';
    const modelId = '4hVYUfQbegVjMuAqvUXjGXam8ZR5';

    // 1. Create a dummy workflow
    const workflow = await (prisma as any).agentWorkflow.create({
        data: {
            id: randomUUID(),
            name: 'Test Swarm Workflow',
            description: 'Enterprise Hardening Test',
            workspaceId,
            definition: { nodes: [], edges: [] },
            isActive: true
        } as any
    });

    // 2. Create Swarm Manager Agent
    const manager = await (prisma as any).aiAgent.create({
        data: {
            id: randomUUID(),
            workspaceId,
            createdBy: userId,
            name: 'Swarm Coordinator',
            description: 'Decomposes complex requests into task trees.',
            agentType: 'PROJECT_MANAGER',
            systemPrompt: 'You are an expert coordinator. Use decomposeTask tool to break high-level objectives into 2-3 smaller tasks.',
            status: 'ACTIVE',
            isActive: true,
            availableTools: ['decomposeTask', 'findQualifiedAgents', 'claimAndAssignTask'],
            modelId: modelId
        }
    });

    // 3. Create Researcher Agent
    const researcher = await (prisma as any).aiAgent.create({
        data: {
            id: randomUUID(),
            workspaceId,
            createdBy: userId,
            name: 'Deep Researcher',
            description: 'Executes research tasks.',
            agentType: 'RESEARCHER',
            systemPrompt: 'You are a thorough researcher. Deliver high-quality insights for any task assigned.',
            status: 'ACTIVE',
            isActive: true,
            modelId: modelId
        }
    });

    console.log(`Created agents: Manager(${manager.id}), Researcher(${researcher.id})`);

    // 4. Create a Swarm Session (WorkflowExecution)
    const swarmSession = await (prisma as any).agentWorkflowExecution.create({
        data: {
            id: randomUUID(),
            workflow: { connect: { id: workflow.id } },
            status: 'RUNNING',
            totalTasks: 1,
            maxTasks: 50,
            maxCostUsd: 5.0
        } as any
    });

    // 5. Create Initial Task
    const rootTask = await (prisma as any).agentTask.create({
        data: {
            id: randomUUID(),
            workspaceId,
            assignedBy: userId,
            workflowExecutionId: swarmSession.id,
            title: 'Research the impact of AI Swarms on DevOps',
            description: 'Decompose this into 2 specific sub-tasks.',
            taskType: 'RESEARCH', // Changed from TASK_EXECUTOR
            status: 'PENDING',
            priority: 'HIGH',
            depth: 0,
            agentId: manager.id 
        } as any
    });

    console.log(`Setup complete. Root Task ID: ${rootTask.id}. Swarm Session: ${swarmSession.id}`);
}

main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
