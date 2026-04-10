import { prisma } from './index';

async function main() {
    const userId = 'cmkdvej3n0000w57cnvfjud6o';
    const workspace = await (prisma as any).workspace.findFirst({
        where: { ownerId: userId }
    });
    console.log(JSON.stringify(workspace, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
