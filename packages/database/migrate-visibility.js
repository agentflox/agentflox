const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'src', 'generated', 'prisma', 'client'));
const prisma = new PrismaClient();

async function run() {
  console.log("Converting templates...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "templates" ALTER COLUMN "visibility" DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "templates" 
      ALTER COLUMN "visibility" 
      TYPE "TemplateVisibility" 
      USING CASE 
        WHEN "visibility"::text IN ('MEMBERS', 'OWNERS_ADMINS', 'OWNERS_ONLY') THEN 'WORKSPACE'::"TemplateVisibility"
        WHEN "visibility"::text = 'PUBLIC' THEN 'PUBLIC'::"TemplateVisibility"
        ELSE 'PRIVATE'::"TemplateVisibility"
      END;
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "templates" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';`);
  } catch (e) {
    if (e.message.includes('does not exist')) {
       console.log('Visibility column not present on templates; it will be created by push anyway.');
    } else {
       throw e;
    }
  }

  console.log("Done database enumeration conversions!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
