/**
 * JS Execution Worker Thread
 *
 * This file runs inside a Piscina worker_thread — completely isolated from
 * the main Node.js event loop and the Inngest HTTP handler.
 *
 * It receives a serialised task, executes the JS code inside isolated-vm,
 * and returns the result.  Heavy CPU work stays confined to this thread so
 * it never blocks HTTP traffic on the main thread.
 */

import type { CodeExecutionResult } from '../services/agents/execution/codeExecutor';
import { callPlatformHelper } from '../services/platformHelpers';
import { buildJsSdkPreamble } from '../services/platformHelpers/sandbox/jsSdkTemplate';

export interface JsWorkerTask {
  code: string;
  params: Record<string, any>;
  steps: Record<string, any>;
  /** Advanced settings forwarded from the step config */
  advancedSettings?: {
    sessionTimeout?: number; // seconds
    cpus?: number;
    memorySize?: number;
  };
  helperContext?: {
    userId?: string;
    runId?: string;
    toolId?: string;
  };
}

// ── Main worker function (called by Piscina) ─────────────────────────────────
export default async function executeJs(task: JsWorkerTask): Promise<CodeExecutionResult> {
  const logs: string[] = [];
  const helperCtx = task.helperContext || {};
  const sdkPreamble = buildJsSdkPreamble({ asyncAwait: true });

  // Lazy-load isolated-vm inside the worker thread
  let ivm: any;
  try {
    ivm = await import('isolated-vm');
  } catch {
    ivm = null;
  }

  // Rewrite top-level `return x` → `result = x`
  const normalizedCode = task.code.replace(/^(\s*)return\s+(.+)$/gm, '$1result = $2');

  const timeoutMs =
    task.advancedSettings?.sessionTimeout
      ? task.advancedSettings.sessionTimeout * 1000
      : 30_000;

  if (!ivm) {
    // Fallback: node:vm (reduced isolation, dev/test only)
    const { Script } = await import('node:vm');
    const ctx: any = {
      params: task.params,
      steps: task.steps,
      result: undefined,
      console: {
        log: (...args: any[]) => logs.push(args.join(' ')),
        warn: (...args: any[]) => logs.push('[warn] ' + args.join(' ')),
        error: (...args: any[]) => logs.push('[error] ' + args.join(' ')),
      },
      _platformHelperCall: async (name: string, args: any) =>
        callPlatformHelper(name, args || {}, helperCtx),
    };
    try {
      const script = new Script(`(async () => { ${sdkPreamble}\nlet result;\n${normalizedCode}\nreturn result; })()`);
      const result = await script.runInNewContext(ctx, { timeout: timeoutMs });
      return { success: true, result, logs };
    } catch (err: any) {
      return { success: false, logs, error: { type: 'RUNTIME', message: err.message } };
    }
  }

  // Production path: isolated-vm
  const isolate = new ivm.Isolate({ memoryLimit: task.advancedSettings?.memorySize ?? 256 });
  try {
    const ctx = await isolate.createContext();
    const jail = ctx.global;
    await jail.set('global', jail.derefInto());

    // Capture console.log from inside the isolate
    await jail.set('_logLine', new ivm.Reference((line: string) => {
      logs.push(line);
    }));
    await jail.set('_platformHelperCall', new ivm.Reference(async (name: string, args: any) => {
      return await callPlatformHelper(name, args || {}, helperCtx);
    }));
    await ctx.eval(`
      const console = {
        log:   (...a) => _logLine.applySync(undefined, a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
        warn:  (...a) => _logLine.applySync(undefined, '[warn] ' + a.join(' ')),
        error: (...a) => _logLine.applySync(undefined, '[error] ' + a.join(' ')),
      };
    `);

    const fullCode = `(async () => {
      const params = ${JSON.stringify(task.params)};
      const steps  = ${JSON.stringify(task.steps)};
      ${sdkPreamble}
      let result;
      ${normalizedCode}
      return result;
    })()`;

    const script = await isolate.compileScript(fullCode);
    const rawResult = await script.run(ctx, { timeout: timeoutMs });
    const result = rawResult instanceof ivm.Reference ? await rawResult.copy() : rawResult;

    return { success: true, result, logs };
  } catch (err: any) {
    if (err.message?.includes('Script execution timed out')) {
      return { success: false, logs, error: { type: 'TIMEOUT', message: `Execution timed out after ${timeoutMs}ms` } };
    }
    return { success: false, logs, error: { type: 'RUNTIME', message: err.message } };
  } finally {
    isolate.dispose();
  }
}
