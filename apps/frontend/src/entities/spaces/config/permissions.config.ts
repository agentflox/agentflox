import { SpaceRole } from "@agentflox/database/src/generated/prisma";

export type SpacePermission = {
    label: string;
    description: string;
    descriptionLong: string;

    // Space Level
    canManageSpaceSettings: boolean; // Rename/Settings
    canDeleteSpace: boolean;
    canShareSpace: boolean;

    // Hierarchy (Lists/Folders)
    canCreateHierarchy: boolean; // Create Lists/Folders
    canDeleteHierarchy: boolean; // Delete Lists/Folders
    canArchiveHierarchy: boolean; // Archive Lists/Folders

    // Content (Tasks/Docs)
    canCreateContent: boolean; // Create Tasks/Docs
    canEditContent: boolean;   // Edit Tasks/Docs properties
    canDeleteContent: boolean; // Delete Tasks/Docs

    // Interaction
    canComment: boolean;
};

export const ROLE_PERMISSIONS: Record<SpaceRole, SpacePermission> = {
    [SpaceRole.ADMIN]: {
        label: "Full Edit",
        description: "Can create tasks, lists, and folders. Can share the space.",
        descriptionLong: "Can create and delete lists, folders, and tasks. Can share the space with others. Cannot manage space settings or delete the space unless they are the owner.",

        canManageSpaceSettings: false, // ClickUp "Full Edit" cannot edit space settings
        canDeleteSpace: false,         // ClickUp "Full Edit" cannot delete space
        canShareSpace: true,

        canCreateHierarchy: true,
        canDeleteHierarchy: true,
        canArchiveHierarchy: true,

        canCreateContent: true,
        canEditContent: true,
        canDeleteContent: true,

        canComment: true,
    },
    [SpaceRole.MEMBER]: {
        label: "Edit",
        description: "Can edit tasks and archive lists. Cannot create new items.",
        descriptionLong: "Can edit tasks and folder settings. Can archive lists and folders. Cannot create new tasks, lists, or folders. Cannot share the space.",

        canManageSpaceSettings: false,
        canDeleteSpace: false,
        canShareSpace: false,

        canCreateHierarchy: false,
        canDeleteHierarchy: false,
        canArchiveHierarchy: true,

        canCreateContent: false, // ClickUp "Edit" cannot create tasks
        canEditContent: true,
        canDeleteContent: false,

        canComment: true,
    },
    [SpaceRole.COMMENTER]: {
        label: "Comment",
        description: "Can comment on tasks. Read-only access to hierarchies.",
        descriptionLong: "Can comment on tasks. Cannot edit tasks or space structure.",

        canManageSpaceSettings: false,
        canDeleteSpace: false,
        canShareSpace: false,

        canCreateHierarchy: false,
        canDeleteHierarchy: false,
        canArchiveHierarchy: false,

        canCreateContent: false,
        canEditContent: false,
        canDeleteContent: false,

        canComment: true,
    },
    [SpaceRole.VIEWER]: {
        label: "View Only",
        description: "Read-only access.",
        descriptionLong: "Read-only access to the space and its content. Cannot comment or edit.",

        canManageSpaceSettings: false,
        canDeleteSpace: false,
        canShareSpace: false,

        canCreateHierarchy: false,
        canDeleteHierarchy: false,
        canArchiveHierarchy: false,

        canCreateContent: false,
        canEditContent: false,
        canDeleteContent: false,

        canComment: false,
    },
};

export const getPermissionDetails = (role: SpaceRole) => ROLE_PERMISSIONS[role];
