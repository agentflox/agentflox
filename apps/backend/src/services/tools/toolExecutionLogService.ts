/**
 * toolExecutionLogService.ts
 *
 * Thin service responsible for publishing execution logs to Redis Pub/Sub so
 * every API/Worker instance can stream them to the correct WebSocket client —
 * regardless of which Render instance the user's WebSocket is connected to.
 *
 * Channel convention: `tool:logs:{runId}`
 * Message shape:      { type, content, timestamp, stepId? }
 *
 * The Inngest function calls `publishLog()` at each trace point.
 * The Socket.io layer (toolExecutionHandlers.ts) subscribes and forwards
 * to the socket room `run:{runId}`.
 *
 * IMPORTANT: Uses `redisPub` (dedicated publish-only client), never the shared
 * `redis` client that is used for regular reads/writes.
 */

import { redisPub } from '@/lib/redis';

export type ExecutionLogType = 'thinking' | 'trace' | 'token' | 'complete' | 'error';

export interface ExecutionLogPayload {
  type: ExecutionLogType;
  content: string;
  stepId?: string;
  timestamp: string;
}

const CHANNEL_PREFIX = 'tool:logs:';
/** TTL in seconds for the log-stream existence sentinel key (auto-cleanup) */
const RUN_TTL_SECONDS = 3600; // 1 hour

/**
 * Publish a single log line for a tool execution run.
 * Safe to call from inside an Inngest function running on the worker service.
 */
export async function publishToolLog(
  runId: string,
  payload: Omit<ExecutionLogPayload, 'timestamp'>
): Promise<void> {
  const message: ExecutionLogPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  const channel = `${CHANNEL_PREFIX}${runId}`;

  // Set a sentinel key so we can check if a run exists before subscribing,
  // and auto-expire it after TTL to prevent memory leaks.
  await redisPub.set(`tool:run:${runId}`, '1', 'EX', RUN_TTL_SECONDS).catch(() => {});
  await redisPub.publish(channel, JSON.stringify(message));
}

/**
 * Mark a run as complete. Publishes a final 'complete' log and then cleans up
 * the sentinel key so clients know the stream has ended.
 */
export async function publishToolComplete(
  runId: string,
  result: any
): Promise<void> {
  await publishToolLog(runId, {
    type: 'complete',
    content: JSON.stringify(result ?? null),
  });
  // Small delay then delete sentinel — gives clients time to receive the final message
  setTimeout(() => {
    redisPub.del(`tool:run:${runId}`).catch(() => {});
  }, 5000);
}

export async function publishToolError(runId: string, message: string): Promise<void> {
  await publishToolLog(runId, { type: 'error', content: message });
  setTimeout(() => {
    redisPub.del(`tool:run:${runId}`).catch(() => {});
  }, 5000);
}

/** Channel name for a given runId — used by the subscriber. */
export function getLogChannel(runId: string): string {
  return `${CHANNEL_PREFIX}${runId}`;
}

/** Verify a run exists in Redis (sentinel key). Used for subscription IDOR guard. */
export async function runExists(runId: string): Promise<boolean> {
  const val = await redisPub.get(`tool:run:${runId}`);
  return val === '1';
}
