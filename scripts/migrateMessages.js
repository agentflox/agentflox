const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.findMany({
    where: {
      content: { startsWith: '__AF_MARKETPLACE_SUBMISSION__' },
    },
    include: {
      conversation: true,
    },
  });

  console.log(`Found ${messages.length} marketplace messages to migrate`);

  for (const msg of messages) {
    try {
      const payload = JSON.parse(
        msg.content.replace('__AF_MARKETPLACE_SUBMISSION__', '')
      );
      const listingId = payload.listing?.id;

      if (listingId && msg.conversation?.marketplaceListingId !== listingId) {
        const participants = [msg.senderId, msg.receiverId].sort();
        
        let targetConv = await prisma.conversation.findFirst({
          where: {
            participantIds: { equals: participants },
            marketplaceListingId: listingId,
          },
        });

        if (!targetConv) {
          targetConv = await prisma.conversation.create({
            data: {
              participantIds: participants,
              marketplaceListingId: listingId,
            },
          });
          console.log(`Created new conversation ${targetConv.id} for listing ${listingId}`);
        }

        await prisma.message.update({
          where: { id: msg.id },
          data: { conversationId: targetConv.id },
        });
        console.log(`Moved message ${msg.id} to conversation ${targetConv.id}`);
      }
    } catch (e) {
      console.error(`Failed to process message ${msg.id}`, e);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
