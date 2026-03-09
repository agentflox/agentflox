import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { CommandContext } from '../types/command.types';

/**
 * Extract command context from current page URL and user session
 */
export function useContextExtraction(): CommandContext {
    const pathname = usePathname();
    const { data: session } = useSession();

    const context = useMemo(() => {
        const ctx: CommandContext = {
            userId: session?.user?.id || 'anonymous',
            url: pathname || '',
            userRole: (session?.user as any)?.role || 'member',
            permissions: (session?.user as any)?.permissions || [],
        };

        // Parse URL patterns to extract IDs
        // Pattern: /workspace/{workspaceId}/...
        const workspaceMatch = pathname?.match(/\/workspace\/([^\/]+)/);
        if (workspaceMatch) {
            ctx.workspaceId = workspaceMatch[1];
        }

        // Pattern: /workspace/{workspaceId}/project/{projectId}
        const projectMatch = pathname?.match(/\/project\/([^\/]+)/);
        if (projectMatch) {
            ctx.projectId = projectMatch[1];
        }

        // Pattern: /workspace/{workspaceId}/team/{teamId}
        const teamMatch = pathname?.match(/\/team\/([^\/]+)/);
        if (teamMatch) {
            ctx.teamId = teamMatch[1];
        }

        // Pattern: /organization/{organizationId}
        const orgMatch = pathname?.match(/\/organization\/([^\/]+)/);
        if (orgMatch) {
            ctx.organizationId = orgMatch[1];
        }

        return ctx;
    }, [pathname, session]);

    return context;
}

export default useContextExtraction;
