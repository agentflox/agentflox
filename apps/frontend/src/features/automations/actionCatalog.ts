import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowRightFromLine,
  ArrowRightToLine,
  Bot,
  Box,
  Calendar,
  CirclePlus,
  Copy,
  Flag,
  GitFork,
  Hash,
  Hourglass,
  Link2,
  List,
  ListPlus,
  MessageSquare,
  Send,
  Sparkles,
  SquarePen,
  Tag,
  Target,
  Timer,
  Trash2,
  Type,
  UserPlus,
  Users,
  WandSparkles,
  Webhook,
  Zap,
} from "lucide-react";

export const AUTOMATION_ACTION_TYPES = [
  "LAUNCH_AI_AGENT",
  "UPDATE_ASSIGNEES",
  "ADD_ASSIGNEE",
  "UPDATE_STATUS",
  "CALL_WEBHOOK",
  "CALL_WEBHOOK_LEGACY",
  "CREATE_TASK",
  "UPDATE_CUSTOM_FIELD",
  "SET_AI_FIELD",
  "ADD_TO_SPRINT",
  "ADD_TO_LIST",
  "MOVE_TO_LIST",
  "DO_ANYTHING_WITH_AI",
  "REFRESH_AI_FIELD",
  "ADD_COMMENT",
  "SEND_CHANNEL_MESSAGE",
  "SEND_DIRECT_MESSAGE",
  "UPDATE_FOLLOWERS",
  "ADD_FOLLOWER",
  "APPLY_TEMPLATE",
  "ARCHIVE_TASK",
  "CREATE_LIST",
  "CREATE_SUBTASK",
  "DELETE_TASK",
  "DUPLICATE_TASK",
  "ESTIMATE_TIME",
  "TRACK_TIME",
  "UPDATE_DUE_DATE",
  "UPDATE_START_DATE",
  "ADD_RELATIONSHIP",
  "UPDATE_PRIORITY",
  "UPDATE_TAGS",
  "UPDATE_TASK_NAME",
  "UPDATE_TASK_TYPE",
] as const;

export type AutomationActionTypeV1 = (typeof AUTOMATION_ACTION_TYPES)[number];

export type ActionGroupId =
  | "popular"
  | "addOrMove"
  | "ai"
  | "communication"
  | "createAndDelete"
  | "datesAndTime"
  | "taskManagement";

export const ACTION_GROUP_LABELS: Record<ActionGroupId, string> = {
  popular: "POPULAR",
  addOrMove: "ADD OR MOVE",
  ai: "AI",
  communication: "COMMUNICATION",
  createAndDelete: "CREATE AND DELETE",
  datesAndTime: "DATES AND TIME",
  taskManagement: "TASK MANAGEMENT",
};

export const ACTION_GROUP_ORDER: ActionGroupId[] = [
  "popular",
  "addOrMove",
  "ai",
  "communication",
  "createAndDelete",
  "datesAndTime",
  "taskManagement",
];

export type ActionMeta = {
  type: AutomationActionTypeV1;
  label: string;
  description: string;
  icon: LucideIcon;
  groups: ActionGroupId[];
  destructive?: boolean;
  submenu?: boolean;
  comingSoon?: boolean;
};

export const ACTION_META: ActionMeta[] = [
  { type: "LAUNCH_AI_AGENT", label: "AI Agents", description: "Run an AI agent", icon: Bot, groups: ["popular", "ai"], submenu: true },
  { type: "UPDATE_ASSIGNEES", label: "Update assignees", description: "Change task assignees", icon: Users, groups: ["popular", "taskManagement"] },
  { type: "UPDATE_STATUS", label: "Update status", description: "Change the task status", icon: Target, groups: ["popular", "taskManagement"] },
  { type: "CALL_WEBHOOK", label: "Call webhook", description: "POST to an HTTP endpoint", icon: Zap, groups: ["popular", "communication"] },
  { type: "CREATE_TASK", label: "Create task", description: "Create a new task", icon: CirclePlus, groups: ["popular", "createAndDelete"] },
  { type: "UPDATE_CUSTOM_FIELD", label: "Update custom field", description: "Set a custom field value", icon: SquarePen, groups: ["popular", "taskManagement"] },
  { type: "ADD_TO_SPRINT", label: "Add to current sprint", description: "Add the task to the current sprint", icon: ArrowRightToLine, groups: ["addOrMove"], comingSoon: true },
  { type: "ADD_TO_LIST", label: "Add to list", description: "Also add the task to a list", icon: List, groups: ["addOrMove"] },
  { type: "MOVE_TO_LIST", label: "Move to list", description: "Move the task to another list", icon: ArrowRightFromLine, groups: ["addOrMove"] },
  { type: "DO_ANYTHING_WITH_AI", label: "Do anything with AI", description: "Run an AI agent with instructions", icon: Sparkles, groups: ["ai"] },
  { type: "REFRESH_AI_FIELD", label: "Refresh AI field", description: "Regenerate an AI custom field", icon: Sparkles, groups: ["ai"] },
  { type: "ADD_COMMENT", label: "Add comment", description: "Post a comment on the task", icon: MessageSquare, groups: ["communication"] },
  { type: "CALL_WEBHOOK_LEGACY", label: "Call webhook (Legacy)", description: "Legacy webhook action", icon: Webhook, groups: ["communication"], comingSoon: true },
  { type: "SEND_CHANNEL_MESSAGE", label: "Send channel message", description: "Post to a channel", icon: Hash, groups: ["communication"], comingSoon: true },
  { type: "SEND_DIRECT_MESSAGE", label: "Send direct message", description: "Send a direct message", icon: Send, groups: ["communication"], comingSoon: true },
  { type: "UPDATE_FOLLOWERS", label: "Update followers", description: "Add or remove followers", icon: UserPlus, groups: ["communication"] },
  { type: "APPLY_TEMPLATE", label: "Apply template", description: "Apply a task template", icon: WandSparkles, groups: ["createAndDelete"], comingSoon: true },
  { type: "ARCHIVE_TASK", label: "Archive task or subtask", description: "Archive the task", icon: Archive, groups: ["createAndDelete"] },
  { type: "CREATE_LIST", label: "Create list", description: "Create a list", icon: ListPlus, groups: ["createAndDelete"] },
  { type: "CREATE_SUBTASK", label: "Create subtask", description: "Create a subtask", icon: GitFork, groups: ["createAndDelete"] },
  { type: "DELETE_TASK", label: "Delete task or subtask", description: "Delete the task", icon: Trash2, groups: ["createAndDelete"], destructive: true },
  { type: "DUPLICATE_TASK", label: "Duplicate", description: "Duplicate the task", icon: Copy, groups: ["createAndDelete"] },
  { type: "ESTIMATE_TIME", label: "Estimate time", description: "Set a time estimate", icon: Hourglass, groups: ["datesAndTime"] },
  { type: "TRACK_TIME", label: "Track time", description: "Log time on the task", icon: Timer, groups: ["datesAndTime"] },
  { type: "UPDATE_DUE_DATE", label: "Update due date", description: "Change the due date", icon: Calendar, groups: ["datesAndTime"] },
  { type: "UPDATE_START_DATE", label: "Update start date", description: "Change the start date", icon: Calendar, groups: ["datesAndTime"] },
  { type: "ADD_RELATIONSHIP", label: "Add relationship", description: "Link related tasks", icon: Link2, groups: ["taskManagement"], comingSoon: true },
  { type: "UPDATE_PRIORITY", label: "Update priority", description: "Change priority", icon: Flag, groups: ["taskManagement"] },
  { type: "UPDATE_TAGS", label: "Update tags", description: "Add or replace tags", icon: Tag, groups: ["taskManagement"] },
  { type: "UPDATE_TASK_NAME", label: "Update task name", description: "Rename the task", icon: Type, groups: ["taskManagement"] },
  { type: "UPDATE_TASK_TYPE", label: "Update task type", description: "Change the task type", icon: Box, groups: ["taskManagement"] },
];

export const ACTION_BY_TYPE = Object.fromEntries(ACTION_META.map((a) => [a.type, a])) as Record<
  AutomationActionTypeV1,
  ActionMeta | undefined
>;

export const ACTION_CATALOG: Record<AutomationActionTypeV1, { label: string }> = Object.fromEntries(
  AUTOMATION_ACTION_TYPES.map((type) => [
    type,
    { label: ACTION_BY_TYPE[type]?.label ?? type.replace(/_/g, " ").toLowerCase() },
  ]),
) as Record<AutomationActionTypeV1, { label: string }>;

ACTION_CATALOG.ADD_ASSIGNEE = { label: "Update assignees" };
ACTION_CATALOG.ADD_FOLLOWER = { label: "Update followers" };

export const INTEGRATION_ACTIONS = [
  { id: "bugsnag", label: "Bugsnag" },
  { id: "email", label: "Email" },
  { id: "github", label: "GitHub" },
  { id: "google-calendar", label: "Google Calendar" },
  { id: "google-drive", label: "Google Drive" },
  { id: "hubspot", label: "HubSpot" },
  { id: "slack", label: "Slack" },
  { id: "twilio", label: "Twilio" },
] as const;

export const AGENT_ACTION_TYPES: AutomationActionTypeV1[] = ["DO_ANYTHING_WITH_AI", "LAUNCH_AI_AGENT"];
