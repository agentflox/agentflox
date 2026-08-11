import logger from '@/lib/logger';
import { getHelperDefinition } from './registry';
import { withTimeout, getDefaultHelperTimeoutMs } from './policy/timeouts';
import type { HelperArgs, HelperContext, HelperResult } from './types';

/**
 * Dispatch a platform helper by name with timeout + registry metadata.
 */
export async function callPlatformHelper(
  name: string,
  args: HelperArgs = {},
  ctx: HelperContext = {},
): Promise<HelperResult> {
  const key = String(name || '').trim();
  if (!key) {
    return { status: 'error', error: 'Helper name is required' };
  }

  const def = getHelperDefinition(key);
  if (!def) {
    return {
      status: 'error',
      error: `Unknown helper: ${name}`,
      __helper: name,
      __input: args,
    };
  }

  const timeoutMs = def.timeoutMs || getDefaultHelperTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await withTimeout(
      def.handler(args || {}, ctx, controller.signal),
      timeoutMs,
      `Helper(${def.name})`,
    );
    return result;
  } catch (err: any) {
    const message = err?.name === 'AbortError'
      ? `Helper timed out after ${timeoutMs}ms`
      : err?.message || `Helper(${def.name}) failed`;
    logger.warn('[PlatformHelpers] call failed', { name: def.name, error: message, runId: ctx.runId });
    return { status: 'error', error: message, __helper: def.name };
  } finally {
    clearTimeout(timer);
  }
}
