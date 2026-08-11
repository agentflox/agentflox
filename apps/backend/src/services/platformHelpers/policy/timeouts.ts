export function getDefaultHelperTimeoutMs(): number {
  const n = Number(process.env.HELPER_DEFAULT_TIMEOUT_MS || 30_000);
  return Number.isFinite(n) && n > 0 ? n : 30_000;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'Helper',
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
