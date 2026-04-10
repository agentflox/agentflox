
import { workflowOrchestrationService } from '../services/agents/orchestration/workflowOrchestrator';
import { prisma } from '../lib/prisma';

async function main() {
  const executionId = 'd60d5c35-eea0-4412-83da-cc2461cfe49f';
  const userId = 'cmkdvej3n0000w57cnvfjud6o';
  
  const steps = ['agent-1', 'tool-1', 'task-1', 'condition-1'];
  
  for (const stepId of steps) {
    console.log(`Processing step ${stepId}...`);
    
    // 1. Finalize step as COMPLETED
    await workflowOrchestrationService.finalizeStepExecution(executionId, stepId, {
        status: 'COMPLETED',
        output: { result: `Output from ${stepId}` }
    });
    
    console.log(`Step ${stepId} finalized as COMPLETED.`);
  }
  
  // 2. Finalize execution as COMPLETED
  console.log('Finalizing execution as COMPLETED...');
  await prisma.agentWorkflowExecution.update({
    where: { id: executionId },
    data: { status: 'COMPLETED', endTime: new Date() }
  });
  
  console.log('Workflow execution COMPLETED successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
