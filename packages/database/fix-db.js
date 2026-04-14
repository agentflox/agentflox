const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'src', 'generated', 'prisma', 'client'));
const prisma = new PrismaClient();
async function run() {
  await prisma.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name = '20240218130000_add_agent_skills'");
  console.log('Deleted successfully!');
}
run().finally(() => prisma.$disconnect());
