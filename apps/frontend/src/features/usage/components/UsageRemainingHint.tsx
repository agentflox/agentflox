"use client";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { UsageCapKind } from "@/features/usage/types";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

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

  const tooltipText =
    kind === "EXECUTION"
      ? `Your plan allows up to ${meter.max} execution${meter.max === 1 ? "" : "s"} per period`
      : `Your plan allows up to ${meter.max} ${noun}`;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-sm text-zinc-500",
        meter.remaining === 0 && "text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      {text}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info
              className="h-3.5 w-3.5 cursor-help text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label={tooltipText}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </p>
  );
}