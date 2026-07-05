"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { DOCS_CONFIG, NavItem } from "./docs-config";

export const DocsSidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-slate-50/40 dark:bg-[#020617]/40 py-8 px-4 lg:px-8 border-r border-slate-200/80 dark:border-slate-800/30 backdrop-blur-3xl overflow-y-auto">
      <div className="flex flex-col gap-8">
        {DOCS_CONFIG.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 opacity-80 dark:opacity-60 px-4 mb-1">
              {section.title}
            </h3>
            <div className="flex flex-col gap-1">
              {section.items?.map((item, itemIdx) => (
                <SidebarItem key={itemIdx} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SidebarItem = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = item.isActive || pathname === item.href;
  const hasChildren = item.items && item.items.length > 0;

  if (hasChildren) {
    return (
      <div className="flex flex-col">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all group"
        >
          {isOpen ? (
            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronRight size={14} className="text-slate-400 dark:text-slate-500" />
          )}
          <span>{item.title}</span>
        </button>
        {isOpen && (
          <div className="flex flex-col gap-1 ml-4 border-l border-slate-200 dark:border-slate-800/50 mt-1 pb-2">
            {item.items?.map((subItem, idx) => (
              <SidebarItem key={idx} item={subItem} pathname={pathname} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={`flex items-center gap-3 w-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.05)] border-l-2 border-indigo-500 rounded-r-lg"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 border-l-2 border-transparent rounded-r-lg"
      }`}
    >
      <span>{item.title}</span>
    </Link>
  );
};

