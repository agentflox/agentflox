import { useMemo } from 'react';
import { Capability } from '../capabilities';
// import { useAuth } from '@/features/auth/hooks/useAuth'; // Placeholder

export function usePermission(capability: Capability, context?: any) {
    // const { user } = useAuth(); // Placeholder
    const user = { role: 'MEMBER', id: 'mock-user' }; // Mock user for now

    const hasPermission = useMemo(() => {
        if (!user) return false;

        // TODO: Implement actual role-based logic here matching backend
        // This repeats logic from backend, ideally fetched from API or decoded from token

        // Simple mock logic
        if (user.role === 'OWNER' || user.role === 'ADMIN') return true;

        // Member logic
        if (user.role === 'MEMBER') {
            const allowedConfig = [
                Capability.TASK_CREATE,
                Capability.TASK_ASSIGN,
                Capability.AGENT_EXECUTE,
                Capability.MARKETPLACE_REQUEST_JOIN,
                Capability.CONTENT_POST,
                Capability.CONTENT_COMMENT
            ];
            return allowedConfig.includes(capability);
        }

        return false;
    }, [user, capability, context]);

    return hasPermission;
}
