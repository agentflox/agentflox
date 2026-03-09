/**
 * Permission System Types
 * Centralized type definitions for the ClickUp-style permission system
 */

import { PermissionLevel, WorkspaceRole, GuestType } from '@agentflox/database';

export type LocationType = 'workspace' | 'space' | 'folder' | 'list' | 'project' | 'team';
export type ItemType = LocationType | 'task';

export interface PermissionCheckResult {
    hasAccess: boolean;
    permission: PermissionLevel | null;
    reason: PermissionDenialReason | null;
}

export type PermissionDenialReason =
    | 'NOT_FOUND'
    | 'NOT_MEMBER'
    | 'NOT_GUEST'
    | 'PRIVATE_ITEM'
    | 'NO_PERMISSION'
    | 'GUEST_SPACE_ACCESS_DENIED';

export interface PermissionContext {
    userId: string;
    workspaceId: string;
    itemType: ItemType;
    itemId: string;
}

export interface WorkspacePermissions {
    // Workspace Management
    manageWorkspace: boolean;
    manageBilling: boolean;
    manageMembers: boolean;
    manageGuests: boolean;

    // Invitations
    inviteMembers: boolean;
    inviteGuests: boolean;

    // Content Creation
    createSpaces: boolean;
    deleteSpaces: boolean;

    // Integrations & Security
    manageIntegrations: boolean;
    manageSecurity: boolean;
    manageCustomRoles: boolean;

    // Data & API
    exportData: boolean;
    useApi: boolean;

    // Content Management
    createTags: boolean;
    deleteTasks: boolean;
    deleteLists: boolean;
    deleteFolders: boolean;

    // Configuration
    manageClickApps: boolean;
    manageCustomFields: boolean;
}

export const DEFAULT_WORKSPACE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermissions> = {
    OWNER: {
        manageWorkspace: true,
        manageBilling: true,
        manageMembers: true,
        manageGuests: true,
        inviteMembers: true,
        inviteGuests: true,
        createSpaces: true,
        deleteSpaces: true,
        manageIntegrations: true,
        manageSecurity: true,
        manageCustomRoles: true,
        exportData: true,
        useApi: true,
        createTags: true,
        deleteTasks: true,
        deleteLists: true,
        deleteFolders: true,
        manageClickApps: true,
        manageCustomFields: true,
    },
    ADMIN: {
        manageWorkspace: true,
        manageBilling: false,
        manageMembers: true,
        manageGuests: true,
        inviteMembers: true,
        inviteGuests: true,
        createSpaces: true,
        deleteSpaces: true,
        manageIntegrations: true,
        manageSecurity: true,
        manageCustomRoles: false,
        exportData: true,
        useApi: true,
        createTags: true,
        deleteTasks: true,
        deleteLists: true,
        deleteFolders: true,
        manageClickApps: true,
        manageCustomFields: true,
    },
    MEMBER: {
        manageWorkspace: false,
        manageBilling: false,
        manageMembers: false,
        manageGuests: false,
        inviteMembers: true,
        inviteGuests: true,
        createSpaces: true,
        deleteSpaces: false,
        manageIntegrations: false,
        manageSecurity: false,
        manageCustomRoles: false,
        exportData: false,
        useApi: true,
        createTags: true,
        deleteTasks: true,
        deleteLists: false,
        deleteFolders: false,
        manageClickApps: false,
        manageCustomFields: true,
    },
    LIMITED_MEMBER: {
        manageWorkspace: false,
        manageBilling: false,
        manageMembers: false,
        manageGuests: false,
        inviteMembers: false,
        inviteGuests: true,
        createSpaces: false,
        deleteSpaces: false,
        manageIntegrations: false,
        manageSecurity: false,
        manageCustomRoles: false,
        exportData: false,
        useApi: false,
        createTags: false,
        deleteTasks: false,
        deleteLists: false,
        deleteFolders: false,
        manageClickApps: false,
        manageCustomFields: false,
    },
    LIMITED_MEMBER_VIEW_ONLY: {
        manageWorkspace: false,
        manageBilling: false,
        manageMembers: false,
        manageGuests: false,
        inviteMembers: false,
        inviteGuests: false,
        createSpaces: false,
        deleteSpaces: false,
        manageIntegrations: false,
        manageSecurity: false,
        manageCustomRoles: false,
        exportData: false,
        useApi: false,
        createTags: false,
        deleteTasks: false,
        deleteLists: false,
        deleteFolders: false,
        manageClickApps: false,
        manageCustomFields: false,
    },
    GUEST: {
        manageWorkspace: false,
        manageBilling: false,
        manageMembers: false,
        manageGuests: false,
        inviteMembers: false,
        inviteGuests: false,
        createSpaces: false,
        deleteSpaces: false,
        manageIntegrations: false,
        manageSecurity: false,
        manageCustomRoles: false,
        exportData: false,
        useApi: false,
        createTags: false,
        deleteTasks: false,
        deleteLists: false,
        deleteFolders: false,
        manageClickApps: false,
        manageCustomFields: false,
    },
};

export { PermissionLevel, WorkspaceRole, GuestType };
