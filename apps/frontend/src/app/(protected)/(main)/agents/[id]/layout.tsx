"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";

interface AgentContextValue {
  agentData: any;
  isLoading: boolean;
  isPublished: boolean;
  currentStatus: string;
  isPublishing: boolean;
  localDraft: any;
  refetch: () => void;
  handleTogglePublish: () => Promise<void>;
  isOwner: boolean;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within AgentLayout");
  }
  return context;
};

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const agentId = params.id as string;
  const activeTab = searchParams.get("tab") || "build";

  const conversationType = useMemo(() => {
    switch (activeTab) {
      case "run":
      case "chat":
        return "AGENT_EXECUTOR";
      case "settings":
        return "AGENT_BUILDER";
      case "build":
      default:
        return "AGENT_OPERATOR";
    }
  }, [activeTab]);

  const includeSections = useMemo(() => {
    switch (activeTab) {
      case "settings":
        return { tools: true, triggers: true, schedules: true, collaborators: true };
      case "run":
      case "chat":
      case "build":
      default:
        return { conversations: true, tools: true, triggers: true };
    }
  }, [activeTab]);

  const {
    data: agent,
    isLoading,
    refetch,
  } = trpc.agent.get.useQuery(
    { id: agentId, conversationType, includeSections },
    { enabled: !!agentId, staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const isOwner = useMemo(() => {
    if (!agent) return false;
    if (typeof (agent as { viewerIsOwner?: boolean }).viewerIsOwner === "boolean") {
      return (agent as { viewerIsOwner: boolean }).viewerIsOwner;
    }
    if (!session?.user?.id) return false;
    const ownerId =
      (agent as { ownerId?: string }).ownerId ??
      (agent as { owner?: { id?: string } }).owner?.id;
    return Boolean(ownerId && ownerId === session.user.id);
  }, [agent, session]);

  const isPublished = agent?.status === "ACTIVE";
  const currentStatus = agent?.status || "DRAFT";

  const handleTogglePublish = async () => {
    if (!agent) return;

    const newStatus = agent.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    updateAgent.mutate({
      id: agent.id,
      status: newStatus,
      isActive: newStatus === "ACTIVE",
    });
  };

  const contextValue: AgentContextValue = {
    agentData: agent,
    isLoading,
    isPublished,
    currentStatus,
    isPublishing: updateAgent.isPending,
    localDraft: null,
    refetch,
    handleTogglePublish,
    isOwner,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      <div className="flex flex-col h-full w-full min-h-0 bg-white overflow-hidden">
        {children}
      </div>
    </AgentContext.Provider>
  );
}