"use client";

import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CreditCard, RefreshCw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

function formatMoney(v: number, currency = "USD") {
  const nf = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 });
  return nf.format(v);
}

function name(u: any) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email;
}

export default function AdminBillingPanel() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [overrideSubId, setOverrideSubId] = useState<string | null>(null);

  const subs = trpc.admin.subscriptionsList.useQuery(
    {
      query: query.trim() || undefined,
      status: status === "ALL" ? undefined : status,
      page,
      pageSize,
    },
    { placeholderData: keepPreviousData, staleTime: 10_000 }
  );

  const failed = trpc.admin.failedPayments.useQuery({ days: 14, page: 1, pageSize: 25 }, { staleTime: 10_000 });
  const plans = trpc.admin.plansList.useQuery(undefined, { staleTime: 60_000 });

  const selectedSub = useMemo(() => (subs.data?.items ?? []).find((s: any) => s.id === overrideSubId) ?? null, [subs.data, overrideSubId]);
  const [planId, setPlanId] = useState<string>("");
  const [subStatus, setSubStatus] = useState<string>("ACTIVE");

  const override = trpc.admin.subscriptionOverridePlan.useMutation({
    onSuccess: async () => {
      setOverrideSubId(null);
      await Promise.all([utils.admin.subscriptionsList.invalidate(), utils.admin.overview.invalidate()]);
    },
  });

  const total = subs.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden p-5 sm:p-6 border border-white/20 dark:border-white/10 shadow-lg shadow-zinc-200/30 dark:shadow-black/30 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl xl:col-span-2 transition-all duration-300">
          {/* Row 1: title */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-lg font-semibold tracking-tight">Subscriptions</div>
              <div className="text-sm text-muted-foreground">Plan overview per account + manual overrides.</div>
            </div>
          </div>

          {/* Row 2: search + filters — full width */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search email / plan…"
              className="h-10 bg-white dark:bg-zinc-950/30 flex-1 min-w-[180px]"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="TRIALING">Trialing</SelectItem>
                <SelectItem value="PAST_DUE">Past due</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="ENDED">Ended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-900/20 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                <TableRow className="hover:bg-transparent border-zinc-200/50 dark:border-zinc-800/50">
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Period end</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(subs.data?.items ?? []).length ? (
                  (subs.data?.items ?? []).map((s: any) => (
                    <TableRow
                      key={s.id}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors duration-300 border-zinc-200/50 dark:border-zinc-800/50 cursor-pointer group"
                      onClick={() => {
                        setPlanId(s.planId);
                        setSubStatus(s.status);
                        setOverrideSubId(s.id);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <div className="truncate">{name(s.user)}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.plan?.displayName || s.plan?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatMoney(s.plan?.price ?? 0, s.plan?.currency || "USD")} / {String((s.plan as any)?.billingPeriod || "—").toLowerCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border",
                            s.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-200 dark:border-emerald-900/40"
                              : s.status === "PAST_DUE"
                                ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-900/40"
                                : "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-950/20 dark:text-zinc-200 dark:border-zinc-800/60"
                          )}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4 text-xs text-muted-foreground">
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                      {subs.isLoading ? "Loading…" : "No subscriptions found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-4">
            <div className="text-xs text-muted-foreground">
              {subs.isLoading ? "Loading…" : `${total.toLocaleString()} total`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3 cursor-pointer text-xs font-medium border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-all"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Prev
              </Button>
              <span className="text-xs text-muted-foreground px-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3 cursor-pointer text-xs font-medium border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-all"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5 sm:p-6 border border-white/20 dark:border-white/10 shadow-lg shadow-amber-500/5 dark:shadow-black/30 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Failed payments
                </div>
                <div className="text-sm text-muted-foreground">Alerts from the last 14 days.</div>
              </div>
              <Button variant="outline" className="h-9 cursor-pointer gap-2" onClick={() => failed.refetch()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

          <div className="mt-4 space-y-2">
            {(failed.data?.items ?? []).length ? (
              (failed.data?.items ?? []).slice(0, 10).map((p: any) => (
                <div key={p.id} className="rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/15 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{name(p.user)}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.user.email}</div>
                    </div>
                    <Badge className="border border-amber-200 dark:border-amber-900/40 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                      FAILED
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      {formatMoney(p.amount, p.currency || "USD")}
                    </span>
                    <span>{new Date(p.createdAt).toLocaleString()}</span>
                  </div>
                  {p.failureReason ? <div className="mt-2 text-xs text-amber-900/90 dark:text-amber-100/90">{p.failureReason}</div> : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/20 p-4 text-sm text-muted-foreground">
                {failed.isLoading ? "Loading…" : "No failed payments in this window."}
              </div>
            )}
          </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={!!overrideSubId}
        onOpenChange={(o) => {
          if (!o) setOverrideSubId(null);
        }}
      >
        <DialogContent className="max-w-2xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-white/20 dark:border-zinc-800/80 shadow-2xl overflow-hidden p-0">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
          <DialogHeader className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-500" />
              Manual plan override
            </DialogTitle>
          </DialogHeader>

          {selectedSub ? (
            <div className="p-6 space-y-6">
              <Card className="p-5 border border-white/20 dark:border-zinc-800/50 shadow-sm bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 bg-indigo-500" />
                <div className="relative z-10">
                  <div className="text-sm font-semibold">{name(selectedSub.user)}</div>
                <div className="text-xs text-muted-foreground">{selectedSub.user.email}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Current: <span className="font-semibold text-foreground">{selectedSub.plan?.displayName || selectedSub.plan?.name}</span> •{" "}
                  <span className="font-semibold text-foreground">{selectedSub.status}</span>
                </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Plan</div>
                  <Select value={planId} onValueChange={setPlanId}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950/30">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans.data ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.displayName || p.name} • {formatMoney(p.price, p.currency)} / {String(p.billingPeriod).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</div>
                  <Select value={subStatus} onValueChange={setSubStatus}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950/30">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {["ACTIVE", "TRIALING", "PAST_DUE", "CANCELLED", "ENDED"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" className="cursor-pointer" onClick={() => setOverrideSubId(null)} disabled={override.isPending}>
                  Cancel
                </Button>
                <Button
                  className="cursor-pointer shadow-sm bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 gap-2"
                  onClick={() => override.mutate({ subscriptionId: selectedSub.id, planId: planId || selectedSub.planId, status: subStatus })}
                  disabled={override.isPending || !planId}
                >
                  <Wrench className="h-4 w-4" />
                  Apply override
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Subscription not found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

