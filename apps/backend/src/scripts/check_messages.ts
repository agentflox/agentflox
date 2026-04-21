import { prisma } from '@agentflox/database';

async function main() {
  const user1 = 'cmkjfbxs80000w51sxw3y4qpm'; // Tien Dat
  const user2 = 'cmkdvej3n0000w57cnvfjud6o'; // Nguyen Dat
  
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    }
  });
  
  console.log(`Messages between Tien Dat and Nguyen Dat: ${messages.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
