"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatCronRule, formatRunDate, getNextCronRun } from "../cronUtils";

const COLUMNS = ["Task ID", "Task Name", "Last Run", "Next Run", "Run Count", "Rule"] as const;

function RecurringEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">
        Recurring Rules you have created or applied will appear here
      </p>
    </div>
  );
}

export function RecurringAutomations({ workspaceId }: { workspaceId?: string }) {
  const recurring = trpc.automation.listRecurring.useQuery(
    { workspaceId: workspaceId || "" },
    { enabled: !!workspaceId },
  );

  const rows = useMemo(() => {
    return (recurring.data?.items ?? []).map((item) => {
      const nextRun = item.cronExpression ? getNextCronRun(item.cronExpression) : null;
      return {
        id: item.id,
        taskId: item.id.slice(0, 8).toUpperCase(),
        name: item.name,
        lastRun: item.lastRanAt,
        nextRun,
        runCount: item.runCount,
        rule: formatCronRule(item.cronExpression),
      };
    });
  }, [recurring.data?.items]);

  return (
    <div className="flex flex-col h-full px-8">
      <div className="pt-4 pb-4 border-b">
        <h2 className="text-lg font-semibold text-zinc-900">Recurring Task Overview</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Displays the most recent recurrence of any active recurring tasks across your Workspace. Only
          the first 100 most recent tasks are displayed.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(88px,1fr)_minmax(140px,2fr)_minmax(120px,1.2fr)_minmax(120px,1.2fr)_minmax(72px,0.8fr)_minmax(100px,1.2fr)] gap-3 px-5 py-3 border-b text-[11px] font-medium tracking-wide text-zinc-400">
        {COLUMNS.map((col) => (
          <span key={col}>{col}</span>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {recurring.isLoading ? (
          <p className="py-16 text-center text-sm text-zinc-400">Loading recurring tasks…</p>
        ) : rows.length === 0 ? (
          <RecurringEmptyState />
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(88px,1fr)_minmax(140px,2fr)_minmax(120px,1.2fr)_minmax(120px,1.2fr)_minmax(72px,0.8fr)_minmax(100px,1.2fr)] gap-3 px-5 py-3 text-sm text-zinc-700 hover:bg-zinc-50/80"
              >
                <span className="font-mono text-xs text-zinc-500 truncate" title={row.id}>
                  {row.taskId}
                </span>
                <span className="truncate font-medium text-zinc-800">{row.name}</span>
                <span className="truncate text-zinc-600">{formatRunDate(row.lastRun)}</span>
                <span className="truncate text-zinc-600">{formatRunDate(row.nextRun)}</span>
                <span className="text-zinc-600">{row.runCount}</span>
                <span className="truncate text-zinc-500 font-mono text-xs" title={row.rule}>
                  {row.rule}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
