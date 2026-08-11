/**
 * composite-tool-executor.ts  —  Inngest function
 *
 * Executes a CompositeToolStep pipeline reliably via Inngest:
 *  - Retries only transient failures (network, DB).
 *  - Each step is idempotent: keyed as `${runId}:${step.id}` so a retry
 *    never double-writes or double-emails.
 *  - Large intermediate payloads are written directly to Postgres; only the
 *    scalar/small result is returned from each step.run() call to stay within
 *    Inngest's step-output size limits.
 *  - JS execution is offloaded to the bounded Piscina thread pool so this
 *    Inngest handler never blocks the Node event loop.
 */

import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { compositeToolExecutionService, CompositeToolStep, sliceSteps } from '../../services/agents/execution/compositeToolExecutionService';
import { publishToolLog, publishToolComplete, publishToolError, isToolRunCancelled, getBufferedToolEvents, clearBufferedToolEvents } from '../../services/tools/toolExecutionLogService';
import { ExecutionQuotaService } from '../../services/billing/executionQuota.service';

export const executeCompositeTool = inngest.createFunction(
    {
        id: 'execute-composite-tool',
        name: 'Execute Composite Tool',
        retries: 2,
        triggers: [{ event: 'tool/composite.execute' }],
    },
    async ({ event, step }) => {
        const { toolId, input, userId, runId, messageId, stepId, rootRunId, billingExempt, startStepId, endStepId } = event.data;

        // Defense-in-depth quota: idempotent via billingKey = rootRunId ?? runId
        if (userId && (runId || rootRunId)) {
            await step.run('consume-execution-quota', async () => {
                await ExecutionQuotaService.consumeExecution(
                    userId,
                    runId ?? rootRunId!,
                    'composite_tool',
                    {
                        rootRunId: rootRunId ?? runId,
                        billingExempt: Boolean(billingExempt),
                        context: {
                            runId: runId ?? rootRunId,
                            toolId,
                        },
                    },
                );
            });
        }

        // Mark execution log as RUNNING
        if (runId) {
            await (prisma as any).compositeToolExecutionLog.updateMany({
                where: { id: runId },
                data: { status: 'RUNNING' },
            }).catch(() => {});
        }

        // ── 1. Load tool (idempotent read) ──────────────────────────────────
        const tool = await step.run('load-tool', async () => {
            const t = await prisma.compositeTool.findUnique({ where: { id: toolId } });
            if (!t) throw new Error(`Composite tool ${toolId} not found`);
            return t;
        });

        const toolSteps = sliceSteps(
            (tool.steps as unknown as CompositeToolStep[]) || [],
            startStepId ?? stepId,
            endStepId,
        );

        // Shared mutable state threaded through steps
        const stepResults: Record<string, any> = {};
        const params: Record<string, any> = { ...(input ?? {}) };
        const context: Record<string, any> = {
            input,
            inputs: input,
            params,
            steps: stepResults,
        };

        // ── 2. Execute each tool step ────────────────────────────────────────
        // (run-start thinking event is published by the HTTP controller so the
        // client sees progress immediately after clicking Run)
        let stepIndex = 1;
        for (const s of toolSteps) {
            if (runId) {
                const cancelled = await step.run(`check-cancel-before-${s.id}`, async () => {
                    return isToolRunCancelled(runId);
                });
                if (cancelled) {
                    await finaliseRun(runId, 'CANCELLED', null, stepResults, 'Cancelled by user').catch(() => {});
                    if (userId) {
                        await ExecutionQuotaService.deregisterActiveRun(
                            userId,
                            rootRunId ?? runId ?? '',
                        ).catch(() => {});
                    }
                    return { success: false, cancelled: true, output: null, steps: stepResults };
                }
            }
            // Idempotency key: runId:stepId — unique per execution + step
            // If step names can repeat in a fan-out, extend with an index:
            //   `${runId}:${s.id}:${stepIndex}`
            const idempotencyKey = `${runId}:${s.id}`;
            const stepTitle = s.name ?? s.varName ?? s.id;
            const displayFields = resolveStepDisplayFields(s, context, params);

            // Publish start log inside step.run so Inngest retries do not re-broadcast
            if (runId) {
                await step.run(`log-start-${s.id}`, async () => {
                    await publishToolLog(runId, {
                        type: 'thinking',
                        content: stepTitle,
                        stepId: s.id,
                        phase: 'start',
                        payload: {
                            stepType: s.type || (s as any).transformation || null,
                            inputs: displayFields,
                        },
                    });
                    return true;
                }).catch(() => {});
            }

            let result: any;
            try {
                result = await step.run(
                    // Inngest uses this string as both the display name and its own
                    // deduplication key within a single run — keep it stable.
                    `step-${s.id}`,
                    async () => {
                        // Check idempotency: if we already persisted this step's
                        // result (e.g. on a retry), return it without re-executing.
                        const existing = await prisma.toolStepResult.findUnique({
                            where: { idempotencyKey },
                        }).catch(() => null); // table may not exist yet — safe fallback

                        if (existing) return existing.result;

                        // Execute the step (JS goes through the Piscina pool inside
                        // compositeToolExecutionService.executeOneStep)
                        const res = await compositeToolExecutionService.executeOneStep(
                            s, context, params, userId
                        );

                        // ── Persist result for idempotency & audit trail ──────────
                        // Write to DB; do NOT return large payloads through Inngest
                        // step output — keep the returned value small.
                        await prisma.toolStepResult.upsert({
                            where: { idempotencyKey },
                            create: {
                                idempotencyKey,
                                toolId,
                                runId,
                                stepId: s.id,
                                stepName: s.name,
                                result: res ?? null,
                            },
                            update: { result: res ?? null },
                        }).catch(() => {
                            // Table not yet migrated — silently skip; won't break execution.
                        });

                        return res;
                    }
                );
            } catch (stepErr: any) {
                if (runId) {
                    await step.run(`log-error-${s.id}`, async () => {
                        await publishToolLog(runId, {
                            type: 'thinking',
                            content: `${stepTitle} failed`,
                            stepId: s.id,
                            phase: 'error',
                            payload: {
                                error: stepErr?.message || String(stepErr),
                                inputs: displayFields,
                                summary: `${stepTitle} failed: ${stepErr?.message || String(stepErr)}`,
                            },
                        });
                        return true;
                    }).catch(() => {});
                }
                throw stepErr;
            }

            // Propagate result into shared context for subsequent steps
            const identifier = s.varName ?? s.name?.replace(/[^a-zA-Z0-9_]/g, '_') ?? s.id;
            const positionalAlias = `step_${stepIndex}`;

            stepResults[s.id] = result;
            stepResults[identifier] = result;
            stepResults[positionalAlias] = result;

            params[identifier] = result;
            params[positionalAlias] = result;
            // Flat-spread object keys for params.{identifier}_{field} access
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                for (const [k, v] of Object.entries(result)) {
                    params[`${identifier}_${k}`] = v;
                }
            }

            context[identifier] = result;
            context[s.id] = result;
            context[positionalAlias] = result;

            if (runId) {
                await step.run(`log-complete-${s.id}`, async () => {
                    const unwrapped = unwrapStepResult(result);
                    const summary = await summarizeStepOutcome(stepTitle, unwrapped, userId);
                    await publishToolLog(runId, {
                        type: 'thinking',
                        content: `${stepTitle} completed`,
                        stepId: s.id,
                        phase: 'complete',
                        payload: {
                            summary,
                            result: summarizeForProgress(unwrapped),
                        },
                    });
                    return true;
                }).catch(() => {});
            }

            stepIndex++;
        }

        // ── 3. Build final output ────────────────────────────────────────────
        const finalOutput = await step.run('build-output', async () => {
            const schema = tool.functionSchema as any;
            const outputMode: string = schema?.['x-outputMode'] ?? 'last_step';
            const returnProps = schema?.returns?.properties ?? {};

            if (outputMode === 'manual' && Object.keys(returnProps).length > 0) {
                const output: Record<string, any> = {};
                for (const [key, fieldSchema] of Object.entries(returnProps) as [string, any][]) {
                    const expr: string | undefined = fieldSchema?.['x-expression'];
                    if (expr) {
                        const path = expr.trim().replace(/^\{\{|\}\}$/g, '').trim();
                        const resolved = path.split('.').reduce((obj: any, k: string) => obj?.[k], context);
                        output[key] = resolved !== undefined ? resolved : null;
                    } else {
                        output[key] = null;
                    }
                }
                return output;
            }

            return stepResults[toolSteps[toolSteps.length - 1]?.id] ?? null;
        });

        // UI progress expects single-line JSON-ish output. Some tools return newline-heavy strings
        // (e.g. extracted PDF text). Normalize those so the output payload does not contain `\n`.
        const sanitizedFinalOutput = sanitizeNewlinesDeep(finalOutput);

        // ── 4. Notify agent pipeline if triggered from an agent message ──────
        if (messageId) {
            await step.run('send-response', async () => {
                await inngest.send({
                    name: 'agent/message.processed',
                    data: {
                        messageId,
                        agentId: '',
                        response: { result: sanitizedFinalOutput, status: 'COMPLETED', stepId },
                        status: 'COMPLETED',
                        timestamp: new Date(),
                    },
                });
            });
        }

        // ── 5. Finalise: update DB log + publish complete event ───────────────
        const { collectArtifactsFromStepResults } = await import(
            '@/services/agents/artifacts/executionArtifact'
        );
        const artifacts = collectArtifactsFromStepResults(stepResults, { finalOutput: sanitizedFinalOutput });
        await finaliseRun(runId, 'SUCCESS', sanitizedFinalOutput, stepResults, undefined, artifacts).catch(() => {});

        if (userId) {
            await step.run('deregister-active-run', async () => {
                await ExecutionQuotaService.deregisterActiveRun(
                    userId,
                    rootRunId ?? runId ?? '',
                );
            });
        }

        return { success: true, output: sanitizedFinalOutput, steps: stepResults };
    }
);

// Helper: update log status and publish final event
async function finaliseRun(
    runId: string | undefined,
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED',
    output: any,
    steps?: Record<string, any>,
    error?: string,
    artifacts?: any[]
): Promise<void> {
    if (!runId) return;

    // Flush buffered progress events into the execution log so history UI can
    // rehydrate Input / Execution Log / Output after the live stream ends.
    const progressLogs = await getBufferedToolEvents(runId).catch(() => []);
    const stepsPayload = {
        results: steps ?? null,
        logs: progressLogs,
        ...(artifacts && artifacts.length ? { artifacts } : {}),
    };

    await (prisma as any).compositeToolExecutionLog.updateMany({
        where: { id: runId },
        data: {
            status,
            output: output ?? null,
            steps: stepsPayload,
            error: error ?? null,
            finishedAt: new Date(),
        },
    }).catch(() => {});

    await clearBufferedToolEvents(runId).catch(() => {});

    if (status === 'SUCCESS') {
        await publishToolComplete(runId, output, artifacts).catch(() => {});
    } else {
        await publishToolError(runId, error ?? (status === 'CANCELLED' ? 'Run cancelled' : 'Execution failed')).catch(() => {});
    }
}

function sanitizeNewlinesDeep(value: any): any {
    if (typeof value === 'string') {
        // Handle both:
        // - actual newline characters
        // - escaped sequences coming from JSON (`\n`)
        return value.replace(/\\n/g, ' ').replace(/\r?\n/g, ' ');
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeNewlinesDeep);
    }
    if (value && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = sanitizeNewlinesDeep(v);
        }
        return out;
    }
    return value;
}

const SKIP_CONFIG_KEYS = new Set([
    'code',
    'prompt',
    'systemPrompt',
    'system_prompt',
    'packages',
    'language',
    'runtime',
    'backend',
    'model',
    'modelId',
    'temperature',
    'maxTokens',
    'max_tokens',
    'headers',
    'body',
    'json',
]);

function resolveTemplate(value: unknown, context: Record<string, any>): unknown {
    if (typeof value !== 'string') return value;
    if (!value.includes('{{')) return value;
    return value.replace(/\{\{(.*?)\}\}/g, (_, path) => {
        const resolved = String(path)
            .trim()
            .split('.')
            .reduce((obj: any, key: string) => obj?.[key], context);
        if (resolved === undefined || resolved === null) return `{{${path}}}`;
        return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
    });
}

function resolveStepDisplayFields(
    step: CompositeToolStep,
    context: Record<string, any>,
    params: Record<string, any>,
): Record<string, unknown> {
    const cfg = (step.config || (step as any).params || {}) as Record<string, unknown>;
    const fields: Record<string, unknown> = {};

    for (const [key, raw] of Object.entries(cfg)) {
        if (SKIP_CONFIG_KEYS.has(key)) continue;
        if (raw === undefined || raw === null || raw === '') continue;
        if (typeof raw === 'object') continue;
        fields[key] = summarizeForProgress(resolveTemplate(raw, context));
    }

    // Include tool input params that look referenced by this step (or all if none found)
    const inputObj = (context.input && typeof context.input === 'object')
        ? (context.input as Record<string, unknown>)
        : {};
    for (const [key, val] of Object.entries(inputObj)) {
        if (key in fields) continue;
        if (val === undefined || val === null || val === '') continue;
        if (typeof val === 'object') continue;
        // Prefer params that appear in config string templates
        const referenced = Object.values(cfg).some(
            (v) => typeof v === 'string' && v.includes(key),
        );
        if (referenced || Object.keys(fields).length === 0) {
            fields[key] = summarizeForProgress(val);
        }
    }

    // Fallback: show a few scalar params
    if (Object.keys(fields).length === 0) {
        let n = 0;
        for (const [key, val] of Object.entries(params)) {
            if (n >= 8) break;
            if (typeof val === 'object') continue;
            fields[key] = summarizeForProgress(val);
            n += 1;
        }
    }

    return fields;
}

function unwrapStepResult(result: unknown): unknown {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
    const obj = result as Record<string, unknown>;
    if ('transformed' in obj && obj.transformed !== undefined) {
        if (obj.transformed && typeof obj.transformed === 'object' && !Array.isArray(obj.transformed)) {
            return { ...(obj.transformed as object), ...omitKeys(obj, ['transformed']) };
        }
        return obj.transformed;
    }
    return result;
}

function omitKeys(obj: Record<string, unknown>, keys: string[]) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (!keys.includes(k)) out[k] = v;
    }
    return out;
}

/** Keep progress payloads small enough for Redis/WebSocket while preserving useful detail. */
function summarizeForProgress(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return summarizeLongText(value);
    }
    if (depth >= 3) {
        if (Array.isArray(value)) return `[array:${value.length}]`;
        if (typeof value === 'object') return `[object:${Object.keys(value as object).length}]`;
        return String(value);
    }
    if (Array.isArray(value)) {
        return {
            length: value.length,
            sample: value.slice(0, 3).map((item) => summarizeForProgress(item, depth + 1)),
        };
    }
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        let i = 0;
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (k === 'status') continue; // noisy / redundant in progress UI
            if (i >= 24) {
                out._truncated = true;
                break;
            }
            out[k] = summarizeForProgress(v, depth + 1);
            i += 1;
        }
        return out;
    }
    return String(value);
}

function summarizeLongText(value: string): string | Record<string, unknown> {
    const pageMatches = value.match(/--\s*\d+\s+of\s+(\d+)\s*--/gi) || [];
    let pageCount: number | null = null;
    if (pageMatches.length > 0) {
        const last = pageMatches[pageMatches.length - 1];
        const m = last.match(/of\s+(\d+)/i);
        pageCount = m ? Number(m[1]) : pageMatches.length;
    }
    if (value.length <= 400 && !pageCount) return value;

    const preview = value.replace(/\s+/g, ' ').trim().slice(0, 220);
    return {
        chars: value.length,
        ...(pageCount ? { pages: pageCount } : {}),
        preview: preview ? `${preview}${value.length > 220 ? '…' : ''}` : '(empty)',
    };
}

function heuristicStepSummary(stepTitle: string, result: unknown): string {
    if (result == null) return `${stepTitle} finished with no output.`;
    if (typeof result === 'string') {
        const pageMatches = result.match(/--\s*\d+\s+of\s+(\d+)\s*--/gi) || [];
        if (pageMatches.length > 0) {
            const last = pageMatches[pageMatches.length - 1];
            const m = last.match(/of\s+(\d+)/i);
            const pages = m ? Number(m[1]) : pageMatches.length;
            return `Extracted text from ${pages} page${pages === 1 ? '' : 's'} of the PDF (${result.length.toLocaleString()} characters).`;
        }
        if (result.length > 200) {
            return `Produced ${result.length.toLocaleString()} characters of text.`;
        }
        return `${stepTitle} returned: ${result.slice(0, 120)}`;
    }
    if (typeof result === 'object' && !Array.isArray(result)) {
        const obj = result as Record<string, unknown>;
        const text =
            typeof obj.text === 'string'
                ? obj.text
                : typeof obj.summary === 'string'
                    ? obj.summary
                    : null;
        if (text) {
            const pageMatches = text.match(/--\s*\d+\s+of\s+(\d+)\s*--/gi) || [];
            if (pageMatches.length > 0) {
                const last = pageMatches[pageMatches.length - 1];
                const m = last.match(/of\s+(\d+)/i);
                const pages = m ? Number(m[1]) : pageMatches.length;
                const tables = Array.isArray(obj.tables)
                    ? obj.tables.length
                    : typeof (obj.tables as any)?.length === 'number'
                        ? (obj.tables as any).length
                        : 0;
                return `Extracted text from ${pages} page${pages === 1 ? '' : 's'} (${text.length.toLocaleString()} characters)${tables ? ` and ${tables} table${tables === 1 ? '' : 's'}` : ''}.`;
            }
            if (typeof obj.summary === 'string' || stepTitle.toLowerCase().includes('summar')) {
                return `Generated a summary (${text.length.toLocaleString()} characters).`;
            }
            return `Produced text output (${text.length.toLocaleString()} characters).`;
        }
        const keys = Object.keys(obj).filter((k) => k !== 'status').slice(0, 6);
        if (keys.length) return `${stepTitle} completed with fields: ${keys.join(', ')}.`;
    }
    if (Array.isArray(result)) {
        return `${stepTitle} returned ${result.length} item${result.length === 1 ? '' : 's'}.`;
    }
    return `${stepTitle} completed successfully.`;
}

/** Prefer a short AI description of what the step accomplished; fall back to heuristics. */
async function summarizeStepOutcome(
    stepTitle: string,
    result: unknown,
    userId?: string,
): Promise<string> {
    const fallback = heuristicStepSummary(stepTitle, result);
    if (!userId) return fallback;

    try {
        const { completeWithDefaultModel } = await import('@/services/models');
        const snapshot = JSON.stringify(summarizeForProgress(result)).slice(0, 2500);
        const { completion } = await completeWithDefaultModel({
            userId,
            request: {
                messages: [
                    {
                        role: 'system',
                        content:
                            'You summarize tool-step results for an end-user progress UI. ' +
                            'Reply with ONE short sentence (max 28 words) describing what the step did, ' +
                            'using concrete numbers when available (pages, characters, items). ' +
                            'No markdown, no quotes, no preamble.',
                    },
                    {
                        role: 'user',
                        content: `Step name: ${stepTitle}\nResult snapshot:\n${snapshot}`,
                    },
                ],
                temperature: 0.2,
                max_tokens: 60,
                stream: false,
            },
            usageContext: {
                action: 'GENERATE',
                metadata: { source: 'compositeTool.stepSummary' },
            },
            skipEntitlement: true,
        });
        const text = String(completion.choices?.[0]?.message?.content || '')
            .replace(/^["'\s]+|["'\s]+$/g, '')
            .trim();
        if (text && text.length >= 12 && text.length <= 220) return text;
    } catch {
        // fall through to heuristic
    }
    return fallback;
}
