"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useDashboardEntityOptional } from "@/features/dashboard/context/DashboardEntityContext";

export interface UseTaskViewContextOptions {
  spaceId?: string;
  projectId?: string;
  teamId?: string;
  listId?: string;
  workspaceId?: string;
  includeViewDetails?: boolean;
}

export function useTaskViewContext({
  spaceId,
  projectId,
  teamId,
  listId,
  workspaceId: workspaceIdProp,
  includeViewDetails = true,
}: UseTaskViewContextOptions) {
  const shared = useDashboardEntityOptional();

  const shouldFetchSpace = !!spaceId;
  const shouldFetchProject = !!projectId && !shared?.workspaceId && !workspaceIdProp;

  const { data: space } = trpc.space.get.useQuery(
    { id: spaceId as string },
    { enabled: shouldFetchSpace, staleTime: 60_000 }
  );
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId as string },
    { enabled: shouldFetchProject, staleTime: 60_000 }
  );

  const resolvedWorkspaceId =
    shared?.workspaceId ??
    workspaceIdProp ??
    space?.workspaceId ??
    project?.workspaceId ??
    undefined;

  const { data: customFieldsFallback = [] } = trpc.customFields.list.useQuery(
    { workspaceId: resolvedWorkspaceId as string, applyTo: "TASK" },
    { enabled: !!resolvedWorkspaceId && !shared }
  );
  const { data: taskTypesFallback = [] } = trpc.task.listTaskTypes.useQuery(
    { workspaceId: resolvedWorkspaceId as string },
    { enabled: !!resolvedWorkspaceId && !shared }
  );
  const { data: agentsDataFallback } = trpc.agent.list.useQuery(
    { includeRelations: true },
    { enabled: !!resolvedWorkspaceId && !shared }
  );
  const { data: currentUserFallback } = trpc.user.me.useQuery(undefined, {
    enabled: !shared,
  });

  const customFields = shared?.customFields ?? customFieldsFallback;
  const availableTaskTypes = shared?.availableTaskTypes ?? taskTypesFallback;
  const currentUser = shared?.currentUser ?? currentUserFallback ?? null;

  const agents = useMemo(() => {
    if (shared?.agents) return shared.agents;
    return (agentsDataFallback?.items ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      image: a.avatar || null,
      type: "agent" as const,
    }));
  }, [shared?.agents, agentsDataFallback]);

  const { data: projectParticipants } = trpc.project.getParticipants.useQuery(
    { projectId: projectId as string },
    { enabled: !!projectId, staleTime: 60_000 }
  );
  const { data: teamParticipants } = trpc.team.getParticipants.useQuery(
    { teamId: teamId as string },
    { enabled: !!teamId, staleTime: 60_000 }
  );
  const { data: listsData } = trpc.list.byContext.useQuery(
    { spaceId, projectId, workspaceId: resolvedWorkspaceId, includeViewDetails },
    { enabled: !!(spaceId || projectId || resolvedWorkspaceId), staleTime: 30_000 }
  );
  const { data: currentList } = trpc.list.get.useQuery(
    { id: listId as string },
    { enabled: !!listId, staleTime: 30_000 }
  );

  const { data: workspaceMembers = [] } = trpc.workspace.getMembers.useQuery(
    { id: resolvedWorkspaceId as string },
    { enabled: !!resolvedWorkspaceId, staleTime: 120_000 }
  );

  return {
    resolvedWorkspaceId,
    space,
    project,
    customFields,
    availableTaskTypes,
    currentUser,
    currentUserId: currentUser?.id,
    agents,
    workspaceMembers,
    projectParticipants,
    teamParticipants,
    listsData,
    currentList,
    isSharedDataLoading: shared?.isSharedDataLoading ?? false,
  };
}
