
import { prisma } from "../apps/frontend/src/lib/prisma";

async function main() {
  try {
    const list = await prisma.list.findFirst({
      where: {
        locationType: "PERSONAL" as any,
        createdBy: "test" as any,
      }
    });
    console.log("Success! Prisma Client can see the fields.");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
