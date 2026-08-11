"use client";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { UsageCapKind } from "@/features/usage/types";

const NOUN: Partial<Record<UsageCapKind, string>> = {
  PROJECT: "projects",
  TEAM: "teams",
  SPACE: "spaces",
  WORKSPACE: "workspaces",
  EXECUTION: "executions",
};

/** Soft footer hint when remaining ≤ 3 on a finite plan. */
export function UsageRemainingHint({
  kind,
  className,
}: {
  kind: Extract<UsageCapKind, "PROJECT" | "TEAM" | "SPACE" | "WORKSPACE" | "EXECUTION">;
  className?: string;
}) {
  const summary = trpc.usage.summary.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const meter = summary.data?.meters?.[kind];
  if (!meter || meter.max < 0 || meter.remaining < 0 || meter.remaining > 3) {
    return null;
  }

  const noun = NOUN[kind] ?? "items";
  const text =
    kind === "EXECUTION"
      ? meter.remaining === 0
        ? "No executions left this period"
        : `${meter.remaining} execution${meter.remaining === 1 ? "" : "s"} left this period`
      : meter.remaining === 0
        ? `No ${noun} remaining on your plan`
        : `${meter.remaining} of ${meter.max} ${noun} remaining`;

  return (
    <p
      className={cn(
        "text-xs text-muted-foreground",
        meter.remaining === 0 && "text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      {text}
    </p>
  );
}
