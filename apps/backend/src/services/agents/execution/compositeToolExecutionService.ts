import { prisma } from '@/lib/prisma';
import { CodeExecutorService } from './codeExecutor';
import { executeApiIntegrationTool } from './apiIntegrationExecutor';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { collectArtifactsFromStepResults } from '../artifacts/executionArtifact';
import {
  getModelBySlug,
  invokeWithModel,
} from '@/services/models';

/**
 * Step types as produced by both the Flow Builder and AI Builder.
 * The Flow builder stores: PYTHON, JAVASCRIPT, LLM, API, SYSTEM_TOOL, LOOP, BRANCH
 * Old legacy types (transform_python etc.) are also supported for backwards compat.
 */
export type StepType =
  | 'PYTHON' | 'JAVASCRIPT' | 'LLM' | 'API' | 'SYSTEM_TOOL' | 'LOOP' | 'BRANCH'
  | 'RUN_CHAIN' | 'IMAGE'
  | 'transform_python' | 'transform_javascript' | 'transform_llm' | 'transform_api';

export interface CompositeToolStep {
  id: string;
  /** varName is how other steps reference this step's output: params.{varName} */
  varName?: string;
  name: string;
  type: StepType | string;
  config: any;
  /** Relevance AI: output variable aliases e.g. { transformed: "{{transformed}}", stdout: "{{stdout}}" } */
  output?: Record<string, string>;
  /** Relevance AI: run this step for each item in an array expression e.g. "{{steps.prev.items}}" */
  foreach?: string;
}

export interface CompositeExecutionResult {
  success: boolean;
  output: any;
  steps: Record<string, any>;
  error?: string;
  artifacts?: any[];
}

export class CompositeToolExecutionService {
  private readonly codeExecutor = new CodeExecutorService();

  async execute(
    toolId: string,
    input: any,
    userId: string,
    onProgress?: (event: { type: 'thinking' | 'token' | 'complete' | 'error'; content: string; metadata?: any }) => void,
    options?: { startStepId?: string; endStepId?: string },
  ): Promise<CompositeExecutionResult> {
    const tool = await prisma.compositeTool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new Error(`Composite tool ${toolId} not found`);
    }

    const allSteps = (tool.steps as unknown as CompositeToolStep[]) || [];
    const steps = sliceSteps(allSteps, options?.startStepId, options?.endStepId);

    // stepResults keyed by step id, varName, and name — accessed via context.steps.*
    const stepResults: Record<string, any> = {};

    // params starts as the tool input (field-by-field), and grows with each step result
    // so Python code can do: params.get('pdf_file_url') OR params.get('step1_result')
    const params: Record<string, any> = { ...(input ?? {}) };

    // Full execution context
    const runId = uuidv4();
    const context: Record<string, any> = {
      input,
      inputs: input,
      params,
      steps: stepResults,
      userId,
      toolId,
      runId,
    };

    onProgress?.({ type: 'thinking', content: `Starting composite tool execution: ${tool.name}` });

    try {
      let stepIndex = 1;
      for (const step of steps) {
        onProgress?.({
          type: 'thinking',
          content: `Executing step: ${step.name || step.id} (${step.type})`,
          metadata: { stepId: step.id },
        });

        // Execute the step, respecting foreach (loop) if present
        let result: any;
        const foreachExpr: string | undefined = (step as any).foreach;
        if (foreachExpr && foreachExpr.trim()) {
          // Resolve the array to iterate over
          const arrPath = foreachExpr.trim().replace(/^\{\{|\}\}$/g, '').trim();
          const arr = arrPath.split('.').reduce((obj: any, k: string) => obj?.[k], context);
          if (Array.isArray(arr)) {
            const results: any[] = [];
            for (const item of arr) {
              const itemParams = { ...params, each: item };
              const itemResult = await this.executeOneStep(step, { ...context, each: item }, itemParams, userId);
              results.push(itemResult);
            }
            result = results;
          } else {
            result = await this.executeOneStep(step, context, params, userId);
          }
        } else {
          result = await this.executeOneStep(step, context, params, userId);
        }

        // Build all aliases for this step's result
        // In our format: step.varName is set (e.g. "extract_text")
        // In Relevance AI format: step.name is the short id (e.g. "python")
        const identifier = step.varName || this.safeIdentifier(step.name) || step.id;
        const positionalAlias = `step_${stepIndex}`;

        // Build a Relevance AI-compatible output object using the step's output mapping
        // e.g. { transformed: {{transformed}}, stdout: {{stdout}} } → resolved against raw result
        let storedResult = result;
        const outputMap = (step as any).output;
        if (outputMap && typeof outputMap === 'object' && result && typeof result === 'object') {
          // The step result IS the context for resolving output aliases
          const stepCtx = result;
          storedResult = {};
          for (const [outKey] of Object.entries(outputMap)) {
            // For Python/JS: transformed=result value, stdout/stderr from result object
            storedResult[outKey] = stepCtx[outKey] ?? result;
          }
          // Also always expose the raw result as 'transformed' for compat
          if (!storedResult.transformed) storedResult.transformed = result;
        } else if (result && typeof result === 'object' && !Array.isArray(result) && !('transformed' in result)) {
          // Wrap plain objects in Relevance AI output shape for {{step.transformed}} compat
          storedResult = { transformed: result, ...result };
        }

        // Store in stepResults (accessible via steps.{varName} in variable expressions)
        if (step.id) stepResults[step.id] = storedResult;
        stepResults[identifier] = storedResult;
        stepResults[positionalAlias] = storedResult;

        // Merge step result into params so subsequent steps can access via params.{varName}
        params[identifier] = storedResult;
        params[positionalAlias] = storedResult;
        // Flat spread: params.{identifier}_{key} for nested field access
        if (storedResult && typeof storedResult === 'object' && !Array.isArray(storedResult)) {
          for (const [key, val] of Object.entries(storedResult)) {
            params[`${identifier}_${key}`] = val;
            // Also spread one level deeper for transformed.{field} access
            if (key === 'transformed' && val && typeof val === 'object' && !Array.isArray(val)) {
              for (const [tf, tv] of Object.entries(val as object)) {
                params[`${identifier}_${tf}`] = tv;
              }
            }
          }
        }

        // Keep context in sync
        context[identifier] = storedResult;
        if (step.id) context[step.id] = storedResult;
        context[positionalAlias] = storedResult;

        stepIndex++;

        onProgress?.({
          type: 'thinking',
          content: `Step ${step.name || step.id} completed`,
          metadata: { stepId: step.id, result },
        });
      }

      // ── Build final output ──────────────────────────────────────────────
      const schema = tool.functionSchema as any;
      const outputMode: string = schema?.['x-outputMode'] ?? 'last_step';
      const returnProps = schema?.returns?.properties ?? {};

      let finalOutput: any;

      if (outputMode === 'manual' && Object.keys(returnProps).length > 0) {
        finalOutput = {};
        for (const [key, fieldSchema] of Object.entries(returnProps) as [string, any][]) {
          const expr: string | undefined = fieldSchema?.['x-expression'];
          if (expr) {
            const path = expr.trim().replace(/^\{\{|\}\}$/g, '').trim();
            const resolved = path.split('.').reduce((obj: any, k: string) => obj?.[k], context);
            finalOutput[key] = resolved !== undefined ? resolved : null;
          } else {
            finalOutput[key] = null;
          }
        }
      } else {
        finalOutput = stepResults[steps[steps.length - 1]?.id] ?? null;
      }

      const artifacts = collectArtifactsFromStepResults(stepResults, { finalOutput });

      onProgress?.({
        type: 'complete',
        content: typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput, null, 2),
        metadata: { result: finalOutput, artifacts },
      });

      return { success: true, output: finalOutput, steps: stepResults, artifacts };
    } catch (err: any) {
      logger.error(`Composite tool execution failed: ${err.message}`, { toolId, userId });
      const { toUserFacingError } = await import('@/services/models');
      const facing = toUserFacingError(err);
      onProgress?.({ type: 'error', content: facing.message, metadata: { code: facing.code, kind: facing.kind } });
      return { success: false, output: null, steps: stepResults, error: facing.message };
    }
  }

  public async executeOneStep(
    step: CompositeToolStep,
    context: Record<string, any>,
    params: Record<string, any>,
    userId: string
  ): Promise<any> {
    // Support our format (type: 'PYTHON') AND Relevance AI format (transformation: 'python_code_transformation')
    const rawType = step.type || (step as any).transformation || '';
    const type = rawType.toString().toUpperCase()
      // Explicit Relevance AI transformation IDs (must come before generic replacements)
      .replace('PYTHON_CODE_TRANSFORMATION', 'PYTHON')
      .replace('JS_CODE_TRANSFORMATION', 'JAVASCRIPT')
      .replace('JAVASCRIPT_CODE_TRANSFORMATION', 'JAVASCRIPT')
      .replace('PROMPT_COMPLETION', 'LLM')
      .replace('API_CALL', 'API')
      .replace('RUN_CHAIN', 'RUN_CHAIN')
      .replace('IMAGE_FM', 'IMAGE')
      // Legacy our-format prefixes
      .replace('TRANSFORM_', '')
      .replace('_TRANSFORMATION', '')
      .replace('_CODE', '')
      .replace('_CALL', '')
      .trim();

    switch (type) {
      case 'LLM':
        return await this.executeLlmStep(step, context, userId);
      case 'PYTHON':
        return await this.executePythonStep(step, context, params, userId);
      case 'JAVASCRIPT':
      case 'JS':
        return await this.executeJavascriptStep(step, context, params, userId);
      case 'API':
        return await this.executeApiStep(step, context, userId);
      case 'SYSTEM_TOOL':
        return await this.executeSystemToolStep(step, context, userId);
      case 'RUN_CHAIN':
        return await this.executeRunChainStep(step, context, params, userId);
      case 'LOOP':
        return await this.executeLoopStep(step, context, params, userId);
      case 'BRANCH':
        return await this.executeBranchStep(step, context, params, userId);
      case 'IMAGE':
        logger.warn(`IMAGE step type is not yet fully supported, returning stub for step ${step.name}`);
        return { image_url: null, status: 'stub' };
      default:
        logger.warn(`Unknown step type "${step.type || (step as any).transformation}", skipping step ${step.name || step.id}`);
        return null;
    }
  }

  private safeIdentifier(name?: string): string {
    if (!name) return '';
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  }

  private resolveVariables(text: string, context: any): string {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{(.*?)\}\}/g, (_, path) => {
      const value = path.trim().split('.').reduce((obj: any, key: string) => obj?.[key], context);
      return value !== undefined
        ? typeof value === 'object' ? JSON.stringify(value) : String(value)
        : `{{${path}}}`;
    });
  }

  private async executeLlmStep(step: CompositeToolStep, context: any, userId: string) {
    // Support both our format (config.*) and Relevance AI format (params.*)
    const cfg = step.config || (step as any).params || {};
    const {
      prompt,
      systemPrompt,
      model: modelSlugOrId = 'gpt-4o-mini',
      modelId: explicitModelId,
      temperature = 0.7,
      maxTokens = 1000,
    } = cfg;
    const resolvedPrompt = this.resolveVariables(prompt || '', context);

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: this.resolveVariables(systemPrompt, context) });
    }
    messages.push({ role: 'user', content: resolvedPrompt });

    let modelId: string | undefined = explicitModelId;
    if (!modelId && typeof modelSlugOrId === 'string') {
      // Prefer catalog id; fall back to slug lookup for legacy step configs
      const byId = await prisma.aiModel.findUnique({ where: { id: modelSlugOrId } }).catch(() => null);
      if (byId) {
        modelId = byId.id;
      } else {
        const bySlug = await getModelBySlug(modelSlugOrId, false);
        modelId = bySlug?.id;
      }
    }

    const result = await invokeWithModel({
      resolve: { modelId, userId },
      messages,
      options: { temperature, maxTokens },
      usageContext: { action: 'GENERATE', metadata: { stepId: step.id, stepType: 'LLM' } },
      userName: 'System',
    });

    return result.content;
  }

  /**
   * Executes a PYTHON step.
   *
   * The generated code uses:
   *   - params          — dict with all tool inputs + all prior step outputs (by varName)
   *   - steps           — dict keyed by step varName with full result objects
   *   - Helper("name")  — platform helper (file_to_text, serper, firecrawl, …)
   *   - LLM("model")    — built-in LLM caller
   *   - result = {...}  — the return value (must assign to `result`, not `return`)
   *
   * NOTE: The AI builder generates `return results` at the end. We rewrite that to
   * `result = results` before execution so the wrapper can capture it.
   */
  private async executePythonStep(
    step: CompositeToolStep,
    context: any,
    params: Record<string, any>,
    userId: string
  ) {
    // Support both our format (config.code) and Relevance AI format (params.code)
    const cfg = step.config || (step as any).params || {};
    const rawCode: string = cfg.code || '';

    // Rewrite `return <expr>` (top-level) → `result = <expr>` so the wrapper captures it
    const code = rawCode.replace(/^(\s*)return\s+(.+)$/gm, '$1result = $2');
    const advancedSettings = this.normalizeAdvancedSettings(cfg);

    const result = await this.codeExecutor.execute(
      { kind: 'PYTHON', code, advancedSettings },
      params,              // ← the merged params dict (inputs + prior step outputs)
      context.steps ?? {}, // ← step results keyed by varName
      {
        executionDepth: 0,
        userId,
        toolId: context.toolId,
        runId: context.runId,
        traceId: context.runId || `composite-${step.id}`,
        advancedSettings,
      },
      {
        runStep: async () => ({}),
        promptCompletion: async (p: string) => {
          const { invokeWithModel } = await import('@/services/models');
          const result = await invokeWithModel({
            resolve: { modelId: null, userId },
            messages: [{ role: 'user', content: p }],
            options: { temperature: 0.2, maxTokens: 2048 },
            usageContext: { agentId: undefined, action: 'GENERATE', metadata: { source: 'python_step_llm' } },
          });
          return result.content || '';
        },
      }
    );

    if (!result.success) {
      throw new Error(`Python step "${step.name}" failed: ${result.error?.message || 'Unknown error'}`);
    }

    if (result.logs?.length) {
      logger.info(`[Python logs for ${step.name}]`, { logs: result.logs });
    }

    return result.result;
  }

  private async executeJavascriptStep(
    step: CompositeToolStep,
    context: any,
    params: Record<string, any>,
    userId: string
  ) {
    // Support both our format (config.code) and Relevance AI format (params.code)
    const cfg = step.config || (step as any).params || {};
    const rawCode: string = cfg.code || '';
    const code = rawCode.replace(/^(\s*)return\s+(.+)$/gm, '$1result = $2');
    const advancedSettings = this.normalizeAdvancedSettings(cfg);

    const result = await this.codeExecutor.execute(
      { kind: 'JAVASCRIPT', code, advancedSettings },
      params,
      context.steps ?? {},
      {
        executionDepth: 0,
        userId,
        toolId: context.toolId,
        runId: context.runId,
        traceId: context.runId || `composite-${step.id}`,
        advancedSettings,
      },
      {
        runStep: async () => ({}),
        promptCompletion: async (p: string) => {
          const result = await invokeWithModel({
            resolve: { modelId: null, userId },
            messages: [{ role: 'user', content: p }],
            options: { temperature: 0.2, maxTokens: 2048 },
            usageContext: { action: 'GENERATE', metadata: { source: 'js_step_llm' } },
          });
          return result.content || '';
        },
      }
    );

    if (!result.success) {
      throw new Error(`JavaScript step "${step.name}" failed: ${result.error?.message || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Normalize step config into the advancedSettings shape expected by CodeExecutorService.
   * Accepts both ToolCodeView field names and flow-builder aliases (memory/timeout/fallback).
   */
  private normalizeAdvancedSettings(cfg: any): NonNullable<import('./codeExecutor').CodeStepConfig['advancedSettings']> {
    const backendRaw = String(cfg?.backend || cfg?.runtime || 'local').toLowerCase();
    const backend: 'modal' | 'daytona' | 'local' =
      backendRaw === 'modal' || backendRaw.includes('modal')
        ? 'modal'
        : backendRaw === 'daytona'
          ? 'daytona'
          : 'local';

    return {
      backend,
      packages: Array.isArray(cfg?.packages) ? cfg.packages.filter((p: any) => typeof p === 'string' && p.trim()) : [],
      runtimeCommands: Array.isArray(cfg?.runtimeCommands)
        ? cfg.runtimeCommands.filter((c: any) => typeof c === 'string' && c.trim())
        : [],
      sessionId: typeof cfg?.sessionId === 'string' ? cfg.sessionId : undefined,
      longOutput: Boolean(cfg?.longOutput),
      gpus: Number(cfg?.gpus ?? 0) || 0,
      cpus: Number(cfg?.cpus ?? 1) || 1,
      memorySize: Number(cfg?.memorySize ?? cfg?.memory ?? 512) || 512,
      sessionTimeout: Number(cfg?.sessionTimeout ?? cfg?.timeout ?? 600) || 600,
      raiseError: (['traceback', 'error', 'stderr'].includes(cfg?.raiseError) ? cfg.raiseError : 'traceback') as
        | 'traceback'
        | 'error'
        | 'stderr',
      enableFallback: cfg?.enableFallback ?? cfg?.fallback ?? true,
    };
  }

  private async executeApiStep(step: CompositeToolStep, context: any, userId: string) {
    // Support both our format (config.*) and Relevance AI format (params.*)
    const cfg = step.config || (step as any).params || {};
    const { method, url, headers, query, body } = cfg;

    const resolvedUrl = this.resolveVariables(url, context);
    const resolvedHeaders: Record<string, string> = {};
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        resolvedHeaders[k] = this.resolveVariables(v as string, context);
      }
    }

    let resolvedBody = body;
    if (typeof body === 'string') {
      resolvedBody = this.resolveVariables(body, context);
    } else if (body && typeof body === 'object') {
      resolvedBody = JSON.parse(this.resolveVariables(JSON.stringify(body), context));
    }

    const result = await executeApiIntegrationTool(
      'httpRequest',
      { method, url: resolvedUrl, headers: resolvedHeaders, query, body: resolvedBody },
      userId
    );

    return result.body;
  }

  private async executeSystemToolStep(step: CompositeToolStep, context: any, userId: string) {
    // Support both our format (config.*) and Relevance AI format (params.*)
    const cfg = step.config || (step as any).params || {};
    const { toolId, input } = cfg;
    if (!toolId) throw new Error(`Missing toolId for SYSTEM_TOOL step "${step.name}"`);

    let parameters: any = {};
    if (typeof input === 'object' && input !== null) {
      parameters = JSON.parse(this.resolveVariables(JSON.stringify(input), context));
    } else if (typeof input === 'string') {
      try {
        parameters = JSON.parse(this.resolveVariables(input, context));
      } catch { }
    }

    const { executeTool } = await import('../core/toolExecutor');
    const { getAllToolsSync } = await import('../registry/toolRegistry');
    const tools = getAllToolsSync();
    const toolDef = tools.find((t: any) => t.id === toolId || t.name === toolId);

    if (!toolDef) {
      throw new Error(`System tool not found: ${toolId}`);
    }

    const res = await executeTool({ toolName: toolDef.name, parameters }, userId);
    if (!res.success) throw new Error(`System tool error: ${res.error}`);
    return res.result;
  }

  private async executeRunChainStep(step: CompositeToolStep, context: any, params: any, userId: string) {
    const cfg = step.config || (step as any).params || {};
    // In Relevance AI, run_chain refers to another studio by ID in studio_id or project
    // But since this is a complex nested call, for now we will just log a warning and return stub
    logger.warn(`RUN_CHAIN step type is not yet fully supported (attempting to run sub-tool ${cfg.studio_id}). Returning stub.`);
    return { output: 'RUN_CHAIN not fully implemented yet' };
  }

  private async executeLoopStep(step: CompositeToolStep, context: any, params: any, userId: string) {
    logger.warn(`LOOP step type is not fully supported except via 'foreach' arrays. Returning stub.`);
    return { status: 'LOOP stub' };
  }

  private async executeBranchStep(step: CompositeToolStep, context: any, params: any, userId: string) {
    logger.warn(`BRANCH step type is not fully supported. Returning stub.`);
    return { status: 'BRANCH stub' };
  }
}

/**
 * Slice the step pipeline for partial runs.
 * - startStepId: begin at this step (inclusive); steps before are skipped
 * - endStepId: stop after this step (inclusive)
 */
export function sliceSteps<T extends { id: string }>(
  steps: T[],
  startStepId?: string,
  endStepId?: string,
): T[] {
  if (!steps.length) return steps;
  let startIdx = 0;
  let endIdx = steps.length - 1;
  if (startStepId) {
    const i = steps.findIndex((s) => s.id === startStepId);
    if (i >= 0) startIdx = i;
  }
  if (endStepId) {
    const i = steps.findIndex((s) => s.id === endStepId);
    if (i >= 0) endIdx = i;
  }
  if (startIdx > endIdx) return [];
  return steps.slice(startIdx, endIdx + 1);
}

export const compositeToolExecutionService = new CompositeToolExecutionService();
