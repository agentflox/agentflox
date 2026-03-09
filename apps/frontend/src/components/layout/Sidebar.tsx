"use client";
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Store,
  Users,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Settings,
  Sparkles,
  Layers,
  Box,
  Building2,
  Link2,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInterfaceSettings } from '@/hooks/useInterfaceSettings';
import { AppSidebar, SidebarItem } from './AppSidebar';
import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MainSidebar({ mode = "inline", onClose }: { mode?: "inline" | "overlay"; onClose?: () => void }) {
  const { data: session } = useSession();
  const { t } = useInterfaceSettings();

  const mainNav: SidebarItem[] = [
    { label: t("sidebar.home"), href: "/", icon: Home },
    { label: t("sidebar.dashboard"), href: DASHBOARD_ROUTES.ROOT, icon: LayoutDashboard },
    { label: t("sidebar.marketplace"), href: MARKETPLACE_ROUTES.ROOT, icon: Store },
  ];

  const secondaryNav = [
    { label: "Personal", href: DASHBOARD_ROUTES.PERSONAL, icon: User },
    { label: t("sidebar.workspaces"), href: DASHBOARD_ROUTES.WORKSPACES, icon: Box },
    { label: t("sidebar.spaces"), href: DASHBOARD_ROUTES.SPACES, icon: Layers },
    { label: t("sidebar.agents"), href: DASHBOARD_ROUTES.AGENTS, icon: Sparkles },
    { label: t("sidebar.workforces"), href: DASHBOARD_ROUTES.WORKFORCES, icon: Building2 },
    { label: t("sidebar.teams"), href: DASHBOARD_ROUTES.TEAMS, icon: Users },
    { label: t("sidebar.projects"), href: DASHBOARD_ROUTES.PROJECTS, icon: FolderOpen },
    { label: t("sidebar.tasks"), href: DASHBOARD_ROUTES.TASKS, icon: FileText },
    { label: t("sidebar.documents"), href: DASHBOARD_ROUTES.DOCUMENTS, icon: FileText },
    { label: t("sidebar.proposals"), href: DASHBOARD_ROUTES.PROPOSALS, icon: FileText },
    { label: t("sidebar.tools"), href: DASHBOARD_ROUTES.TOOLS, icon: Settings },
    { label: t("sidebar.integrations"), href: DASHBOARD_ROUTES.INTEGRATIONS, icon: Link2 },
  ];

  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();

  const handleCollapseChange = (collapsed: boolean) => {
    setIsMainCollapsed(collapsed);
    const width = collapsed ? '4rem' : '16rem';
    // AppSidebar sets the CSS variable. We just need to dispatch event if needed.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebar:main-collapsed', { detail: { collapsed, width } }));
    }
  };

  const handleItemClick = () => {
    if (mode === 'overlay' && onClose) {
      onClose();
    }
    setIsMoreOpen(false);
  };

  const visibleSecondary = secondaryNav.slice(0, 5);
  const hiddenSecondary = secondaryNav.slice(5);

  const customHeader = (collapsed: boolean) => (
    <div className={cn("flex items-center gap-2 overflow-hidden transition-all", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <span className="font-semibold text-zinc-900">Agentflox</span>
    </div>
  );

  return (
    <AppSidebar
      items={mainNav}
      mode={mode}
      onClose={onClose}
      cssVarName="--main-sidebar-width"
      onCollapseChange={handleCollapseChange}
      onItemClick={handleItemClick}
      renderHeader={customHeader}
    >
      <div className="space-y-1 mt-6">
        {!isMainCollapsed && (
          <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
            {t("sidebar.workspace_header")}
          </div>
        )}
        {visibleSecondary.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleItemClick}
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                isMainCollapsed && "justify-center px-2"
              )}
              title={isMainCollapsed ? item.label : undefined}
            >
              <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
              {!isMainCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* More Button */}
        <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <DialogTrigger asChild>
            <button
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none mt-2",
                isMainCollapsed ? "justify-center" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
              title={t("sidebar.more")}
            >
              <MoreHorizontal size={18} className="shrink-0 text-zinc-400 group-hover:text-zinc-900" />
              {!isMainCollapsed && <span>{t("sidebar.more")}</span>}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white border-zinc-200 text-zinc-900 p-0 overflow-hidden gap-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-lg font-medium text-zinc-900">{t("sidebar.all_apps")}</DialogTitle>
            </DialogHeader>

            <div className="p-4 pt-2 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {hiddenSecondary.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleItemClick}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition-all hover:bg-zinc-100 hover:border-zinc-200",
                        active && "ring-1 ring-primary border-primary/50 bg-primary/5"
                      )}
                    >
                      <Icon size={24} className={cn(active ? "text-primary" : "text-zinc-400")} />
                      <span className="text-sm font-medium text-zinc-700">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppSidebar>
  );
}
