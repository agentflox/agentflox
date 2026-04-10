import { randomUUID } from 'crypto';

async function main() {
    const rootTaskId = '3fe38d94-d2f7-4065-88d2-f48f7da22134';
    const managerId = '4f192f18-6d21-44a7-b581-bb60238fc790';
    const userId = 'cmkdvej3n0000w57cnvfjud6o';

    const eventData = {
        name: 'agent/execute',
        data: {
            executionId: randomUUID(),
            agentId: managerId,
            userId: userId,
            inputData: {
                message: `Start the DevOps research task.`,
                taskId: rootTaskId
            }
        }
    };

    console.log('Sending Inngest event:', JSON.stringify(eventData, null, 2));

    const response = await fetch('http://localhost:8288/e/local', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
    });

    if (response.ok) {
        console.log('Successfully triggered agent execution.');
        console.log('Check Inngest Dev Server at http://localhost:8288 to monitor progress.');
    } else {
        const err = await response.text();
        console.error('Failed to trigger execution:', err);
    }
}

main().catch(console.error);
