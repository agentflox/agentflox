import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import * as vm from 'node:vm';
import logger from '@/lib/logger';

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
    context: { executionDepth: number; userId: string; traceId: string; advancedSettings?: any },
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

      // Built-in helpers matching the Python API
      await jail.set('prompt_completion', new ivm.Reference(async (prompt: string) => {
        return await helpers.promptCompletion(prompt);
      }));
      await jail.set('run_step', new ivm.Reference(async (stepId: string, input: any) => {
        if (context.executionDepth >= 5) throw new Error('Recursion depth exceeded');
        return await helpers.runStep(stepId, input);
      }));

      // Inject Helper() and LLM() as stubs — mirroring the Python sandbox
        const helperStub = `
        function Helper(name) {
          return {
            call: (kwargs) => ({ __helper: name, __input: kwargs })
          };
        }
        class _LLMCompletions {
          constructor(model) { this._model = model; }
          create({ messages = [], ...rest } = {}) {
            const userMsg = (messages.find(m => m.role === 'user') || {}).content || '';
            return { choices: [{ message: { content: \`[LLM stub for \${this._model}: \${String(userMsg).slice(0, 80)}]\` } }], usage: { total_tokens: 0 } };
          }
        }
        class _LLMChat { constructor(model) { this.completions = new _LLMCompletions(model); } }
        function LLM(model = 'gpt-4o-mini') { return { chat: new _LLMChat(model) }; }

        const insert_data = async (dataset_id, data) => ({ success: true, dataset: dataset_id, inserted: Array.isArray(data) ? data.length : 1 });
        const retrieve_data = async (dataset_id, page_size, include_fields) => ({ success: true, dataset: dataset_id, data: [] });
        const retrieve_all = async (dataset_id, page_size, include_fields) => ([]);
        const insert_temp_file = async (file_path_or_bytes, ext) => ({ url: "https://tmp.relevance.ai/stub" });
        class Integration {
          constructor(provider, account) { this.provider = provider; this.account = account; }
          async api_call(method, url, body, headers, params) { return { __integration: this.provider, status: "stub_success" }; }
        }
      `;

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

      const wrapperScript = `
const params = ${JSON.stringify(params)};
const steps = ${JSON.stringify(steps)};

// ── Built-in globals injected by the platform ──
function Helper(name) {
  return {
    call: (kwargs) => ({ __helper: name, __input: kwargs })
  };
}

class _LLMCompletions {
  constructor(model) { this._model = model; }
  create({ messages = [], ...rest } = {}) {
    const userMsg = (messages.find(m => m.role === 'user') || {}).content || '';
    return {
      choices: [{ message: { content: \`[LLM stub for \${this._model}: \${String(userMsg).slice(0, 80)}]\` } }],
      usage: { total_tokens: 0 }
    };
  }
}
class _LLMChat { constructor(model) { this.completions = new _LLMCompletions(model); } }
function LLM(model = 'gpt-4o-mini') { return { chat: new _LLMChat(model) }; }

const prompt_completion = async (prompt) => \`[AI Completion for: \${prompt}]\`;
const run_step = async (stepId, input) => ({ success: true, result: {} });
const insert_data = async (dataset_id, data) => ({ success: true, dataset: dataset_id, inserted: Array.isArray(data) ? data.length : 1 });
const retrieve_data = async (dataset_id, page_size, include_fields) => ({ success: true, dataset: dataset_id, data: [] });
const retrieve_all = async (dataset_id, page_size, include_fields) => ([]);
const insert_temp_file = async (file_path_or_bytes, ext) => ({ url: "https://tmp.relevance.ai/stub" });
class Integration {
  constructor(provider, account) { this.provider = provider; this.account = account; }
  async api_call(method, url, body, headers, params) { return { __integration: this.provider, status: "stub_success" }; }
}

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

      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none',
        '--memory', memory,
        '--cpus', cpus,
        '-v', `${workDir}:/app`,
        '-w', '/app',
      ];
      if (useGvisor) {
        dockerArgs.push('--runtime=runsc');
      }
      dockerArgs.push('node:18-slim', 'node', 'run.js');

      const timeoutMs = (context?.advancedSettings?.sessionTimeout || (this.JS_TIMEOUT / 1000)) * 1000;

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
    
    if (backend === 'modal') {
      return this.executePythonModal(code, params, steps, context, helpers);
    }
    if (backend === 'daytona') {
      return this.executePythonDaytona(code, params, steps, context, helpers);
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
          advancedSettings: context?.advancedSettings
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

      // Daytona execution typically involves:
      // 1. Creating or getting a workspace
      // 2. Executing a script inside it
      // 3. Returning output
      const response = await fetch(`${daytonaApi}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DAYTONA_API_KEY || ''}`
        },
        body: JSON.stringify({
          language: 'python',
          code,
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
    let logSize = 0;
    let logOverflow = false;

    try {
      await fs.mkdir(workDir, { recursive: true });

      // Rewrite top-level `return x` to `result = x` so the wrapper captures it
      const normalizedCode = code.replace(/^(\s*)return\s+(.+)$/gm, '$1result = $2');

      // Wrapper script to handle JSON I/O, globals, and built-in helpers
      const wrapperScript = [
        "import json",
        "import sys",
        "import urllib.request",
        "",
        "# ── Built-in globals injected by the platform ──",
        `params = ${JSON.stringify(params)}`,
        `steps = ${JSON.stringify(steps)}`,
        "",
        "# Helper('name').call(**kwargs) — stub for platform helpers",
        "class _HelperResult:",
        "    def __init__(self, data): self._data = data",
        "    def __getitem__(self, k): return self._data[k]",
        "    def get(self, k, d=None): return self._data.get(k, d)",
        "    def __repr__(self): return repr(self._data)",
        "",
        "class _Helper:",
        "    def __init__(self, name): self._name = name",
        "    def call(self, **kwargs):",
        "        # Platform will replace this stub with real implementation",
        "        return _HelperResult({'__helper': self._name, '__input': kwargs})",
        "",
        "def Helper(name): return _Helper(name)",
        "",
        "# LLM('model').chat.completions.create(messages=[...]) — stub",
        "class _LLMCompletions:",
        "    def __init__(self, model): self._model = model",
        "    def create(self, messages=None, **kwargs):",
        "        user_msg = next((m['content'] for m in (messages or []) if m.get('role') == 'user'), '')",
        "        return {'choices': [{'message': {'content': f'[LLM stub for {self._model}: {user_msg[:80]}]'}}], 'usage': {'total_tokens': 0}}",
        "",
        "class _LLMChat:",
        "    def __init__(self, model): self.completions = _LLMCompletions(model)",
        "",
        "class _LLM:",
        "    def __init__(self, model): self.chat = _LLMChat(model)",
        "",
        "def LLM(model='gpt-4o-mini'): return _LLM(model)",
        "",
        "def prompt_completion(prompt): return f'[AI Completion for: {prompt}]'",
        "def run_step(step_id, input_data): return {'success': True, 'result': {}}",
        "def insert_data(dataset_id, data): return {'success': True, 'dataset': dataset_id, 'inserted': len(data) if isinstance(data, list) else 1}",
        "def retrieve_data(dataset_id, page_size=None, include_fields=None): return {'success': True, 'dataset': dataset_id, 'data': []}",
        "def retrieve_all(dataset_id, page_size=1000, include_fields=None): return []",
        "def insert_temp_file(file_path_or_bytes, ext=None): return {'url': 'https://tmp.relevance.ai/stub'}",
        "",
        "class Integration:",
        "    def __init__(self, provider, account):",
        "        self.provider = provider",
        "        self.account = account",
        "    def api_call(self, method, url, body=None, headers=None, params=None):",
        "        return {'__integration': self.provider, 'status': 'stub_success'}",
        "",
        "# ── User code ──",
        "def main():",
        "    _captured_result = None",
        "    try:",
        normalizedCode.split('\n').map(line => '        ' + line).join('\n'),
        "        try:",
        "            _captured_result = locals().get('result')",
        "        except:",
        "            pass",
        "        if _captured_result is not None:",
        "            print('---RESULT_START---')",
        "            print(json.dumps(_captured_result, default=str))",
        "            print('---RESULT_END---')",
        "    except Exception as e:",
        "        import traceback",
        `        raise_error = "${context?.advancedSettings?.raiseError || 'traceback'}"`,
        "        if raise_error == 'error':",
        "            error_msg = str(e)",
        "        elif raise_error == 'stderr':",
        "            print(json.dumps({'__error': traceback.format_exc(), '__type': 'RUNTIME'}), file=sys.stderr)",
        "            sys.exit(0) # Exit cleanly because it's printed to stderr",
        "        else:",
        "            error_msg = traceback.format_exc()",
        "        print(json.dumps({'__error': error_msg, '__type': 'RUNTIME'}), file=sys.stderr)",
        "        sys.exit(1)",
        "",
        "if __name__ == '__main__':",
        "    main()",
        ""
      ].join("\n");

      const scriptPath = path.join(workDir, 'run.py');
      await fs.writeFile(scriptPath, wrapperScript);

      const useGvisor = process.env.USE_GVISOR === 'true';
      const cpus = context?.advancedSettings?.cpus?.toString() || '1.0';
      const memory = context?.advancedSettings?.memorySize ? `${context.advancedSettings.memorySize}m` : '256m';
      
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none',
        '--memory', memory,
        '--cpus', cpus,
        '-v', `${workDir}:/app`,
        '-w', '/app',
      ];
      if (useGvisor) {
        dockerArgs.push('--runtime=runsc');
      }
      dockerArgs.push('python:3.9-slim', 'python3', 'run.py');

      const timeoutMs = (context?.advancedSettings?.sessionTimeout || (this.PYTHON_TIMEOUT / 1000)) * 1000;

      return await new Promise<CodeExecutionResult>((resolve) => {
        const py = spawn('docker', dockerArgs, {
          timeout: timeoutMs,
        });

        let resultFound = false;
        let resultData = '';
        let stdoutBuffer = '';

        py.stdout.on('data', (data) => {
          if (logOverflow) return;
          const chunk = data.toString();
          stdoutBuffer += chunk;
          if (logs.length >= this.MAX_LOG_LINES || logSize + chunk.length > this.MAX_LOG_BYTES) {
            logOverflow = true;
            logs.push('--- LOG LIMIT EXCEEDED ---');
          }
          logSize += chunk.length;
        });

        py.stderr.on('data', (data) => {
          const chunk = data.toString();
          logs.push(`stderr: ${chunk}`);
          logSize += chunk.length;
        });

        py.on('close', (code) => {
          // Parse stdoutBuffer for result
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
              // Add non-result stdout to logs
              logs.push(line.trim());
            }
          }

          if (code !== 0) {
            // Check if we captured a structured error
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
              } catch (e) {
                // Ignore parse error
              }
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

        py.on('error', (err) => {
          resolve({
            success: false,
            logs,
            error: { type: 'RUNTIME', message: err.message }
          });
        });
      });
    } catch (error: any) {
      return { success: false, logs, error: { type: 'RUNTIME', message: error.message } };
    } finally {
      // Cleanup
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
    }
  }
}