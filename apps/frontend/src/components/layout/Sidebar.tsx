"use client";
import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
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
  User,
  LineChart,
  LifeBuoy,
  BookOpen,
  MessagesSquare,
  HelpCircle,
  LogOut,
  Grid3x3,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInterfaceSettings } from '@/hooks/useInterfaceSettings';
import { AppSidebar, SidebarItem } from './AppSidebar';
import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import { useAppDispatch } from '@/hooks/useReduxStore';
import { setSupportAssistantOpen } from '@/stores/slices/messages.slice';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { trpc } from '@/lib/trpc';

export default function MainSidebar({ mode = "inline", onClose }: { mode?: "inline" | "overlay"; onClose?: () => void }) {
  const { data: session } = useSession();
  const { t } = useInterfaceSettings();
  const dispatch = useAppDispatch();
  const currentPlan = trpc.billing.currentPlan.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 60 * 1000,
  });

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
    { label: t("sidebar.tools"), href: DASHBOARD_ROUTES.TOOLS, icon: Settings },
    { label: t("sidebar.integrations"), href: DASHBOARD_ROUTES.INTEGRATIONS, icon: Link2 },
  ];

  const accountNav = [
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
    { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { label: "Analytics", href: "/dashboard/analytics", icon: LineChart },
  ];

  const supportNav = [
    { label: "Documentation", href: "https://docs.agentflox.com", icon: BookOpen, isExternal: true },
    { label: "Community", href: "https://community.agentflox.com", icon: MessagesSquare, isExternal: true },
    { label: "Help", onClick: () => dispatch(setSupportAssistantOpen(true)), icon: HelpCircle },
  ];

  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();

  const handleCollapseChange = (collapsed: boolean) => {
    setIsMainCollapsed(collapsed);
    const width = collapsed ? '5rem' : '16rem';
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

  const realName = session?.user?.name || session?.user?.email || "Agentflox User";
  const rawPlanName = currentPlan.data?.plan?.displayName || currentPlan.data?.plan?.name || "Free";
  const userPlan = rawPlanName.toLowerCase().includes("plan") ? rawPlanName : `${rawPlanName} Plan`;

  const customHeader = (collapsed: boolean) => (
    <div className={cn("flex items-center gap-3 overflow-hidden transition-all", collapsed ? "w-0 opacity-0" : "w-auto opacity-100", "my-1")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
        {session?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-zinc-600">
            {realName.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col truncate">
        <span className="truncate text-sm font-semibold text-zinc-900 leading-tight">
          {realName}
        </span>
        <span className="truncate text-xs font-medium text-blue-600 mt-0.5">{userPlan}</span>
      </div>
    </div>
  );

  const renderNavSection = (items: any[], title: string) => (
    <div className="space-y-1 mt-6">
      {!isMainCollapsed && (
        <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.href ? pathname === item.href : false;

        const content = (
          <>
            <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
            {isMainCollapsed ? (
              <span className="text-center max-w-[68px] break-words leading-tight">{item.label}</span>
            ) : (
              <div className="flex w-full items-center justify-between">
                <span>{item.label}</span>
                {item.isExternal && <ExternalLink size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
            )}
          </>
        );

        const className = cn(
          "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer",
          isActive ? "bg-primary/10 text-primary" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
          isMainCollapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
        );

        const ItemWrapper = item.href ? (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={handleItemClick}
            className={className}
            {...(item.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.label}
            onClick={() => {
              item.onClick?.();
              handleItemClick();
            }}
            className={className}
          >
            {content}
          </button>
        );

        if (isMainCollapsed) {
          return (
            <Tooltip key={item.href || item.label} delayDuration={0}>
              <TooltipTrigger asChild>{ItemWrapper}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }

        return <React.Fragment key={item.href || item.label}>{ItemWrapper}</React.Fragment>;
      })}
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
      <div className="pb-12 flex flex-col">
        {/* Workspace Section */}
        <div className="space-y-1 mt-6">
          {!isMainCollapsed && (
            <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              Workspace
            </div>
          )}
          {visibleSecondary.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const ItemWrapper = (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={handleItemClick}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                  isMainCollapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
                )}
              >
                <Icon size={18} className={cn("shrink-0", isActive ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                {isMainCollapsed ? (
                  <span className="text-center max-w-[68px] break-words leading-tight">{item.label}</span>
                ) : (
                  <span>{item.label}</span>
                )}
              </Link>
            );

            if (isMainCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{ItemWrapper}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return <React.Fragment key={item.href}>{ItemWrapper}</React.Fragment>;
          })}

          {/* More Button */}
          <Popover open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            {(() => {
              const triggerButton = (
                <button
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none mt-2 cursor-pointer",
                    "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    isMoreOpen && "bg-zinc-100 text-zinc-900",
                    isMainCollapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
                  )}
                >
                  <Grid3x3 size={18} className="shrink-0 text-zinc-400 group-hover:text-zinc-900" />
                  {isMainCollapsed ? (
                    <span className="text-center max-w-[68px] break-words leading-tight">{t("sidebar.more")}</span>
                  ) : (
                    <span>{t("sidebar.more")}</span>
                  )}
                </button>
              );

              const WrappedTrigger = isMainCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      {triggerButton}
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t("sidebar.more")}</TooltipContent>
                </Tooltip>
              ) : (
                <PopoverTrigger asChild>
                  {triggerButton}
                </PopoverTrigger>
              );

              return WrappedTrigger;
            })()}
            <PopoverContent
              side="right"
              align="start"
              sideOffset={12}
              className="w-[300px] bg-white border-zinc-200 text-zinc-900 p-0 overflow-hidden shadow-lg rounded-xl"
              onInteractOutside={() => setIsMoreOpen(false)}
            >
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {hiddenSecondary.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={handleItemClick}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent p-3 transition-all hover:bg-zinc-100 hover:border-zinc-200",
                          active && "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                          <Icon size={20} className={cn(active ? "text-primary" : "text-zinc-600")} />
                        </div>
                        <span className="text-[11px] font-medium text-zinc-700 text-center">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Embedded Render Helpers for new sections */}
        {renderNavSection(accountNav, "Account")}
        {renderNavSection(supportNav, "Support")}

        {/* Logout Button */}
        <div className="mt-8">
          {(() => {
            const logoutBtn = (
              <button
                onClick={() => signOut()}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-200 outline-none cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700",
                  isMainCollapsed && "flex-col justify-center gap-1.5 px-1 py-2.5 text-[10px] leading-tight"
                )}
              >
                <LogOut size={18} className="shrink-0 text-red-500 group-hover:text-red-600" />
                {isMainCollapsed ? (
                  <span className="text-center max-w-[68px] break-words leading-tight">{t("header.logout")}</span>
                ) : (
                  <span>{t("header.logout")}</span>
                )}
              </button>
            );

            if (isMainCollapsed) {
              return (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{logoutBtn}</TooltipTrigger>
                  <TooltipContent side="right">{t("header.logout")}</TooltipContent>
                </Tooltip>
              );
            }
            return logoutBtn;
          })()}
        </div>
      </div>
    </AppSidebar>
  );
}
