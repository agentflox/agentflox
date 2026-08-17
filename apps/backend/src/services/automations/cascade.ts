export const MAX_DEPTH = 3;
export const MAX_RUNS_PER_ROOT = 10;

export type CascadeContext = {
  source?: string;
  rootEventId: string;
  depth: number;
  visitedAutomationIds: string[];
  runCount: number;
};

export type CascadeDecision =
  | { ok: true; next: CascadeContext }
  | { ok: false; reason: 'max_depth' | 'already_visited' | 'cascade_budget_exceeded' };

export function mintRootEventId(): string {
  return `ae_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createCascadeContext(partial?: Partial<CascadeContext>): CascadeContext {
  return {
    source: partial?.source ?? 'user',
    rootEventId: partial?.rootEventId ?? mintRootEventId(),
    depth: partial?.depth ?? 0,
    visitedAutomationIds: partial?.visitedAutomationIds ?? [],
    runCount: partial?.runCount ?? 0,
  };
}

export function canRunAutomation(
  ctx: CascadeContext,
  automationId: string,
): CascadeDecision {
  if (ctx.depth >= MAX_DEPTH) {
    return { ok: false, reason: 'max_depth' };
  }
  if (ctx.visitedAutomationIds.includes(automationId)) {
    return { ok: false, reason: 'already_visited' };
  }
  if (ctx.runCount >= MAX_RUNS_PER_ROOT) {
    return { ok: false, reason: 'cascade_budget_exceeded' };
  }
  return {
    ok: true,
    next: {
      ...ctx,
      source: 'automation',
      depth: ctx.depth + 1,
      visitedAutomationIds: [...ctx.visitedAutomationIds, automationId],
      runCount: ctx.runCount + 1,
    },
  };
}
