"use client";

import { useEffect, useState } from "react";
import { Bot, CircleUser, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SidePanelContainer } from "@/components/layout/ResizableSplitLayout";
import { AgentProfile } from "@/entities/agents/components/AgentProfile";
import { AgentChatBuilder } from "@/entities/agents/components/AgentChatBuilder";
import { OperatorView } from "@/features/dashboard/views/agent/OperatorView";
import { ChatView } from "@/features/dashboard/views/agent/ChatView";
import { cn } from "@/lib/utils";
import type { AgentPanelRequest } from "@/features/automations/components/AgentsPopover";

function mapAgentForProfile(agent: any) {
  return {
    id: agent.id,
    name: agent.name || "Unnamed Agent",
    description: agent.description ?? null,
    avatar: agent.avatar ?? null,
    status: (agent.status === "ACTIVE"
      ? "ACTIVE"
      : agent.status === "DRAFT"
        ? "DRAFT"
        : agent.status === "BUILDING"
          ? "BUILDING"
          : agent.status === "RECONFIGURING"
            ? "RECONFIGURING"
            : agent.status === "EXECUTING"
              ? "EXECUTING"
              : "INACTIVE") as
      | "ACTIVE"
      | "DRAFT"
      | "INACTIVE"
      | "BUILDING"
      | "RECONFIGURING"
      | "EXECUTING",
    isActive: agent.isActive ?? false,
    modelId: agent.modelId ?? agent.aiModel?.id ?? null,
    aiModel: agent.aiModel ?? null,
    agentType: agent.agentType ?? null,
    systemPrompt: agent.systemPrompt ?? null,
    capabilities: agent.capabilities ?? null,
    constraints: agent.constraints ?? null,
    createdAt: agent.createdAt ?? new Date(),
    updatedAt: agent.updatedAt ?? new Date(),
    metadata: (agent.metadata as any) ?? {},
    viewerIsOwner: agent.viewerIsOwner === true,
    ownerId: agent.ownerId,
    triggers: (agent.triggers || []).map((t: any) => ({
      id: t.id,
      triggerType: t.triggerType,
      triggerConfig: t.triggerConfig as any,
      name: t.name,
      description: t.description,
      isActive: t.isActive,
      priority: t.priority,
      tags: t.tags,
    })),
    tools: (agent.tools || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      toolType: t.toolType,
      isActive: t.isActive,
    })),
    schedules: (agent.schedules || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      repeatTime: s.repeatTime,
      startTime: s.startTime,
      endTime: s.endTime,
      timezone: s.timezone,
      instructions: s.instructions,
      isActive: s.isActive,
      priority: s.priority,
    })),
  };
}

const CONVERSATION_TYPE = {
  builder: "AGENT_BUILDER",
  operator: "AGENT_OPERATOR",
  executor: "AGENT_EXECUTOR",
} as const;

export function AgentTabbedPanel({
  request,
  onClose,
}: {
  request: AgentPanelRequest;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"chat" | "profile">(request.initialTab ?? "chat");
  const conversationType = CONVERSATION_TYPE[request.mode];

  useEffect(() => {
    setTab(request.initialTab ?? "chat");
  }, [request.agentId, request.mode, request.initialTab]);

  const { data: agent } = trpc.agent.get.useQuery(
    { id: request.agentId!, conversationType },
    { enabled: !!request.agentId },
  );

  return (
    <SidePanelContainer
      onClose={onClose}
      title={agent?.name || "AI Agent"}
      icon={<Bot className="h-4 w-4 text-violet-600" />}
      actions={
        <div className="flex items-center gap-0.5 mr-1">
          {(
            [
              { id: "chat" as const, label: "Chat", Icon: MessageSquare },
              { id: "profile" as const, label: "Profile", Icon: CircleUser },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                tab === id ? "bg-violet-50 text-violet-700" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full min-h-0">
        {tab === "chat" && request.mode === "builder" && (
          <AgentChatBuilder agentId={request.agentId} presentation="tabs" />
        )}
        {tab === "chat" && request.mode === "operator" && (
          <OperatorView agentId={request.agentId} presentation="tabs" />
        )}
        {tab === "chat" && request.mode === "executor" && (
          <ChatView agentId={request.agentId} conversationType="AGENT_EXECUTOR" presentation="tabs" />
        )}
        {tab === "profile" && agent && (
          <div className="h-full overflow-hidden">
            <AgentProfile
              agent={mapAgentForProfile(agent)}
              conversationType={conversationType}
            />
          </div>
        )}
        {tab === "profile" && !agent && (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500">
            Loading profile…
          </div>
        )}
      </div>
    </SidePanelContainer>
  );
}
