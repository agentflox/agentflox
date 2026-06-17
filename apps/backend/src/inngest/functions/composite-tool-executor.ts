import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { compositeToolExecutionService, CompositeToolStep } from '../../services/agents/execution/compositeToolExecutionService';

export const executeCompositeTool = inngest.createFunction(
    {
        id: 'execute-composite-tool',
        name: 'Execute Composite Tool',
        retries: 2,
        triggers: [{ event: 'tool/composite.execute' }]
    },
    async ({ event, step }) => {
        const { toolId, input, userId, messageId, stepId } = event.data;

        // 1. Load tool
        const tool = await step.run('load-tool', async () => {
            const t = await prisma.compositeTool.findUnique({ where: { id: toolId } });
            if (!t) throw new Error(`Composite tool ${toolId} not found`);
            return t;
        });

        const steps = (tool.steps as unknown as CompositeToolStep[]) || [];
        const stepResults: Record<string, any> = {};
        const context: Record<string, any> = { input, inputs: input, steps: stepResults };

        // 2. Execute steps one by one
        let stepIndex = 1;
        for (const s of steps) {
            const result = await step.run(`step-${s.id}`, async () => {
                return compositeToolExecutionService.executeOneStep(s, context, userId);
            });
            
            stepResults[s.id] = result;
            context[s.id] = result;

            const positionalAlias = `step_${stepIndex}`;
            stepResults[positionalAlias] = result;
            context[positionalAlias] = result;

            if (s.name) {
                stepResults[s.name] = result;
                context[s.name] = result;
                const safeName = s.name.replace(/[^a-zA-Z0-9_]/g, '_');
                stepResults[safeName] = result;
                context[safeName] = result;
            }
            
            stepIndex++;
        }

        // 3. Build final output
        const finalOutput = await step.run('build-output', async () => {
            const schema = tool.functionSchema as any;
            const outputMode: string = schema?.['x-outputMode'] ?? 'last_step';
            const returnProps = schema?.returns?.properties ?? {};

            let output: any;

            if (outputMode === 'manual' && Object.keys(returnProps).length > 0) {
                output = {};
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
            } else {
                output = stepResults[steps[steps.length - 1]?.id] ?? null;
            }
            return output;
        });

        // 4. Send response back
        if (messageId) {
            await step.run('send-response', async () => {
                await inngest.send({
                    name: 'agent/message.processed',
                    data: {
                        messageId,
                        agentId: '',
                        response: {
                            result: finalOutput,
                            status: 'COMPLETED',
                            stepId,
                        },
                        status: 'COMPLETED',
                        timestamp: new Date()
                    }
                });
            });
        }

        return { success: true, output: finalOutput, steps: stepResults };
    }
);
