
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Checking last 10 AiMessages...');
  const messages = await prisma.aiMessage.findMany({
    where: { 
        metadata: { 
            path: ['type'], 
            equals: 'inter-agent' 
        } 
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('Messages:', JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
