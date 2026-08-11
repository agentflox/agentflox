import { createServer, type Server } from 'http';
import logger from '@/lib/logger';
import { callPlatformHelper } from '../dispatch';
import {
  bearerFromAuthHeader,
  mintScopedHelperToken,
  verifyScopedHelperToken,
} from '../security/scopedToken';
import type { HelperContext } from '../types';

export interface HelperBridge {
  url: string;
  token: string;
  close: () => Promise<void>;
}

export interface StartHelperBridgeOptions {
  ctx: HelperContext;
  /** Token TTL seconds (default 900) */
  ttlSeconds?: number;
}

/**
 * Ephemeral localhost HTTP bridge so sandboxed Python can call real Helpers.
 * Auth: scoped per-run Bearer token (userId + runId + exp).
 */
export async function startHelperBridge(opts: StartHelperBridgeOptions): Promise<HelperBridge> {
  const { ctx, ttlSeconds = 900 } = opts;
  if (!ctx.userId || !ctx.runId) {
    throw new Error('Helper bridge requires userId and runId');
  }

  const token = mintScopedHelperToken(
    { userId: ctx.userId, runId: ctx.runId, toolId: ctx.toolId },
    ttlSeconds,
  );

  const server: Server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method !== 'POST' || (req.url !== '/' && req.url !== '/helper')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const bearer = bearerFromAuthHeader(req.headers.authorization);
    try {
      if (!bearer) throw new Error('Missing bearer token');
      const claims = verifyScopedHelperToken(bearer);
      if (claims.userId !== ctx.userId || claims.runId !== ctx.runId) {
        throw new Error('Token does not match this run');
      }
    } catch (err: any) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err?.message || 'Unauthorized' }));
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const name = String(body?.name || '');
      const args = body?.args && typeof body.args === 'object' ? body.args : {};
      // LLM bridge calls use special names
      const result = await callPlatformHelper(name, args, {
        userId: ctx.userId,
        runId: ctx.runId,
        toolId: ctx.toolId,
        scopedToken: token,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err: any) {
      logger.error('[HelperBridge] call failed', { error: err?.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        error: err?.message || 'Helper bridge error',
      }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind helper bridge port');
  }

  const url = `http://127.0.0.1:${address.port}/helper`;
  logger.info('[HelperBridge] started', { url, runId: ctx.runId });

  return {
    url,
    token,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
