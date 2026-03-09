import { kv } from '@vercel/kv'

export const redis = kv

export async function getJson<T>(key: string): Promise<T | null> {
  const value = await redis.get(key)
  if (!value) {
    return null
  }
  // Handle case where value might already be an object (from previous incorrect storage)
  if (typeof value === 'object' && value !== null) {
    return value as T
  }
  // Handle case where value is a string that needs parsing
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Failed to parse redis key ${key}`, error)
      // If parsing fails, try to delete the corrupted key
      await redis.del(key)
      return null
    }
  }
  return null
}

export async function setJson<T>(key: string, value: T, ttlSeconds?: number) {
  const payload = JSON.stringify(value)
  if (typeof ttlSeconds === 'number') {
    await redis.set(key, payload, { ex: ttlSeconds })
  } else {
    await redis.set(key, payload)
  }
}

