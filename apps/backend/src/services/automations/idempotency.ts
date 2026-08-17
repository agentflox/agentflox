import { prisma } from '@/lib/prisma';

export type IdempotencyStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export async function claimIdempotencyKey(key: string): Promise<
  | { claimed: true }
  | { claimed: false; status: IdempotencyStatus; result: unknown }
> {
  try {
    await prisma.automationIdempotencyKey.create({
      data: { key, status: 'PENDING' },
    });
    return { claimed: true };
  } catch {
    const existing = await prisma.automationIdempotencyKey.findUnique({ where: { key } });
    if (!existing) return { claimed: true };
    return {
      claimed: false,
      status: existing.status as IdempotencyStatus,
      result: existing.result,
    };
  }
}

export async function completeIdempotencyKey(key: string, result: unknown) {
  await prisma.automationIdempotencyKey.update({
    where: { key },
    data: { status: 'COMPLETED', result: result as object },
  });
}

export async function failIdempotencyKey(key: string, result?: unknown) {
  await prisma.automationIdempotencyKey.update({
    where: { key },
    data: { status: 'FAILED', result: (result as object) ?? undefined },
  });
}

export async function waitForIdempotency(key: string, attempts = 10): Promise<unknown | null> {
  for (let i = 0; i < attempts; i++) {
    const row = await prisma.automationIdempotencyKey.findUnique({ where: { key } });
    if (!row) return null;
    if (row.status === 'COMPLETED') return row.result;
    if (row.status === 'FAILED') return null;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}
