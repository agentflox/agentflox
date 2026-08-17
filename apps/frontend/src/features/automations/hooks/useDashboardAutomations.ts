"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { AutomationScope } from "../types";
import type { AgentPanelRequest } from "../components/AgentsPopover";

export function useDashboardAutomations(scope: AutomationScope | null) {
  const enabledQuery = trpc.automation.isEnabled.useQuery(
    { workspaceId: scope?.workspaceId || "" },
    { enabled: !!scope?.workspaceId },
  );
  const isEnabled = enabledQuery.data?.enabled === true;

  const [agentOpen, setAgentOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<"classic" | "agent">("classic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [agentPanel, setAgentPanel] = useState<AgentPanelRequest | null>(null);

  const openAgentPanel = useCallback((req: AgentPanelRequest) => {
    setAgentOpen(false);
    setHubOpen(false);
    setAgentPanel(req);
  }, []);

  const closeAgentPanel = useCallback(() => setAgentPanel(null), []);

  const openManage = useCallback(() => {
    setAgentOpen(false);
    setHubOpen(false);
    setManageOpen(true);
  }, []);

  const openBuilder = useCallback((mode: "classic" | "agent", id?: string | null) => {
    setHubOpen(false);
    setManageOpen(false);
    setBuilderMode(mode);
    setEditingId(id ?? null);
    setBuilderOpen(true);
  }, []);

  return {
    isEnabled,
    agentOpen,
    setAgentOpen,
    hubOpen,
    setHubOpen,
    manageOpen,
    setManageOpen,
    builderOpen,
    setBuilderOpen,
    builderMode,
    editingId,
    agentPanel,
    openAgentPanel,
    closeAgentPanel,
    openManage,
    openBuilder,
  };
}
