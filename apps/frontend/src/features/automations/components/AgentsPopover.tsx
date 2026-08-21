"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AgentCard } from "./shared/AgentCard";
import type { AutomationScope } from "../types";
import { cn } from "@/lib/utils";

export type AgentPanelRequest = {
  mode: "builder" | "operator" | "executor";
  agentId?: string;
  initialTab?: "chat" | "profile";
};

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

export function AgentsPopover({
  scope,
  onOpenAgentPanel,
}: {
  scope: AutomationScope;
  onOpenAgentPanel: (req: AgentPanelRequest) => void;
}) {
  const agents = trpc.agent.list.useQuery({
    workspaceId: scope.workspaceId,
    spaceId: scope.spaceId,
    teamId: scope.teamId,
    projectId: scope.projectId,
    scopeMode: "exact",
    pageSize: 50,
    includeRelations: true,
  });
  const activate = trpc.agent.activate.useMutation({ onSuccess: () => agents.refetch() });
  const deactivate = trpc.agent.deactivate.useMutation({ onSuccess: () => agents.refetch() });
  const createAgent = trpc.agent.create.useMutation();

  const items = agents.data?.items ?? [];
  const activeCount = items.filter((a: any) => a.isActive).length;
  const locLabel =
    scope.contextType === "SPACE"
      ? "Space"
      : scope.contextType === "TEAM"
        ? "Team"
        : scope.contextType === "PROJECT"
          ? "Project"
          : "Workspace";

  const handleAdd = async () => {
    try {
      const agent = await createAgent.mutateAsync({
        name: "Untitled Agent",
        agentType: "TASK_EXECUTOR",
        systemPrompt: "You are a helpful AI agent.",
        status: "DRAFT",
        workspaceId: scope.workspaceId,
        ...(scope.contextType === "SPACE" ? { spaceId: scope.contextId } : {}),
        ...(scope.contextType === "PROJECT" ? { projectId: scope.contextId } : {}),
        ...(scope.contextType === "TEAM" ? { teamId: scope.contextId } : {}),
      });
      onOpenAgentPanel({ mode: "builder", agentId: agent.id, initialTab: "chat" });
    } catch {
      toast.error("Failed to create agent");
    }
  };

  return (
    <div className="w-[560px] max-h-[560px] flex flex-col bg-white rounded-xl shadow-lg">
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <AgentIcon className="h-5 w-5 text-violet-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-zinc-900">AI Agents</h3>
            </div>
            <p className="text-xs text-zinc-500">AI agents that automate how you work</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-zinc-900 text-white hover:bg-zinc-700 h-8 cursor-pointer"
            onClick={handleAdd}
          >
            Add <ChevronDown className="h-4 w-4 ml-1 mt-0.5" />
          </Button>
        </div>
      </div>
      <div className="px-4 pb-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-zinc-500">Agents in {scope.contextName || locLabel}</p>
          <span className="text-xs text-violet-600 font-medium">{activeCount} total active</span>
        </div>
        {agents.isLoading ? (
          <p className="text-xs text-zinc-400 py-8 text-center">Loading agents…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-zinc-400 py-8 text-center">No agents in this {locLabel.toLowerCase()} yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((agent: any) => (
              <AgentCard
                key={agent.id}
                title={agent.name}
                subtitle={
                  agent.description?.trim()
                    || (agent.owner?.name ? `by ${agent.owner.name}` : "Agent")
                }
                avatar={agent.avatar}
                color={agent.color}
                active={agent.isActive}
                warning={agent.isActive && agent.isPaused ? "Paused" : undefined}
                onToggle={async (v) => {
                  try {
                    if (v) await activate.mutateAsync({ agentId: agent.id });
                    else await deactivate.mutateAsync({ agentId: agent.id });
                  } catch (e: any) {
                    toast.error(e.message || "Failed to update agent");
                  }
                }}
                onEdit={() => onOpenAgentPanel({ mode: "operator", agentId: agent.id, initialTab: "profile" })}
                onRun={() => onOpenAgentPanel({ mode: "executor", agentId: agent.id, initialTab: "chat" })}
                onClick={() => onOpenAgentPanel({ mode: "operator", agentId: agent.id, initialTab: "profile" })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
