import { prisma } from './index';
import { Inngest } from 'inngest';
import { v4 as uuidv4 } from 'uuid';

process.env.INNGEST_EVENT_KEY = 'local';
process.env.INNGEST_DEV = '1';

const inngest = new Inngest({ id: 'agentflox-agents', name: 'Agentflox AI Agents' });

async function trigger() {
    const executionId = uuidv4();
    const agentId = '4f192f18-6d21-44a7-b581-bb60238fc790';
    const userId = 'cmkdvej3n0000w57cnvfjud6o';

    console.log('Creating execution record...');
    await (prisma as any).agentExecution.create({
        data: {
            id: executionId,
            agentId: agentId,
            triggeredBy: 'MANUAL',
            triggerUserId: userId,
            inputData: { message: 'Handle the swarm backlog and decompose tasks as needed.' },
            status: 'QUEUED',
            startedAt: new Date(),
        }
    });

    const payload = {
        agentId: agentId,
        userId: userId,
        executionId: executionId,
        inputData: {
            message: 'Handle the swarm backlog and decompose tasks as needed.'
        }
    };

    console.log('Sending agent/execute event to Inngest...');
    const result = await inngest.send({
        name: 'agent/execute',
        data: payload
    });

    console.log('Successfully triggered agent execution Result:', result);
    console.log('ID:', executionId);
    process.exit(0);
}

trigger().catch(err => {
    console.error('Trigger failed:', err);
    process.exit(1);
});
