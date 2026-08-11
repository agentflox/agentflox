"use client";
import type { ReactNode } from "react";
import AnalyticsLoading from "./loading";
import Link from "next/link";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UsageQuotaMeter } from "@/features/usage/types";
import { ArrowRight, Sparkles, Maximize, Play } from "lucide-react";

function MeterCard({
  label,
  meter,
  action,
}: {
  label: string;
  meter?: UsageQuotaMeter;
  action?: ReactNode;
}) {
  if (!meter) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          {action}
        </div>
        <div className="mt-2 text-lg font-semibold text-foreground/80">—</div>
      </div>
    );
  }

  const unlimited = meter.max < 0;
  const pct =
    unlimited || meter.max <= 0
      ? 0
      : Math.min(100, Math.round((meter.used / meter.max) * 100));
  const atCap = !unlimited && meter.remaining === 0;

  return (
    <div
      className={cn(
        "group rounded-lg border p-4",
        atCap
          ? "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
          : "border-border/60 bg-muted/20",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div
          className={cn(
            "flex items-center gap-0 transition-all duration-150",
            action && "group-hover:gap-3 group-focus-within:gap-3",
          )}
        >
          {!unlimited && (
            <div
              className={cn(
                "text-[11px] font-medium tabular-nums",
                atCap ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              {meter.remaining} left
            </div>
          )}
          {action && (
            <div
              className={cn(
                "w-0 overflow-hidden opacity-0 transition-all duration-150",
                "group-hover:w-7 group-hover:opacity-100",
                "group-focus-within:w-7 group-focus-within:opacity-100",
              )}
            >
              {action}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-foreground">
        {unlimited ? "Unlimited" : `${meter.used} / ${meter.max}`}
      </div>
      {!unlimited && meter.max > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              atCap ? "bg-amber-500" : pct >= 80 ? "bg-sky-600" : "bg-sky-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

export default function UsagePage() {
  const summary = trpc.usage.summary.useQuery();
  const history = trpc.usage.history.useQuery({ page: 1, pageSize: 20 });
  const custom = trpc.usage.customModelsSummary.useQuery({ days: 30 });

  if (summary.isLoading || history.isLoading || custom.isLoading) {
    return <AnalyticsLoading />;
  }

  const meters = summary.data?.meters;
  const models = custom.data?.models ?? custom.data?.items ?? [];

  return (
    <Shell>
      <div className="space-y-8">
        <PageHeader
          title="Usage"
          description="View your current limits and historical consumption."
          actions={
            <Link href="/dashboard/billing" className="inline-block shrink-0">
              <Button
                className={cn(
                  "relative overflow-hidden border-0 text-white shadow-lg shadow-indigo-900/25",
                  "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600",
                  "hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500",
                  "gap-2 px-5 font-semibold tracking-wide ring-1 ring-white/10",
                  "inline-flex w-fit shrink-0 items-center justify-center",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 opacity-60"
                />
                <Sparkles className="relative h-4 w-4 text-amber-200" />
                <span className="relative">Upgrade</span>
              </Button>
            </Link>
          }
        />

        <Card className="p-6">
          <h3 className="text-xl font-medium">Current period</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <MeterCard label="Projects" meter={meters?.PROJECT} />
            <MeterCard label="Teams" meter={meters?.TEAM} />
            <MeterCard label="Workspaces" meter={meters?.WORKSPACE} />
            <MeterCard label="Spaces" meter={meters?.SPACE} />
            <MeterCard
              label="Executions"
              meter={meters?.EXECUTION}
              action={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard/analytics/executions"
                      className="inline-flex items-center justify-center rounded-md border border-border/70 bg-background/80 p-1.5 text-foreground transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Maximize className="h-3.5 w-3.5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>View details</TooltipContent>
                </Tooltip>
              }
            />
            <MeterCard
              label="Tokens"
              meter={meters?.TOKENS}
              action={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard/analytics/ai-models"
                      className="inline-flex items-center justify-center rounded-md border border-border/70 bg-background/80 p-1.5 text-foreground transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Maximize className="h-3.5 w-3.5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>View details</TooltipContent>
                </Tooltip>
              }
            />
          </div>
          {typeof summary.data?.maxSupabaseStorage === "number" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Storage limit: {summary.data.maxSupabaseStorage} GB
            </p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-medium">Custom model usage (last 30 days)</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                BYOK usage is tracked separately and does not debit your plan token pool.
              </p>
            </div>
            <Link
              href="/dashboard/analytics/ai-models"
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-zinc-200 p-3 rounded-lg"
            >
              View all AI models
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Requests</div>
              <div className="text-lg font-semibold tabular-nums">{formatNumber(custom.data?.totals.requests ?? 0)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Input tokens</div>
              <div className="text-lg font-semibold tabular-nums">{formatNumber(custom.data?.totals.inputTokens ?? 0)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Output tokens</div>
              <div className="text-lg font-semibold tabular-nums">{formatNumber(custom.data?.totals.outputTokens ?? 0)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total tokens</div>
              <div className="text-lg font-semibold tabular-nums">{formatNumber(custom.data?.totals.totalTokens ?? 0)}</div>
            </div>
          </div>

          <ScrollArea className="mt-4 h-[360px] rounded-lg border">
            {models.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No custom models yet. Add a BYOK model in Model Manager to see it here.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full px-2">
                {models.map((row: any) => {
                  const id = row.modelId || row.slug || row.displayName || row.model;
                  return (
                    <AccordionItem key={id} value={String(id)}>
                      <AccordionTrigger className="hover:no-underline px-2 [&>svg]:hidden group">
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex items-center justify-center h-8 w-8 rounded hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-700 shrink-0 transition-colors cursor-pointer">
                              <Play className="h-3 w-3 shrink-0 fill-current transition-transform duration-150 group-data-[state=open]:rotate-90" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {row.displayName || row.model}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {[row.provider, row.apiModelId].filter(Boolean).join(" · ") || "Custom model"}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            <div>{formatNumber(row.requests ?? 0)} req</div>
                            <div>{formatNumber(row.totalTokens ?? 0)} tok</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2">
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Requests</div>
                            <div className="text-sm font-semibold tabular-nums">{formatNumber(row.requests ?? 0)}</div>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Input</div>
                            <div className="text-sm font-semibold tabular-nums">{formatNumber(row.inputTokens ?? 0)}</div>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Output</div>
                            <div className="text-sm font-semibold tabular-nums">{formatNumber(row.outputTokens ?? 0)}</div>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Errors</div>
                            <div className="text-sm font-semibold tabular-nums">{formatNumber(row.errors ?? 0)}</div>
                          </div>
                        </div>

                        {(row.recent?.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No usage recorded for this model in the last {custom.data?.days ?? 30} days.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-zinc-400">When</TableHead>
                                  <TableHead className="text-zinc-400">Action</TableHead>
                                  <TableHead className="text-zinc-400">In</TableHead>
                                  <TableHead className="text-zinc-400">Out</TableHead>
                                  <TableHead className="text-zinc-400">Total</TableHead>
                                  <TableHead className="text-zinc-400">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.recent.map((log: any) => (
                                  <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap text-xs">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs">{log.action}</TableCell>
                                    <TableCell className="tabular-nums text-xs">{formatNumber(log.inputTokens)}</TableCell>
                                    <TableCell className="tabular-nums text-xs">{formatNumber(log.outputTokens)}</TableCell>
                                    <TableCell className="tabular-nums text-xs">{formatNumber(log.totalTokens)}</TableCell>
                                    <TableCell className="text-xs">
                                      {log.success ? (
                                        <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                                      ) : (
                                        <span className="text-amber-700 dark:text-amber-400" title={log.errorMessage || undefined}>
                                          Error
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </ScrollArea>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-medium">Usage history</h3>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Projects</TableHead>
                  <TableHead className="text-zinc-400">Teams</TableHead>
                  <TableHead className="text-zinc-400">Workspaces</TableHead>
                  <TableHead className="text-zinc-400">Spaces</TableHead>
                  <TableHead className="text-zinc-400">Executions left</TableHead>
                  <TableHead className="text-zinc-400">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data?.items?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>{new Date(u.date).toLocaleDateString()}</TableCell>
                    <TableCell>{u.remainingProjects ?? "-"}</TableCell>
                    <TableCell>{u.remainingTeams ?? "-"}</TableCell>
                    <TableCell>{u.remainingWorkspaces ?? "-"}</TableCell>
                    <TableCell>{u.remainingSpaces ?? "-"}</TableCell>
                    <TableCell>
                      {u.remainingExecutions === -1
                        ? "Unlimited"
                        : (u.remainingExecutions ?? "-")}
                    </TableCell>
                    <TableCell>{u.remainingCredits ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
