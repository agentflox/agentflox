import { redis } from '@/lib/redis';

export async function setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
        await redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
        await redis.set(key, serialized);
    }
}

export async function getJson<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    try {
        return JSON.parse(data) as T;
    } catch {
        return null;
    }
}
