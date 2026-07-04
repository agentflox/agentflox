"use client";

import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, ShieldCheck, UserCog, UserX, X } from "lucide-react";
import { cn } from "@/lib/utils";

function userLabel(u: any) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.username || u.email;
}

function toCsv(rows: any[]) {
  const header = ["id", "email", "name", "username", "role", "isActive", "isVerified", "createdAt", "lastActiveAt"];
  const escape = (v: any) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.email,
        [r.firstName, r.lastName].filter(Boolean).join(" "),
        r.username,
        r.role,
        r.isActive,
        r.isVerified,
        r.createdAt,
        r.lastActiveAt,
      ].map(escape).join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsersPanel() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("ALL");
  const [isActive, setIsActive] = useState<string>("ALL");
  const [sort, setSort] = useState<"createdAt" | "lastActiveAt" | "email">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const list = trpc.admin.usersList.useQuery(
    {
      query: query.trim() || undefined,
      role: role === "ALL" ? undefined : role,
      isActive: isActive === "ALL" ? undefined : isActive === "ACTIVE",
      sort,
      order,
      page,
      pageSize,
    },
    { placeholderData: keepPreviousData, staleTime: 10_000 }
  );

  const detail = trpc.admin.userDetail.useQuery({ userId: detailUserId || "" }, { enabled: !!detailUserId });

  const setRoleMutation = trpc.admin.userSetRole.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.usersList.invalidate(), detailUserId ? utils.admin.userDetail.invalidate({ userId: detailUserId }) : Promise.resolve()]);
    },
  });

  const setActiveMutation = trpc.admin.userSetActive.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.usersList.invalidate(), detailUserId ? utils.admin.userDetail.invalidate({ userId: detailUserId }) : Promise.resolve()]);
    },
  });

  const bulkSetActiveMutation = trpc.admin.usersBulkSetActive.useMutation({
    onSuccess: async () => {
      setSelected({});
      await utils.admin.usersList.invalidate();
    },
  });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allChecked = items.length > 0 && items.every((u: any) => selected[u.id]);
  const someChecked = items.some((u: any) => selected[u.id]) && !allChecked;

  const detailUser = detail.data?.user;

  return (
    <div className="space-y-5">
      {/* Top filter bar: search | role + status | export — all inline, same height */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</div>
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Email, username, first/last name…"
            className="h-10 bg-white dark:bg-zinc-950/30"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</div>
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[130px] bg-white dark:bg-zinc-950/30 cursor-pointer">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="MODERATOR">Moderator</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
          <Select
            value={isActive}
            onValueChange={(v) => {
              setIsActive(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[130px] bg-white dark:bg-zinc-950/30 cursor-pointer">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end pt-5">
          <Button
            variant="outline"
            className="cursor-pointer gap-2 h-10 border-dashed hover:border-solid hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
            onClick={() => downloadText(`users_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(items))}
            disabled={items.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Floating selection banner */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/95 px-5 py-3 shadow-2xl shadow-zinc-200/60 dark:shadow-black/60 backdrop-blur-md ring-1 ring-zinc-100 dark:ring-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {selectedIds.length} {selectedIds.length === 1 ? "user" : "users"} selected
          </span>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected({})}
            className="h-8 gap-1.5 px-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Deselect
          </Button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 cursor-pointer"
            onClick={() => bulkSetActiveMutation.mutate({ userIds: selectedIds, isActive: false })}
            disabled={bulkSetActiveMutation.isPending}
          >
            <UserX className="h-3.5 w-3.5" />
            Suspend
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-sm cursor-pointer"
            onClick={() => bulkSetActiveMutation.mutate({ userIds: selectedIds, isActive: true })}
            disabled={bulkSetActiveMutation.isPending}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Activate
          </Button>
        </div>
      )}

      <Card className="relative overflow-hidden p-0 border border-white/20 dark:border-white/10 shadow-lg shadow-zinc-200/30 dark:shadow-black/30 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md">
          <div className="space-y-1">
            <div className="text-sm font-semibold tracking-tight text-foreground">Users directory</div>
            <div className="text-xs text-muted-foreground">
              {list.isLoading ? "Loading…" : `${total.toLocaleString()} total • page ${page} / ${totalPages}`}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="h-9 w-[160px] bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Sort: Created</SelectItem>
                <SelectItem value="lastActiveAt">Sort: Last active</SelectItem>
                <SelectItem value="email">Sort: Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={(v) => setOrder(v as any)}>
              <SelectTrigger className="h-9 w-[100px] bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-[120px] bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer">
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
        </div>

        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
            <TableRow className="hover:bg-transparent border-zinc-200/50 dark:border-zinc-800/50">
              <TableHead className="w-[42px]">
                <div className="flex items-center justify-center">
                  <Checkbox
                    className="cursor-pointer"
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(v) => {
                      const next: Record<string, boolean> = { ...selected };
                      items.forEach((u: any) => {
                        next[u.id] = Boolean(v);
                      });
                      setSelected(next);
                    }}
                  />
                </div>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((u: any) => (
                <TableRow key={u.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors duration-300 border-zinc-200/50 dark:border-zinc-800/50 group">
                  <TableCell className="w-[42px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        className="cursor-pointer"
                        checked={Boolean(selected[u.id])}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [u.id]: Boolean(v) }))}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      className="flex items-center gap-3 text-left cursor-pointer group"
                      onClick={() => setDetailUserId(u.id)}
                    >
                      <Avatar className="h-9 w-9 border border-zinc-200/70 dark:border-zinc-800/60">
                        <AvatarImage src={u.avatar || undefined} />
                        <AvatarFallback className="text-xs">{(u.email || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold tracking-tight truncate group-hover:underline">{userLabel(u)}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/30">
                      {u.role || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "border",
                        u.isActive
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-200 dark:border-emerald-900/40"
                          : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/20 dark:text-red-200 dark:border-red-900/40"
                      )}
                    >
                      {u.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4 text-xs text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="text-sm text-muted-foreground">{list.isLoading ? "Loading…" : "No users found."}</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">{selectedIds.length ? `${selectedIds.length} selected` : ""}</div>
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

      <Dialog open={!!detailUserId} onOpenChange={(o) => !o && setDetailUserId(null)}>
        <DialogContent className="max-w-4xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-white/20 dark:border-zinc-800/80 shadow-2xl overflow-hidden p-0">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <DialogHeader className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-500" />
              User profile
            </DialogTitle>
          </DialogHeader>

          {detail.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : detailUser ? (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-5 border border-white/20 dark:border-zinc-800/50 shadow-sm bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 bg-blue-500" />
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-zinc-200/70 dark:border-zinc-800/60">
                    <AvatarImage src={detailUser.avatar || undefined} />
                    <AvatarFallback className="text-xs">{(detailUser.email || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-semibold tracking-tight truncate">{userLabel(detailUser)}</div>
                    <div className="text-xs text-muted-foreground truncate">{detailUser.email}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Role</div>
                  <div className="font-semibold">{detailUser.role || "—"}</div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-semibold">{detailUser.isActive ? "Active" : "Suspended"}</div>
                  <div className="text-muted-foreground">Verified</div>
                  <div className="font-semibold">{detailUser.isVerified ? "Yes" : "No"}</div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-semibold">{new Date(detailUser.createdAt).toLocaleString()}</div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</div>
                  <div className="flex flex-col gap-2">
                    <Select
                      value={detailUser.role || "—"}
                      onValueChange={(v) => setRoleMutation.mutate({ userId: detailUser.id, role: v === "—" ? null : v })}
                    >
                      <SelectTrigger className="bg-white dark:bg-zinc-950/30">
                        <SelectValue placeholder="Set role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="—">No role</SelectItem>
                        <SelectItem value="USER">USER</SelectItem>
                        <SelectItem value="MODERATOR">MODERATOR</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant={detailUser.isActive ? "outline" : "primary"}
                      className={cn(
                        "cursor-pointer gap-2",
                        detailUser.isActive
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      )}
                      onClick={() => setActiveMutation.mutate({ userId: detailUser.id, isActive: !detailUser.isActive })}
                      disabled={setActiveMutation.isPending}
                    >
                      {detailUser.isActive ? <UserX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      {detailUser.isActive ? "Suspend user" : "Activate user"}
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Note: this panel is platform-level and does not modify workspace roles.
                  </div>
                </div>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <Card className="p-5 border border-white/20 dark:border-zinc-800/50 shadow-sm bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold tracking-tight">Subscription</div>
                      <div className="text-xs text-muted-foreground">Current plan details and status.</div>
                    </div>
                    <Badge variant="secondary" className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/30">
                      {detail.data?.subscription?.status || "—"}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm">
                    {detail.data?.subscription ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Plan</div>
                        <div className="font-semibold">{detail.data.subscription.plan?.displayName || detail.data.subscription.plan?.name}</div>
                        <div className="text-muted-foreground">Period</div>
                        <div className="font-semibold">{String((detail.data.subscription.plan as any)?.billingPeriod || "—")}</div>
                        <div className="text-muted-foreground">Current end</div>
                        <div className="font-semibold">{new Date(detail.data.subscription.currentPeriodEnd).toLocaleString()}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No subscription found.</div>
                    )}
                  </div>
                </Card>

                <Card className="p-0 overflow-hidden border border-white/20 dark:border-zinc-800/50 shadow-sm bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md">
                  <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
                    <div className="font-semibold tracking-tight">Recent activity</div>
                    <div className="text-xs text-muted-foreground">Latest 50 activity log entries for this user.</div>
                  </div>
                  <div className="max-h-[360px] overflow-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/50">
                        <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800/60">
                          <TableHead>When</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Severity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detail.data?.activity ?? []).length ? (
                          (detail.data?.activity ?? []).map((log: any) => (
                            <TableRow key={log.id} className="border-zinc-100 dark:border-zinc-800/60">
                              <TableCell className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                              <TableCell className="font-medium">{log.title}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{log.category}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/30">
                                  {log.severity}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                              No activity logs found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">User not found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

