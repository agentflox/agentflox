import type { LucideIcon } from "lucide-react";
import {
  ArrowRightToLine,
  Box,
  Calendar,
  CalendarClock,
  CircleCheck,
  CircleMinus,
  Flag,
  GitFork,
  Link2,
  ListChecks,
  ListPlus,
  MessageSquare,
  SquarePen,
  Sparkles,
  Tag,
  Target,
  Timer,
  Type,
  UserMinus,
  UserPlus,
} from "lucide-react";

export const AUTOMATION_TRIGGER_TYPES = [
  "TASK_OR_SUBTASK_CREATED",
  "TASK_OR_SUBTASK_UPDATED",
  "TASK_STATUS_CHANGED",
  "TASK_ASSIGNEE_ADDED",
  "TASK_ASSIGNEE_REMOVED",
  "TASK_ASSIGNEE_CHANGED",
  "TASK_DUE_DATE_ARRIVES",
  "TASK_DUE_DATE_CHANGED",
  "TASK_START_DATE_ARRIVES",
  "TASK_START_DATE_CHANGED",
  "TASK_PRIORITY_CHANGED",
  "TASK_NAME_CHANGED",
  "TASK_TYPE_CHANGED",
  "TASK_LINKED",
  "TASK_TIME_TRACKED",
  "TASK_UNBLOCKED",
  "TASK_COMMENT_ADDED",
  "CUSTOM_FIELD_CHANGED",
  "DATE_CUSTOM_FIELD_ARRIVES",
  "TAG_ADDED",
  "TAG_REMOVED",
  "CHECKLISTS_RESOLVED",
  "SUBTASKS_RESOLVED",
  "EXISTING_TASK_ADDED_TO_LOCATION",
  "MOVE_TO_LIST",
  "DATE_BEFORE_AFTER",
  "EVERY_SCHEDULED_TIME",
  "CHAT_MESSAGE_POSTED",
  "WEBHOOK",
  "INTEGRATION_TRIGGER",
] as const;

export type AutomationTriggerTypeV1 = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export type TriggerGroupId =
  | "popular"
  | "ai"
  | "addOrMove"
  | "communication"
  | "createAndComplete"
  | "datesAndTime"
  | "taskManagement";

export type TriggerMeta = {
  type: AutomationTriggerTypeV1;
  label: string;
  entity: string;
  description: string;
  icon: LucideIcon;
  groups: TriggerGroupId[];
};

export const TRIGGER_GROUP_LABELS: Record<TriggerGroupId, string> = {
  popular: "POPULAR",
  ai: "AI",
  addOrMove: "ADD OR MOVE",
  communication: "COMMUNICATION",
  createAndComplete: "CREATE AND COMPLETE",
  datesAndTime: "DATES AND TIME",
  taskManagement: "TASK MANAGEMENT",
};

export const TRIGGER_GROUP_ORDER: TriggerGroupId[] = [
  "popular",
  "ai",
  "addOrMove",
  "communication",
  "createAndComplete",
  "datesAndTime",
  "taskManagement",
];

export const TRIGGER_META: TriggerMeta[] = [
  {
    type: "CUSTOM_FIELD_CHANGED",
    label: "Custom field changed",
    entity: "Tasks or subtasks",
    description: "When a custom field value changes",
    icon: SquarePen,
    groups: ["popular", "taskManagement"],
  },
  {
    type: "EVERY_SCHEDULED_TIME",
    label: "Every...",
    entity: "Schedule",
    description: "Run on a schedule",
    icon: CalendarClock,
    groups: ["popular", "datesAndTime"],
  },
  {
    type: "TASK_STATUS_CHANGED",
    label: "Status changed",
    entity: "Tasks or subtasks",
    description: "When a task status changes",
    icon: Target,
    groups: ["popular", "taskManagement"],
  },
  {
    type: "TASK_OR_SUBTASK_CREATED",
    label: "Task or subtask created",
    entity: "Tasks or subtasks",
    description: "When a task or subtask is created",
    icon: CircleCheck,
    groups: ["popular", "createAndComplete"],
  },
  {
    type: "EXISTING_TASK_ADDED_TO_LOCATION",
    label: "Existing task or subtask added here",
    entity: "Tasks or subtasks",
    description: "When an existing task is added to this location",
    icon: ListPlus,
    groups: ["addOrMove"],
  },
  {
    type: "MOVE_TO_LIST",
    label: "Existing task or subtask moved here",
    entity: "Tasks or subtasks",
    description: "When an existing task is moved here",
    icon: ArrowRightToLine,
    groups: ["addOrMove"],
  },
  {
    type: "TASK_COMMENT_ADDED",
    label: "Comment added",
    entity: "Tasks or subtasks",
    description: "When a comment is added",
    icon: MessageSquare,
    groups: ["communication"],
  },
  {
    type: "CHECKLISTS_RESOLVED",
    label: "All checklists resolved",
    entity: "Tasks or subtasks",
    description: "When every checklist item is complete",
    icon: ListChecks,
    groups: ["createAndComplete"],
  },
  {
    type: "SUBTASKS_RESOLVED",
    label: "All immediate subtasks resolved",
    entity: "Tasks or subtasks",
    description: "When every immediate subtask is complete",
    icon: GitFork,
    groups: ["createAndComplete"],
  },
  {
    type: "DATE_CUSTOM_FIELD_ARRIVES",
    label: "Date custom field arrives",
    entity: "Tasks or subtasks",
    description: "When a date custom field arrives",
    icon: Calendar,
    groups: ["datesAndTime"],
  },
  {
    type: "DATE_BEFORE_AFTER",
    label: "Date is before/after",
    entity: "Tasks or subtasks",
    description: "When a date is before or after a value",
    icon: Calendar,
    groups: ["datesAndTime"],
  },
  {
    type: "TASK_DUE_DATE_ARRIVES",
    label: "Due date arrives",
    entity: "Tasks or subtasks",
    description: "When the due date arrives",
    icon: Calendar,
    groups: ["datesAndTime"],
  },
  {
    type: "TASK_DUE_DATE_CHANGED",
    label: "Due date changed",
    entity: "Tasks or subtasks",
    description: "When the due date changes",
    icon: Calendar,
    groups: ["datesAndTime"],
  },
  {
    type: "TASK_START_DATE_ARRIVES",
    label: "Start date arrives",
    entity: "Tasks or subtasks",
    description: "When the start date arrives",
    icon: Calendar,
    groups: ["datesAndTime"],
  },
  {
    type: "TASK_START_DATE_CHANGED",
    label: "Start date changed",
    entity: "Tasks or subtasks",
    description: "When the start date changes",
    icon: Calendar,
    groups: ["datesAndTime"],
  },
  {
    type: "TASK_TIME_TRACKED",
    label: "Time tracked",
    entity: "Tasks or subtasks",
    description: "When time is tracked on a task",
    icon: Timer,
    groups: ["datesAndTime"],
  },
  {
    type: "TASK_ASSIGNEE_ADDED",
    label: "Assignee added",
    entity: "Tasks or subtasks",
    description: "When an assignee is added",
    icon: UserPlus,
    groups: ["taskManagement"],
  },
  {
    type: "TASK_ASSIGNEE_REMOVED",
    label: "Assignee removed",
    entity: "Tasks or subtasks",
    description: "When an assignee is removed",
    icon: UserMinus,
    groups: ["taskManagement"],
  },
  {
    type: "TASK_PRIORITY_CHANGED",
    label: "Priority changed",
    entity: "Tasks or subtasks",
    description: "When priority changes",
    icon: Flag,
    groups: ["taskManagement"],
  },
  {
    type: "TAG_ADDED",
    label: "Tag added",
    entity: "Tasks or subtasks",
    description: "When a tag is added",
    icon: Tag,
    groups: ["taskManagement"],
  },
  {
    type: "TAG_REMOVED",
    label: "Tag removed",
    entity: "Tasks or subtasks",
    description: "When a tag is removed",
    icon: Tag,
    groups: ["taskManagement"],
  },
  {
    type: "TASK_LINKED",
    label: "Task or subtask linked",
    entity: "Tasks or subtasks",
    description: "When a task is linked",
    icon: Link2,
    groups: ["taskManagement"],
  },
  {
    type: "TASK_NAME_CHANGED",
    label: "Task or subtask name changes",
    entity: "Tasks or subtasks",
    description: "When the task name changes",
    icon: Type,
    groups: ["taskManagement"],
  },
  {
    type: "TASK_UNBLOCKED",
    label: "Task or subtask unblocked",
    entity: "Tasks or subtasks",
    description: "When a blocking dependency is removed",
    icon: CircleMinus,
    groups: ["taskManagement"],
  },
  {
    type: "TASK_TYPE_CHANGED",
    label: "Task type changed",
    entity: "Tasks or subtasks",
    description: "When the task type changes",
    icon: Box,
    groups: ["taskManagement"],
  },
];

export const TRIGGER_BY_TYPE = Object.fromEntries(
  TRIGGER_META.map((t) => [t.type, t]),
) as Record<AutomationTriggerTypeV1, TriggerMeta | undefined>;

export const TRIGGER_CATALOG: Record<AutomationTriggerTypeV1, { label: string; entity: string }> =
  Object.fromEntries(
    AUTOMATION_TRIGGER_TYPES.map((type) => {
      const meta = TRIGGER_BY_TYPE[type];
      return [
        type,
        {
          label: meta?.label ?? type.replace(/_/g, " ").toLowerCase(),
          entity: meta?.entity ?? "Tasks or subtasks",
        },
      ];
    }),
  ) as Record<AutomationTriggerTypeV1, { label: string; entity: string }>;

/** @deprecated Use INTEGRATION_PROVIDERS from integrationAutomationCatalog instead */
export const INTEGRATION_TRIGGERS = [] as const;
