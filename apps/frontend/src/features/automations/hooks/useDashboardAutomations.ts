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
  const [builderRequest, setBuilderRequest] = useState<{
    mode: "classic" | "agent";
    editingId?: string | null;
  } | null>(null);
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
    setBuilderRequest(null);
    setManageOpen(true);
  }, []);

  const openBuilder = useCallback((mode: "classic" | "agent", id?: string | null) => {
    setHubOpen(false);
    setBuilderRequest({ mode, editingId: id ?? null });
    setManageOpen(true);
  }, []);

  const clearBuilderRequest = useCallback(() => setBuilderRequest(null), []);

  const handleManageOpenChange = useCallback((open: boolean) => {
    setManageOpen(open);
    if (!open) setBuilderRequest(null);
  }, []);

  return {
    isEnabled,
    agentOpen,
    setAgentOpen,
    hubOpen,
    setHubOpen,
    manageOpen,
    setManageOpen: handleManageOpenChange,
    builderRequest,
    clearBuilderRequest,
    agentPanel,
    openAgentPanel,
    closeAgentPanel,
    openManage,
    openBuilder,
  };
}
