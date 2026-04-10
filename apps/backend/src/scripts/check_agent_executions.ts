
import { prisma } from '../lib/prisma';

async function main() {
  const executionId = 'd60d5c35-eea0-4412-83da-cc2461cfe49f';
  
  console.log(`Checking related executions and messages for ${executionId}...`);
  const agentExecutions = await prisma.agentExecution.findMany({
    where: { 
        executionContext: { 
            path: ['executionId'], 
            equals: executionId 
        } 
    }
  });
  console.log('Agent Executions:', agentExecutions.map(e => ({ id: e.id, status: e.status })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
