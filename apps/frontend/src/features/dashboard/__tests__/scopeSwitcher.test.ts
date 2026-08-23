/**
 * Scope View Switcher Target Destination Resolution Test Suite
 * 
 * Validates that the DashboardHeader "Open in..." / "View in..." dropdown:
 * 1. Shows valid destination options based on context IDs and currentScope.
 * 2. Properly omits the current scope (e.g. if viewing a space, doesn't show "View in space page").
 * 3. Constructs the precise target route paths.
 */

export interface ScopeOption {
    id: string;
    label: string;
    targetPath: string;
}

export function getAvailableScopeOptions(input: {
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    currentScope?: "workspace" | "space" | "team" | "project";
}): ScopeOption[] {
    const { workspaceId, spaceId, projectId, teamId, currentScope } = input;
    const options: ScopeOption[] = [];

    // 1. Workspace page destination
    if (workspaceId && currentScope !== "workspace") {
        let targetPath = `/dashboard/workspaces/${workspaceId}`;
        if (projectId) targetPath += `/pj/${projectId}`;
        else if (spaceId) targetPath += `/sp/${spaceId}`;
        else if (teamId) targetPath += `/tm/${teamId}`;
        options.push({
            id: "workspace",
            label: "View in workspace page",
            targetPath,
        });
    }

    // 2. Space page destination
    if (spaceId && currentScope !== "space") {
        options.push({
            id: "space",
            label: "View in space page",
            targetPath: `/dashboard/spaces/${spaceId}`,
        });
    }

    // 3. Team page destination
    if (teamId && currentScope !== "team") {
        options.push({
            id: "team",
            label: "View in team page",
            targetPath: `/dashboard/teams/${teamId}`,
        });
    }

    // 4. Project page destination
    if (projectId && currentScope !== "project") {
        options.push({
            id: "project",
            label: "View in project page",
            targetPath: `/dashboard/projects/${projectId}`,
        });
    }

    return options;
}

export function runScopeSwitcherTests() {
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

    // Scenario 1: Inside Workspace viewing a Project that belongs to Space
    test("Inside Workspace page viewing a Project gives Space, Team, and Project options", () => {
        const options = getAvailableScopeOptions({
            workspaceId: "ws_1",
            spaceId: "sp_1",
            projectId: "pj_1",
            currentScope: "workspace",
        });

        assertEqual(options, [
            { id: "space", label: "View in space page", targetPath: "/dashboard/spaces/sp_1" },
            { id: "project", label: "View in project page", targetPath: "/dashboard/projects/pj_1" },
        ]);
    });

    // Scenario 2: Inside Space page viewing a Project
    test("Inside Space page viewing a Project gives Workspace and Project options", () => {
        const options = getAvailableScopeOptions({
            workspaceId: "ws_1",
            spaceId: "sp_1",
            projectId: "pj_1",
            currentScope: "space",
        });

        assertEqual(options, [
            { id: "workspace", label: "View in workspace page", targetPath: "/dashboard/workspaces/ws_1/pj/pj_1" },
            { id: "project", label: "View in project page", targetPath: "/dashboard/projects/pj_1" },
        ]);
    });

    // Scenario 3: Inside Dedicated Project page
    test("Inside Project page gives Workspace and Space options", () => {
        const options = getAvailableScopeOptions({
            workspaceId: "ws_1",
            spaceId: "sp_1",
            projectId: "pj_1",
            currentScope: "project",
        });

        assertEqual(options, [
            { id: "workspace", label: "View in workspace page", targetPath: "/dashboard/workspaces/ws_1/pj/pj_1" },
            { id: "space", label: "View in space page", targetPath: "/dashboard/spaces/sp_1" },
        ]);
    });

    // Scenario 4: Inside Dedicated Team page
    test("Inside Team page gives Workspace option", () => {
        const options = getAvailableScopeOptions({
            workspaceId: "ws_1",
            teamId: "tm_1",
            currentScope: "team",
        });

        assertEqual(options, [
            { id: "workspace", label: "View in workspace page", targetPath: "/dashboard/workspaces/ws_1/tm/tm_1" },
        ]);
    });

    return results;
}
