"use client";
import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Store,
  Users,
  FolderOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  LogOut,
  Filter,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  X
} from 'lucide-react';
import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';

const mainNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: DASHBOARD_ROUTES.ROOT, icon: LayoutDashboard },
  { label: "Marketplace", href: MARKETPLACE_ROUTES.ROOT, icon: Store },
];

const secondaryNav = [
  { label: "Teams", href: DASHBOARD_ROUTES.TEAMS, icon: Users },
  { label: "Projects", href: DASHBOARD_ROUTES.PROJECTS, icon: FolderOpen },
  { label: "Proposals", href: DASHBOARD_ROUTES.PROPOSALS, icon: FileText },
];

type TeamSidebarProps = {
  mode?: "inline" | "overlay";
  onClose?: () => void;
  scope?: "all" | "owned" | "participated";
  onScopeChange?: (scope: "all" | "owned" | "participated") => void;
  values?: Record<string, any>;
  onChange?: (next: Record<string, any>) => void;
  isOverlay?: boolean;
};

export default function MainSidebar({
  mode = "inline",
  onClose,
  isOverlay = false,
  ...restProps
}: TeamSidebarProps) {
  void restProps;
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const [selectedIndustries, setSelectedIndustries] = useState(["AI / ML"]);
  const [selectedStages, setSelectedStages] = useState(["Seed"]);
  const [fundingRange, setFundingRange] = useState([0, 500000]);

  const industries = ["AI / ML", "Fintech", "Healthcare", "Education"];
  const stages = ["Pre-Seed", "Seed", "Series A", "Series B", "Growth"];

  // Function to check if a nav item is active
  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  const handleItemClick = (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href;
    }
    if (onClose) onClose();
  };

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };

  const toggleStage = (stage: string) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  const resolvedMode = isOverlay ? "overlay" : mode;

  const Aside = (
    <aside className={`${isMainCollapsed ? 'w-16' : 'w-64'} ${resolvedMode === 'overlay' ? 'h-full' : ''} z-50 bg-slate-800 text-white transition-all duration-300 ease-in-out flex flex-col`}
      onTransitionEnd={() => {
        // broadcast width to consumers
        const width = isMainCollapsed ? '4rem' : '16rem';
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--main-sidebar-width', width);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sidebar:main-collapsed', { detail: { collapsed: isMainCollapsed, width } }));
        }
      }}
    >
      {/* Header with Collapse Button */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!isMainCollapsed && <h2 className="text-lg font-semibold">Navigation</h2>}
        <div className="flex items-center gap-2">
          {resolvedMode === 'overlay' && (
            <button
              aria-label="Close sidebar"
              onClick={() => {
                if (onClose) onClose();
              }}
              className="p-1 rounded-md border hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={() => {
              const next = !isMainCollapsed;
              setIsMainCollapsed(next);
              const width = next ? '4rem' : '16rem';
              if (typeof document !== 'undefined') {
                document.documentElement.style.setProperty('--main-sidebar-width', width);
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sidebar:main-collapsed', { detail: { collapsed: next, width } }));
              }
            }}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
          >
            {isMainCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {mainNav.map((item) => {
            const IconComponent = item.icon;
            const isActive = isItemActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleItemClick(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                title={isMainCollapsed ? item.label : ''}
              >
                <IconComponent size={20} />
                {!isMainCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {!isMainCollapsed && (
          <>
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400 mb-3">Shortcuts</p>
              <div className="space-y-1">
                {secondaryNav.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = isItemActive(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleItemClick(item.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                        }`}
                    >
                      <IconComponent size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* User Profile and Logout */}
      <div className="p-4 border-t border-slate-700">
        {!isMainCollapsed ? (
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dashboard/my-profile'; }}>
              <User size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{session?.user?.name || 'My Profile'}</p>
                <p className="text-xs text-slate-400">{session?.user?.email || ''}</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" onClick={() => signOut()}>
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              className="w-full flex justify-center p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Profile"
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dashboard/my-profile'; }}
            >
              <User size={20} />
            </button>
            <button
              className="w-full flex justify-center p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Logout"
              onClick={() => signOut()}
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return Aside;
}
