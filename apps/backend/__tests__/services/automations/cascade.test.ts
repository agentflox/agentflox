import { canRunAutomation, createCascadeContext, MAX_DEPTH, MAX_RUNS_PER_ROOT } from '@/services/automations/cascade';

describe('automation cascade', () => {
  it('blocks a loop when the same automation is visited again', () => {
    const first = canRunAutomation(createCascadeContext(), 'a1');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const loop = canRunAutomation(first.next, 'a1');
    expect(loop).toEqual({ ok: false, reason: 'already_visited' });
  });

  it('blocks depth greater than 3', () => {
    let ctx = createCascadeContext();
    for (let i = 0; i < MAX_DEPTH; i++) {
      const next = canRunAutomation(ctx, `auto_${i}`);
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      ctx = next.next;
    }
    expect(canRunAutomation(ctx, 'overflow')).toEqual({ ok: false, reason: 'max_depth' });
  });

  it('blocks more than 10 runs per root event', () => {
    let ctx = createCascadeContext({ depth: 0, runCount: MAX_RUNS_PER_ROOT });
    expect(canRunAutomation(ctx, 'a-new')).toEqual({ ok: false, reason: 'cascade_budget_exceeded' });
  });
});
