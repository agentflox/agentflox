"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ExecutionsLoading from "./loading";
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
import { ArrowLeft, Bot, Network, Play, Sparkles, Wrench, MessagesSquare, Users } from "lucide-react";

type KindFilter = "all" | "composite_tool" | "workforce" | "agent" | "swarm" | "chat";

const KIND_META: Record<
  Exclude<KindFilter, "all">,
  { label: string; Icon: typeof Wrench; entity: string }
> = {
  composite_tool: { label: "Tools", Icon: Wrench, entity: "Tool" },
  workforce: { label: "Workforces", Icon: Network, entity: "Workforce" },
  agent: { label: "Agents", Icon: Bot, entity: "Agent" },
  swarm: { label: "Swarms", Icon: Users, entity: "Workforce" },
  chat: { label: "Chats", Icon: MessagesSquare, entity: "Agent" },
};

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

function formatDuration(ms: number | null | undefined) {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function statusTone(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return "text-emerald-600 dark:text-emerald-400";
    case "FAILED":
      return "text-amber-700 dark:text-amber-400";
    case "CANCELLED":
      return "text-zinc-500";
    default:
      return "text-sky-700 dark:text-sky-400";
  }
}

function entityLines(row: {
  kind: string;
  toolName?: string | null;
  toolId?: string | null;
  agentName?: string | null;
  agentId?: string | null;
  workforceName?: string | null;
  workforceId?: string | null;
  conversationId?: string | null;
}) {
  const lines: Array<{ label: string; value: string }> = [];
  if (row.toolName || row.toolId) {
    lines.push({ label: "Tool", value: row.toolName || row.toolId || "—" });
  }
  if (row.agentName || row.agentId) {
    lines.push({ label: "Agent", value: row.agentName || row.agentId || "—" });
  }
  if (row.workforceName || row.workforceId) {
    lines.push({
      label: row.kind === "swarm" ? "Swarm workforce" : "Workforce",
      value: row.workforceName || row.workforceId || "—",
    });
  }
  if (row.conversationId) {
    lines.push({ label: "Conversation", value: row.conversationId });
  }
  return lines;
}

export default function ExecutionsUsagePage() {
  const router = useRouter();
  const [kind, setKind] = useState<KindFilter>("all");
  const [days, setDays] = useState<30 | 7 | 90>(30);
  const [page, setPage] = useState(1);

  const detail = trpc.usage.executionsDetail.useQuery({
    days,
    kind,
    page,
    pageSize: 30,
  });

  const kindTabs = useMemo(
    () =>
      [
        { id: "all" as const, label: "All" },
        { id: "composite_tool" as const, label: "Tools" },
        { id: "agent" as const, label: "Agents" },
        { id: "chat" as const, label: "Chats" },
        { id: "workforce" as const, label: "Workforces" },
        { id: "swarm" as const, label: "Swarms" },
      ] as const,
    [],
  );

  if (detail.isLoading) {
    return <ExecutionsLoading />;
  }

  const items = detail.data?.items ?? [];
  const totals = detail.data?.totals;
  const totalCount = detail.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 30));
  const canPrev = page > 1 && totalPages > 1 && !detail.isFetching;
  const canNext = page < totalPages && totalPages > 1 && !detail.isFetching;

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
          title="Execution usage"
          description="Each billed run against your plan execution quota — tool, agent, workforce, swarm, and chat."
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
              {kindTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setKind(tab.id);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    kind === tab.id
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
                    "rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors cursor-pointer",
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

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-semibold tabular-nums">
                {formatNumber(totals?.executions ?? 0)}
              </div>
            </div>
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.Icon;
              return (
                <div key={k} className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatNumber(totals?.byKind?.[k] ?? 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xl font-medium">Execution log</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatNumber(detail.data?.total ?? 0)} runs in the last {days} days
                {kind !== "all" ? ` · ${KIND_META[kind].label.toLowerCase()}` : ""}
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
                {page} / {totalPages}
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

          <ScrollArea className="h-[560px] rounded-lg border">
            {detail.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading executions…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No billed executions in this period. Runs will appear here when tools, agents, or
                workforces consume quota.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full px-2">
                {items.map((row) => {
                  const meta =
                    KIND_META[row.kind as keyof typeof KIND_META] ?? KIND_META.agent;
                  const lines = entityLines(row);
                  return (
                    <AccordionItem key={row.id} value={row.id}>
                      <AccordionTrigger className="hover:no-underline px-2 [&>svg]:hidden group">
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 text-left">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex items-center justify-center h-8 w-8 rounded hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-700 shrink-0 transition-colors cursor-pointer">
                              <Play className="h-3 w-3 shrink-0 fill-current transition-transform duration-150 group-data-[state=open]:rotate-90" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {row.label || meta.label}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {meta.label}
                                {lines[0] ? ` · ${lines[0].value}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            <div>{new Date(row.createdAt).toLocaleString()}</div>
                            <div className={cn("font-medium", statusTone(row.status))}>
                              {row.status}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-4">
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Kind</div>
                            <div className="text-sm font-semibold">{meta.label}</div>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Status</div>
                            <div className={cn("text-sm font-semibold", statusTone(row.status))}>
                              {row.status}
                            </div>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Duration</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {formatDuration(row.durationMs)}
                            </div>
                          </div>
                          <div className="rounded-md bg-muted/40 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">Started</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {new Date(row.startedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-zinc-400">Field</TableHead>
                                <TableHead className="text-zinc-400">Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lines.map((line) => (
                                <TableRow key={line.label}>
                                  <TableCell className="w-40 text-xs text-muted-foreground">
                                    {line.label}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs break-all">
                                    {line.value}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="text-xs text-muted-foreground">
                                  Run ID
                                </TableCell>
                                <TableCell className="font-mono text-xs break-all">
                                  {row.runId || "—"}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-xs text-muted-foreground">
                                  Billing key
                                </TableCell>
                                <TableCell className="font-mono text-xs break-all">
                                  {row.billingKey}
                                </TableCell>
                              </TableRow>
                              {(row.workspaceId || row.spaceId) && (
                                <>
                                  {row.workspaceId ? (
                                    <TableRow>
                                      <TableCell className="text-xs text-muted-foreground">
                                        Workspace
                                      </TableCell>
                                      <TableCell className="font-mono text-xs break-all">
                                        {row.workspaceId}
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                  {row.spaceId ? (
                                    <TableRow>
                                      <TableCell className="text-xs text-muted-foreground">
                                        Space
                                      </TableCell>
                                      <TableCell className="font-mono text-xs break-all">
                                        {row.spaceId}
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                </>
                              )}
                              {row.errorMessage ? (
                                <TableRow>
                                  <TableCell className="text-xs text-muted-foreground">
                                    Error
                                  </TableCell>
                                  <TableCell className="text-xs text-amber-700 dark:text-amber-400">
                                    {row.errorMessage}
                                  </TableCell>
                                </TableRow>
                              ) : null}
                            </TableBody>
                          </Table>
                        </div>
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
