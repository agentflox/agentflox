import { getJson, setJson } from "@/lib/redis";

const CACHE_ENABLED = Boolean(
  process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL
);

export async function cachedQuery<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  if (CACHE_ENABLED) {
    try {
      const cached = await getJson<T>(key);
      if (cached !== null) return cached;
    } catch {
      // Redis unavailable — fall through to DB
    }
  }

  const fresh = await fetcher();
  if (fresh === null) return null;

  if (CACHE_ENABLED) {
    try {
      await setJson(key, fresh, ttlSeconds);
    } catch {
      // Ignore cache write failures
    }
  }

  return fresh;
}

export function trpcCacheKey(parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(":");
}

export async function invalidateCacheKey(key: string): Promise<void> {
  if (!CACHE_ENABLED) return;
  try {
    const { redis } = await import("@/lib/redis");
    await redis.del(key);
  } catch {
    // Ignore
  }
}
