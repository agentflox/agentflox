import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export function useMarketplaceGuard() {
    const { data: session } = trpc.user.me.useQuery();
    const [isGuardOpen, setIsGuardOpen] = useState(false);
    
    // Checks if profile is valid, if not opens guard. Returns true if valid.
    const checkProfileAndProceed = useCallback((onValid: () => void) => {
        if (!session) return false;
        
        // Ensure user has provided at least a username and a bio
        const hasValidProfile = !!session.username?.trim() && !!session.bio?.trim();
        
        if (!hasValidProfile) {
            setIsGuardOpen(true);
            return false;
        }
        
        onValid();
        return true;
    }, [session]);

    return {
        checkProfileAndProceed,
        isGuardOpen,
        setIsGuardOpen
    };
}
