/**
 * Dashboard URL & Query Parameter Hygiene Utilities
 * 
 * Enforces:
 * 1. Unified 'v' parameter for all views (replaces nv, fv, lv)
 * 2. 2-letter short codes (sp, pj, tm, fd, lt, dv, ch, ai, v, task)
 * 3. Path-based subroute support (/dashboard/spaces/:id/tm/:id, /lt/:id, /fd/:id, /pj/:id, /dv/:id)
 * 4. Backward compatibility with legacy parameters (folder, list, docView, fv, nv, aid, sid)
 */

export const SHORT_ENTITY_KEYS = ["sp", "pj", "tm", "fd", "lt", "dv", "dc", "ch", "ai", "rid", "cid", "lid"] as const;
export type ShortEntityKey = (typeof SHORT_ENTITY_KEYS)[number];

export const ALL_SUB_PARAMS = [
    "v",
    "pj",
    "tm",
    "sp",
    "sid",
    "lt",
    "list",
    "fd",
    "folder",
    "dv",
    "docView",
    "dc",
    "doc",
    "fv",
    "nv",
    "lv",
    "ch",
    "ai",
    "aid",
    "rid",
    "runId",
    "cid",
    "convId",
    "conversationId",
    "lid",
    "logId",
    "task",
    "taskId",
    "scope",
    "status",
    "page",
    "ttab",
    "team",
] as const;

export type SubParamKey = (typeof ALL_SUB_PARAMS)[number];

/**
 * Remove all nested / sub-entity parameters from a URLSearchParams object.
 */
export function clearAllSubParams(params: URLSearchParams): void {
    ALL_SUB_PARAMS.forEach((key) => params.delete(key));
}

export interface DashboardActiveState {
    tab: string | null;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    folderId?: string;
    listId?: string;
    docViewId?: string;
    docItemId?: string;
    runId?: string;
    conversationId?: string;
    logId?: string;
    chatId?: string;
    aiChatId?: string;
    viewId?: string;
    taskId?: string | null;
}

/**
 * Helper to parse active entity and view state from searchParams and optional subpath array.
 */
export function parseDashboardState(
    searchParams: URLSearchParams | { get: (key: string) => string | null },
    subpath?: string[]
): DashboardActiveState {
    let tab = searchParams.get("tab");
    let spaceId = searchParams.get("sp") || searchParams.get("sid") || undefined;
    let projectId = searchParams.get("pj") || undefined;
    let teamId = searchParams.get("tm") || searchParams.get("team") || undefined;
    let folderId = searchParams.get("fd") || searchParams.get("folder") || undefined;
    let listId = searchParams.get("lt") || searchParams.get("list") || undefined;
    let docViewId = searchParams.get("dv") || searchParams.get("docView") || undefined;
    let docItemId = searchParams.get("dc") || searchParams.get("doc") || searchParams.get("page") || undefined;
    let runId = searchParams.get("rid") || searchParams.get("runId") || undefined;
    let conversationId = searchParams.get("cid") || searchParams.get("convId") || searchParams.get("conversationId") || undefined;
    let logId = searchParams.get("lid") || searchParams.get("logId") || undefined;
    let chatId = searchParams.get("ch") || undefined;
    let aiChatId = searchParams.get("ai") || searchParams.get("aid") || undefined;
    let viewId = searchParams.get("v") || searchParams.get("nv") || searchParams.get("fv") || searchParams.get("lv") || undefined;
    let taskId = searchParams.get("task") || searchParams.get("taskId") || null;

    // Parse path segments iteratively: ['dv', 'id1', 'dc', 'id2'] or ['v', 'view123']
    if (subpath && subpath.length > 0) {
        for (let i = 0; i < subpath.length; i += 2) {
            const segment = subpath[i];
            const id = subpath[i + 1];
            if (!id) {
                if (["teams", "projects", "lists", "docs", "spaces", "chats", "ai-chat", "overview", "personal"].includes(segment)) {
                    tab = segment;
                }
                break;
            }
            if (segment === "v" || segment === "view") {
                viewId = id;
            } else if (segment === "dc" || segment === "doc" || segment === "page") {
                docItemId = id;
            } else if (segment === "rid" || segment === "run") {
                runId = id;
            } else if (segment === "cid" || segment === "chat" || segment === "conv") {
                conversationId = id;
            } else if (segment === "lid" || segment === "log") {
                logId = id;
            } else if (segment === "dv" || segment === "docs" || segment === "docView") {
                docViewId = id;
                if (!tab) tab = "docs";
            } else if (segment === "tm" || segment === "teams" || segment === "team") {
                teamId = id;
                if (!tab) tab = "teams";
            } else if (segment === "pj" || segment === "projects" || segment === "project") {
                projectId = id;
                if (!tab) tab = "projects";
            } else if (segment === "lt" || segment === "lists" || segment === "list") {
                listId = id;
                if (!tab) tab = "lists";
            } else if (segment === "fd" || segment === "folders" || segment === "folder") {
                folderId = id;
                if (!tab) tab = "lists";
            } else if (segment === "sp" || segment === "spaces" || segment === "space") {
                spaceId = id;
                if (!tab) tab = "spaces";
            }
        }
    }

    return {
        tab,
        spaceId,
        projectId,
        teamId,
        folderId,
        listId,
        docViewId,
        docItemId,
        runId,
        conversationId,
        logId,
        chatId,
        aiChatId,
        viewId,
        taskId,
    };
}

export interface BuildUrlOptions {
    tab?: string;
    entityKey?: ShortEntityKey | "sid" | "list" | "folder" | "docView" | "aid";
    entityId?: string | null;
    viewId?: string | null;
    taskId?: string | null;
    keepTask?: boolean;
}

/**
 * Standardize entity keys to 2-letter short codes
 */
export function normalizeEntityKey(key?: string): ShortEntityKey | undefined {
    if (!key) return undefined;
    switch (key) {
        case "folder":
        case "fd":
            return "fd";
        case "list":
        case "lt":
            return "lt";
        case "docView":
        case "dv":
            return "dv";
        case "team":
        case "tm":
            return "tm";
        case "project":
        case "pj":
            return "pj";
        case "space":
        case "sid":
        case "sp":
            return "sp";
        case "aid":
        case "ai":
            return "ai";
        case "ch":
            return "ch";
        case "cid":
        case "conversationId":
        case "convId":
        case "chatId":
            return "cid";
        case "lid":
        case "logId":
            return "lid";
        case "rid":
        case "runId":
            return "rid";
        default:
            return key as ShortEntityKey;
    }
}

/**
 * Build clean query parameters using short codes and unified 'v'
 */
export function buildCleanDashboardParams(
    currentSearchParams: URLSearchParams | string,
    options: BuildUrlOptions = {}
): URLSearchParams {
    const raw = typeof currentSearchParams === "string"
        ? new URLSearchParams(currentSearchParams)
        : new URLSearchParams(currentSearchParams.toString());

    const task = options.taskId !== undefined
        ? options.taskId
        : (options.keepTask ? (raw.get("task") || raw.get("taskId")) : null);

    const targetTab = options.tab ?? raw.get("tab") ?? undefined;
    const cleanParams = new URLSearchParams();

    if (targetTab) {
        cleanParams.set("tab", targetTab);
    }

    const normKey = normalizeEntityKey(options.entityKey);
    if (normKey && options.entityId) {
        cleanParams.set(normKey, options.entityId);
    }

    // Unified 'v' parameter
    if (options.viewId) {
        cleanParams.set("v", options.viewId);
    }

    if (task) {
        cleanParams.set("task", task);
    }

    return cleanParams;
}

/**
 * Update an active view 'v' while stripping stale parameters.
 */
export function setCleanViewParam(
    currentSearchParams: URLSearchParams | string,
    viewId: string
): URLSearchParams {
    const params = typeof currentSearchParams === "string"
        ? new URLSearchParams(currentSearchParams)
        : new URLSearchParams(currentSearchParams.toString());

    // Clean legacy view keys
    ["nv", "fv", "lv"].forEach((k) => params.delete(k));

    params.set("v", viewId);
    return params;
}

export interface BuildPathOptions {
    basePath: string; // e.g. /dashboard/spaces/cmreoaxwv...
    type?: "tm" | "pj" | "lt" | "fd" | "dv" | "sp" | "v";
    id?: string | null;
    docItemId?: string | null;
    viewId?: string | null;
    taskId?: string | null;
}

/**
 * Build a path-based nested URL:
 * - /dashboard/workspaces/:workspaceId/v/:viewId
 * - /dashboard/spaces/:spaceId/tm/:teamId/v/:viewId
 * - /dashboard/spaces/:spaceId/dv/:docViewId/dc/:docItemId
 */
export function buildDashboardPath({
    basePath,
    type,
    id,
    docItemId,
    viewId,
    taskId,
}: BuildPathOptions): string {
    let path = basePath.replace(/\/$/, "");
    if (type && id) {
        path = `${path}/${type}/${id}`;
    }
    if (docItemId) {
        path = `${path}/dc/${docItemId}`;
    }
    if (viewId) {
        path = `${path}/v/${viewId}`;
    }

    const query = new URLSearchParams();
    if (taskId) query.set("task", taskId);

    const queryString = query.toString();
    return queryString ? `${path}?${queryString}` : path;
}
