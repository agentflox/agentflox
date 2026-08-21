export type LocationPin = {
  workspaceId?: string | null;
  teamId?: string | null;
  spaceId?: string | null;
  projectId?: string | null;
};

/** Exactly one of team/space/project plus workspaceId. */
export function normalizeAgentLocation(input: LocationPin): LocationPin {
  const workspaceId = input.workspaceId ?? null;
  const pins = [
    input.projectId ? { projectId: input.projectId } : null,
    !input.projectId && input.spaceId ? { spaceId: input.spaceId } : null,
    !input.projectId && !input.spaceId && input.teamId ? { teamId: input.teamId } : null,
  ].filter(Boolean) as Array<Record<string, string>>;
  const pin = pins[0] ?? {};
  return {
    workspaceId,
    teamId: (pin as any).teamId ?? null,
    spaceId: (pin as any).spaceId ?? null,
    projectId: (pin as any).projectId ?? null,
  };
}

export function isInScopeAgent(
  agent: LocationPin,
  location: LocationPin,
): boolean {
  if (location.workspaceId && agent.workspaceId && agent.workspaceId !== location.workspaceId) {
    return false;
  }
  if (location.projectId) {
    if (agent.projectId) return agent.projectId === location.projectId;
    if (agent.spaceId) return agent.spaceId === location.spaceId;
    if (agent.teamId) return agent.teamId === location.teamId;
    return !agent.projectId && !agent.spaceId && !agent.teamId;
  }
  if (location.spaceId) {
    if (agent.projectId) return false;
    if (agent.spaceId) return agent.spaceId === location.spaceId;
    if (agent.teamId) return agent.teamId === location.teamId;
    return !agent.spaceId && !agent.teamId && !agent.projectId;
  }
  if (location.teamId) {
    if (agent.projectId || agent.spaceId) return false;
    if (agent.teamId) return agent.teamId === location.teamId;
    return !agent.teamId;
  }
  return !agent.teamId && !agent.spaceId && !agent.projectId;
}

export function inScopeWhere(location: LocationPin) {
  const clauses: any[] = [];
  if (location.projectId) {
    clauses.push({ projectId: location.projectId });
    if (location.spaceId) clauses.push({ spaceId: location.spaceId, projectId: null });
    if (location.teamId) clauses.push({ teamId: location.teamId, spaceId: null, projectId: null });
    clauses.push({ workspaceId: location.workspaceId, teamId: null, spaceId: null, projectId: null });
  } else if (location.spaceId) {
    clauses.push({ spaceId: location.spaceId, projectId: null });
    if (location.teamId) clauses.push({ teamId: location.teamId, spaceId: null, projectId: null });
    clauses.push({ workspaceId: location.workspaceId, teamId: null, spaceId: null, projectId: null });
  } else if (location.teamId) {
    clauses.push({ teamId: location.teamId, spaceId: null, projectId: null });
    clauses.push({ workspaceId: location.workspaceId, teamId: null, spaceId: null, projectId: null });
  } else if (location.workspaceId) {
    clauses.push({ workspaceId: location.workspaceId, teamId: null, spaceId: null, projectId: null });
  }
  return clauses.length ? { OR: clauses } : {};
}

export function elsewhereWhere(location: LocationPin) {
  const notInScope = inScopeWhere(location);
  return {
    workspaceId: location.workspaceId,
    NOT: notInScope.OR ? { OR: notInScope.OR } : undefined,
  };
}

/** Agents pinned exactly to this location (no parent/child inheritance). */
export function exactScopeWhere(location: LocationPin) {
  if (location.projectId) {
    return { projectId: location.projectId };
  }
  if (location.spaceId) {
    return { spaceId: location.spaceId, projectId: null };
  }
  if (location.teamId) {
    return { teamId: location.teamId, spaceId: null, projectId: null };
  }
  if (location.workspaceId) {
    return {
      workspaceId: location.workspaceId,
      teamId: null,
      spaceId: null,
      projectId: null,
    };
  }
  return {};
}
