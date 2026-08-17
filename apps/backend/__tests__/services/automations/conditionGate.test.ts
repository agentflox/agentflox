import { evaluateConditionGate } from '@/services/automations/conditionGate';

describe('LLM condition gate', () => {
  it('fails closed on timeout', async () => {
    const result = await evaluateConditionGate({
      prompt: 'is this urgent?',
      task: { id: 't1', title: 'A' },
      timeoutMs: 20,
      evaluator: () => new Promise((resolve) => setTimeout(() => resolve(true), 200)),
    });
    expect(result.pass).toBe(false);
    expect(result.error).toMatch(/timeout/);
  });

  it('caches the same prompt + task fingerprint', async () => {
    const evaluator = jest.fn(async () => true);
    const task = { id: 't-cache', title: 'Same' };
    const first = await evaluateConditionGate({ prompt: 'p', task, evaluator });
    const second = await evaluateConditionGate({ prompt: 'p', task, evaluator });
    expect(first.pass).toBe(true);
    expect(second.pass).toBe(true);
    expect(evaluator).toHaveBeenCalledTimes(1);
  });
});
