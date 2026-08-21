"use client";

import { Button } from "@/components/ui/button";
import { Settings, Check, ChevronDown, Zap } from "lucide-react";
import { useAutomations } from "../hooks/useAutomations";
import { ActiveToggle } from "./shared/ActiveToggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AutomationScope } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function AutomationsHubPopover({
  scope,
  onManage,
  onCreate,
}: {
  scope: AutomationScope;
  onManage: () => void;
  onCreate: (mode: "classic" | "agent") => void;
}) {
  const { list, setActive } = useAutomations(scope);
  const items = list.data?.items ?? [];
  const activeCount = list.data?.activeCount ?? 0;
  const loc = scope.contextName || "this location";

  return (
    <div className="w-[560px] max-h-[620px] overflow-y-auto bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-zinc-900">
          Automations in {loc}
        </h3>
        <div className="flex items-center gap-2">
          {onManage && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-zinc-700 cursor-pointer"
              onClick={onManage}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Manage automations
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white h-8 cursor-pointer">
                Add <ChevronDown className="h-4 w-4 ml-1 mt-0.5" />
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
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-violet-600 font-medium">{activeCount} total active</span>
      </div>
      {list.isLoading ? (
        <p className="text-xs text-zinc-400 py-8 text-center">Loading automations…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-zinc-400 py-8 text-center">No automations in {loc} yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((rule: any) => {
            const agentMismatch =
              rule.kind === "AGENT" && rule.isActive && (!rule.aiAgent || !rule.aiAgent.isActive);
            return (
              <div
                key={rule.id}
                className={cn(
                  "rounded-xl border p-3 min-h-[88px]",
                  rule.isActive ? "border-violet-300 bg-violet-50" : "border-zinc-200",
                  agentMismatch && "border-amber-300 bg-amber-50",
                )}
              >
                <div className="flex justify-between items-start">
                  {rule.isActive ? <Check className="h-4 w-4 text-violet-600" /> : <div />}
                  <ActiveToggle
                    checked={rule.isActive}
                    onCheckedChange={(v) => setActive.mutate({ id: rule.id, isActive: v })}
                  />
                </div>
                <div className="mt-3 flex items-start gap-2">
                  {rule.kind === "AGENT" ? (
                    rule.aiAgent?.avatar ? (
                      <img src={rule.aiAgent.avatar} alt="" className="h-5 w-5 rounded object-cover shrink-0 mt-0.5" />
                    ) : (
                      <AgentIcon className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <Zap className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-2">{rule.name}</p>
                    {rule.description ? (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">{rule.description}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
