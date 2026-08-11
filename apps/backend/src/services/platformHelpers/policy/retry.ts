export async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; shouldRetry?: (err: any, attempt: number) => boolean } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 400;
  const shouldRetry =
    opts.shouldRetry ??
    ((err: any) => {
      const status = err?.status || err?.statusCode;
      if (status === 429) return true;
      if (typeof status === 'number' && status >= 500) return true;
      const msg = String(err?.message || err || '');
      return /ECONNRESET|ETIMEDOUT|ENOTFOUND|network|fetch failed/i.test(msg);
    });

  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !shouldRetry(err, attempt)) throw err;
      const jitter = Math.floor(Math.random() * 200);
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
