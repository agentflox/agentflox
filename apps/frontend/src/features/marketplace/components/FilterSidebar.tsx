"use client";

import { ListingType } from "../types/marketplace.types";
import { cn } from "@/lib/utils";
import { 
  Bot, Users, FolderKanban, Sparkles, Box, Wrench, LayoutGrid, CheckCircle2 
} from "lucide-react";

interface FilterSidebarProps {
  activeCategory: ListingType | 'all';
  onCategoryChange: (category: ListingType | 'all') => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Items', icon: LayoutGrid },
  { id: 'agent', label: 'AI Agents', icon: Bot },
  { id: 'template', label: 'Templates', icon: Box },
  { id: 'tool', label: 'Tools', icon: Wrench },
  { id: 'talent', label: 'Talent', icon: Sparkles },
  { id: 'team', label: 'Teams', icon: Users },
  { id: 'project', label: 'Projects', icon: FolderKanban },
  { id: 'task', label: 'Tasks', icon: CheckCircle2 },
];

export default function FilterSidebar({
  activeCategory,
  onCategoryChange
}: FilterSidebarProps) {
  return (
    <div className="space-y-8 sticky top-24" style={{ viewTransitionName: 'filter-sidebar' } as React.CSSProperties}>
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
        <nav className="space-y-1">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onCategoryChange(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900" 
                    : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-70")} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
      
      {/* Skeleton for secondary enterprise filters (price, rating, verified) */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Enterprise Tiers</h3>
        <div className="space-y-3">
           <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground transition-colors">
              <input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900" defaultChecked />
              Verified Authors Only
           </label>
           <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground transition-colors">
              <input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900" />
              Requires NDA
           </label>
           <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground transition-colors">
              <input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900" />
              SLA Backed Only
           </label>
        </div>
      </div>
    </div>
  );
}
