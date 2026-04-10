
import { runWorkforce } from '../services/agents/orchestration/workforceExecutionService';

async function main() {
  const workforceId = 'test-workforce-all-nodes-1';
  const userId = 'cmkdvej3n0000w57cnvfjud6o';
  const input = { task: 'Greet the user' };

  console.log(`Running workforce ${workforceId} for user ${userId}...`);
  try {
    const result = await runWorkforce(workforceId, input, userId);
    console.log('Execution result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error running workforce:', error);
  }
}

main().catch(console.error);
