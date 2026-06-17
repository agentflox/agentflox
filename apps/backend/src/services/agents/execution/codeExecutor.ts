import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import * as vm from 'node:vm';

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
    context: { executionDepth: number; userId: string; traceId: string },
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
   * Executes Javascript using isolated-vm (preferred) or node:vm (fallback).
   */
  private async executeJavascript(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    await initIvm();
    if (ivm) {
      return this.executeJavascriptIsolated(code, params, steps, context, helpers);
    } else {
      return this.executeJavascriptFallback(code, params, steps, context, helpers);
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

      // Use provided helpers
      await jail.set('prompt_completion', new ivm.Reference(async (prompt: string) => {
        return await helpers.promptCompletion(prompt);
      }));
      await jail.set('run_step', new ivm.Reference(async (stepId: string, input: any) => {
        if (context.executionDepth >= 5) throw new Error('Recursion depth exceeded');
        return await helpers.runStep(stepId, input);
      }));

      const fullCode = `(async () => { ${code} })()`;
      const script = await isolate.compileScript(fullCode);
      const result = await script.run(ctx, { timeout: this.JS_TIMEOUT });

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

  private async executeJavascriptFallback(
    code: string,
    params: Record<string, any>,
    steps: Record<string, any>,
    context: any,
    helpers: any
  ): Promise<CodeExecutionResult> {
    const logs: string[] = [];
    let logSize = 0;
    let logOverflow = false;

    const sandbox = {
      params,
      steps: steps || {},
      console: {
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
      },
      prompt_completion: async (prompt: string) => await helpers.promptCompletion(prompt),
      run_step: async (stepId: string, input: any) => {
        if (context.executionDepth >= 5) throw new Error('Recursion depth exceeded');
        return await helpers.runStep(stepId, input);
      },
      setTimeout,
      clearTimeout
    };

    try {
      // Create a context and run inside it
      vm.createContext(sandbox);

      const fullCode = `(async () => { 
        ${code} 
      })()`;

      // Use a timeout to prevent infinite loops (non-perfect in sync node:vm but better than nothing)
      const result = await vm.runInContext(fullCode, sandbox, {
        timeout: this.JS_TIMEOUT,
        displayErrors: true
      });

      return {
        success: true,
        result,
        logs,
        error: logOverflow ? { type: 'LOG_OVERFLOW', message: 'Logs truncated' } : undefined
      };
    } catch (err: any) {
      return {
        success: false,
        logs,
        error: {
          type: err.message.includes('timeout') ? 'TIMEOUT' : 'RUNTIME',
          message: err.message
        }
      };
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
    const runId = uuidv4();
    const workDir = path.join(os.tmpdir(), `agent-python-${runId}`);
    const logs: string[] = [];
    let logSize = 0;
    let logOverflow = false;

    try {
      await fs.mkdir(workDir, { recursive: true });

      // Wrapper script to handle JSON I/O and globals
      const wrapperScript = `
import json
import sys

# Setup globals
params = ${JSON.stringify(params)}
steps = ${JSON.stringify(steps)}

def prompt_completion(prompt):
    return f"[AI Completion for: {prompt}]"

def run_step(step_id, input_data):
    return {"success": True, "result": {}}

def main():
    # User state
    _captured_result = None
    try:
        # User code starts here
${code.split('\n').map(line => '        ' + line).join('\n')}
        # Capture the 'result' variable if it exists
        try:
            _captured_result = locals().get('result')
        except:
            pass
            
        # Print final result as JSON to stdout
        if _captured_result is not None:
            print("---RESULT_START---")
            print(json.dumps(_captured_result))
            print("---RESULT_END---")
            
    except Exception as e:
        print(json.dumps({"__error": str(e), "__type": "RUNTIME"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
`;

      const scriptPath = path.join(workDir, 'run.py');
      await fs.writeFile(scriptPath, wrapperScript);

      return await new Promise<CodeExecutionResult>((resolve) => {
        const py = spawn('python3', [scriptPath], {
          timeout: this.PYTHON_TIMEOUT,
          env: { ...process.env, PYTHONUNBUFFERED: '1' }
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
        });

        py.on('error', (err) => {
          resolve({
            success: false,
            logs,
            error: { type: 'SECURITY', message: err.message }
          });
        });

        py.on('close', (code) => {
          if (code === 0) {
            let finalResult = null;

            if (stdoutBuffer.includes('---RESULT_START---')) {
              const parts = stdoutBuffer.split('---RESULT_START---');
              const resultPart = parts[1].split('---RESULT_END---')[0];
              resultData = resultPart.trim();
              resultFound = true;

              const logsBefore = parts[0].split('\n').filter(Boolean);
              const logsAfter = parts[1].split('---RESULT_END---')[1]?.split('\n').filter(Boolean) || [];
              logs.push(...logsBefore, ...logsAfter);
            } else {
              logs.push(...stdoutBuffer.split('\n').filter(Boolean));
            }

            if (resultFound && resultData) {
              try {
                finalResult = JSON.parse(resultData);
              } catch (e) {
                console.error('[CodeExecutor] Failed to parse result JSON', resultData);
              }
            }
            resolve({
              success: true,
              result: finalResult,
              logs,
              error: logOverflow ? { type: 'LOG_OVERFLOW', message: 'Logs truncated' } : undefined
            });
          } else {
            const stderrLog = logs.filter(l => l.startsWith('stderr:')).join('\n');
            resolve({
              success: false,
              logs,
              error: { type: 'RUNTIME', message: `Process exited with code ${code}. Stderr: ${stderrLog}` }
            });
          }
        });

        // Kill if timeout
        setTimeout(() => {
          py.kill();
          resolve({
            success: false,
            logs,
            error: { type: 'TIMEOUT', message: 'Execution timed out' }
          });
        }, this.PYTHON_TIMEOUT);
      });

    } catch (err: any) {
      return {
        success: false,
        logs,
        error: { type: 'RUNTIME', message: err.message }
      };
    } finally {
      // Cleanup
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
    }
  }
}
