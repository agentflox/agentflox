"use client";

import { useState } from "react";
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
  LayoutDashboard,
  Link2,
  Settings,
  Users,
  LucideIcon,
  Sparkles,
  Search,
} from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { t } = useInterfaceSettings();
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredNavItems = navItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Shell>
      <div className="bg-gradient-to-br from-background via-background to-muted/30 pb-12">
        <div className="flex flex-col mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-8 gap-6">

          {/* Header Banner */}
          <div className="shrink-0 relative overflow-hidden rounded-3xl border border-border bg-card p-12 lg:p-16 shadow-sm">
            <div className="absolute right-0 top-0 -translate-y-12 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute z-0 inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  {t("dashboard.title") || "Dashboard"}
                  <LayoutDashboard className="h-8 w-8 text-primary" />
                </h1>
                <p className="text-muted-foreground max-w-xl text-lg sm:text-xl font-medium">
                  {t("dashboard.subtitle") || "Overview of your collaborative environment."}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0 overflow-x-auto pb-2 md:pb-0 hide-scrollbar w-full md:w-auto">
                <div className="flex flex-col p-4 rounded-2xl bg-background/60 border border-border/50 backdrop-blur-md min-w-[120px] shadow-sm transition-all hover:-translate-y-1 hover:shadow-md flex-1 md:flex-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                      <Box className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspaces</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground">3</div>
                </div>
                
                <div className="flex flex-col p-4 rounded-2xl bg-background/60 border border-border/50 backdrop-blur-md min-w-[120px] shadow-sm transition-all hover:-translate-y-1 hover:shadow-md flex-1 md:flex-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spaces</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground">12</div>
                </div>

                <div className="flex flex-col p-4 rounded-2xl bg-background/60 border border-border/50 backdrop-blur-md min-w-[120px] shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hidden sm:flex flex-1 md:flex-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground">24</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modules Section Header */}
          <div className="shrink-0 pt-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary shadow-sm">
                  <Layers className="h-4 w-4" />
                  <span>Platform Ecosystem</span>
                </div>
                <h2 className="text-2xl pt-1 font-bold tracking-tight text-foreground">
                  Explore Your Modules
                </h2>
                <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                  Create intelligent agents, orchestrate complex workflows, and empower your team to achieve more. Choose a module below to begin your journey.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-auto md:min-w-[320px] lg:min-w-[400px] shrink-0">
                <div className="group flex h-12 w-full items-center rounded-xl border border-border/80 bg-card/50 backdrop-blur-md px-4 shadow-sm transition-all focus-within:border-primary/50 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10 hover:border-border">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input
                    className="flex-1 h-full w-full bg-transparent pl-3 pr-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 border-none outline-none"
                    placeholder="Search modules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cards Container */}
          <div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
              {filteredNavItems.map((item) => (
                <DashboardCard key={item.id} item={item} t={t} />
              ))}
              {filteredNavItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No modules found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="shrink-0 pt-16">
            <div className="rounded-3xl border border-border bg-card p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
              <div className="absolute z-0 inset-0 bg-gradient-to-tl from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

              <div className="relative z-10 space-y-2 text-left w-full">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Ready to customize and implement your strategies?</h3>
                <p className="text-muted-foreground text-base max-w-2xl">
                  Explore our comprehensive documentation to master the platform and build powerful agents.
                </p>
              </div>
              <div className="relative z-10 shrink-0 w-full md:w-auto mt-2 md:mt-0 flex justify-start md:justify-end">
                <Button
                  asChild
                  size="lg"
                  className="rounded-2xl font-semibold px-8 shadow-sm hover:shadow-md transition-all duration-300 group bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  <a href="https://docs.agentflox.com" target="_blank" rel="noopener noreferrer">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </div>
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
        "group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl",
        item.borderColor,
        item.gradient,
        item.hoverGlow,
        "bg-background/40 hover:bg-background/80"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-10 pointer-events-none" />

      {/* Card content */}
      <div className="relative p-6 flex flex-col flex-1 h-full">
        {/* Icon */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "rounded-xl p-3 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
            "bg-gradient-to-br from-background to-muted backdrop-blur-md border border-border/50"
          )}>
            <Icon className={cn("h-7 w-7 transition-colors duration-300", item.iconColor)} />
          </div>
        </div>

        {/* Title and description */}
        <div className="space-y-2 mb-6 flex-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors duration-300">
            {item.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 group-hover:text-foreground/80 transition-colors duration-300">
            {item.description}
          </p>
        </div>

        {/* CTA Button Style - Enhanced Hover */}
        <div className="mt-auto group/btn flex items-center gap-2 overflow-hidden w-fit">
          <div className="flex items-center justify-center p-2 rounded-full bg-foreground/5 text-foreground/70 transition-all duration-300 group-hover:bg-foreground group-hover:text-background shadow-sm">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-foreground/70 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
            Explore now
          </span>
        </div>
      </div>
    </Link>
  );
}
