/**
 * jsWorkerPool.ts
 *
 * A bounded Piscina thread pool for CPU-intensive JS execution via isolated-vm.
 *
 * Pool sizing:
 *   - CPU-bound work (isolated-vm) should be capped at roughly N = vCPU count,
 *     not N = vCPU × 2, to avoid context-switching overhead.
 *   - We read the real vCPU count from os.cpus() and default to 1 on small
 *     Render instances (Free / Starter). Tune via JS_WORKER_THREADS env var.
 *   - maxQueue = 'auto' lets Piscina queue excess tasks rather than throwing.
 *
 * Usage:
 *   import { jsWorkerPool } from '@/lib/jsWorkerPool';
 *   const result = await jsWorkerPool.run(task);
 */

import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import Piscina from 'piscina';
import type { JsWorkerTask } from '../workers/jsExecutionWorker';
import type { CodeExecutionResult } from '../services/agents/execution/codeExecutor';

const vCPUs = os.cpus().length;
// CPU-bound work: start at 1× vCPU, tune up if latency data shows headroom
const threadCount = parseInt(process.env.JS_WORKER_THREADS ?? String(vCPUs), 10);

// Resolve the compiled worker script path at runtime.
// In production (tsc build):  dist/lib/ → ../workers/jsExecutionWorker.js
// In development (tsx watch):  src/lib/ → ../workers/jsExecutionWorker.ts
//   tsx supports loading .ts worker files natively when the process uses tsx.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerExt = __dirname.includes('dist') ? '.js' : '.ts';
const workerPath = path.resolve(__dirname, `../workers/jsExecutionWorker${workerExt}`);

export const jsWorkerPool = new Piscina({
  filename: workerPath,
  maxThreads: threadCount,
  minThreads: 1,
  maxQueue: 'auto',         // queue excess tasks; never throw on overload
  idleTimeout: 30_000,      // reclaim idle threads after 30s
  // In dev tsx mode, propagate the tsx loader to worker threads
  ...(workerExt === '.ts'
    ? { execArgv: ['--import', 'tsx'] }
    : {}),
});

/**
 * Run a JS code snippet inside the bounded pool.
 * Returns CodeExecutionResult so callers can use the same interface as
 * the inline isolated-vm path.
 */
export async function runJsInPool(task: JsWorkerTask): Promise<CodeExecutionResult> {
  return jsWorkerPool.run(task) as Promise<CodeExecutionResult>;
}
