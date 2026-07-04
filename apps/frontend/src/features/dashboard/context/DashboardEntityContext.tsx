"use client";

import React, { createContext, useContext, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface DashboardEntityContextValue {
  workspaceId?: string;
  spaceId?: string;
  projectId?: string;
  teamId?: string;
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    color?: string | null;
    image?: string | null;
  } | null;
  customFields: any[];
  availableTaskTypes: any[];
  agents: { id: string; name: string; image: string | null; type: "agent" }[];
  isSharedDataLoading: boolean;
}

const DashboardEntityContext = createContext<DashboardEntityContextValue | null>(null);

export interface DashboardEntityProviderProps {
  workspaceId?: string;
  spaceId?: string;
  projectId?: string;
  teamId?: string;
  children: React.ReactNode;
}

export function DashboardEntityProvider({
  workspaceId,
  spaceId,
  projectId,
  teamId,
  children,
}: DashboardEntityProviderProps) {
  const { data: currentUser } = trpc.user.me.useQuery();
  const { data: customFields = [], isLoading: isLoadingFields } = trpc.customFields.list.useQuery(
    { workspaceId: workspaceId as string, applyTo: "TASK" },
    { enabled: !!workspaceId }
  );
  const { data: availableTaskTypes = [], isLoading: isLoadingTypes } = trpc.task.listTaskTypes.useQuery(
    { workspaceId: workspaceId as string },
    { enabled: !!workspaceId }
  );
  const { data: agentsData, isLoading: isLoadingAgents } = trpc.agent.list.useQuery(
    { includeRelations: true },
    { enabled: !!workspaceId }
  );

  const agents = useMemo(
    () =>
      (agentsData?.items ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        image: a.avatar || null,
        type: "agent" as const,
      })),
    [agentsData]
  );

  const value = useMemo<DashboardEntityContextValue>(
    () => ({
      workspaceId,
      spaceId,
      projectId,
      teamId,
      currentUser: currentUser ?? null,
      customFields,
      availableTaskTypes,
      agents,
      isSharedDataLoading: isLoadingFields || isLoadingTypes || isLoadingAgents,
    }),
    [
      workspaceId,
      spaceId,
      projectId,
      teamId,
      currentUser,
      customFields,
      availableTaskTypes,
      agents,
      isLoadingFields,
      isLoadingTypes,
      isLoadingAgents,
    ]
  );

  return (
    <DashboardEntityContext.Provider value={value}>{children}</DashboardEntityContext.Provider>
  );
}

export function useDashboardEntity() {
  const ctx = useContext(DashboardEntityContext);
  if (!ctx) {
    throw new Error("useDashboardEntity must be used within DashboardEntityProvider");
  }
  return ctx;
}

export function useDashboardEntityOptional() {
  return useContext(DashboardEntityContext);
}
