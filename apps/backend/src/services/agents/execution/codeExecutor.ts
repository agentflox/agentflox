import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import * as vm from 'node:vm';
import logger from '@/lib/logger';
import { buildPythonSdkPreamble } from '@/services/platformHelpers/sandbox/pythonSdkTemplate';

let ivm: any;
async function initIvm() {
  if (ivm !== undefined) return;
  try {
    ivm = await import('isolated-vm');
  } catch (e) {
    ivm = null;
    console.warn('[CodeExecutor] isolated-vm not available, falling back to node:vm. SECURITY WARNING: Reduced isolation.');
  }
}

export interface CodeExecutionResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: {
    type: 'SYNTAX' | 'RUNTIME' | 'TIMEOUT' | 'SECURITY' | 'TYPE_MISMATCH' | 'LOG_OVERFLOW';
    message: string;
    line?: number;
  };
}

export interface CodeStepConfig {
  kind: 'PYTHON' | 'JAVASCRIPT';
  code: string;
  outputFields?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  /** Advanced Settings matches Relevance AI */
  advancedSettings?: {
    backend?: 'modal' | 'daytona' | 'local';
    packages?: string[];
    runtimeCommands?: string[];
    sessionId?: string;
    longOutput?: boolean;
    gpus?: number;
    cpus?: number;
    memorySize?: number; // in MB
    sessionTimeout?: number; // in seconds
    raiseError?: 'traceback' | 'error' | 'stderr';
    enableFallback?: boolean;
  };
}

export class CodeExecutorService {
  private readonly JS_TIMEOUT = 5000;
  private readonly PYTHON_TIMEOUT = 30000;
  private readonly MAX_LOG_LINES = 1000;
  private readonly MAX_LOG_BYTES = 64 * 1024;

  /**
   * Main entry point for executing code steps.
   */
  async execute(
    config: CodeStepConfig,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: {
      executionDepth: number;
      userId: string;
      traceId: string;
      toolId?: string;
      runId?: string;
      advancedSettings?: any;
    },
    helpers: {
      runStep: (stepId: string, input: any) => Promise<any>;
      promptCompletion: (prompt: string) => Promise<string>;
    }
  ): Promise<CodeExecutionResult> {
    if (config.kind === 'JAVASCRIPT') {
      return this.executeJavascript(config.code, params, steps, context, helpers);
    } else {
      return this.executePython(config.code, params, steps, context, helpers);
    }
  }

  /**
   * Routes JS execution through the bounded Piscina thread pool.
   * This offloads CPU-heavy isolated-vm work OFF the main event loop so the
   * Inngest HTTP handler stays responsive even under concurrent JS executions.
   * Falls back to inline isolated-vm if the pool is unavailable (unit tests,
   * local dev without a compiled worker file).
   */
  private async executeJavascript(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    // Try the Piscina pool first (production path)
    try {
      const { runJsInPool } = await import('@/lib/jsWorkerPool');
      return await runJsInPool({
        code,
        params,
        steps,
        advancedSettings: context?.advancedSettings,
        helperContext: {
          userId: context?.userId,
          runId: context?.runId || context?.traceId,
          toolId: context?.toolId,
        },
      });
    } catch (poolErr: any) {
      // Pool unavailable (e.g. compiled worker file missing in dev) — fallback
      logger.warn('[CodeExecutor] JS worker pool unavailable, falling back to inline isolated-vm', { error: poolErr?.message });
      await initIvm();
      if (ivm && process.env.USE_GVISOR !== 'true') {
        return this.executeJavascriptIsolated(code, params, steps, context, helpers);
      }
      return this.executeJavascriptDocker(code, params, steps, context, helpers);
    }
  }

  private async executeJavascriptIsolated(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const logs: string[] = [];
    let logSize = 0;
    let logOverflow = false;

    try {
      const ctx = await isolate.createContext();
      const jail = ctx.global;

      await jail.set('params', new ivm.ExternalCopy(params).copyInto());
      await jail.set('steps', new ivm.ExternalCopy(steps).copyInto());

      await jail.set('console', new ivm.Reference({
        log: (...args: any[]) => {
          if (logOverflow) return;
          const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          if (logs.length >= this.MAX_LOG_LINES || logSize + line.length > this.MAX_LOG_BYTES) {
            logOverflow = true;
            logs.push('--- LOG LIMIT EXCEEDED ---');
            return;
          }
          logs.push(line);
          logSize += line.length;
        }
      }));

      const { callPlatformHelper } = await import('@/services/platformHelpers');
      const { buildJsSdkPreamble } = await import('@/services/platformHelpers/sandbox/jsSdkTemplate');
      const helperCtx = {
        userId: context?.userId,
        runId: context?.runId || context?.traceId,
        toolId: context?.toolId,
      };

      await jail.set('_platformHelperCall', new ivm.Reference(async (name: string, args: any) => {
        return await callPlatformHelper(name, args || {}, helperCtx);
      }));
      await jail.set('prompt_completion', new ivm.Reference(async (prompt: string) => {
        return await helpers.promptCompletion(prompt);
      }));
      await jail.set('run_step', new ivm.Reference(async (stepId: string, input: any) => {
        if (context.executionDepth >= 5) throw new Error('Recursion depth exceeded');
        return await helpers.runStep(stepId, input);
      }));

      const helperStub = buildJsSdkPreamble({ asyncAwait: true });
      const fullCode = `(async () => { ${helperStub}\n${code} })()`;
      const script = await isolate.compileScript(fullCode);
      const timeoutMs = (context?.advancedSettings?.sessionTimeout || (this.JS_TIMEOUT / 1000)) * 1000;
      const result = await script.run(ctx, { timeout: timeoutMs });

      const finalResult = result instanceof ivm.Reference ? await result.copy() : result;

      return {
        success: true,
        result: finalResult,
        logs,
        error: logOverflow ? { type: 'LOG_OVERFLOW', message: 'Logs truncated' } : undefined
      };
    } catch (err: any) {
      return { success: false, logs, error: { type: 'RUNTIME', message: err.message } };
    } finally {
      isolate.dispose();
    }
  }

  private async executeJavascriptDocker(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    const runId = uuidv4();
    const workDir = path.join(os.tmpdir(), `agent-js-${runId}`);
    const logs: string[] = [];
    let logSize = 0;
    let logOverflow = false;

    try {
      await fs.mkdir(workDir, { recursive: true });

      // Rewrite top-level `return x` to `result = x` so the wrapper captures it
      const normalizedCode = code.replace(/^(\s*)return\s+(.+)$/gm, '$1result = $2');
      const { buildJsSdkPreamble } = await import('@/services/platformHelpers/sandbox/jsSdkTemplate');
      const { startHelperBridge } = await import('@/services/platformHelpers');
      const helperCtx = {
        userId: context?.userId || 'anonymous',
        runId: context?.runId || context?.traceId || runId,
        toolId: context?.toolId,
      };
      const bridge = await startHelperBridge({ ctx: helperCtx });

      const wrapperScript = `
const params = ${JSON.stringify(params)};
const steps = ${JSON.stringify(steps)};
globalThis.__helperFetch = async (name, args) => {
  const bridge = process.env.HELPER_BRIDGE_URL || '';
  const token = process.env.HELPER_BRIDGE_TOKEN || '';
  if (!bridge) {
    return { __helper: name, __input: args, status: 'error', error: 'Helper bridge not configured', text: '', tables: [] };
  }
  const res = await fetch(bridge, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ name, args: args || {} }),
  });
  return res.json();
};
${buildJsSdkPreamble({ asyncAwait: true })}

// ── User code ──
(async () => {
  let result;
  try {
    ${normalizedCode}

    if (typeof result !== 'undefined') {
      console.log('---RESULT_START---');
      console.log(JSON.stringify(result));
      console.log('---RESULT_END---');
    }
  } catch (err) {
    console.error(JSON.stringify({ __error: err.message, __type: 'RUNTIME' }));
    process.exit(1);
  }
})();
`;

      const scriptPath = path.join(workDir, 'run.js');
      await fs.writeFile(scriptPath, wrapperScript);

      const useGvisor = process.env.USE_GVISOR === 'true';
      const cpus = context?.advancedSettings?.cpus?.toString() || '1.0';
      const memory = context?.advancedSettings?.memorySize ? `${context.advancedSettings.memorySize}m` : '256m';
      const bridgePort = new URL(bridge.url).port;
      const dockerHelperUrl = `http://host.docker.internal:${bridgePort}/helper`;

      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'bridge',
        '--add-host', 'host.docker.internal:host-gateway',
        '--memory', memory,
        '--cpus', cpus,
        '-e', `HELPER_BRIDGE_URL=${dockerHelperUrl}`,
        '-e', `HELPER_BRIDGE_TOKEN=${bridge.token}`,
        '-v', `${workDir}:/app`,
        '-w', '/app',
      ];
      if (useGvisor) {
        dockerArgs.push('--runtime=runsc');
      }
      dockerArgs.push('node:18-slim', 'node', 'run.js');

      const timeoutMs = (context?.advancedSettings?.sessionTimeout || (this.JS_TIMEOUT / 1000)) * 1000;

      try {
        return await new Promise<CodeExecutionResult>((resolve) => {
        const js = spawn('docker', dockerArgs, {
          timeout: timeoutMs,
        });

        let resultFound = false;
        let resultData = '';
        let stdoutBuffer = '';

        js.stdout.on('data', (data) => {
          if (logOverflow) return;
          const chunk = data.toString();
          stdoutBuffer += chunk;

          if (logs.length >= this.MAX_LOG_LINES || logSize + chunk.length > this.MAX_LOG_BYTES) {
            logOverflow = true;
            logs.push('--- LOG LIMIT EXCEEDED ---');
          }
          logSize += chunk.length;
        });

        js.stderr.on('data', (data) => {
          const chunk = data.toString();
          logs.push(`stderr: ${chunk}`);
          logSize += chunk.length;
        });

        js.on('close', (code) => {
          const lines = stdoutBuffer.split('\n');
          let insideResult = false;

          for (const line of lines) {
            if (line.trim() === '---RESULT_START---') {
              insideResult = true;
              continue;
            }
            if (line.trim() === '---RESULT_END---') {
              insideResult = false;
              resultFound = true;
              continue;
            }
            if (insideResult) {
              resultData += line;
            } else if (line.trim() !== '') {
              logs.push(line.trim());
            }
          }

          if (code !== 0) {
            const errLine = logs.find(l => l.includes('__error') && l.includes('__type'));
            if (errLine) {
              try {
                const parsed = JSON.parse(errLine.replace('stderr: ', ''));
                resolve({
                  success: false,
                  logs,
                  error: { type: parsed.__type || 'RUNTIME', message: parsed.__error }
                });
                return;
              } catch (e) { }
            }
            resolve({
              success: false,
              logs,
              error: { type: 'RUNTIME', message: `Process exited with code ${code}` }
            });
            return;
          }

          let parsedResult = undefined;
          if (resultFound) {
            try {
              parsedResult = JSON.parse(resultData);
            } catch (e) {
              logs.push(`Failed to parse result JSON: ${resultData}`);
            }
          }

          resolve({
            success: true,
            result: parsedResult,
            logs,
            error: logOverflow ? { type: 'LOG_OVERFLOW', message: 'Logs truncated' } : undefined
          });
        });

        js.on('error', (err) => {
          resolve({
            success: false,
            logs,
            error: { type: 'RUNTIME', message: err.message }
          });
        });
      });
      } finally {
        await bridge.close().catch(() => { });
      }
    } catch (error: any) {
      return { success: false, logs, error: { type: 'RUNTIME', message: error.message } };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
    }
  }

  /**
   * Executes Python using child_process.spawn into a restricted environment.
   */
  private async executePython(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    const backend = context?.advancedSettings?.backend || 'local';
    const enableFallback = context?.advancedSettings?.enableFallback !== false;

    if (backend === 'modal') {
      const result = await this.executePythonModal(code, params, steps, context, helpers);
      if (result.success || !enableFallback) return result;
      logger.warn('[CodeExecutor] Modal execution failed, falling back to local execution', {
        error: result.error?.message,
      });
    }
    if (backend === 'daytona') {
      const result = await this.executePythonDaytona(code, params, steps, context, helpers);
      if (result.success || !enableFallback) return result;
      logger.warn('[CodeExecutor] Daytona execution failed, falling back to local execution', {
        error: result.error?.message,
      });
    }
    return this.executePythonDocker(code, params, steps, context, helpers);
  }

  private async executePythonModal(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    try {
      const modalEndpoint = process.env.MODAL_PYTHON_EXEC_URL;
      if (!modalEndpoint) {
        throw new Error("Modal execution endpoint not configured. Set MODAL_PYTHON_EXEC_URL.");
      }

      const advanced = context?.advancedSettings || {};
      const runId = context?.runId || context?.traceId || uuidv4();
      const helperCtx = this.helperContextFrom(context, runId);
      const { mintScopedHelperToken } = await import('@/services/platformHelpers');
      const helperBridgeUrl = this.resolvePublicHelperCallUrl();
      const helperBridgeToken = helperBridgeUrl
        ? mintScopedHelperToken(helperCtx, advanced.sessionTimeout || 900)
        : '';

      const response = await fetch(modalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MODAL_AUTH_TOKEN || ''}`
        },
        body: JSON.stringify({
          code,
          params,
          steps,
          packages: advanced.packages || [],
          runtimeCommands: advanced.runtimeCommands || [],
          sessionId: advanced.sessionId,
          gpus: advanced.gpus,
          cpus: advanced.cpus,
          memorySize: advanced.memorySize,
          sessionTimeout: advanced.sessionTimeout,
          advancedSettings: advanced,
          helperBridgeUrl: helperBridgeUrl || undefined,
          helperBridgeToken: helperBridgeToken || undefined,
        })
      });

      if (!response.ok) {
        throw new Error(`Modal execution failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.success,
        result: data.result,
        logs: data.logs || [],
        error: data.error
      };
    } catch (err: any) {
      return { success: false, logs: [], error: { type: 'RUNTIME', message: err.message } };
    }
  }

  private async executePythonDaytona(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    try {
      const daytonaApi = process.env.DAYTONA_API_URL;
      if (!daytonaApi) {
        throw new Error("Daytona API URL not configured. Set DAYTONA_API_URL.");
      }

      const advanced = context?.advancedSettings || {};
      const response = await fetch(`${daytonaApi}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DAYTONA_API_KEY || ''}`
        },
        body: JSON.stringify({
          language: 'python',
          code,
          packages: advanced.packages || [],
          runtimeCommands: advanced.runtimeCommands || [],
          sessionId: advanced.sessionId,
          gpus: advanced.gpus,
          cpus: advanced.cpus,
          memorySize: advanced.memorySize,
          sessionTimeout: advanced.sessionTimeout,
          env: {
            PARAMS_JSON: JSON.stringify(params),
            STEPS_JSON: JSON.stringify(steps)
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Daytona execution failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.success,
        result: data.result,
        logs: data.logs || [],
        error: data.error
      };
    } catch (err: any) {
      return { success: false, logs: [], error: { type: 'RUNTIME', message: err.message } };
    }
  }

  /**
   * Escape a shell argument for use inside double-quoted bash strings.
   */
  private shellQuote(value: string): string {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  private dockerAvailableCache: boolean | null = null;

  private async isDockerAvailable(): Promise<boolean> {
    if (this.dockerAvailableCache !== null) return this.dockerAvailableCache;
    if (process.env.FORCE_NATIVE_PYTHON === 'true') {
      this.dockerAvailableCache = false;
      return false;
    }

    this.dockerAvailableCache = await new Promise<boolean>((resolve) => {
      const probe = spawn('docker', ['version', '--format', '{{.Server.Version}}'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      const timer = setTimeout(() => {
        probe.kill();
        resolve(false);
      }, 2500);
      probe.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
      probe.on('close', (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });

    if (!this.dockerAvailableCache) {
      logger.warn('[CodeExecutor] Docker not available — using host Python for local execution');
    }
    return this.dockerAvailableCache;
  }

  private async resolveHostPython(): Promise<string> {
    const candidates = process.platform === 'win32'
      ? ['python', 'py', 'python3']
      : ['python3', 'python'];

    for (const cmd of candidates) {
      const ok = await new Promise<boolean>((resolve) => {
        const args = cmd === 'py' ? ['-3', '--version'] : ['--version'];
        const probe = spawn(cmd, args, { stdio: 'ignore', windowsHide: true });
        probe.on('error', () => resolve(false));
        probe.on('close', (code) => resolve(code === 0));
      });
      if (ok) return cmd;
    }
    throw new Error(
      'Neither Docker nor a host Python interpreter was found. Install Docker Desktop or Python 3, then retry.'
    );
  }

  private parsePythonProcessOutput(
    exitCode: number | null,
    stdoutBuffer: string,
    logs: string[],
    logOverflow: boolean,
  ): CodeExecutionResult {
    const lines = stdoutBuffer.split('\n');
    let insideResult = false;
    let resultFound = false;
    let resultData = '';

    for (const line of lines) {
      if (line.trim() === '---RESULT_START---') {
        insideResult = true;
        continue;
      }
      if (line.trim() === '---RESULT_END---') {
        insideResult = false;
        resultFound = true;
        continue;
      }
      if (insideResult) {
        resultData += line;
      } else if (line.trim() !== '') {
        logs.push(line.trim());
      }
    }

    if (exitCode !== 0) {
      const errLine = logs.find((l) => l.includes('__error') && l.includes('__type'));
      if (errLine) {
        try {
          const parsed = JSON.parse(errLine.replace('stderr: ', ''));
          return {
            success: false,
            logs,
            error: { type: parsed.__type || 'RUNTIME', message: parsed.__error },
          };
        } catch {
          // ignore
        }
      }
      return {
        success: false,
        logs,
        error: { type: 'RUNTIME', message: `Process exited with code ${exitCode}` },
      };
    }

    let parsedResult = undefined;
    if (resultFound) {
      try {
        parsedResult = JSON.parse(resultData);
      } catch {
        logs.push(`Failed to parse result JSON: ${resultData}`);
      }
    }

    return {
      success: true,
      result: parsedResult,
      logs,
      error: logOverflow ? { type: 'LOG_OVERFLOW', message: 'Logs truncated' } : undefined,
    };
  }

  private runSpawnedProcess(
    command: string,
    args: string[],
    options: { cwd?: string; timeoutMs: number; env?: NodeJS.ProcessEnv },
    logs: string[],
    maxLogLines: number,
    maxLogBytes: number,
  ): Promise<{ exitCode: number | null; stdoutBuffer: string; logOverflow: boolean }> {
    return new Promise((resolve) => {
      let logSize = 0;
      let logOverflow = false;
      let stdoutBuffer = '';

      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeoutMs,
        windowsHide: true,
        shell: false,
      });

      child.stdout.on('data', (data) => {
        if (logOverflow) return;
        const chunk = data.toString();
        stdoutBuffer += chunk;
        if (logs.length >= maxLogLines || logSize + chunk.length > maxLogBytes) {
          logOverflow = true;
          logs.push('--- LOG LIMIT EXCEEDED ---');
        }
        logSize += chunk.length;
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        logs.push(`stderr: ${chunk}`);
        logSize += chunk.length;
      });

      child.on('close', (code) => {
        resolve({ exitCode: code, stdoutBuffer, logOverflow });
      });

      child.on('error', (err) => {
        logs.push(`stderr: ${err.message}`);
        resolve({ exitCode: 1, stdoutBuffer, logOverflow });
      });
    });
  }

  private buildPythonWrapper(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    advanced: any,
  ): string {
    const normalizedCode = code.replace(/^(\s*)return\s+(.+)$/gm, '$1result = $2');
    return [
      buildPythonSdkPreamble(),
      `params = ${JSON.stringify(params)}`,
      `steps = ${JSON.stringify(steps)}`,
      '',
      'def main():',
      '    _captured_result = None',
      '    try:',
      normalizedCode.split('\n').map(line => '        ' + line).join('\n'),
      '        try:',
      "            _captured_result = locals().get('result')",
      '        except:',
      '            pass',
      '        if _captured_result is not None:',
      "            print('---RESULT_START---')",
      '            print(json.dumps(_captured_result, default=str))',
      "            print('---RESULT_END---')",
      '    except Exception as e:',
      '        import traceback',
      `        raise_error = "${advanced.raiseError || 'traceback'}"`,
      "        if raise_error == 'error':",
      '            error_msg = str(e)',
      "        elif raise_error == 'stderr':",
      "            print(json.dumps({'__error': traceback.format_exc(), '__type': 'RUNTIME'}), file=sys.stderr)",
      '            sys.exit(0)',
      '        else:',
      '            error_msg = traceback.format_exc()',
      "        print(json.dumps({'__error': error_msg, '__type': 'RUNTIME'}), file=sys.stderr)",
      '        sys.exit(1)',
      '',
      "if __name__ == '__main__':",
      '    main()',
      '',
    ].join('\n');
  }

  private resolvePublicHelperCallUrl(): string | null {
    const base = (
      process.env.HELPER_PUBLIC_BASE_URL ||
      process.env.BACKEND_PUBLIC_URL ||
      process.env.API_BASE_URL ||
      ''
    ).replace(/\/$/, '');
    if (!base) return null;
    return `${base}/v1/internal/helpers/call`;
  }

  private helperContextFrom(context: any, fallbackRunId: string) {
    return {
      userId: context?.userId || 'anonymous',
      runId: context?.runId || context?.traceId || fallbackRunId,
      toolId: context?.toolId,
    };
  }

  private async executePythonDocker(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    const runId = uuidv4();
    const workDir = path.join(os.tmpdir(), `agent-python-${runId}`);
    const logs: string[] = [];
    const advanced = context?.advancedSettings || {};
    const packages: string[] = Array.isArray(advanced.packages)
      ? advanced.packages.filter((p: any) => typeof p === 'string' && p.trim())
      : [];
    const runtimeCommands: string[] = Array.isArray(advanced.runtimeCommands)
      ? advanced.runtimeCommands.filter((c: any) => typeof c === 'string' && c.trim())
      : [];
    const needsSetup = packages.length > 0 || runtimeCommands.length > 0;
    const maxLogLines = advanced.longOutput ? this.MAX_LOG_LINES * 10 : this.MAX_LOG_LINES;
    const maxLogBytes = advanced.longOutput ? this.MAX_LOG_BYTES * 10 : this.MAX_LOG_BYTES;
    const timeoutMs = (advanced.sessionTimeout || (this.PYTHON_TIMEOUT / 1000)) * 1000;
    const useDocker = await this.isDockerAvailable();

    const { startHelperBridge } = await import('@/services/platformHelpers');
    const bridge = await startHelperBridge({
      ctx: this.helperContextFrom(context, runId),
    });

    try {
      await fs.mkdir(workDir, { recursive: true });
      const wrapperScript = this.buildPythonWrapper(code, params, steps, advanced);
      await fs.writeFile(path.join(workDir, 'run.py'), wrapperScript);

      const helperEnv = {
        ...process.env,
        HELPER_BRIDGE_URL: bridge.url,
        HELPER_BRIDGE_TOKEN: bridge.token,
      };

      if (!useDocker) {
        const pythonCmd = await this.resolveHostPython();
        logs.push(`[local] Running with host Python (${pythonCmd}) — Docker not found`);
        logs.push(`[local] Helper bridge ready at ${bridge.url}`);

        for (const cmd of runtimeCommands) {
          const trimmed = cmd.trim();
          if (!trimmed) continue;
          logs.push(`[setup] $ ${trimmed}`);
          const setup = await this.runSpawnedProcess(
            process.platform === 'win32' ? 'cmd.exe' : 'bash',
            process.platform === 'win32' ? ['/c', trimmed] : ['-lc', trimmed],
            { cwd: workDir, timeoutMs, env: helperEnv },
            logs,
            maxLogLines,
            maxLogBytes,
          );
          if (setup.exitCode !== 0) {
            return {
              success: false,
              logs,
              error: { type: 'RUNTIME', message: `Runtime command failed: ${trimmed}` },
            };
          }
        }

        if (packages.length > 0) {
          logs.push(`[setup] Installing packages: ${packages.join(', ')}`);
          const pipArgs = pythonCmd === 'py'
            ? ['-3', '-m', 'pip', 'install', '--no-cache-dir', ...packages.map((p) => p.trim())]
            : ['-m', 'pip', 'install', '--no-cache-dir', ...packages.map((p) => p.trim())];
          const pip = await this.runSpawnedProcess(
            pythonCmd,
            pipArgs,
            { cwd: workDir, timeoutMs, env: helperEnv },
            logs,
            maxLogLines,
            maxLogBytes,
          );
          if (pip.exitCode !== 0) {
            return {
              success: false,
              logs,
              error: { type: 'RUNTIME', message: `pip install failed for: ${packages.join(', ')}` },
            };
          }
        }

        const runArgs = pythonCmd === 'py' ? ['-3', 'run.py'] : ['run.py'];
        const ran = await this.runSpawnedProcess(
          pythonCmd,
          runArgs,
          { cwd: workDir, timeoutMs, env: helperEnv },
          logs,
          maxLogLines,
          maxLogBytes,
        );
        return this.parsePythonProcessOutput(ran.exitCode, ran.stdoutBuffer, logs, ran.logOverflow);
      }

      let entryCommand: string[] = ['python3', 'run.py'];
      if (needsSetup) {
        const setupLines = [
          '#!/bin/bash',
          'set -euo pipefail',
          'echo "[setup] Starting runtime setup..."',
          ...runtimeCommands.map((cmd) => {
            const trimmed = cmd.trim();
            return `echo "[setup] $ ${trimmed.replace(/"/g, '\\"')}"\n${trimmed}`;
          }),
          ...(packages.length > 0
            ? [
                'echo "[setup] Installing Python packages..."',
                `pip install --no-cache-dir ${packages.map((p) => this.shellQuote(p.trim())).join(' ')}`,
              ]
            : []),
          'echo "[setup] Setup complete. Running user code..."',
          'python3 run.py',
        ];
        await fs.writeFile(path.join(workDir, 'setup.sh'), setupLines.join('\n') + '\n', { mode: 0o755 });
        entryCommand = ['bash', 'setup.sh'];
      }

      const useGvisor = process.env.USE_GVISOR === 'true';
      const cpus = advanced.cpus?.toString() || '1.0';
      const memory = advanced.memorySize ? `${advanced.memorySize}m` : '256m';
      const bridgePort = new URL(bridge.url).port;
      // Containers must reach the host helper bridge
      const dockerHelperUrl = `http://host.docker.internal:${bridgePort}/helper`;
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'bridge',
        '--add-host', 'host.docker.internal:host-gateway',
        '--memory', memory,
        '--cpus', cpus,
        '-e', `HELPER_BRIDGE_URL=${dockerHelperUrl}`,
        '-e', `HELPER_BRIDGE_TOKEN=${bridge.token}`,
        '-v', `${workDir}:/app`,
        '-w', '/app',
      ];
      if (useGvisor) dockerArgs.push('--runtime=runsc');
      dockerArgs.push('python:3.9-slim', ...entryCommand);

      const ran = await this.runSpawnedProcess(
        'docker',
        dockerArgs,
        { timeoutMs },
        logs,
        maxLogLines,
        maxLogBytes,
      );
      return this.parsePythonProcessOutput(ran.exitCode, ran.stdoutBuffer, logs, ran.logOverflow);
    } catch (error: any) {
      return { success: false, logs, error: { type: 'RUNTIME', message: error.message } };
    } finally {
      await bridge.close().catch(() => { });
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
    }
  }
}
