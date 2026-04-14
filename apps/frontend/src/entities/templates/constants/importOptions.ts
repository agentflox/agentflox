/**
 * Template import option constants.
 *
 * - TASK_IMPORT_ITEMS   – individual property checkboxes shown for Task templates
 *                         (and as nested options under the "Tasks" toggle for
 *                         Space / Folder / List templates).
 * - CONTAINER_TOGGLES  – top-level on/off switches for Space, Folder, List types.
 * - ENTITY_IMPORT_MODE – maps each TemplateEntityType to the import UI variant
 *                        it should render.
 */

// ─── Task property items ─────────────────────────────────────────────────────

export interface TaskImportItem {
  /** Unique key used in CaptureConfig (camelCase). */
  id: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Whether the checkbox is checked by default. */
  defaultChecked: boolean;
}

/**
 * Ordered list of task property checkboxes.
 * Rendered in two equal columns (first half left, second half right).
 */
export const TASK_IMPORT_ITEMS: TaskImportItem[] = [
  { id: "dueDates",               label: "Due dates",                  defaultChecked: true  },
  { id: "assignees",              label: "Assignees",                  defaultChecked: true  },
  { id: "startDate",              label: "Start date",                 defaultChecked: true  },
  { id: "attachments",            label: "Attachments",                defaultChecked: true  },
  { id: "followers",              label: "Followers",                  defaultChecked: true  },
  { id: "comments",               label: "Comments",                   defaultChecked: true  },
  { id: "commentAttachments",     label: "Comment Attachments",        defaultChecked: true  },
  { id: "currentTaskStatuses",    label: "Current task statuses",      defaultChecked: true  },
  { id: "recurringSettings",      label: "Recurring settings",         defaultChecked: true  },
  { id: "dependencies",           label: "Dependencies",               defaultChecked: true  },
  { id: "tags",                   label: "Tags",                       defaultChecked: true  },
  { id: "description",            label: "Description",                defaultChecked: true  },
  { id: "priority",               label: "Priority",                   defaultChecked: true  },
  { id: "copySettingsForStatuses",label: "Copy settings for Statuses", defaultChecked: true  },
  { id: "customFields",           label: "Custom Fields",              defaultChecked: true  },
  { id: "timeEstimate",           label: "Time Estimate",              defaultChecked: true  },
  { id: "subtasks",               label: "Subtasks",                   defaultChecked: true  },
  { id: "checklists",             label: "Checklists",                 defaultChecked: true  },
  { id: "keepCheckedItems",       label: "Keep checked items",         defaultChecked: false },
  { id: "taskTypes",              label: "Task Types",                 defaultChecked: true  },
  { id: "relationships",          label: "Relationships",              defaultChecked: true  },
  { id: "duration",               label: "Duration",                   defaultChecked: true  },
  { id: "links",                  label: "Links",                      defaultChecked: true  },
];

// Helpers to split into two columns for the grid layout
export const TASK_IMPORT_ITEMS_COL1 = TASK_IMPORT_ITEMS.filter((_, i) => i % 2 === 0);
export const TASK_IMPORT_ITEMS_COL2 = TASK_IMPORT_ITEMS.filter((_, i) => i % 2 === 1);

// ─── Container-level toggles (Space / Folder / List) ─────────────────────────

export interface ContainerToggle {
  id: string;
  label: string;
  description?: string;
  defaultEnabled: boolean;
  /** When true the toggle expands the task property checkboxes below it. */
  expandsTaskItems?: boolean;
}

export const CONTAINER_TOGGLES: ContainerToggle[] = [
  {
    id: "automations",
    label: "Automations",
    defaultEnabled: true,
  },
  {
    id: "views",
    label: "Views",
    defaultEnabled: true,
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Customize task properties that you want to include below.",
    defaultEnabled: true,
    expandsTaskItems: true,
  },
];

// ─── Per entity-type import UI variant ───────────────────────────────────────

/**
 * "task"      → Show TASK_IMPORT_ITEMS checkboxes directly (no top toggles).
 * "container" → Show CONTAINER_TOGGLES (Automations / Views / Tasks) where
 *               the Tasks toggle, when enabled, reveals TASK_IMPORT_ITEMS.
 * "none"      → No import options panel at all.
 */
export type ImportMode = "task" | "container" | "none";

export const ENTITY_TYPE_IMPORT_MODE: Record<string, ImportMode> = {
  TASK:      "task",
  SPACE:     "container",
  FOLDER:    "container",
  LIST:      "container",
  DOC:       "none",
  VIEW:      "none",
  AGENT:     "none",
  WORKFORCE: "none",
  PROPOSAL:  "none",
};

// ─── Default capture config builders ─────────────────────────────────────────

/** Returns the default checked map for task property checkboxes. */
export function defaultTaskChecks(): Record<string, boolean> {
  return Object.fromEntries(TASK_IMPORT_ITEMS.map((i) => [i.id, i.defaultChecked]));
}

/** Returns the default enabled map for container toggles. */
export function defaultContainerToggles(): Record<string, boolean> {
  return Object.fromEntries(CONTAINER_TOGGLES.map((t) => [t.id, t.defaultEnabled]));
}
