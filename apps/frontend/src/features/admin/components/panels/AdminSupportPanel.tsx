"use client";

import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Bug, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

function person(u: any) {
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.username || u?.email || "Unknown";
}

export default function AdminSupportPanel() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"audit" | "bugs">("audit");

  // Audit logs
  const [auditQuery, setAuditQuery] = useState("");
  const [auditSeverity, setAuditSeverity] = useState<string>("ALL");
  const [auditCategory, setAuditCategory] = useState<string>("ALL");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(50);

  const audit = trpc.admin.auditLogs.useQuery(
    {
      query: auditQuery.trim() || undefined,
      severity: auditSeverity === "ALL" ? undefined : auditSeverity,
      category: auditCategory === "ALL" ? undefined : auditCategory,
      page: auditPage,
      pageSize: auditPageSize,
    },
    { placeholderData: keepPreviousData, staleTime: 10_000 }
  );

  const auditTotal = audit.data?.total ?? 0;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));

  // Bug reports (AgentFeedback)
  const [handled, setHandled] = useState<string>("UNHANDLED");
  const [bugsPage, setBugsPage] = useState(1);
  const [bugsPageSize, setBugsPageSize] = useState(25);

  const bugs = trpc.admin.bugReports.useQuery(
    {
      handled: handled === "ALL" ? undefined : handled === "HANDLED",
      page: bugsPage,
      pageSize: bugsPageSize,
    },
    { placeholderData: keepPreviousData, staleTime: 10_000 }
  );

  const setHandledMutation = trpc.admin.setBugReportHandled.useMutation({
    onSuccess: async () => {
      await utils.admin.bugReports.invalidate();
    },
  });

  const bugItems = bugs.data?.items ?? [];
  const bugTotal = bugs.data?.total ?? 0;
  const bugTotalPages = Math.max(1, Math.ceil(bugTotal / bugsPageSize));

  const auditCategoryOptions = useMemo(() => {
    const values = new Set<string>();
    (audit.data?.items ?? []).forEach((i: any) => {
      if (i.category) values.add(String(i.category));
    });
    return ["ALL", ...Array.from(values).sort()];
  }, [audit.data?.items]);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5 rounded-xl h-auto border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm shadow-inner">
          <TabsTrigger value="audit" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all duration-300 py-2.5 px-5 group">
            <FileText className="h-4 w-4 mr-2.5 transition-transform duration-300 group-data-[state=active]:scale-110" />
            Audit logs
          </TabsTrigger>
          <TabsTrigger value="bugs" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all duration-300 py-2.5 px-5 group">
            <Bug className="h-4 w-4 mr-2.5 transition-transform duration-300 group-data-[state=active]:scale-110" />
            Bug reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-6 space-y-4">
          <Card className="relative overflow-hidden p-5 sm:p-6 border border-white/20 dark:border-white/10 shadow-lg shadow-indigo-500/5 dark:shadow-black/30 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full" />
            <div className="relative z-10">
              {/* Row 1: title */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-lg font-semibold tracking-tight flex items-center gap-2 text-foreground">
                    <ShieldAlert className="h-5 w-5 text-indigo-500" />
                    Audit logs
                  </div>
                  <div className="text-sm text-muted-foreground">Who did what, when. Filter by severity/category, search by title/entity.</div>
                </div>
              </div>

              {/* Row 2: search + filters — full width */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                  value={auditQuery}
                  onChange={(e) => {
                    setAuditQuery(e.target.value);
                    setAuditPage(1);
                  }}
                  placeholder="Search logs…"
                  className="h-10 bg-white dark:bg-zinc-950/30 flex-1 min-w-[160px]"
                />
                <Select
                  value={auditSeverity}
                  onValueChange={(v) => {
                    setAuditSeverity(v);
                    setAuditPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All severity</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARN">Warn</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={auditCategory}
                  onValueChange={(v) => {
                    setAuditCategory(v);
                    setAuditPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditCategoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(auditPageSize)} onValueChange={(v) => setAuditPageSize(Number(v))}>
                  <SelectTrigger className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="cursor-pointer h-10 gap-2" onClick={() => audit.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="relative z-10 mt-6 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-900/20 backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                  <TableRow className="hover:bg-transparent border-zinc-200/50 dark:border-zinc-800/50">
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(audit.data?.items ?? []).length ? (
                    (audit.data?.items ?? []).map((l: any) => (
                      <TableRow key={l.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors duration-300 border-zinc-200/50 dark:border-zinc-800/50">
                        <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold truncate max-w-[220px]">{person(l.user)}</div>
                          <div className="text-muted-foreground truncate max-w-[220px]">{l.user?.email || "—"}</div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[520px] truncate">{l.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.category}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border",
                              l.severity === "ERROR"
                                ? "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/20 dark:text-red-200 dark:border-red-900/40"
                                : l.severity === "WARN"
                                  ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-900/40"
                                  : "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-950/20 dark:text-zinc-200 dark:border-zinc-800/60"
                            )}
                          >
                            {l.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                        {audit.isLoading ? "Loading…" : "No logs found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-4">
              <div className="text-xs text-muted-foreground">
                {audit.isLoading ? "Loading…" : `${auditTotal.toLocaleString()} total`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 cursor-pointer text-xs border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-all"
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                >
                  ← Prev
                </Button>
                <span className="text-xs text-muted-foreground px-1">{auditPage} / {auditTotalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 cursor-pointer text-xs border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-all"
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage >= auditTotalPages}
                >
                  Next →
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="mt-6 space-y-4">
          <Card className="relative overflow-hidden p-5 sm:p-6 border border-white/20 dark:border-white/10 shadow-lg shadow-amber-500/5 dark:shadow-black/30 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />
            <div className="relative z-10">
              {/* Row 1: title */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-lg font-semibold tracking-tight flex items-center gap-2 text-foreground">
                    <Bug className="h-5 w-5 text-amber-500" />
                    User bug reports
                  </div>
                  <div className="text-sm text-muted-foreground">Collected from agent feedback comments/suggestions. Mark as handled to keep the inbox clean.</div>
                </div>
              </div>

              {/* Row 2: filters — full width */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Select
                  value={handled}
                  onValueChange={(v) => {
                    setHandled(v);
                    setBugsPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer w-[160px]">
                    <SelectValue placeholder="Handled" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNHANDLED">Unhandled</SelectItem>
                    <SelectItem value="HANDLED">Handled</SelectItem>
                    <SelectItem value="ALL">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(bugsPageSize)} onValueChange={(v) => setBugsPageSize(Number(v))}>
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
                <Button variant="outline" className="cursor-pointer h-10 gap-2" onClick={() => bugs.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="relative z-10 mt-6 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-900/20 backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
                  <TableRow className="hover:bg-transparent border-zinc-200/50 dark:border-zinc-800/50">
                    <TableHead className="w-[72px]">Handled</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugItems.length ? (
                    bugItems.map((f: any) => {
                      const isHandled = Boolean((f.metadata as any)?.handled);
                      return (
                        <TableRow key={f.id} className={cn("transition-colors duration-300 border-zinc-200/50 dark:border-zinc-800/50 hover:bg-amber-50/40 dark:hover:bg-amber-900/20", isHandled ? "opacity-60" : "")}>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={isHandled}
                                onCheckedChange={(v) => setHandledMutation.mutate({ feedbackId: f.id, handled: Boolean(v) })}
                                disabled={setHandledMutation.isPending}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">
                            <div className="font-semibold truncate max-w-[240px]">{person(f.user)}</div>
                            <div className="text-muted-foreground truncate max-w-[240px]">{f.user?.email}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.aiAgent?.name || "—"}</TableCell>
                          <TableCell className="max-w-[520px]">
                            <div className="text-sm font-medium">{f.comment || f.suggestions || "—"}</div>
                            {Array.isArray(f.issueCategories) && f.issueCategories.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {f.issueCategories.slice(0, 6).map((c: string) => (
                                  <Badge key={c} variant="secondary" className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/30">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                        {bugs.isLoading ? "Loading…" : "No bug reports found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-4">
              <div className="text-xs text-muted-foreground">
                {bugs.isLoading ? "Loading…" : `${bugTotal.toLocaleString()} total`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 cursor-pointer text-xs border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-all"
                  onClick={() => setBugsPage((p) => Math.max(1, p - 1))}
                  disabled={bugsPage <= 1}
                >
                  ← Prev
                </Button>
                <span className="text-xs text-muted-foreground px-1">{bugsPage} / {bugTotalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 cursor-pointer text-xs border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 transition-all"
                  onClick={() => setBugsPage((p) => Math.min(bugTotalPages, p + 1))}
                  disabled={bugsPage >= bugTotalPages}
                >
                  Next →
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

