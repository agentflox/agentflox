import type { LucideIcon } from "lucide-react";
import {
  ArrowRightToLine,
  Box,
  Calendar,
  CalendarClock,
  CirclePlus,
  Flame,
  Flag,
  Mail,
  MessageSquare,
  Settings2,
  SquarePen,
  Target,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import type { AutomationActionTypeV1 } from "./actionCatalog";
import type { AutomationTriggerTypeV1 } from "./triggerCatalog";

export type BrowseSectionId =
  | "popular"
  | "development"
  | "marketing"
  | "professionalServices"
  | "projectManagement"
  | "assignees"
  | "creation"
  | "dates"
  | "move"
  | "statuses"
  | "taskTypes"
  | "webhook"
  | "integrations";

export type BrowseTemplate = {
  id: string;
  title: string;
  description: string;
  triggerIcon: LucideIcon;
  actionIcon: LucideIcon;
  badge?: "popular" | "agent";
  sections: BrowseSectionId[];
  mode: "classic" | "agent";
  triggerType: AutomationTriggerTypeV1;
  actionType: AutomationActionTypeV1;
  comingSoon?: boolean;
  applyTemplateId?: "auto-assign" | "update-status-on-create" | "launch-ai-on-create";
};

export const BROWSE_TEMPLATES: BrowseTemplate[] = [
  {
    id: "kick-off-scoped",
    title: "Kick off tasks fully scoped",
    description: "When a task is created, launch an AI Agent to fill in details, assignees, and next steps.",
    triggerIcon: CirclePlus,
    actionIcon: SquarePen,
    badge: "popular",
    sections: ["popular", "creation", "projectManagement"],
    mode: "agent",
    triggerType: "TASK_OR_SUBTASK_CREATED",
    actionType: "DO_ANYTHING_WITH_AI",
    applyTemplateId: "launch-ai-on-create",
  },
  {
    id: "schedule-agent-runs",
    title: "Schedule AI Agent runs",
    description: "Launch an AI Agent on a recurring schedule to review work and post updates.",
    triggerIcon: CalendarClock,
    actionIcon: Calendar,
    badge: "agent",
    sections: ["popular", "dates", "projectManagement"],
    mode: "agent",
    triggerType: "EVERY_SCHEDULED_TIME",
    actionType: "DO_ANYTHING_WITH_AI",
  },
  {
    id: "polished-progress-emails",
    title: "Send polished progress emails",
    description: "When status changes, draft a progress email from recent comments and custom fields.",
    triggerIcon: Target,
    actionIcon: Mail,
    badge: "popular",
    sections: ["popular", "marketing", "statuses"],
    mode: "classic",
    triggerType: "TASK_STATUS_CHANGED",
    actionType: "ADD_COMMENT",
    comingSoon: true,
  },
  {
    id: "share-status-updates",
    title: "Share status updates instantly",
    description: "When a task is completed, post a status comment so the team stays in the loop.",
    triggerIcon: Target,
    actionIcon: MessageSquare,
    badge: "popular",
    sections: ["popular", "statuses", "professionalServices"],
    mode: "classic",
    triggerType: "TASK_STATUS_CHANGED",
    actionType: "ADD_COMMENT",
  },
  {
    id: "engineering-updates",
    title: "Keep engineering updates flowing",
    description: "When status changes, create a follow-up task so engineering updates keep moving.",
    triggerIcon: Target,
    actionIcon: CirclePlus,
    sections: ["development", "statuses", "creation"],
    mode: "classic",
    triggerType: "TASK_STATUS_CHANGED",
    actionType: "CREATE_TASK",
  },
  {
    id: "route-tickets",
    title: "Route tickets by expertise",
    description: "When a custom field changes, assign the right teammate based on expertise.",
    triggerIcon: SquarePen,
    actionIcon: Users,
    sections: ["development", "assignees"],
    mode: "classic",
    triggerType: "CUSTOM_FIELD_CHANGED",
    actionType: "UPDATE_ASSIGNEES",
    applyTemplateId: "auto-assign",
  },
  {
    id: "auto-assign-new",
    title: "Auto-assign new work",
    description: "When a task is created, add an assignee so nothing sits unowned.",
    triggerIcon: CirclePlus,
    actionIcon: UserPlus,
    sections: ["assignees", "creation"],
    mode: "classic",
    triggerType: "TASK_OR_SUBTASK_CREATED",
    actionType: "UPDATE_ASSIGNEES",
    applyTemplateId: "auto-assign",
  },
  {
    id: "due-date-nudge",
    title: "Nudge before due dates",
    description: "When a due date arrives, comment on the task so owners can act in time.",
    triggerIcon: Calendar,
    actionIcon: MessageSquare,
    sections: ["dates", "projectManagement"],
    mode: "classic",
    triggerType: "TASK_DUE_DATE_ARRIVES",
    actionType: "ADD_COMMENT",
  },
  {
    id: "move-to-list",
    title: "Move work into the right list",
    description: "When an existing task is added here, move it to the correct list.",
    triggerIcon: ArrowRightToLine,
    actionIcon: ArrowRightToLine,
    sections: ["move"],
    mode: "classic",
    triggerType: "MOVE_TO_LIST",
    actionType: "MOVE_TO_LIST",
  },
  {
    id: "priority-on-type",
    title: "Set priority from task type",
    description: "When the task type changes, update priority so work is ranked consistently.",
    triggerIcon: Box,
    actionIcon: Flag,
    sections: ["taskTypes"],
    mode: "classic",
    triggerType: "TASK_TYPE_CHANGED",
    actionType: "UPDATE_PRIORITY",
  },
  {
    id: "webhook-on-create",
    title: "Call a webhook on create",
    description: "When a task is created, POST the payload to an external endpoint.",
    triggerIcon: CirclePlus,
    actionIcon: Webhook,
    sections: ["webhook"],
    mode: "classic",
    triggerType: "TASK_OR_SUBTASK_CREATED",
    actionType: "CALL_WEBHOOK",
  },
];

export const BROWSE_NAV = [
  {
    heading: "Featured",
    items: [{ id: "popular" as BrowseSectionId, label: "Popular", icon: Flame }],
  },
  {
    heading: "Solutions",
    items: [
      { id: "development" as BrowseSectionId, label: "Development", icon: Settings2 },
      { id: "marketing" as BrowseSectionId, label: "Marketing", icon: Settings2 },
      { id: "professionalServices" as BrowseSectionId, label: "Professional Services", icon: Settings2 },
      { id: "projectManagement" as BrowseSectionId, label: "Project Management", icon: Settings2 },
    ],
  },
  {
    heading: "Categories",
    items: [
      { id: "assignees" as BrowseSectionId, label: "Assignees", icon: UserPlus },
      { id: "creation" as BrowseSectionId, label: "Creation", icon: CirclePlus },
      { id: "dates" as BrowseSectionId, label: "Dates", icon: Calendar },
      { id: "move" as BrowseSectionId, label: "Move", icon: ArrowRightToLine },
      { id: "statuses" as BrowseSectionId, label: "Statuses", icon: Target },
      { id: "taskTypes" as BrowseSectionId, label: "Task Types", icon: Box },
      { id: "webhook" as BrowseSectionId, label: "Webhook", icon: Webhook },
    ],
  },
] as const;

export const BROWSE_INTEGRATIONS = [
  { id: "bugsnag", label: "Bugsnag" },
  { id: "calendly", label: "Calendly" },
  { id: "email", label: "Email" },
  { id: "github", label: "GitHub" },
  { id: "google-calendar", label: "Google Calendar" },
  { id: "google-drive", label: "Google Drive", isNew: true },
  { id: "hubspot", label: "HubSpot" },
  { id: "slack", label: "Slack", isNew: true },
  { id: "twilio", label: "Twilio" },
] as const;

export const SECTION_TITLES: Record<BrowseSectionId, string> = {
  popular: "Popular",
  development: "Development",
  marketing: "Marketing",
  professionalServices: "Professional Services",
  projectManagement: "Project Management",
  assignees: "Assignees",
  creation: "Creation",
  dates: "Dates",
  move: "Move",
  statuses: "Statuses",
  taskTypes: "Task Types",
  webhook: "Webhook",
  integrations: "Integrations",
};
