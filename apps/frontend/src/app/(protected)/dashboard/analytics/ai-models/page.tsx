"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AiModelsLoading from "./loading";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Play, Sparkles } from "lucide-react";

type Scope = "all" | "system" | "custom";

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

function formatDuration(ms: number | null | undefined) {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

const MODELS_PAGE_SIZE = 30;

export default function AiModelsUsagePage() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("all");
  const [days, setDays] = useState<30 | 7 | 90>(30);
  const [page, setPage] = useState(1);

  const detail = trpc.usage.modelsDetail.useQuery({ days, scope, recentLimit: 30 });

  const scopeTabs = useMemo(
    () =>
      [
        { id: "all" as const, label: "All models" },
        { id: "system" as const, label: "System (plan)" },
        { id: "custom" as const, label: "Custom (BYOK)" },
      ] as const,
    [],
  );

  if (detail.isLoading) {
    return <AiModelsLoading />;
  }

  const models = detail.data?.models ?? [];
  const totals = detail.data?.totals;
  const totalPages = Math.max(1, Math.ceil(models.length / MODELS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageModels = models.slice(
    (safePage - 1) * MODELS_PAGE_SIZE,
    safePage * MODELS_PAGE_SIZE,
  );
  const canPrev = safePage > 1 && totalPages > 1 && !detail.isFetching;
  const canNext = safePage < totalPages && totalPages > 1 && !detail.isFetching;

  return (
    <div className="h-full space-y-8 overflow-y-auto">
      <div className="bg-background border-b">
        <div className="px-8 pt-2 pb-2">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/analytics')}
            className="text-muted-foreground hover:text-foreground mb-[8px] -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <PageHeader
          title="AI model usage"
          description="Per-model request and token detail for system and BYOK models. System usage debits your plan token pool; custom usage is ledger-only."
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
          className="px-8 pb-6"
        />
      </div>
      <div className="px-8 space-y-8">
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {scopeTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setScope(tab.id);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    scope === tab.id
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDays(d);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
                    days === d
                      ? "border-sky-600 bg-sky-50 text-sky-800 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Requests" value={formatNumber(totals?.requests ?? 0)} />
            <Stat label="Total tokens" value={formatNumber(totals?.totalTokens ?? 0)} />
            <Stat
              label="System tokens"
              value={formatNumber(totals?.systemTokens ?? 0)}
              hint="Debits plan pool"
            />
            <Stat
              label="Custom tokens"
              value={formatNumber(totals?.customTokens ?? 0)}
              hint="BYOK · no plan debit"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xl font-medium">Models</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Expand a model for token breakdown and recent invocation logs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[min(70vh,720px)] rounded-lg border">
            {detail.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading model usage…</div>
            ) : models.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No model usage in the last {days} days
                {scope !== "all" ? ` for ${scope} models` : ""}.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full px-2">
                {pageModels.map((row) => {
                  const id = row.modelId || row.slug || row.displayName || row.model;
                  const errorRate =
                    row.requests > 0 ? Math.round((row.errors / row.requests) * 100) : 0;
                  return (
                    <AccordionItem key={String(id)} value={String(id)}>
                      <AccordionTrigger className="hover:no-underline px-2 [&>svg]:hidden group">
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex items-center justify-center h-8 w-8 rounded hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-700 shrink-0 transition-colors cursor-pointer">
                              <Play className="h-3 w-3 shrink-0 fill-current transition-transform duration-150 group-data-[state=open]:rotate-90" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-medium text-foreground">
                                  {row.displayName || row.model}
                                </span>
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    row.isCustom
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                      : "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
                                  )}
                                >
                                  {row.isCustom ? "Custom" : "System"}
                                </span>
                              </div>
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {[row.provider, row.apiModelId || row.slug].filter(Boolean).join(" · ") ||
                                  "Model"}
                                {row.lastUsedAt
                                  ? ` · Last ${new Date(row.lastUsedAt).toLocaleString()}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            <div>{formatNumber(row.requests)} req</div>
                            <div>{formatNumber(row.totalTokens)} tok</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-4">
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          <MiniStat label="Requests" value={formatNumber(row.requests)} />
                          <MiniStat label="Input" value={formatNumber(row.inputTokens)} />
                          <MiniStat label="Output" value={formatNumber(row.outputTokens)} />
                          <MiniStat label="Total" value={formatNumber(row.totalTokens)} />
                          <MiniStat label="Errors" value={`${formatNumber(row.errors)} (${errorRate}%)`} />
                          <MiniStat label="Avg latency" value={formatDuration(row.avgDurationMs)} />
                        </div>

                        {(row.recent?.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No invocations recorded for this model in the selected window.
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
                                  <TableHead className="text-zinc-400">Latency</TableHead>
                                  <TableHead className="text-zinc-400">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.recent.map((log) => (
                                  <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap text-xs">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs">{log.action}</TableCell>
                                    <TableCell className="tabular-nums text-xs">
                                      {formatNumber(log.inputTokens)}
                                    </TableCell>
                                    <TableCell className="tabular-nums text-xs">
                                      {formatNumber(log.outputTokens)}
                                    </TableCell>
                                    <TableCell className="tabular-nums text-xs">
                                      {formatNumber(log.totalTokens)}
                                    </TableCell>
                                    <TableCell className="tabular-nums text-xs">
                                      {formatDuration(log.requestDuration)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {log.success ? (
                                        <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                                      ) : (
                                        <span
                                          className="text-amber-700 dark:text-amber-400"
                                          title={log.errorMessage || undefined}
                                        >
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
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
