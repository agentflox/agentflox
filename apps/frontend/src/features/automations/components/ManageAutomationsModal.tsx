"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Search, Zap, Bot } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ActiveToggle } from "./shared/ActiveToggle";
import { LogicSummary } from "./shared/LogicSummary";
import type { AutomationScope } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";

function AgentIcon({ className }: { className?: string }) {
    return (
        <img
            src="/images/ai-agent-removebg-preview.png"
            alt=""
            aria-hidden
            className={cn("h-5 w-5 shrink-0", className)}
        />
    );
}

function lastChip(status?: string) {
  if (!status) return null;
  const map: Record<string, string> = {
    SUCCESS: "bg-emerald-50 text-emerald-700",
    FAILED: "bg-red-50 text-red-700",
    PARTIAL: "bg-amber-50 text-amber-700",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${map[status] || "bg-zinc-100"}`}>{status}</span>;
}

const TAB_ITEMS = [
  { value: "manage", label: "Manage" },
  { value: "usage", label: "Usage" },
  { value: "activity", label: "Activity" },
  { value: "webhooks", label: "Webhooks" },
  { value: "recurring", label: "Recurring" },
];

export function ManageAutomationsModal({
  open,
  onOpenChange,
  scope,
  onCreate,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scope: AutomationScope;
  onCreate: (mode: "classic" | "agent") => void;
  onEdit: (id: string, mode: "classic" | "agent") => void;
}) {
  const [tab, setTab] = useState("manage");
  const [search, setSearch] = useState("");
  const list = trpc.automation.list.useQuery(
    { workspaceId: scope.workspaceId || "", spaceId: scope.spaceId, teamId: scope.teamId, projectId: scope.projectId, search },
    { enabled: open && !!scope.workspaceId },
  );
  const usage = trpc.automation.usageSummary.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: open && tab === "usage" },
  );
  const logs = trpc.automation.listLogs.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: open && tab === "activity" },
  );
  const setActive = trpc.automation.setActive.useMutation({ onSuccess: () => list.refetch() });
  const rotate = trpc.automation.rotateWebhookSecret.useMutation();
  const createHook = trpc.automation.createWebhookTrigger.useMutation();

  const recurring = useMemo(
    () => (list.data?.items ?? []).filter((a: any) => a.isScheduled || a.triggers?.some((t: any) => t.triggerType === "EVERY_SCHEDULED_TIME")),
    [list.data],
  );
  const webhooks = useMemo(
    () => (list.data?.items ?? []).filter((a: any) => a.triggers?.some((t: any) => t.triggerType === "WEBHOOK")),
    [list.data],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Automations</DialogTitle>
        </VisuallyHidden>
        <div className="flex items-center gap-2 px-5 py-3 border-b">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h2 className="font-semibold">Automations</h2>
        </div>
        <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="flex flex-row items-stretch">
          <TabsList className="flex flex-col h-[600px] w-44 shrink-0 items-stretch justify-start gap-0.5 rounded-none border-r bg-zinc-50/60 p-2">
            {TAB_ITEMS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="flex-none w-full justify-start rounded-md px-3 h-10 text-sm font-medium cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 text-zinc-500 hover:text-zinc-800"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-w-0 h-[600px] overflow-y-auto">
            <TabsContent value="manage" className="px-5 pb-5 pt-4 mt-0">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-zinc-600">{scope.contextName}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-zinc-900 hover:bg-zinc-700 text-white h-8 cursor-pointer">
                      Add Automation <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onCreate("classic")}>
                        <Zap className="h-4 w-4 text-sky-600" />
                        Classic
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer justify-between" onClick={() => onCreate("agent")}>
                        <span className="flex items-center gap-2">
                          <AgentIcon className="h-4 w-4 text-violet-600" />
                          Agent
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-1 h-4 bg-violet-100 text-violet-700 border-0">
                          New
                        </Badge>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs rounded-full border px-2 py-1">Active ({list.data?.activeCount ?? 0})</span>
                <div className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-md focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all overflow-hidden cursor-text">
                  <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                  <Input
                    variant="ghost"
                    className="flex-1 h-full border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="divide-y border rounded-lg">
                {(list.data?.items ?? []).map((rule: any) => {
                  const triggerType = rule.triggers?.[0]?.triggerType;
                  const actionType = Array.isArray(rule.actions) ? rule.actions[0]?.type : undefined;
                  const mismatch = rule.kind === "AGENT" && rule.isActive && (!rule.aiAgent || !rule.aiAgent.isActive || rule.aiAgent.isPaused);
                  const last = rule.logs?.[0]?.status;
                  return (
                    <div key={rule.id} className="p-4 flex items-start justify-between gap-3">
                      <button type="button" className="text-left flex-1 cursor-pointer" onClick={() => onEdit(rule.id, rule.kind === "AGENT" ? "agent" : "classic")}>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{rule.name}</p>
                          {lastChip(last)}
                          {mismatch && <span className="text-[10px] text-amber-700">Agent paused</span>}
                        </div>
                        <div className="mt-1">
                          <LogicSummary triggerType={triggerType} actionType={actionType} />
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{rule.description || "Enter description..."}</p>
                      </button>
                      <ActiveToggle checked={rule.isActive} onCheckedChange={(v) => setActive.mutate({ id: rule.id, isActive: v })} />
                    </div>
                  );
                })}
                {(list.data?.items ?? []).length === 0 && (
                  <p className="p-8 text-sm text-center text-zinc-500">No automations yet</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="usage" className="px-5 pb-6 pt-4 mt-0">
              <div className="grid grid-cols-3 gap-3 py-4">
                <div className="rounded-lg border p-4"><p className="text-xs text-zinc-500">Active</p><p className="text-2xl font-semibold">{usage.data?.active ?? 0}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-zinc-500">Success</p><p className="text-2xl font-semibold">{usage.data?.success ?? 0}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-zinc-500">Failed</p><p className="text-2xl font-semibold">{usage.data?.failed ?? 0}</p></div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="px-5 pb-6 pt-4 mt-0">
              {(logs.data?.items ?? []).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b text-sm">
                  <span>{log.automation?.name}</span>
                  {lastChip(log.status)}
                  <span className="text-xs text-zinc-400">{new Date(log.executedAt).toLocaleString()}</span>
                </div>
              ))}
              {(logs.data?.items ?? []).length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No activity yet</p>}
            </TabsContent>

            <TabsContent value="webhooks" className="px-5 pb-6 pt-4 mt-0">
              {webhooks.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">{rule.name}</span>
                  <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => (rule.webhookSecret ? rotate : createHook).mutate({ id: rule.id })}>
                    {rule.webhookSecret ? "Rotate secret" : "Create webhook"}
                  </Button>
                </div>
              ))}
              {webhooks.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No webhook automations</p>}
            </TabsContent>

            <TabsContent value="recurring" className="px-5 pb-6 pt-4 mt-0">
              {recurring.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between py-2 border-b text-sm">
                  <span>{rule.name}</span>
                  <span className="text-xs text-zinc-500">{rule.cronExpression || "Scheduled"}</span>
                </div>
              ))}
              {recurring.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No recurring automations</p>}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}