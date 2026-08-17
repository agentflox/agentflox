import { conditionGateCacheKey, relevantFieldFingerprint, type FingerprintTask } from './fingerprint';

const cache = new Map<string, { value: boolean; expires: number }>();
const TTL_MS = 5 * 60 * 1000;

export type GateResult = { pass: boolean; error?: string };

export async function evaluateConditionGate(opts: {
  prompt: string;
  task: FingerprintTask & { id: string };
  evaluator?: (prompt: string, task: FingerprintTask & { id: string }) => Promise<boolean>;
  timeoutMs?: number;
}): Promise<GateResult> {
  const fingerprint = relevantFieldFingerprint(opts.task);
  const key = conditionGateCacheKey(opts.prompt, opts.task.id, fingerprint);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return { pass: hit.value };

  const timeoutMs = opts.timeoutMs ?? 2000;
  const evaluator =
    opts.evaluator ??
    (async () => {
      throw new Error('condition_gate_unavailable');
    });

  try {
    const pass = await Promise.race([
      evaluator(opts.prompt, opts.task),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error('condition_gate_timeout')), timeoutMs);
        timer.unref?.();
      }),
    ]);
    cache.set(key, { value: pass, expires: Date.now() + TTL_MS });
    return { pass };
  } catch (err: any) {
    return { pass: false, error: err?.message || 'condition_gate_error' };
  }
}
