import {
    LayoutDashboard, FolderKanban, Users, FileText, CheckSquare, Hash,
    FileCheck, Wrench, Package, Activity, MessageSquare, MessageCircle
} from "lucide-react";
import { ViewType } from "@/features/dashboard/components/modals/AddViewModal";

export const viewConfig: Record<
    ViewType,
    {
        label: string;
        icon: React.ComponentType<{ className?: string; size?: number }>;
        description: string;
    }
> = {
    OVERVIEW: { label: "Overview", icon: LayoutDashboard, description: "Overview of the space" },
    PROJECTS: { label: "Projects", icon: FolderKanban, description: "View and manage projects" },
    TEAMS: { label: "Teams", icon: Users, description: "View and manage teams" },
    DOCS: { label: "Docs", icon: FileText, description: "View and manage documents" },
    TASKS: { label: "Tasks", icon: CheckSquare, description: "View and manage tasks" },
    CHANNELS: { label: "Channels", icon: Hash, description: "View and manage channels" },
    PROPOSALS: { label: "Proposals", icon: FileCheck, description: "View and manage proposals" },
    TOOLS: { label: "Tools", icon: Wrench, description: "View and manage tools" },
    MATERIALS: { label: "Materials", icon: Package, description: "View and manage materials" },
    DASHBOARD: { label: "Dashboard", icon: LayoutDashboard, description: "Space dashboard" },
    ACTIVITY: { label: "Activity", icon: Activity, description: "Activity log" },
    POSTS: { label: "Posts", icon: MessageSquare, description: "Space posts" },
    DISCUSSIONS: { label: "Discussions", icon: MessageCircle, description: "Discussions" },
};
