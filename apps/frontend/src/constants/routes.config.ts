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
    "/personal",
    "/workspaces",
    "/spaces",
    "/projects",
    "/teams",
    "/tasks",
    "/materials",
    "/docs",
    "/tools",
    "/skills",
    "/resources",
    "/agents",
    "/workforces",
    "/billing",
    "/settings",
    "/my-profile",
    "/notifications",
    "/messages",
    "/mynetwork",
    "/organization",
    "/organizations",
    "/proposals",
    "/requests",
    "/usage",
    "/discussions",
    "/integrations",
    "/profiles",
    "/analytics",
    "/listings",
    "/dashboard",
    "/marketplace",
    "/onboarding",
    "/mp"
];

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

export const DASHBOARD_ROUTES = {
    ROOT: '/',

    // Personal
    PERSONAL: '/personal',

    // Workspaces
    WORKSPACES: `/workspaces`,
    WORKSPACE: (id: string) => `/workspaces/${id}`,
    WORKSPACE_TAB: (id: string, tab: string) => `/workspaces/${id}?tab=${tab}`,

    // Spaces
    SPACES: `/spaces`,
    SPACE: (id: string) => `/spaces/${id}`,
    SPACE_TAB: (id: string, tab: string) => `/spaces/${id}?tab=${tab}`,

    // Projects
    PROJECTS: `/projects`,
    PROJECT: (id: string) => `/projects/${id}`,
    PROJECT_EDIT: (id: string) => `/projects/edit/${id}`,
    PROJECT_TAB: (id: string, tab: string) => `/projects/${id}?tab=${tab}`,

    // Teams
    TEAMS: `/teams`,
    TEAM: (id: string) => `/teams/${id}`,
    TEAM_EDIT: (id: string) => `/teams/edit/${id}`,
    TEAM_TAB: (id: string, tab: string) => `/teams/${id}?tab=${tab}`,

    // Nested Context Routes (Workspace-scoped)
    WORKSPACE_SPACE: (workspaceId: string, spaceId: string) =>
        `/workspaces/${workspaceId}?v=spaces&sid=${spaceId}`,
    WORKSPACE_PROJECT: (workspaceId: string, projectId: string) =>
        `/workspaces/${workspaceId}/projects/${projectId}`,
    WORKSPACE_TEAM: (workspaceId: string, teamId: string) =>
        `/workspaces/${workspaceId}/teams/${teamId}`,
    WORKSPACE_SPACE_PROJECT: (workspaceId: string, spaceId: string, projectId: string) =>
        `/workspaces/${workspaceId}/spaces/${spaceId}/projects/${projectId}`,

    // Other Dashboard Routes
    TASKS: '/tasks',
    TASK: (id: string) => `/tasks/${id}`,

    MATERIALS: '/materials',
    MATERIAL: (id: string) => `/materials/${id}`,

    DOCUMENTS: '/docs',
    DOCUMENT: (id: string) => `/docs/${id}`,

    TOOLS: '/tools',
    TOOL: (id: string) => `/tools/${id}`,

    SKILLS: '/skills',
    SKILL: (id: string) => `/skills/${id}`,

    RESOURCES: '/resources',
    RESOURCE: (id: string) => `/resources/${id}`,

    AGENTS: '/agents',
    AGENT: (id: string) => `/agents/${id}`,

    WORKFORCES: '/workforces',
    WORKFORCE_CREATE: (id: string) => `/workforces/${id}`,

    BILLING: '/billing',
    SETTINGS: '/settings',
    PROFILE: '/my-profile',
    NOTIFICATIONS: '/notifications',
    MESSAGES: '/messages',
    NETWORK: '/mynetwork',
    ORGANIZATION: '/organization',
    ORGANIZATIONS: '/organizations',
    PROPOSALS: '/proposals',
    REQUESTS: '/requests',
    USAGE: '/usage',
    DISCUSSIONS: '/discussions',
    INTEGRATIONS: '/integrations',
    PROFILES: (id: string) => `/profiles/${id}`,
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
