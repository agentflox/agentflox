import { prisma } from '@/lib/prisma';
import { agentFSMOrchestrator } from '@/services/agents/orchestration/agentFSMOrchestrator';
import { v4 as uuidv4 } from 'uuid';

async function testLocalFSM() {
    const runId = uuidv4();
    const agentId = '4f192f18-6d21-44a7-b581-bb60238fc790';
    const userId = 'cmkdvej3n0000w57cnvfjud6o';
    const tenantId = userId;

    console.log(`[Test] Starting local FSM test. RunID: ${runId}`);

    // Create execution record
    await (prisma as any).agentExecution.create({
        data: {
            id: runId,
            agentId: agentId,
            triggeredBy: 'MANUAL',
            triggerUserId: userId,
            inputData: { message: 'Handle the swarm backlog and decompose tasks as needed.' },
            status: 'RUNNING',
            startedAt: new Date(),
        }
    });

    const context = {
        runId,
        tenantId,
        agentId,
        userId,
        message: 'Handle the swarm backlog and decompose tasks as needed.',
    };

    // Use a mock step object that executes functions immediately
    const mockStep = {
        run: async (name: string, fn: () => Promise<any>) => {
            console.log(`[MockStep] Running ${name}...`);
            return await fn();
        }
    };

    try {
        const result = await agentFSMOrchestrator.run(context as any, mockStep as any);
        console.log('[Test] FSM Execution Complete:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('[Test] FSM Execution Failed:', err);
    }

    process.exit(0);
}

testLocalFSM().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
