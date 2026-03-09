import { sendBackendRequest } from '@/utils/backend-request';

export const permissionsService = {
    // Invitations
    invitations: {
        inviteMember: (data: {
            workspaceId?: string;
            spaceId?: string;
            email: string;
            role: string;
        }, session?: any) =>
            sendBackendRequest('/api/invitations/member', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        inviteGuest: (data: {
            itemType: string;
            itemId: string;
            email: string;
            permission: string;
        }, session?: any) =>
            sendBackendRequest('/api/invitations/guest', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        listPending: (session?: any) =>
            sendBackendRequest('/api/invitations/pending', {
                method: 'GET',
            }, session),

        listSent: (session?: any) =>
            sendBackendRequest('/api/invitations/sent', {
                method: 'GET',
            }, session),

        accept: (data: { token: string }, session?: any) =>
            sendBackendRequest('/api/invitations/accept', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        decline: (data: { token: string }, session?: any) =>
            sendBackendRequest('/api/invitations/decline', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        cancel: (invitationId: string, session?: any) =>
            sendBackendRequest(`/api/invitations/${invitationId}/cancel`, {
                method: 'POST',
            }, session),

        resend: (invitationId: string, session?: any) =>
            sendBackendRequest(`/api/invitations/${invitationId}/resend`, {
                method: 'POST',
            }, session),
    },

    // Permissions
    permissions: {
        resolvePermission: async (itemType: string, itemId: string, session?: any): Promise<string | null> => {
            const response = await sendBackendRequest(`/api/permissions/${itemType}/${itemId}`, {
                method: 'GET',
            }, session);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data.permission as string | null;
        },

        list: (itemType: string, itemId: string, session?: any) =>
            sendBackendRequest(`/api/permissions/${itemType}/${itemId}/list`, {
                method: 'GET',
            }, session),

        grant: (itemType: string, itemId: string, data: {
            userId?: string;
            teamId?: string;
            permission: string;
        }, session?: any) =>
            sendBackendRequest(`/api/permissions/${itemType}/${itemId}/grant`, {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        revoke: (itemType: string, itemId: string, params: {
            userId?: string;
            teamId?: string;
        }, session?: any) => {
            const query = new URLSearchParams();
            if (params.userId) query.set('userId', params.userId);
            if (params.teamId) query.set('teamId', params.teamId);

            return sendBackendRequest(`/api/permissions/${itemType}/${itemId}/revoke?${query.toString()}`, {
                method: 'DELETE',
            }, session);
        },

        bulkGrant: (itemType: string, itemId: string, data: {
            userIds?: string[];
            teamIds?: string[];
            permission: string;
        }, session?: any) =>
            sendBackendRequest(`/api/permissions/${itemType}/${itemId}/bulk-grant`, {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        bulkRevoke: (itemType: 'space' | 'project' | 'task' | 'view', itemId: string, data: {
            userIds?: string[];
            teamIds?: string[];
            excludeOwners?: boolean;
        }, session?: any) =>
            sendBackendRequest(`/api/permissions/${itemType}/${itemId}/bulk-revoke`, {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        transferOwnership: (itemType: 'space' | 'project', itemId: string, data: {
            newOwnerId: string;
        }, session?: any) =>
            sendBackendRequest(`/api/permissions/${itemType}/${itemId}/transfer`, {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),
    },

    // Space specific
    space: {
        updateMemberRole: (spaceId: string, data: {
            userId: string;
            role: string;
        }, session?: any) =>
            sendBackendRequest(`/api/permissions/space/${spaceId}/role`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }, session),
    }
};
