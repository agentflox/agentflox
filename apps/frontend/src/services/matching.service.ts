import { sendBackendRequest } from '@/utils/backend-request';

/**
 * Matching API client for backend matching/AI operations
 */
export const matchingService = {
    /**
     * Search and match entities (projects, etc.)
     */
    search: (data: {
        userId: string;
        type: 'projects' | 'users' | 'teams';
        query: string;
        limit?: number;
        filters?: any;
        advancedAi?: boolean;
    }, session?: any) => {
        // If advancedAi is false, this might be handled by regular database queries,
        // but if we are using the matching service:

        // Note: The original code in marketplace.ts differentiated between advancedAi (service-server) and basic (prisma).
        // The calling code (trpc) should decide. If it calls this API, it implies using the matching service.

        return sendBackendRequest('/v1/matching/search', {
            method: 'POST',
            body: JSON.stringify(data),
        }, session);
    }
};
