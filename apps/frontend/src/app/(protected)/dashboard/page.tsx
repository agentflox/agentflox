"use client";

import Shell from "@/components/layout/Shell";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Box,
  FileText,
  FolderOpen,
  Layers,
  Link2,
  Settings,
  Users,
  LucideIcon,
  Sparkles,
} from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { t } = useInterfaceSettings();

  const navItems = [
    {
      id: "workspaces",
      title: t("sidebar.workspaces"),
      icon: Box,
      href: DASHBOARD_ROUTES.WORKSPACES,
      description: t("dashboard.empty.workspaces.desc") || "Manage your organization workspaces.",
      gradient: "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/20",
      hoverGlow: "hover:shadow-blue-500/50",
    },
    {
      id: "spaces",
      title: t("sidebar.spaces"),
      icon: Layers,
      href: DASHBOARD_ROUTES.SPACES,
      description: t("dashboard.empty.spaces.desc") || "Organize projects into spaces.",
      gradient: "from-indigo-500/20 via-purple-500/20 to-pink-500/20",
      iconColor: "text-indigo-500",
      borderColor: "border-indigo-500/20",
      hoverGlow: "hover:shadow-indigo-500/50",
    },
    {
      id: "agents",
      title: t("sidebar.agents"),
      icon: Sparkles,
      href: DASHBOARD_ROUTES.AGENTS,
      description: t("dashboard.empty.agents.desc") || "Manage and orchestrate your AI agents.",
      gradient: "from-purple-500/20 via-violet-500/20 to-indigo-500/20",
      iconColor: "text-purple-500",
      borderColor: "border-purple-500/20",
      hoverGlow: "hover:shadow-purple-500/50",
    },
    {
      id: "workforces",
      title: t("sidebar.workforces"),
      icon: Users,
      href: DASHBOARD_ROUTES.WORKFORCES,
      description: t("dashboard.empty.workforces.desc") || "Group agents and people into workforces.",
      gradient: "from-sky-500/20 via-cyan-500/20 to-emerald-500/20",
      iconColor: "text-sky-500",
      borderColor: "border-sky-500/20",
      hoverGlow: "hover:shadow-sky-500/50",
    },
    {
      id: "teams",
      title: t("sidebar.teams"),
      icon: Users,
      href: DASHBOARD_ROUTES.TEAMS,
      description: t("dashboard.empty.teams.desc") || "Manage team members and roles.",
      gradient: "from-violet-500/20 via-purple-500/20 to-fuchsia-500/20",
      iconColor: "text-violet-500",
      borderColor: "border-violet-500/20",
      hoverGlow: "hover:shadow-violet-500/50",
    },
    {
      id: "projects",
      title: t("sidebar.projects"),
      icon: FolderOpen,
      href: DASHBOARD_ROUTES.PROJECTS,
      description: t("dashboard.empty.projects.desc") || "Track project progress and milestones.",
      gradient: "from-emerald-500/20 via-green-500/20 to-lime-500/20",
      iconColor: "text-emerald-500",
      borderColor: "border-emerald-500/20",
      hoverGlow: "hover:shadow-emerald-500/50",
    },
    {
      id: "tasks",
      title: t("sidebar.tasks"),
      icon: FileText,
      href: DASHBOARD_ROUTES.TASKS,
      description: "Track individual assignments and todos.",
      gradient: "from-rose-500/20 via-pink-500/20 to-red-500/20",
      iconColor: "text-rose-500",
      borderColor: "border-rose-500/20",
      hoverGlow: "hover:shadow-rose-500/50",
    },
    {
      id: "documents",
      title: t("sidebar.documents"),
      icon: FileText,
      href: DASHBOARD_ROUTES.DOCUMENTS,
      description: "Manage project documentation.",
      gradient: "from-amber-500/20 via-orange-500/20 to-yellow-500/20",
      iconColor: "text-amber-500",
      borderColor: "border-amber-500/20",
      hoverGlow: "hover:shadow-amber-500/50",
    },
    {
      id: "proposals",
      title: t("sidebar.proposals"),
      icon: FileText,
      href: DASHBOARD_ROUTES.PROPOSALS,
      description: "Create and track proposals.",
      gradient: "from-orange-500/20 via-amber-500/20 to-yellow-500/20",
      iconColor: "text-orange-500",
      borderColor: "border-orange-500/20",
      hoverGlow: "hover:shadow-orange-500/50",
    },
    {
      id: "tools",
      title: t("sidebar.tools"),
      icon: Settings,
      href: DASHBOARD_ROUTES.TOOLS,
      description: "Configure workspace tools.",
      gradient: "from-slate-500/20 via-gray-500/20 to-zinc-500/20",
      iconColor: "text-slate-500",
      borderColor: "border-slate-500/20",
      hoverGlow: "hover:shadow-slate-500/50",
    },
    {
      id: "integrations",
      title: t("sidebar.integrations"),
      icon: Link2,
      href: DASHBOARD_ROUTES.INTEGRATIONS,
      description: "Connect with third-party services.",
      gradient: "from-cyan-500/20 via-sky-500/20 to-blue-500/20",
      iconColor: "text-cyan-500",
      borderColor: "border-cyan-500/20",
      hoverGlow: "hover:shadow-cyan-500/50",
    }
  ];

  return (
    <Shell>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <div className="mx-auto max-w-7xl space-y-8 py-8 px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="space-y-6 pb-6 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  {t("dashboard.title")}
                  <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
                </h1>
                <p className="text-base text-muted-foreground max-w-2xl">
                  {t("dashboard.subtitle") || "Manage your projects, teams, and resources in one place."}
                </p>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {navItems.map((item) => (
              <DashboardCard key={item.id} item={item} t={t} />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

interface DashboardItem {
  id: string;
  title: string;
  icon: LucideIcon;
  href: string;
  description: string;
  gradient: string;
  iconColor: string;
  borderColor: string;
  hoverGlow: string;
}

function DashboardCard({ item, t }: { item: DashboardItem; t: any }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
        item.borderColor,
        item.gradient,
        item.hoverGlow
      )}
    >
      {/* Card content */}
      <div className="relative p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-start justify-between">
          <div className="rounded-xl bg-background/50 p-3 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className={cn("h-8 w-8", item.iconColor)} />
          </div>
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {item.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* CTA Button Style */}
        <div className="flex items-center justify-between w-full p-2 rounded-md bg-transparent transition-colors group-hover:bg-background/40">
          <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Explore</span>
          <ArrowRight className="h-4 w-4 text-foreground/80 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </div>
    </Link>
  );
}
