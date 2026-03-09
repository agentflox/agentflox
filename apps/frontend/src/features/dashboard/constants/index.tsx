import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Activity,
  AlertCircle,
  Scale,
  CheckSquare,
  Users,
  ChevronLeft,
  Bot,
  Swords,
  Briefcase
} from 'lucide-react';

export const actions = [
  {
    title: "Create Proposal",
    description: "Draft and publish to marketplace",
    href: "#proposals",
    buttonText: "New Proposal",
    variant: "primary" as const
  },
  {
    title: "Create Project",
    description: "Spin up a new initiative",
    href: "#projects",
    buttonText: "New Project",
    variant: "outline" as const
  },
  {
    title: "Create Team",
    description: "Assemble collaborators",
    href: "#teams",
    buttonText: "New Team",
    variant: "outline" as const
  }
];

export const projectMenuItems = [
  { label: "Overview", value: "overview", icon: LayoutDashboard },
  { label: "Analytics", value: "analytics", icon: Activity },
  { label: "Discussions", value: "discussions", icon: MessageSquare },
  { label: "AI Chat", value: "chat", icon: Bot },
  { label: "Logs", value: "logs", icon: FileText },
  { label: "Activities", value: "activities", icon: Activity },
  { label: "Appeal", value: "appeal", icon: AlertCircle },
  { label: "Governance", value: "governance", icon: Scale },
  { label: "Tasks", value: "tasks", icon: CheckSquare },
  { label: "Members", value: "members", icon: Users },
  { label: "War Room", value: "war_room", icon: Swords },
  { label: "Marketplace", value: "marketplace", icon: Briefcase },
] as const;

export const agentMenuItems = [
  { label: "Overview", value: "overview", icon: LayoutDashboard },
  { label: "Team", value: "team", icon: Users },
  { label: "Builder", value: "builder", icon: Users },
  { label: "Automation", value: "automation", icon: Users },
  { label: "Chat", value: "chat", icon: Bot },
  { label: "Activities", value: "activities", icon: Activity },
  { label: "Tasks", value: "tasks", icon: CheckSquare },
  { label: "Logs", value: "logs", icon: FileText },
] as const;

export const teamMenuItems = [
  { label: "Overview", value: "overview", icon: LayoutDashboard },
  { label: "Discussions", value: "discussions", icon: MessageSquare },
  { label: "AI Chat", value: "chat", icon: Bot },
  { label: "Logs", value: "logs", icon: FileText },
  { label: "Activities", value: "activities", icon: Activity },
  { label: "Appeal", value: "appeal", icon: AlertCircle },
  { label: "Governance", value: "governance", icon: Scale },
  { label: "Tasks", value: "tasks", icon: CheckSquare },
  { label: "Members", value: "members", icon: Users },
] as const;

export const DISCUSSSION_FILTERS = [
  { key: "all", label: "All Discussions", description: "View all discussions" },
  { key: "feature", label: "Feature Ideas", description: "Feature requests and suggestions" },
  { key: "design", label: "Design & UI", description: "Design discussions and feedback" },
  { key: "implementation", label: "Implementation", description: "Technical implementation topics" },
  { key: "bugs", label: "Bugs / Fixes", description: "Bug reports and fixes" },
  { key: "announcements", label: "Announcements", description: "Important announcements" },
  { key: "issues", label: "Issues", description: "General issues and concerns" },
  { key: "others", label: "Others", description: "Other topics" },
  { key: "pinned", label: "Pinned", description: "Pinned discussions" },
  { key: "author", label: "My Posts", description: "Discussions you created" },
  { key: "active", label: "Most Active", description: "Most commented discussions" },
  { key: "upvoted", label: "Most Upvoted", description: "Highest voted discussions" },
] as const;

export const POST_TOPICS = {
  FEATURE: { label: "Feature", color: "blue" },
  DESIGN: { label: "Design", color: "purple" },
  IMPLEMENTATION: { label: "Implementation", color: "green" },
  BUGS: { label: "Bug", color: "red" },
  ANNOUNCEMENT: { label: "Announcement", color: "yellow" },
  ISSUE: { label: "Issue", color: "orange" },
  OTHERS: { label: "Other", color: "gray" },
} as const;

export type DiscussionFilterKey = typeof DISCUSSSION_FILTERS[number]["key"];
export type PostTopic = keyof typeof POST_TOPICS;
