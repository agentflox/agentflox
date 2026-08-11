"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  LayoutGrid,
  Users,
  Building2,
  Zap,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  USAGE_CAP_UPGRADE_URL,
  type UsageCapKind,
  type UsageQuotaMeter,
} from "@/features/usage/types";

const KIND_META: Record<
  Extract<UsageCapKind, "PROJECT" | "TEAM" | "SPACE" | "WORKSPACE" | "EXECUTION">,
  { title: string; noun: string; description: string; Icon: typeof FolderKanban }
> = {
  PROJECT: {
    title: "Projects limit",
    noun: "projects",
    description: "Projects available on your current plan.",
    Icon: FolderKanban,
  },
  TEAM: {
    title: "Teams limit",
    noun: "teams",
    description: "Teams available on your current plan.",
    Icon: Users,
  },
  SPACE: {
    title: "Spaces limit",
    noun: "spaces",
    description: "Spaces available on your current plan.",
    Icon: LayoutGrid,
  },
  WORKSPACE: {
    title: "Workspaces limit",
    noun: "workspaces",
    description: "Workspaces available on your current plan.",
    Icon: Building2,
  },
  EXECUTION: {
    title: "Executions limit",
    noun: "executions",
    description: "Agent, tool, and workforce runs in this billing period.",
    Icon: Zap,
  },
};

function dismissKey(kind: string) {
  return `usage-banner-dismissed:${kind}`;
}

type BannerKind = keyof typeof KIND_META;

export function UsageQuotaBanner({
  kind,
  description,
  className,
}: {
  kind: BannerKind;
  description?: string;
  className?: string;
}) {
  const router = useRouter();
  const summary = trpc.usage.summary.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const [hidden, setHidden] = useState(true);

  const meter: UsageQuotaMeter | undefined = summary.data?.meters?.[kind];
  const meta = KIND_META[kind];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(dismissKey(kind)) === "1";
    setHidden(dismissed);
  }, [kind]);

  const pct = useMemo(() => {
    if (!meter || meter.max <= 0) return 0;
    return Math.min(100, Math.round((meter.used / meter.max) * 100));
  }, [meter]);

  if (!meter || meter.max < 0) return null;
  if (hidden && meter.remaining !== 0) return null;

  const atCap = meter.remaining === 0;
  const Icon = meta.Icon;

  const onDismiss = () => {
    sessionStorage.setItem(dismissKey(kind), "1");
    setHidden(true);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6",
        atCap
          ? "border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30"
          : "border-sky-200/70 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/25",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Dismiss usage banner"
        onClick={onDismiss}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-zinc-400 transition hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-start gap-3 pr-8 sm:pr-0">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            atCap
              ? "border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              : "border-sky-200 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {atCap ? `${meta.title} reached` : meta.title}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description ?? meta.description}
            {atCap ? " Upgrade to continue creating or running." : null}
          </p>
        </div>
      </div>

      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5 pr-6 sm:max-w-sm sm:pr-8">
        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {meter.used}/{meter.max} {meta.noun}{" "}
          <span
            className={cn(
              "font-semibold",
              atCap
                ? "text-amber-700 dark:text-amber-300"
                : "text-sky-700 dark:text-sky-300",
            )}
          >
            ({meter.remaining} remaining)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              atCap ? "bg-amber-500" : "bg-sky-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
