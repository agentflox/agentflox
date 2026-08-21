import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  FileText,
  FilePlus,
  FolderOpen,
  GitPullRequest,
  GitMerge,
  GitCommit,
  CircleDot,
  CircleCheck,
  Hash,
  Mail,
  MessageSquare,
  Send,
  SmilePlus,
  Upload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Field types for dynamic config rendering
// ---------------------------------------------------------------------------

export type IntegrationFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "select"
  | "datetime"
  | "file"
  | "checkbox"
  | "email";

export type IntegrationConfigField = {
  id: string;
  label: string;
  type: IntegrationFieldType;
  required?: boolean;
  placeholder?: string;
  optional?: boolean;
  halfWidth?: boolean;
  supportsVariables?: boolean;
  options?: Array<{ value: string; label: string }>;
  advanced?: boolean;
};

// ---------------------------------------------------------------------------
// Integration trigger / action definition
// ---------------------------------------------------------------------------

export type IntegrationTriggerDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  fields: IntegrationConfigField[];
};

export type IntegrationActionDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  fields: IntegrationConfigField[];
};

export type IntegrationProviderDef = {
  id: string;
  label: string;
  catalogProvider: string;
  triggers: IntegrationTriggerDef[];
  actions: IntegrationActionDef[];
};

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

export const INTEGRATION_PROVIDERS: IntegrationProviderDef[] = [
  // ─── Email ────────────────────────────────────────────────────────────
  {
    id: "email",
    label: "Email",
    catalogProvider: "email",
    triggers: [],
    actions: [
      {
        id: "send_email",
        label: "Send email",
        icon: Mail,
        fields: [
          { id: "to", label: "To", type: "email", required: true, placeholder: "Enter email address(es)" },
          { id: "subject", label: "Subject", type: "text", required: true, placeholder: "Enter email subject", supportsVariables: true },
          { id: "body", label: "Body", type: "richtext", required: true, placeholder: "Enter email content..." },
        ],
      },
    ],
  },

  // ─── GitHub ───────────────────────────────────────────────────────────
  {
    id: "github",
    label: "GitHub",
    catalogProvider: "github",
    triggers: [
      {
        id: "push",
        label: "Push",
        icon: GitCommit,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "branch", label: "Branch", type: "select", optional: true, placeholder: "Any" },
        ],
      },
      {
        id: "pr_opened",
        label: "Pull request opened",
        icon: GitPullRequest,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "branch", label: "Branch", type: "select", optional: true, placeholder: "Any" },
          { id: "file_paths", label: "File paths", type: "text", optional: true, placeholder: "e.g. src/**, .docs/**", advanced: true },
          { id: "pr_state", label: "Pull request state", type: "select", optional: true, placeholder: "Any", advanced: true },
          { id: "author", label: "Author", type: "text", optional: true, placeholder: "e.g. octocat", advanced: true },
          { id: "labels", label: "Labels", type: "select", optional: true, placeholder: "Select labels", advanced: true },
          { id: "include_draft", label: "Include draft PRs", type: "checkbox", advanced: true },
          { id: "exclude_draft", label: "Exclude draft PRs", type: "checkbox", advanced: true },
        ],
      },
      {
        id: "pr_merged",
        label: "Pull request merged",
        icon: GitMerge,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "branch", label: "Branch", type: "select", optional: true, placeholder: "Any" },
          { id: "file_paths", label: "File paths", type: "text", optional: true, placeholder: "e.g. src/**, .docs/**", advanced: true },
          { id: "pr_state", label: "Pull request state", type: "select", optional: true, placeholder: "Any", advanced: true },
          { id: "author", label: "Author", type: "text", optional: true, placeholder: "e.g. octocat", advanced: true },
          { id: "labels", label: "Labels", type: "select", optional: true, placeholder: "Select labels", advanced: true },
          { id: "include_draft", label: "Include draft PRs", type: "checkbox", advanced: true },
          { id: "exclude_draft", label: "Exclude draft PRs", type: "checkbox", advanced: true },
        ],
      },
      {
        id: "issue_opened",
        label: "Issue opened",
        icon: CircleDot,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "labels", label: "Labels", type: "select", optional: true, placeholder: "Select labels", advanced: true },
        ],
      },
      {
        id: "issue_closed",
        label: "Issue closed",
        icon: CircleCheck,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "labels", label: "Labels", type: "select", optional: true, placeholder: "Select labels", advanced: true },
        ],
      },
    ],
    actions: [
      {
        id: "create_issue",
        label: "Create issue",
        icon: CircleDot,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "title", label: "Title", type: "text", required: true, placeholder: "Enter issue title", supportsVariables: true },
          { id: "description", label: "Description", type: "richtext", placeholder: "Enter issue description..." },
        ],
      },
      {
        id: "add_comment",
        label: "Add comment",
        icon: MessageSquare,
        fields: [
          { id: "repository", label: "Repository", type: "select", required: true, placeholder: "Select repository" },
          { id: "issue_number", label: "Issue / PR number", type: "text", required: true, placeholder: "e.g. 42" },
          { id: "body", label: "Comment", type: "richtext", required: true, placeholder: "Enter comment..." },
        ],
      },
    ],
  },

  // ─── Google Calendar ──────────────────────────────────────────────────
  {
    id: "google_calendar",
    label: "Google Calendar",
    catalogProvider: "google_calendar",
    triggers: [
      {
        id: "event_created",
        label: "Event created",
        icon: Calendar,
        fields: [
          { id: "calendar", label: "Calendar", type: "select", required: true, placeholder: "Select calendar" },
          { id: "event_type", label: "Event type", type: "select", optional: true, placeholder: "Any" },
          { id: "start_time", label: "Start time", type: "select", optional: true, placeholder: "Any time", halfWidth: true, advanced: true },
          { id: "end_time", label: "End time", type: "select", optional: true, placeholder: "Any time", halfWidth: true, advanced: true },
          { id: "timezone", label: "Time zone", type: "select", optional: true, placeholder: "Select time zone", halfWidth: true, advanced: true },
          { id: "guests", label: "Guests", type: "select", optional: true, placeholder: "Any", halfWidth: true, advanced: true },
          { id: "only_conferencing", label: "Only events with conferencing", type: "checkbox", advanced: true },
          { id: "include_cancelled", label: "Include cancelled events", type: "checkbox", advanced: true },
        ],
      },
      {
        id: "event_starting",
        label: "Event starting soon",
        icon: Calendar,
        fields: [
          { id: "calendar", label: "Calendar", type: "select", required: true, placeholder: "Select calendar" },
          { id: "minutes_before", label: "Minutes before", type: "text", required: true, placeholder: "e.g. 15" },
        ],
      },
    ],
    actions: [
      {
        id: "create_event",
        label: "Create event",
        icon: Calendar,
        fields: [
          { id: "calendar", label: "Calendar", type: "select", required: true, placeholder: "Select calendar" },
          { id: "event_title", label: "Event title", type: "text", required: true, placeholder: "Enter event title", supportsVariables: true },
          { id: "start_time", label: "Start time", type: "datetime", required: true, halfWidth: true },
          { id: "end_time", label: "End time", type: "datetime", required: true, halfWidth: true },
          { id: "timezone", label: "Time zone", type: "select", required: false, placeholder: "Select time zone" },
        ],
      },
      {
        id: "update_event",
        label: "Update event",
        icon: Calendar,
        fields: [
          { id: "calendar", label: "Calendar", type: "select", required: true, placeholder: "Select calendar" },
          { id: "event_id", label: "Event ID", type: "text", required: true, placeholder: "Enter event ID" },
          { id: "event_title", label: "Event title", type: "text", placeholder: "Enter event title", supportsVariables: true },
        ],
      },
    ],
  },

  // ─── Google Drive ─────────────────────────────────────────────────────
  {
    id: "google_drive",
    label: "Google Drive",
    catalogProvider: "google_drive",
    triggers: [
      {
        id: "file_created",
        label: "New file created",
        icon: FilePlus,
        fields: [
          { id: "folder", label: "Folder", type: "select", optional: true, placeholder: "Select folder" },
          { id: "file_type", label: "File type", type: "select", optional: true, placeholder: "Any" },
          { id: "filename_contains", label: "File name contains", type: "text", optional: true, placeholder: "e.g. report", halfWidth: true, advanced: true },
          { id: "filename_not_contains", label: "File name does not contain", type: "text", optional: true, placeholder: "e.g. draft", halfWidth: true, advanced: true },
          { id: "mime_type", label: "MIME type", type: "select", optional: true, placeholder: "Any", halfWidth: true, advanced: true },
          { id: "is_trashed", label: "Is trashed", type: "select", optional: true, placeholder: "Any", halfWidth: true, advanced: true },
          { id: "owned_by_me", label: "Owned by me", type: "checkbox", advanced: true },
          { id: "shared_with_me", label: "Shared with me", type: "checkbox", advanced: true },
        ],
      },
      {
        id: "file_modified",
        label: "File modified",
        icon: FileText,
        fields: [
          { id: "folder", label: "Folder", type: "select", optional: true, placeholder: "Select folder" },
          { id: "file_type", label: "File type", type: "select", optional: true, placeholder: "Any" },
        ],
      },
    ],
    actions: [
      {
        id: "create_file",
        label: "Create file",
        icon: FilePlus,
        fields: [
          { id: "folder", label: "Folder", type: "select", required: true, placeholder: "Select folder" },
          { id: "file_name", label: "File name", type: "text", required: true, placeholder: "Enter file name with extension (e.g. report.docx)", supportsVariables: true },
          { id: "file_content", label: "File content", type: "file", required: true },
        ],
      },
      {
        id: "create_document",
        label: "Create Document",
        icon: FileText,
        fields: [
          { id: "parent_folder", label: "Parent Folder", type: "select", placeholder: "Select an option" },
          { id: "document_name", label: "Document Name", type: "text", required: true, placeholder: "Document Name", supportsVariables: true },
          { id: "file_content", label: "File Content", type: "textarea", placeholder: "File Content", supportsVariables: true },
        ],
      },
      {
        id: "move_file",
        label: "Move file",
        icon: FolderOpen,
        fields: [
          { id: "file_id", label: "File", type: "select", required: true, placeholder: "Select file" },
          { id: "destination", label: "Destination folder", type: "select", required: true, placeholder: "Select folder" },
        ],
      },
    ],
  },

  // ─── Slack ────────────────────────────────────────────────────────────
  {
    id: "slack",
    label: "Slack",
    catalogProvider: "slack",
    triggers: [
      {
        id: "message_posted",
        label: "New message in channel",
        icon: MessageSquare,
        fields: [
          { id: "workspace", label: "Workspace", type: "select", required: true, placeholder: "Select workspace" },
          { id: "channel", label: "Channel", type: "select", required: true, placeholder: "Select channel" },
          { id: "message_subtype", label: "Message subtype", type: "select", optional: true, placeholder: "Any", halfWidth: true, advanced: true },
          { id: "message_contains", label: "Message contains", type: "text", optional: true, placeholder: "e.g. alert", halfWidth: true, advanced: true },
          { id: "message_not_contains", label: "Message does not contain", type: "text", optional: true, placeholder: "e.g. ignore", halfWidth: true, advanced: true },
          { id: "user", label: "User", type: "select", optional: true, placeholder: "Any", halfWidth: true, advanced: true },
          { id: "bot_messages", label: "Bot messages", type: "select", optional: true, placeholder: "Exclude", halfWidth: true, advanced: true },
          { id: "thread_replies", label: "Thread replies", type: "select", optional: true, placeholder: "Any", halfWidth: true, advanced: true },
        ],
      },
      {
        id: "reaction_added",
        label: "Reaction added",
        icon: SmilePlus,
        fields: [
          { id: "workspace", label: "Workspace", type: "select", required: true, placeholder: "Select workspace" },
          { id: "channel", label: "Channel", type: "select", required: true, placeholder: "Select channel" },
          { id: "emoji", label: "Emoji", type: "text", optional: true, placeholder: "Any" },
        ],
      },
    ],
    actions: [
      {
        id: "send_message",
        label: "Send message",
        icon: Send,
        fields: [
          { id: "workspace", label: "Workspace", type: "select", required: true, placeholder: "Select workspace" },
          { id: "channel", label: "Channel", type: "select", required: true, placeholder: "Select channel" },
          { id: "message", label: "Message", type: "richtext", required: true, placeholder: "Enter your message..." },
        ],
      },
      {
        id: "send_dm",
        label: "Send direct message",
        icon: MessageSquare,
        fields: [
          { id: "workspace", label: "Workspace", type: "select", required: true, placeholder: "Select workspace" },
          { id: "user", label: "User", type: "select", required: true, placeholder: "Select user" },
          { id: "message", label: "Message", type: "richtext", required: true, placeholder: "Enter your message..." },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const INTEGRATION_PROVIDER_BY_ID = Object.fromEntries(
  INTEGRATION_PROVIDERS.map((p) => [p.id, p]),
) as Record<string, IntegrationProviderDef | undefined>;

export function getIntegrationTrigger(
  providerId: string,
  triggerId: string,
): IntegrationTriggerDef | undefined {
  return INTEGRATION_PROVIDER_BY_ID[providerId]?.triggers.find((t) => t.id === triggerId);
}

export function getIntegrationAction(
  providerId: string,
  actionId: string,
): IntegrationActionDef | undefined {
  return INTEGRATION_PROVIDER_BY_ID[providerId]?.actions.find((a) => a.id === actionId);
}
