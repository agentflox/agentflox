import { prisma } from '@agentflox/database';

async function main() {
  const connectionCount = await prisma.connection.count();
  const acceptedCount = await prisma.connection.count({ where: { status: 'ACCEPTED' } });
  const pendingCount = await prisma.connection.count({ where: { status: 'PENDING' } });
  
  console.log('--- Connection Stats ---');
  console.log('Total Connections:', connectionCount);
  console.log('ACCEPTED:', acceptedCount);
  console.log('PENDING:', pendingCount);
  
  const sample = await prisma.connection.findMany({
    take: 5,
    include: {
      requester: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } }
    }
  });
  
  console.log('\n--- Sample Connections ---');
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
