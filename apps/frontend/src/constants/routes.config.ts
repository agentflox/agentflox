// apps/frontend/src/constants/routes.config.ts
/*
    Routes Config
    This file contains all the routes for the application.
    It is used to redirect users to the appropriate routes.
    @author: Agentflox Team
    @version: 0.0.1
    @since: 2026-01-16
*/
// ============================================================================
// BASE ROUTES
// ============================================================================

export const API_AUTH_PREFIX = "/api/auth";

export const AUTH_ROUTES = [
    "/login",
    "/register",
    "/auth",
    "/forgot-password",
    "/auth/reset-password"
];

export const PROTECTED_ROUTES = [
    "/",
    "/dashboard",
    "/mp" // marketplace
];

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

export const DASHBOARD_ROUTES = {
    ROOT: '/dashboard',

    // Personal
    PERSONAL: '/dashboard/personal',

    // Workspaces
    WORKSPACES: `/dashboard/workspaces`,
    WORKSPACE: (id: string) => `/dashboard/workspaces/${id}`,
    WORKSPACE_TAB: (id: string, tab: string) => `/dashboard/workspaces/${id}?tab=${tab}`,

    // Spaces
    SPACES: `/dashboard/spaces`,
    SPACE: (id: string) => `/dashboard/spaces/${id}`,
    SPACE_TAB: (id: string, tab: string) => `/dashboard/spaces/${id}?tab=${tab}`,

    // Projects
    PROJECTS: `/dashboard/projects`,
    PROJECT: (id: string) => `/dashboard/projects/${id}`,
    PROJECT_EDIT: (id: string) => `/dashboard/projects/edit/${id}`,
    PROJECT_TAB: (id: string, tab: string) => `/dashboard/projects/${id}?tab=${tab}`,

    // Teams
    TEAMS: `/dashboard/teams`,
    TEAM: (id: string) => `/dashboard/teams/${id}`,
    TEAM_EDIT: (id: string) => `/dashboard/teams/edit/${id}`,
    TEAM_TAB: (id: string, tab: string) => `/dashboard/teams/${id}?tab=${tab}`,

    // Nested Context Routes (Workspace-scoped)
    WORKSPACE_SPACE: (workspaceId: string, spaceId: string) =>
        `/dashboard/workspaces/${workspaceId}?v=spaces&sid=${spaceId}`,
    WORKSPACE_PROJECT: (workspaceId: string, projectId: string) =>
        `/dashboard/workspaces/${workspaceId}/projects/${projectId}`,
    WORKSPACE_TEAM: (workspaceId: string, teamId: string) =>
        `/dashboard/workspaces/${workspaceId}/teams/${teamId}`,
    WORKSPACE_SPACE_PROJECT: (workspaceId: string, spaceId: string, projectId: string) =>
        `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/projects/${projectId}`,

    // Other Dashboard Routes
    TASKS: '/dashboard/tasks',
    TASK: (id: string) => `/dashboard/tasks/${id}`,

    MATERIALS: '/dashboard/materials',
    MATERIAL: (id: string) => `/dashboard/materials/${id}`,

    DOCUMENTS: '/dashboard/docs',
    DOCUMENT: (id: string) => `/dashboard/docs/${id}`,

    TOOLS: '/dashboard/tools',
    TOOL: (id: string) => `/dashboard/tools/${id}`,

    RESOURCES: '/dashboard/resources',
    RESOURCE: (id: string) => `/dashboard/resources/${id}`,

    AGENTS: '/dashboard/agents',
    AGENT: (id: string) => `/dashboard/agents/${id}`,

    WORKFORCES: '/dashboard/workforces',
    WORKFORCE_CREATE: (id: string) => `/dashboard/workforces/create/${id}`,

    BILLING: '/dashboard/billing',
    SETTINGS: '/dashboard/settings',
    PROFILE: '/dashboard/my-profile',
    NOTIFICATIONS: '/dashboard/notifications',
    MESSAGES: '/dashboard/messages',
    NETWORK: '/dashboard/mynetwork',
    ORGANIZATION: '/dashboard/organization',
    ORGANIZATIONS: '/dashboard/organizations',
    PROPOSALS: '/dashboard/proposals',
    REQUESTS: '/dashboard/requests',
    USAGE: '/dashboard/usage',
    DISCUSSIONS: '/dashboard/discussions',
    INTEGRATIONS: '/dashboard/integrations',
    PROFILES: (id: string) => `/dashboard/profiles/${id}`,
} as const;

// ============================================================================
// MARKETPLACE ROUTES
// ============================================================================

export const MARKETPLACE_ROUTES = {
    ROOT: `/marketplace`,

    // Projects
    PROJECTS: `/marketplace/projects`,
    PROJECT: (id: string) => `/marketplace/projects/${id}`,
    PROJECTS_SEARCH: `/marketplace/projects/search/results`,

    // Teams
    TEAMS: `/marketplace/teams`,
    TEAM: (id: string) => `/marketplace/teams/${id}`,
    TEAMS_SEARCH: `/marketplace/teams/search/results`,

    // Tools
    TOOLS: `/marketplace/tools`,
    TOOL: (id: string) => `/marketplace/tools/${id}`,
    TOOLS_SEARCH: `/marketplace/tools/search/results`,

    // Tasks
    TASKS: `/marketplace/tasks`,
    TASK: (id: string) => `/marketplace/tasks/${id}`,
    TASKS_SEARCH: `/marketplace/tasks/search/results`,

    // Resources
    RESOURCES: `/marketplace/resources`,
    RESOURCE: (id: string) => `/marketplace/resources/${id}`,
    RESOURCES_SEARCH: `/marketplace/resources/search/results`,

    // Proposals
    PROPOSALS: `/marketplace/proposals`,
    PROPOSAL: (id: string) => `/marketplace/proposals/${id}`,
    PROPOSALS_SEARCH: `/marketplace/proposals/search/results`,

    // Talents
    TALENTS: `/marketplace/talents`,
    TALENT: (id: string) => `/marketplace/talents/${id}`,
    TALENTS_SEARCH: `/marketplace/talents/search/results`,
} as const;

// ============================================================================
// ROUTE HELPERS
// ============================================================================

/**
 * Build URL with query parameters
 * @param base Base URL path
 * @param params Query parameters object
 * @returns Complete URL with query string
 */
export function buildUrl(base: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    if (!params) return base;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    return queryString ? `${base}?${queryString}` : base;
}

/**
 * Build search URL with filters
 * @param base Base search URL
 * @param filters Filter parameters
 * @returns Search URL with query parameters
 */
export function buildSearchUrl(
    base: string,
    filters?: {
        q?: string;
        category?: string;
        status?: string;
        sort?: string;
        order?: 'asc' | 'desc';
        page?: number;
        limit?: number;
        [key: string]: any;
    }
): string {
    return buildUrl(base, filters);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DashboardRoute = typeof DASHBOARD_ROUTES[keyof typeof DASHBOARD_ROUTES];
export type MarketplaceRoute = typeof MARKETPLACE_ROUTES[keyof typeof MARKETPLACE_ROUTES];
