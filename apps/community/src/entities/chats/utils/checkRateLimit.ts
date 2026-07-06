import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

interface RateLimitConfig {
  RPM?: number; 
  RPD?: number;
}

interface RateLimitResult {
  limitPerMinute?: number;
  remainingPerMinute?: number;
  resetPerMinute?: number;
  limitPerDay?: number;
  remainingPerDay?: number;
  resetPerDay?: number;
}

async function checkRateLimit(req: Request, config: RateLimitConfig): Promise<Response | RateLimitResult> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn("KV store not configured for rate limiting");
    return {};
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const result: RateLimitResult = {};

  // --- Initialize limiters only once ---
  const minuteRatelimit = config.RPM
    ? new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(config.RPM, "1 m"),
      })
    : null;

  const dayRatelimit = config.RPD
    ? new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(config.RPD, "1 d"),
      })
    : null;

  // --- Run both in parallel ---
  const [minuteResult, dayResult] = await Promise.all([
    minuteRatelimit?.limit(`ratelimit_${ip}_minute`),
    dayRatelimit?.limit(`ratelimit_${ip}_day`),
  ]);

  // --- Collect results ---
  if (minuteResult) {
    result.limitPerMinute = minuteResult.limit;
    result.remainingPerMinute = minuteResult.remaining;
    result.resetPerMinute = minuteResult.reset;
  }
  if (dayResult) {
    result.limitPerDay = dayResult.limit;
    result.remainingPerDay = dayResult.remaining;
    result.resetPerDay = dayResult.reset;
  }

  // --- Check limits ---
  if (dayResult && !dayResult.success) {
    return new Response(
      JSON.stringify({
        error: "Daily rate limit exceeded",
        details: `You have reached your daily limit. Try again tomorrow.`,
        nextAllowedTime: new Date(dayResult.reset).toISOString(),
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  if (minuteResult && !minuteResult.success) {
    const wait = Math.ceil((minuteResult.reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Minute rate limit exceeded",
        details: `Please try again in ${wait} seconds.`,
        waitTimeInSeconds: wait,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": wait.toString(),
        },
      }
    );
  }

  return result;
}

export { checkRateLimit };
