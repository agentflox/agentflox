"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { DOCS_CONFIG, NavItem } from "./docs-config";

export const DocsSidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-slate-950/20 py-8 px-6 lg:px-12 border-r border-slate-800/10 backdrop-blur-3xl overflow-y-auto">
      <div className="flex flex-col gap-8">
        {DOCS_CONFIG.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 opacity-60 px-2">
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
  const isActive = pathname === item.href;
  const hasChildren = item.items && item.items.length > 0;

  if (hasChildren) {
    return (
      <div className="flex flex-col">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition-all group"
        >
          {isOpen ? (
            <ChevronDown size={14} className="text-slate-500" />
          ) : (
            <ChevronRight size={14} className="text-slate-500" />
          )}
          <span>{item.title}</span>
        </button>
        {isOpen && (
          <div className="flex flex-col gap-1 ml-4 border-l border-slate-800/50 mt-1 pb-2">
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
      className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-all ${
        isActive
          ? "bg-indigo-500/10 text-white border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent hover:border-slate-800"
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full transition-all ${
          isActive ? "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,1)]" : "bg-slate-700"
        }`}
      />
      <span>{item.title}</span>
    </Link>
  );
};

