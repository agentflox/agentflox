type TaskLike = { id: string; parentId?: string | null };

export type FlatRowEntry =
  | { kind: "task"; taskId: string; depth: number; index: number }
  | { kind: "inline"; parentId: string; childDepth: number };

export type GroupedFlatRowEntry =
  | { kind: "group-header"; groupName: string }
  | { kind: "top-group-header"; groupName: string; listId: string }
  | { kind: "subgroup-header"; groupName: string; topGroupId: string; subGroupName: string }
  | { kind: "group-cols"; groupName: string }
  | { kind: "task"; groupName: string; taskId: string; depth: number }
  | { kind: "inline-group"; groupName: string }
  | { kind: "inline-parent"; groupName: string; parentId: string; childDepth: number }
  | { kind: "group-add"; groupName: string };

interface BuildFlatRowEntriesParams {
  groupBy: string;
  filteredTasks: TaskLike[];
  orderByParent: Record<string, string[]>;
  expandedParents: Set<string>;
  inlineAddGroupKey: string | null;
  expandedSubtaskMode?: "collapsed" | "expanded" | "separate";
}

export function buildFlatRowEntries({
  groupBy,
  filteredTasks,
  orderByParent,
  expandedParents,
  inlineAddGroupKey,
  expandedSubtaskMode = "collapsed",
}: BuildFlatRowEntriesParams): FlatRowEntry[] {
  if (groupBy !== "none") return [];

  if (expandedSubtaskMode === "separate") {
    return filteredTasks.map((t, index) => ({
      kind: "task" as const,
      taskId: t.id,
      depth: 0,
      index,
    }));
  }

  const entries: FlatRowEntry[] = [];
  const byId = new Map(filteredTasks.map((t) => [t.id, t]));
  const rootOrder = orderByParent["root"] ?? filteredTasks.filter((t) => !t.parentId).map((t) => t.id);
  const rendered = new Set<string>();
  let rowIndex = 0;

  const walk = (taskId: string, depth: number) => {
    const task = byId.get(taskId);
    if (!task || rendered.has(taskId)) return;
    rendered.add(taskId);
    entries.push({ kind: "task", taskId, depth, index: rowIndex++ });

    if (expandedParents.has(task.id)) {
      const childIds =
        orderByParent[task.id] ?? filteredTasks.filter((t) => t.parentId === task.id).map((t) => t.id);
      childIds.forEach((cid) => walk(cid, depth + 1));

      const parentKey = `parent:${task.id}`;
      if (inlineAddGroupKey === parentKey) {
        entries.push({ kind: "inline", parentId: task.id, childDepth: depth + 1 });
      }
    }
  };

  rootOrder.forEach((id) => walk(id, 0));
  return entries;
}

interface BuildGroupedFlatRowEntriesParams {
  groupBy: string;
  groupedTasks?: Record<string, TaskLike[]>;
  nestedGroupedTasks?: Record<string, Record<string, TaskLike[]>>;
  filteredTasks: TaskLike[];
  collapsedGroups: Set<string>;
  orderByParent: Record<string, string[]>;
  expandedParents: Set<string>;
  inlineAddGroupKey: string | null;
  expandedSubtaskMode?: "collapsed" | "expanded" | "separate";
}

export function buildGroupedFlatRowEntries({
  groupBy,
  groupedTasks,
  nestedGroupedTasks,
  filteredTasks,
  collapsedGroups,
  orderByParent,
  expandedParents,
  inlineAddGroupKey,
  expandedSubtaskMode = "collapsed",
}: BuildGroupedFlatRowEntriesParams): GroupedFlatRowEntry[] {
  if (groupBy === "none") return [];

  const entries: GroupedFlatRowEntry[] = [];
  const allById = new Map(filteredTasks.map((t) => [t.id, t]));

  if (nestedGroupedTasks) {
    for (const [listId, subGroups] of Object.entries(nestedGroupedTasks)) {
      const topIsExpanded = !collapsedGroups.has(listId);
      entries.push({ kind: "top-group-header", groupName: listId, listId });

      if (!topIsExpanded) continue;

      for (const [subGroupName, groupTasks] of Object.entries(subGroups)) {
        const combinedKey = `${listId}::${subGroupName}`;
        const subIsExpanded = !collapsedGroups.has(combinedKey);

        entries.push({ kind: "subgroup-header", groupName: combinedKey, topGroupId: listId, subGroupName });

        if (!subIsExpanded) continue;

        entries.push({ kind: "group-cols", groupName: combinedKey });

        if (expandedSubtaskMode === "separate") {
          groupTasks.forEach((t) => {
            entries.push({ kind: "task", groupName: combinedKey, taskId: t.id, depth: 0 });
          });
        } else {
          const rootKey = "root";
          const orderedAll = orderByParent[rootKey] ?? groupTasks.map((t) => t.id);
          const roots = groupTasks.filter((t) => !t.parentId || !allById.has(t.parentId));
          const rootSet = new Set(roots.map((r) => r.id));
          const rootOrder = orderedAll.filter((id) => rootSet.has(id));
          const rendered = new Set<string>();

          const getChildrenIds = (parentId: string) => {
            const ordered = orderByParent[parentId] ?? filteredTasks.filter((t) => t.parentId === parentId).map((t) => t.id);
            return ordered.filter((id) => allById.has(id));
          };

          const walk = (taskId: string, depth: number) => {
            const task = allById.get(taskId);
            if (!task || rendered.has(taskId)) return;
            rendered.add(taskId);
            entries.push({ kind: "task", groupName: combinedKey, taskId, depth });

            if (expandedSubtaskMode === "expanded" || expandedParents.has(task.id)) {
              const childIds = getChildrenIds(task.id);
              childIds.forEach((cid) => walk(cid, depth + 1));

              const parentKey = `parent:${task.id}`;
              if (inlineAddGroupKey === parentKey) {
                entries.push({ kind: "inline-parent", groupName: combinedKey, parentId: task.id, childDepth: depth + 1 });
              }
            }
          };

          rootOrder.forEach((id) => walk(id, 0));
        }

        if (inlineAddGroupKey === combinedKey) {
          entries.push({ kind: "inline-group", groupName: combinedKey });
        }

        entries.push({ kind: "group-add", groupName: combinedKey });
      }
    }
  } else if (groupedTasks) {
    for (const [groupName, groupTasks] of Object.entries(groupedTasks)) {
      const isExpanded = !collapsedGroups.has(groupName);
      entries.push({ kind: "group-header", groupName });
      if (!isExpanded) continue;

      entries.push({ kind: "group-cols", groupName });

      if (expandedSubtaskMode === "separate") {
        groupTasks.forEach((t) => {
          entries.push({ kind: "task", groupName, taskId: t.id, depth: 0 });
        });
      } else {
        const rootKey = "root";
        const orderedAll = orderByParent[rootKey] ?? groupTasks.map((t) => t.id);
        const roots = groupTasks.filter((t) => !t.parentId || !allById.has(t.parentId));
        const rootSet = new Set(roots.map((r) => r.id));
        const rootOrder = orderedAll.filter((id) => rootSet.has(id));
        const rendered = new Set<string>();

        const getChildrenIds = (parentId: string) => {
          const ordered = orderByParent[parentId] ?? filteredTasks.filter((t) => t.parentId === parentId).map((t) => t.id);
          return ordered.filter((id) => allById.has(id));
        };

        const walk = (taskId: string, depth: number) => {
          const task = allById.get(taskId);
          if (!task || rendered.has(taskId)) return;
          rendered.add(taskId);
          entries.push({ kind: "task", groupName, taskId, depth });

          if (expandedSubtaskMode === "expanded" || expandedParents.has(task.id)) {
            const childIds = getChildrenIds(task.id);
            childIds.forEach((cid) => walk(cid, depth + 1));

            const parentKey = `parent:${task.id}`;
            if (inlineAddGroupKey === parentKey) {
              entries.push({ kind: "inline-parent", groupName, parentId: task.id, childDepth: depth + 1 });
            }
          }
        };

        rootOrder.forEach((id) => walk(id, 0));
      }

      if (inlineAddGroupKey === groupName) {
        entries.push({ kind: "inline-group", groupName });
      }

      entries.push({ kind: "group-add", groupName });
    }
  }

  return entries;
}
