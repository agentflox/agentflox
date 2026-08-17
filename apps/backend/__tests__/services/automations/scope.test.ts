import { isInScopeAgent, normalizeAgentLocation } from '../../../../frontend/src/features/automations/scope';

describe('agent location scope', () => {
  it('keeps at most one of team/space/project', () => {
    expect(
      normalizeAgentLocation({
        workspaceId: 'ws',
        teamId: 'tm',
        spaceId: 'sp',
        projectId: 'pj',
      }),
    ).toEqual({
      workspaceId: 'ws',
      teamId: null,
      spaceId: null,
      projectId: 'pj',
    });
  });

  it('includes parent space and workspace agents on a project dashboard', () => {
    const location = { workspaceId: 'ws', spaceId: 'sp', projectId: 'pj' };
    expect(isInScopeAgent({ workspaceId: 'ws', projectId: 'pj' }, location)).toBe(true);
    expect(isInScopeAgent({ workspaceId: 'ws', spaceId: 'sp' }, location)).toBe(true);
    expect(isInScopeAgent({ workspaceId: 'ws' }, location)).toBe(true);
    expect(isInScopeAgent({ workspaceId: 'ws', projectId: 'other' }, location)).toBe(false);
  });

  it('excludes project-pinned agents from a space dashboard', () => {
    const location = { workspaceId: 'ws', spaceId: 'sp' };
    expect(isInScopeAgent({ workspaceId: 'ws', spaceId: 'sp' }, location)).toBe(true);
    expect(isInScopeAgent({ workspaceId: 'ws', projectId: 'pj', spaceId: 'sp' }, location)).toBe(false);
  });
});
