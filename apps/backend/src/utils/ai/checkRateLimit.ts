import { redis } from '@/lib/redis'

export interface RateLimitConfig {
  RPM?: number
  RPD?: number
}

export interface RateLimitResult {
  limitPerMinute?: number
  remainingPerMinute?: number
  resetPerMinute?: number
  limitPerDay?: number
  remainingPerDay?: number
  resetPerDay?: number
}

type HeaderGetter = {
  get(name: string): string | undefined
}

export interface RateLimitRequestLike {
  headers: HeaderGetter
}

const ONE_MINUTE_MS = 60_000
const ONE_DAY_MS = 86_400_000

async function enforceLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const redisKey = `ratelimit:${key}:${windowMs}`
  const execResult = (await redis
    .multi()
    .incr(redisKey)
    .pttl(redisKey)
    .exec()) as Array<[Error | null, number]>

  const incrementResult = execResult?.[0]?.[1] ?? 0
  let ttl = execResult?.[1]?.[1] ?? -1

  if (ttl === -1) {
    await redis.pexpire(redisKey, windowMs)
    ttl = windowMs
  }

  const remaining = limit - incrementResult
  const success = incrementResult <= limit
  const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs)

  return {
    success,
    remaining: remaining > 0 ? remaining : 0,
    resetAt,
  }
}

function toRateLimitRequestLike(
  req: RateLimitRequestLike | import('express').Request
): RateLimitRequestLike {
  if (typeof (req as import('express').Request)?.get === 'function') {
    const expressReq = req as import('express').Request
    return {
      headers: {
        get: (name: string) => {
          const value = expressReq.get(name)
          if (Array.isArray(value)) return value[0]
          return value ?? undefined
        },
      },
    }
  }
  return req as RateLimitRequestLike
}

export async function checkRateLimit(
  req: RateLimitRequestLike | import('express').Request,
  config: RateLimitConfig
): Promise<Response | RateLimitResult> {
  const normalized = toRateLimitRequestLike(req)
  const ip =
    normalized.headers.get('x-forwarded-for') ||
    normalized.headers.get('x-real-ip') ||
    normalized.headers.get('cf-connecting-ip') ||
    'unknown'

  const result: RateLimitResult = {}

  const minuteResult = config.RPM
    ? await enforceLimit(`minute:${ip}`, config.RPM, ONE_MINUTE_MS)
    : null

  const dayResult = config.RPD
    ? await enforceLimit(`day:${ip}`, config.RPD, ONE_DAY_MS)
    : null

  if (minuteResult) {
    result.limitPerMinute = config.RPM
    result.remainingPerMinute = minuteResult.remaining
    result.resetPerMinute = minuteResult.resetAt
  }

  if (dayResult) {
    result.limitPerDay = config.RPD
    result.remainingPerDay = dayResult.remaining
    result.resetPerDay = dayResult.resetAt
  }

  if (dayResult && !dayResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Daily rate limit exceeded',
        details: 'You have reached your daily limit. Try again tomorrow.',
        nextAllowedTime: new Date(dayResult.resetAt).toISOString(),
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (minuteResult && !minuteResult.success) {
    const waitSeconds = Math.ceil((minuteResult.resetAt - Date.now()) / 1000)
    return new Response(
      JSON.stringify({
        error: 'Minute rate limit exceeded',
        details: `Please try again in ${waitSeconds} seconds.`,
        waitTimeInSeconds: waitSeconds,
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': waitSeconds.toString() },
      }
    )
  }

  return result
}

