/**
 * Hierarchy Scoping and Direct-Only Isolation Test Suite
 * 
 * Verifies that the nested hierarchy query filters correctly isolate entities:
 * 1. Direct workspace lists/folders do not leak into spaces/projects/teams.
 * 2. Space queries with `directOnly: true` return ONLY space-level items (no project/folder items).
 * 3. Project queries return direct project items.
 * 4. Team queries return direct team items.
 */

export interface MockHierarchyItem {
    id: string;
    name: string;
    workspaceId?: string;
    spaceId?: string | null;
    projectId?: string | null;
    teamId?: string | null;
    folderId?: string | null;
}

/**
 * Filter function implementing the exact backend `byContext` query logic with `directOnly` support
 */
export function filterHierarchyItems(
    items: MockHierarchyItem[],
    input: {
        workspaceId?: string;
        spaceId?: string;
        projectId?: string;
        teamId?: string;
        folderId?: string;
        directOnly?: boolean;
    }
): MockHierarchyItem[] {
    return items.filter(item => {
        // Project Context
        if (input.projectId) {
            if (item.projectId !== input.projectId) return false;
            if (input.directOnly && item.folderId) return false;
            if (input.folderId !== undefined && item.folderId !== input.folderId) return false;
            return true;
        }

        // Space Context
        if (input.spaceId) {
            if (item.spaceId !== input.spaceId) return false;
            if (input.directOnly) {
                // Must not be under a project or under a folder
                if (item.projectId) return false;
                if (item.folderId) return false;
            }
            if (input.folderId !== undefined && item.folderId !== input.folderId) return false;
            return true;
        }

        // Team Context
        if (input.teamId) {
            if (item.teamId !== input.teamId) return false;
            if (input.directOnly && item.folderId) return false;
            if (input.folderId !== undefined && item.folderId !== input.folderId) return false;
            return true;
        }

        // Workspace Context
        if (input.workspaceId) {
            if (item.workspaceId !== input.workspaceId) return false;
            if (input.directOnly) {
                // Must have no space, project, team, or folder parent
                if (item.spaceId) return false;
                if (item.projectId) return false;
                if (item.teamId) return false;
                if (item.folderId) return false;
            }
            return true;
        }

        return true;
    });
}

export function runHierarchyScopingTests() {
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

    const mockDataset: MockHierarchyItem[] = [
        // Direct Workspace items
        { id: "ws_list_1", name: "Workspace Root List", workspaceId: "ws_1" },
        { id: "ws_folder_1", name: "Workspace Folder", workspaceId: "ws_1" },
        { id: "ws_nested_list", name: "List in Workspace Folder", workspaceId: "ws_1", folderId: "ws_folder_1" },

        // Space 1 items
        { id: "sp1_direct_list", name: "Space 1 Direct List", workspaceId: "ws_1", spaceId: "sp_1" },
        { id: "sp1_folder_1", name: "Space 1 Folder", workspaceId: "ws_1", spaceId: "sp_1" },
        { id: "sp1_folder_list", name: "List in Space 1 Folder", workspaceId: "ws_1", spaceId: "sp_1", folderId: "sp1_folder_1" },

        // Project 1 items (under Space 1)
        { id: "pj1_direct_list", name: "Project 1 Direct List", workspaceId: "ws_1", spaceId: "sp_1", projectId: "pj_1" },
        { id: "pj1_folder", name: "Project 1 Folder", workspaceId: "ws_1", spaceId: "sp_1", projectId: "pj_1" },
        { id: "pj1_folder_list", name: "List in Project 1 Folder", workspaceId: "ws_1", spaceId: "sp_1", projectId: "pj_1", folderId: "pj1_folder" },

        // Team 1 items
        { id: "tm1_direct_list", name: "Team 1 Direct List", workspaceId: "ws_1", teamId: "tm_1" },
        { id: "tm1_folder", name: "Team 1 Folder", workspaceId: "ws_1", teamId: "tm_1" },
        { id: "tm1_folder_list", name: "List in Team 1 Folder", workspaceId: "ws_1", teamId: "tm_1", folderId: "tm1_folder" },
    ];

    test("Workspace directOnly filter returns only items directly under workspace", () => {
        const direct = filterHierarchyItems(mockDataset, { workspaceId: "ws_1", directOnly: true });
        const ids = direct.map(i => i.id);
        assertEqual(ids, ["ws_list_1", "ws_folder_1"]);
    });

    test("Space directOnly filter returns only direct space items and excludes project items", () => {
        const direct = filterHierarchyItems(mockDataset, { spaceId: "sp_1", directOnly: true });
        const ids = direct.map(i => i.id);
        assertEqual(ids, ["sp1_direct_list", "sp1_folder_1"]);
    });

    test("Project directOnly filter returns only direct project items", () => {
        const direct = filterHierarchyItems(mockDataset, { projectId: "pj_1", directOnly: true });
        const ids = direct.map(i => i.id);
        assertEqual(ids, ["pj1_direct_list", "pj1_folder"]);
    });

    test("Team directOnly filter returns only direct team items", () => {
        const direct = filterHierarchyItems(mockDataset, { teamId: "tm_1", directOnly: true });
        const ids = direct.map(i => i.id);
        assertEqual(ids, ["tm1_direct_list", "tm1_folder"]);
    });

    test("Folder specific query returns only lists under that specific folder", () => {
        const folderLists = filterHierarchyItems(mockDataset, { spaceId: "sp_1", folderId: "sp1_folder_1" });
        const ids = folderLists.map(i => i.id);
        assertEqual(ids, ["sp1_folder_list"]);
    });

    return results;
}
