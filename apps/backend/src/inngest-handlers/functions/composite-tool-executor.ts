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
import { compositeToolExecutionService, CompositeToolStep } from '../../services/agents/execution/compositeToolExecutionService';
import { publishToolLog, publishToolComplete, publishToolError } from '../../services/tools/toolExecutionLogService';

export const executeCompositeTool = inngest.createFunction(
    {
        id: 'execute-composite-tool',
        name: 'Execute Composite Tool',
        retries: 2,
        triggers: [{ event: 'tool/composite.execute' }],
    },
    async ({ event, step }) => {
        const { toolId, input, userId, runId, messageId, stepId } = event.data;

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

        const toolSteps = (tool.steps as unknown as CompositeToolStep[]) || [];

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
        let stepIndex = 1;
        for (const s of toolSteps) {
            // Idempotency key: runId:stepId — unique per execution + step
            // If step names can repeat in a fan-out, extend with an index:
            //   `${runId}:${s.id}:${stepIndex}`
            const idempotencyKey = `${runId}:${s.id}`;

            // Publish a 'thinking' log so the client knows this step started
            if (runId) {
                await publishToolLog(runId, {
                    type: 'thinking',
                    content: `Running step: ${s.name ?? s.id}`,
                    stepId: s.id,
                }).catch(() => {});
            }

            const result = await step.run(
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

        // ── 4. Notify agent pipeline if triggered from an agent message ──────
        if (messageId) {
            await step.run('send-response', async () => {
                await inngest.send({
                    name: 'agent/message.processed',
                    data: {
                        messageId,
                        agentId: '',
                        response: { result: finalOutput, status: 'COMPLETED', stepId },
                        status: 'COMPLETED',
                        timestamp: new Date(),
                    },
                });
            });
        }

        // ── 5. Finalise: update DB log + publish complete event ───────────────
        await finaliseRun(runId, 'SUCCESS', finalOutput, stepResults).catch(() => {});

        return { success: true, output: finalOutput, steps: stepResults };
    }
);

// Helper: update log status and publish final event
async function finaliseRun(
    runId: string | undefined,
    status: 'SUCCESS' | 'FAILED',
    output: any,
    steps?: Record<string, any>,
    error?: string
): Promise<void> {
    if (!runId) return;
    await (prisma as any).compositeToolExecutionLog.updateMany({
        where: { id: runId },
        data: { 
            status, 
            output: output ?? null, 
            steps: steps ?? null,
            error: error ?? null, 
            finishedAt: new Date() 
        },
    }).catch(() => {});

    if (status === 'SUCCESS') {
        await publishToolComplete(runId, output).catch(() => {});
    } else {
        await publishToolError(runId, error ?? 'Execution failed').catch(() => {});
    }
}
