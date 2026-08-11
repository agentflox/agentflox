/**
 * toolExecutionHandlers.ts
 *
 * Socket.io event handlers for real-time tool execution log streaming.
 *
 * Security model:
 *  - Every subscription request is validated against the DB to confirm the
 *    authenticated socket user actually owns the requested runId.
 *    This prevents IDOR: User A cannot subscribe to User B's execution logs.
 *  - We use a *dedicated* Redis subscriber per socket connection to avoid
 *    cross-contaminating the shared redisSub adapter client used by socket.io.
 *  - The per-socket subscriber is destroyed on socket disconnect.
 *
 * Protocol (client → server):
 *   socket.emit('tool:subscribe-logs', { runId })
 *   → server joins room `run:{runId}` and starts forwarding logs
 *   → server emits `tool:log` events to the socket
 *   → server emits `tool:complete` or `tool:error` when done, then unsubscribes
 *
 *   socket.emit('tool:unsubscribe-logs', { runId })
 *   → server tears down the Redis subscription for that runId
 */

import type { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { prisma } from '@/lib/prisma';
import { redisPub } from '@/lib/redis';
import { getLogChannel } from '@/services/tools/toolExecutionLogService';
import type { ExecutionLogPayload } from '@/services/tools/toolExecutionLogService';
import logger from '@/lib/logger';

/** Re-use the same Redis config the rest of the app uses. */
function createDedicatedSubscriber(): Redis {
  return redisPub.duplicate();
}


/**
 * Register tool execution log streaming handlers on a socket connection.
 * Call this from the main `io.on('connection')` block alongside other handlers.
 */
export function registerToolExecutionHandlers(
  _io: Server,
  socket: Socket & { data: { userId: string } }
): void {
  // One dedicated Redis subscriber per socket — destroyed on disconnect.
  // Using a per-socket subscriber (rather than a shared global one) means:
  //  1. We can subscribe to N channels without affecting the io adapter's sub.
  //  2. Cleanup is automatic and scoped: no channel leaks across connections.
  const socketSub = createDedicatedSubscriber();
  /** runId → cleanup function map for this socket */
  const activeSubscriptions = new Map<string, () => void>();

  // ── Subscribe ───────────────────────────────────────────────────────────────
  socket.on('tool:subscribe-logs', async ({ runId }: { runId: string }) => {
    if (!runId || typeof runId !== 'string') return;
    if (activeSubscriptions.has(runId)) return; // already subscribed

    const userId = socket.data.userId;

    // ── IDOR Guard ──────────────────────────────────────────────────────────
    // Verify the run belongs to the authenticated user before subscribing.
    const executionLog = await prisma.compositeToolExecutionLog.findFirst({
      where: { id: runId, userId },
      select: { id: true, status: true, output: true },
    }).catch(() => null);

    if (!executionLog) {
      socket.emit('tool:error', {
        runId,
        message: 'Run not found or access denied',
      });
      return;
    }

    // If the run already completed (e.g. user reconnected after a pause),
    // emit a synthetic complete event immediately instead of subscribing.
    if ((executionLog.status as string) === 'SUCCESS' || (executionLog.status as string) === 'FAILED') {
      if ((executionLog.status as string) === 'FAILED') {
        socket.emit('tool:error', {
          runId,
          message: 'Run failed',
        });
      } else {
        socket.emit('tool:complete', {
          runId,
          status: executionLog.status,
          result: executionLog.output ?? null,
        });
      }
      return;
    }

    // ── Redis Pub/Sub subscription ──────────────────────────────────────────
    const channel = getLogChannel(runId);
    await socketSub.subscribe(channel);
    logger.info(`[ToolExec] Socket ${socket.id} (user ${userId}) subscribed to run ${runId}`);

    const onMessage = (_ch: string, raw: string) => {
      if (_ch !== channel) return;

      let payload: ExecutionLogPayload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      if (payload.type === 'complete') {
        socket.emit('tool:complete', {
          runId,
          result: JSON.parse(payload.content ?? 'null'),
          ...(payload.artifacts?.length ? { artifacts: payload.artifacts } : {}),
        });
        cleanup();
      } else if (payload.type === 'error') {
        socket.emit('tool:error', { runId, message: payload.content });
        cleanup();
      } else {
        // 'thinking' | 'trace' | 'token'
        socket.emit('tool:log', { runId, ...payload });
      }
    };

    socketSub.on('message', onMessage);

    const cleanup = () => {
      socketSub.removeListener('message', onMessage);
      socketSub.unsubscribe(channel).catch(() => {});
      activeSubscriptions.delete(runId);
      logger.info(`[ToolExec] Unsubscribed socket ${socket.id} from run ${runId}`);
    };

    activeSubscriptions.set(runId, cleanup);
  });

  // ── Manual unsubscribe ──────────────────────────────────────────────────────
  socket.on('tool:unsubscribe-logs', ({ runId }: { runId: string }) => {
    const cleanup = activeSubscriptions.get(runId);
    if (cleanup) cleanup();
  });

  // ── Cleanup on disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    for (const cleanup of activeSubscriptions.values()) {
      cleanup();
    }
    activeSubscriptions.clear();
    socketSub.quit().catch(() => {});
  });
}
