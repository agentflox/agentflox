
import { prisma } from '../lib/prisma';

async function main() {
  const executionId = 'd60d5c35-eea0-4412-83da-cc2461cfe49f';
  
  console.log(`Checking messages for execution ${executionId}...`);
  const messages = await prisma.aiMessage.findMany({
    where: { 
        metadata: { 
            path: ['executionId'], 
            equals: executionId 
        } 
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('Messages:', JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
