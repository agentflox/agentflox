import { prisma } from '@/lib/prisma';
import { CodeExecutorService } from './codeExecutor';
import { executeApiIntegrationTool } from './apiIntegrationExecutor';
import { openai } from '@/lib/openai';
import logger from '@/lib/logger';

export interface CompositeToolStep {
  id: string;
  type: 'transform_llm' | 'transform_python' | 'transform_javascript' | 'transform_api';
  name: string;
  config: any;
}

export interface CompositeExecutionResult {
  success: boolean;
  output: any;
  steps: Record<string, any>;
  error?: string;
}

export class CompositeToolExecutionService {
  private readonly codeExecutor = new CodeExecutorService();

  async execute(
    toolId: string,
    input: any,
    userId: string,
    onProgress?: (event: { type: 'thinking' | 'token' | 'complete' | 'error'; content: string; metadata?: any }) => void
  ): Promise<CompositeExecutionResult> {
    const tool = await prisma.compositeTool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new Error(`Composite tool ${toolId} not found`);
    }

    const steps = (tool.steps as unknown as CompositeToolStep[]) || [];
    const stepResults: Record<string, any> = {};
    const context: Record<string, any> = { input, inputs: input, steps: stepResults };

    onProgress?.({ type: 'thinking', content: `Starting composite tool execution: ${tool.name}` });

    try {
      let stepIndex = 1;
      for (const step of steps) {
        onProgress?.({ type: 'thinking', content: `Executing step: ${step.name} (${step.type})`, metadata: { stepId: step.id } });

        let result: any;
        result = await this.executeOneStep(step, context, userId);

        stepResults[step.id] = result;
        context[step.id] = result;

        // Alias by positional index (e.g., step_1)
        const positionalAlias = `step_${stepIndex}`;
        stepResults[positionalAlias] = result;
        context[positionalAlias] = result;

        // Alias by name and safe name
        if (step.name) {
          stepResults[step.name] = result;
          context[step.name] = result;
          const safeName = step.name.replace(/[^a-zA-Z0-9_]/g, '_');
          stepResults[safeName] = result;
          context[safeName] = result;
        }

        stepIndex++;

        // If step defines specific output mapping
        if (step.config?.outputMapping) {
          // TODO: Implement output mapping
        }

        onProgress?.({ type: 'thinking', content: `Step ${step.name} completed successfully`, metadata: { stepId: step.id, result: result } });
      }

      // ── Build final output ──────────────────────────────────────────────
      const schema = tool.functionSchema as any;
      const outputMode: string = schema?.['x-outputMode'] ?? 'last_step';
      const returnProps = schema?.returns?.properties ?? {};

      let finalOutput: any;

      if (outputMode === 'manual' && Object.keys(returnProps).length > 0) {
        // Build output object by resolving each field's x-expression
        finalOutput = {};
        for (const [key, fieldSchema] of Object.entries(returnProps) as [string, any][]) {
          const expr: string | undefined = fieldSchema?.['x-expression'];
          if (expr) {
            // Unwrap {{ … }} if present
            const path = expr.trim().replace(/^\{\{|\}\}$/g, '').trim();
            // Resolve via dot-path against context
            const resolved = path.split('.').reduce((obj: any, k: string) => obj?.[k], context);
            finalOutput[key] = resolved !== undefined ? resolved : null;
          } else {
            finalOutput[key] = null;
          }
        }
      } else {
        finalOutput = stepResults[steps[steps.length - 1]?.id] ?? null;
      }

      onProgress?.({ type: 'complete', content: typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput, null, 2), metadata: { result: finalOutput } });

      return {
        success: true,
        output: finalOutput,
        steps: stepResults,
      };
    } catch (err: any) {
      logger.error(`Composite tool execution failed: ${err.message}`, { toolId, userId });
      onProgress?.({ type: 'error', content: err.message });
      return {
        success: false,
        output: null,
        steps: stepResults,
        error: err.message,
      };
    }
  }

  public async executeOneStep(step: CompositeToolStep, context: any, userId: string): Promise<any> {
    switch (step.type) {
      case 'LLM' as any:
        return await this.executeLlmStep(step, context);
      case 'PYTHON' as any:
        return await this.executePythonStep(step, context, userId);
      case 'JAVASCRIPT' as any:
        return await this.executeJavascriptStep(step, context, userId);
      case 'API' as any:
        return await this.executeApiStep(step, context, userId);
      case 'SYSTEM_TOOL' as any:
        return await this.executeSystemToolStep(step, context, userId);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private resolveVariables(text: string, context: any): string {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{(.*?)\}\}/g, (_, path) => {
      const value = path.trim().split('.').reduce((obj: any, key: string) => obj?.[key], context);
      return value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : `{{${path}}}`;
    });
  }

  private async executeLlmStep(step: CompositeToolStep, context: any) {
    const { prompt, systemPrompt, model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 1000 } = step.config || {};
    const resolvedPrompt = this.resolveVariables(prompt || '', context);
    
    const messages: any[] = [];
    if (systemPrompt) {
      const resolvedSystemPrompt = this.resolveVariables(systemPrompt, context);
      messages.push({ role: 'system', content: resolvedSystemPrompt });
    }
    messages.push({ role: 'user', content: resolvedPrompt });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0].message.content;
  }

  private async executePythonStep(step: CompositeToolStep, context: any, userId: string) {
    const { code } = step.config || {};
    // Resolve variables in code if needed, but usually Python code fetches from `params` or `steps`
    // The current CodeExecutorService doesn't support easy variable injection into code string, 
    // but we can pass them in `params`.

    // For now, we pass the entire context as params
    const result = await this.codeExecutor.execute(
      { kind: 'PYTHON', code },
      context.input || {},
      context,
      { executionDepth: 0, userId, traceId: `composite-${step.id}` },
      {
        runStep: async () => ({}),
        promptCompletion: async (p) => {
          const c = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: p }] });
          return c.choices[0].message.content || '';
        }
      }
    );

    if (!result.success) {
      throw new Error(`Python step failed: ${result.error?.message || 'Unknown error'}`);
    }

    console.log(`[Python Logs for ${step.name}]:`, result.logs);

    return result.result;
  }

  private async executeJavascriptStep(step: CompositeToolStep, context: any, userId: string) {
    const { code } = step.config || {};
    const result = await this.codeExecutor.execute(
      { kind: 'JAVASCRIPT', code },
      context.input || {},
      context,
      { executionDepth: 0, userId, traceId: `composite-${step.id}` },
      {
        runStep: async () => ({}),
        promptCompletion: async (p) => {
          const c = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: p }] });
          return c.choices[0].message.content || '';
        }
      }
    );

    if (!result.success) {
      throw new Error(`Javascript step failed: ${result.error?.message || 'Unknown error'}`);
    }

    return result.result;
  }

  private async executeApiStep(step: CompositeToolStep, context: any, userId: string) {
    const { method, url, headers, query, body } = step.config || {};

    // Resolve variables in URL, headers, and body
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
      {
        method,
        url: resolvedUrl,
        headers: resolvedHeaders,
        query,
        body: resolvedBody,
      },
      userId
    );

    return result.body;
  }

  private async executeSystemToolStep(step: CompositeToolStep, context: any, userId: string) {
    const { toolId, input } = step.config || {};
    if (!toolId) throw new Error('Missing toolId for SYSTEM_TOOL step');

    // Parse input, resolve variables
    let parameters: any = {};
    if (typeof input === 'object' && input !== null) {
      parameters = JSON.parse(this.resolveVariables(JSON.stringify(input), context));
    } else if (typeof input === 'string') {
      try {
        parameters = JSON.parse(this.resolveVariables(input, context));
      } catch {
        // Not JSON
      }
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
}

export const compositeToolExecutionService = new CompositeToolExecutionService();
