import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * Derive a stable bigint advisory-lock key from integration scope.
 * Uses SHA-256 and takes the first 8 bytes as a signed bigint.
 */
export function integrationAdvisoryLockKey(parts: string[]): bigint {
  const hash = createHash('sha256').update(parts.join(':')).digest();
  return hash.readBigInt64BE(0);
}

/**
 * Run fn inside a Postgres transaction advisory lock (fail-closed on DB errors).
 */
export async function withIntegrationAdvisoryLock<T>(
  lockKey: bigint,
  fn: () => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
    return fn();
  });
}
