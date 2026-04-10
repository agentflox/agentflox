
import { workflowOrchestrationService } from '../services/agents/orchestration/workflowOrchestrator';
import { agentRegistryService } from '../services/agents/orchestration/agentRegistry';

async function main() {
  const executionId = 'd60d5c35-eea0-4412-83da-cc2461cfe49f';
  const stepId = 'agent-1';
  const userId = 'cmkdvej3n0000w57cnvfjud6o';
  const input = { task: 'Greet the user' };

  console.log('Syncing database agents to registry...');
  await agentRegistryService.syncDatabaseAgents();

  console.log(`Manually dispatching step ${stepId} for execution ${executionId}...`);
  const result = await workflowOrchestrationService.dispatchWorkflowStep(executionId, stepId, input, userId);
  console.log('Dispatch result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
