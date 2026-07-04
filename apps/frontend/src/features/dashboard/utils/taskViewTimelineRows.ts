export type TaskLike = {
  id: string;
  title?: string;
  name?: string;
  status?: { id: string; name: string; color: string; type?: string } | null;
  priority?: string | null;
  dueDate?: Date | string | null;
  startDate?: Date | string | null;
  assignees?: { user?: { id: string; name?: string | null; image?: string | null; email?: string | null }; name?: string }[];
  assignee?: { id: string; name?: string | null; image?: string | null; email?: string | null };
  list?: { id: string; name: string };
  taskType?: { id: string; name: string; color?: string; icon?: string };
  noStartTime?: boolean;
  noEndTime?: boolean;
};

export type TimelineLaneGroup = {
  groupKey: string;
  lanes: TaskLike[][];
  noDateTasks: TaskLike[];
};

export type TimelineRowEntry =
  | { kind: "group-gap" }
  | { kind: "group-header"; groupKey: string }
  | { kind: "lane"; groupKey: string; laneIdx: number; laneTasks: TaskLike[] }
  | { kind: "no-date"; groupKey: string; taskId: string };

export const TIMELINE_ROW_HEIGHT = 44;
export const TIMELINE_GROUP_HEADER_HEIGHT = 40;
export const TIMELINE_GROUP_GAP = 12;
export const TIMELINE_FILLER_ROW_COUNT = 5;

interface BuildTimelineRowEntriesParams {
  laneGroups: TimelineLaneGroup[];
  groupBy: string;
  collapsedGroups: Set<string>;
}

export function buildTimelineRowEntries({
  laneGroups,
  groupBy,
  collapsedGroups,
}: BuildTimelineRowEntriesParams): TimelineRowEntry[] {
  const entries: TimelineRowEntry[] = [];

  laneGroups.forEach(({ groupKey, lanes, noDateTasks }, groupIdx) => {
    if (groupIdx > 0) entries.push({ kind: "group-gap" });

    entries.push({ kind: "group-header", groupKey });

    if (groupBy !== "none" && collapsedGroups.has(groupKey)) return;

    lanes.forEach((laneTasks, laneIdx) => {
      entries.push({ kind: "lane", groupKey, laneIdx, laneTasks });
    });
    noDateTasks.forEach((task) => {
      entries.push({ kind: "no-date", groupKey, taskId: task.id });
    });
  });

  return entries;
}

export function getTimelineRowHeight(entry: TimelineRowEntry | "filler"): number {
  if (entry === "filler") return TIMELINE_ROW_HEIGHT;
  if (entry.kind === "group-gap") return TIMELINE_GROUP_GAP;
  if (entry.kind === "group-header") return TIMELINE_GROUP_HEADER_HEIGHT;
  return TIMELINE_ROW_HEIGHT;
}

export function getTimelineVirtualRowCount(rowEntries: TimelineRowEntry[]): number {
  return rowEntries.length + TIMELINE_FILLER_ROW_COUNT;
}
