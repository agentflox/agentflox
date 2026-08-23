import {
    buildCleanDashboardParams,
    parseDashboardState,
    buildDashboardPath,
    normalizeEntityKey,
    clearAllSubParams,
    SHORT_ENTITY_KEYS,
    ALL_SUB_PARAMS,
} from "../utils/dashboardUrl";

/**
 * Universal Hierarchy & Dashboard URL Hygiene Test Suite
 */
export function runDashboardUrlTests() {
    const results: { name: string; passed: boolean; error?: string }[] = [];

    function test(name: string, fn: () => void) {
        try {
            fn();
            results.push({ name, passed: true });
        } catch (e: any) {
            results.push({ name, passed: false, error: e?.message || String(e) });
        }
    }

    function assertEqual(actual: any, expected: any, msg?: string) {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a !== b) {
            throw new Error(`${msg || "Assertion failed"}: expected ${b}, got ${a}`);
        }
    }

    function assertTrue(val: boolean, msg?: string) {
        if (!val) throw new Error(msg || "Expected true, got false");
    }

    // 1. normalizeEntityKey
    test("normalizeEntityKey maps full names and legacy keys to 2-letter short codes", () => {
        assertEqual(normalizeEntityKey("project"), "pj");
        assertEqual(normalizeEntityKey("pj"), "pj");
        assertEqual(normalizeEntityKey("space"), "sp");
        assertEqual(normalizeEntityKey("sid"), "sp");
        assertEqual(normalizeEntityKey("team"), "tm");
        assertEqual(normalizeEntityKey("tm"), "tm");
        assertEqual(normalizeEntityKey("folder"), "fd");
        assertEqual(normalizeEntityKey("fd"), "fd");
        assertEqual(normalizeEntityKey("list"), "lt");
        assertEqual(normalizeEntityKey("lt"), "lt");
        assertEqual(normalizeEntityKey("docView"), "dv");
        assertEqual(normalizeEntityKey("dv"), "dv");
        assertEqual(normalizeEntityKey("aid"), "ai");
        assertEqual(normalizeEntityKey("chatId"), "cid");
        assertEqual(normalizeEntityKey(undefined), undefined);
    });

    // 2. buildCleanDashboardParams
    test("buildCleanDashboardParams creates clean params with 2-letter short codes", () => {
        const params = new URLSearchParams("tab=lists&old=123&sp=sp_1");
        const clean = buildCleanDashboardParams(params, {
            tab: "lists",
            entityKey: "list",
            entityId: "list_123",
        });

        assertEqual(clean.get("tab"), "lists");
        assertEqual(clean.get("lt"), "list_123");
        assertEqual(clean.get("old"), null);
    });

    test("buildCleanDashboardParams preserves task param when keepTask is true", () => {
        const params = new URLSearchParams("tab=lists&task=task_456");
        const clean = buildCleanDashboardParams(params, {
            tab: "lists",
            entityKey: "dc",
            entityId: "doc_789",
            keepTask: true,
        });

        assertEqual(clean.get("dc"), "doc_789");
        assertEqual(clean.get("task"), "task_456");
    });

    // 3. parseDashboardState
    test("parseDashboardState parses short codes and legacy keys properly", () => {
        const params = new URLSearchParams("tab=projects&pj=proj_1&task=task_1&v=view_1");
        const state = parseDashboardState(params);

        assertEqual(state.tab, "projects");
        assertEqual(state.projectId, "proj_1");
        assertEqual(state.taskId, "task_1");
        assertEqual(state.viewId, "view_1");
    });

    test("parseDashboardState parses path segments iteratively", () => {
        const params = new URLSearchParams();
        const subpath = ["pj", "proj_99", "lt", "list_88"];
        const state = parseDashboardState(params, subpath);

        assertEqual(state.projectId, "proj_99");
        assertEqual(state.listId, "list_88");
    });

    // 4. buildDashboardPath
    test("buildDashboardPath builds path-based hierarchical routes correctly", () => {
        const path1 = buildDashboardPath({
            basePath: "/dashboard/workspaces/ws_1",
            type: "pj",
            id: "proj_100",
        });
        assertEqual(path1, "/dashboard/workspaces/ws_1/pj/proj_100");

        const path2 = buildDashboardPath({
            basePath: "/dashboard/spaces/sp_1",
            type: "lt",
            id: "list_200",
            viewId: "view_300",
            taskId: "task_400",
        });
        assertEqual(path2, "/dashboard/spaces/sp_1/lt/list_200/v/view_300?task=task_400");
    });

    // 5. clearAllSubParams
    test("clearAllSubParams removes all sub-entity parameters cleanly", () => {
        const params = new URLSearchParams("workspaceId=ws_1&tab=lists&pj=p1&tm=t1&sp=s1&lt=l1&fd=f1&dv=d1&v=v1&task=t1");
        clearAllSubParams(params);

        assertEqual(params.get("workspaceId"), "ws_1");
        assertEqual(params.get("tab"), "lists");
        assertEqual(params.get("pj"), null);
        assertEqual(params.get("tm"), null);
        assertEqual(params.get("sp"), null);
        assertEqual(params.get("lt"), null);
        assertEqual(params.get("fd"), null);
        assertEqual(params.get("dv"), null);
        assertEqual(params.get("v"), null);
        assertEqual(params.get("task"), null);
    });

    return results;
}
