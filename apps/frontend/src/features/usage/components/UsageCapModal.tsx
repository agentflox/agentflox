"use client";

import { useRouter } from "next/navigation";
import {
  FolderKanban,
  LayoutGrid,
  Users,
  Building2,
  Zap,
  CreditCard,
  Gauge,
  Coins,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  USAGE_CAP_UPGRADE_URL,
  type UsageCapKind,
  type UsageCapPayload,
} from "@/features/usage/types";

const COPY: Record<
  UsageCapKind,
  { title: string; Icon: typeof FolderKanban }
> = {
  PROJECT: { title: "Project limit reached", Icon: FolderKanban },
  TEAM: { title: "Team limit reached", Icon: Users },
  SPACE: { title: "Space limit reached", Icon: LayoutGrid },
  WORKSPACE: { title: "Workspace limit reached", Icon: Building2 },
  REQUEST: { title: "Request limit reached", Icon: Gauge },
  EXECUTION: { title: "Execution limit reached", Icon: Zap },
  CONCURRENT: { title: "Too many runs in progress", Icon: Gauge },
  SUBSCRIPTION: { title: "No active subscription", Icon: CreditCard },
  TOKENS: { title: "Token budget exhausted", Icon: Coins },
};

function supportingLine(payload: UsageCapPayload): string {
  if (payload.kind === "SUBSCRIPTION") {
    return "Reactivate or upgrade your plan to continue using Agentflox.";
  }
  if (payload.kind === "CONCURRENT") {
    return "Wait for a run to finish, or upgrade for higher concurrency.";
  }
  if (payload.max < 0) return payload.message;
  if (payload.remaining === 0) {
    return `Your plan includes ${payload.max}. You've used all of them.`;
  }
  return payload.message;
}

export function UsageCapModal({
  open,
  onOpenChange,
  payload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: UsageCapPayload | null;
}) {
  const router = useRouter();
  if (!payload) return null;

  const meta = COPY[payload.kind] ?? COPY.EXECUTION;
  const Icon = meta.Icon;
  const showMeter = payload.max >= 0 && payload.kind !== "SUBSCRIPTION";
  const pct =
    payload.max > 0
      ? Math.min(100, Math.round((payload.used / payload.max) * 100))
      : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="h-1 w-full bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-400 dark:from-zinc-200 dark:via-zinc-400 dark:to-zinc-600" />
        <div className="space-y-5 px-6 pb-6 pt-6">
          <DialogHeader className="space-y-4 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {meta.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {supportingLine(payload)}
              </DialogDescription>
            </div>
          </DialogHeader>

          {showMeter ? (
            <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <span>
                  {payload.used} / {payload.max} used
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5",
                    payload.remaining === 0
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                      : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200",
                  )}
                >
                  {payload.remaining} remaining
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    payload.remaining === 0 ? "bg-amber-500" : "bg-zinc-800 dark:bg-zinc-200",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
            >
              Not now
            </Button>
            <Button
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={() => {
                onOpenChange(false);
                router.push(payload.upgradeUrl || USAGE_CAP_UPGRADE_URL);
              }}
            >
              Upgrade plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
