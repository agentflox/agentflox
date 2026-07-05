'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSocket, SocketScope } from '@/components/providers/SocketProvider';

/**
 * Automatically synchronizes the socket scope based on the current URL parameters.
 * Use this hook in layouts or pages that represent a specific scope (Workspace, Project, Team).
 */
export function useSocketScopeSync() {
    const params = useParams();
    const { switchScope } = useSocket();

    useEffect(() => {
        // Extract IDs from URL params
        // Note: params can be string or string[], we generally expect strings for IDs
        const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : undefined;
        const projectId = typeof params?.projectId === 'string' ? params.projectId : undefined;
        const teamId = typeof params?.teamId === 'string' ? params.teamId : undefined;

        const scope: SocketScope = {
            workspaceId: workspaceId || null,
            projectId: projectId || null,
            teamId: teamId || null,
        };

        // Only switch if we have at least a workspace ID or explicitly want global (no IDs found but maybe we are in app root?)
        // Actually, if we are in a route that uses this hook, we likely want to sync whatever params are present.
        // However, if we are at root, params might be empty.

        if (workspaceId || projectId || teamId) {
            switchScope(scope);
        }

    }, [params, switchScope]);
}
