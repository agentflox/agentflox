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
      for (const step of steps) {
        onProgress?.({ type: 'thinking', content: `Executing step: ${step.name} (${step.type})`, metadata: { stepId: step.id } });

        let result: any;

        switch (step.type) {
          case 'LLM' as any:
            result = await this.executeLlmStep(step, context);
            break;
          case 'PYTHON' as any:
            result = await this.executePythonStep(step, context, userId);
            break;
          case 'JAVASCRIPT' as any:
            result = await this.executeJavascriptStep(step, context, userId);
            break;
          case 'API' as any:
            result = await this.executeApiStep(step, context, userId);
            break;
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        stepResults[step.id] = result;
        context[step.id] = result;

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


  private resolveVariables(text: string, context: any): string {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{(.*?)\}\}/g, (_, path) => {
      const value = path.trim().split('.').reduce((obj: any, key: string) => obj?.[key], context);
      return value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : `{{${path}}}`;
    });
  }

  private async executeLlmStep(step: CompositeToolStep, context: any) {
    const { prompt, model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 1000 } = step.config || {};
    const resolvedPrompt = this.resolveVariables(prompt, context);

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: resolvedPrompt }],
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
}

export const compositeToolExecutionService = new CompositeToolExecutionService();
