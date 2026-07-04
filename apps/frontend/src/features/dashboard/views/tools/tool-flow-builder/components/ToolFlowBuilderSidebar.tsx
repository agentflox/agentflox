"use client";

import { cn } from "@/lib/utils";
import type { ToolFlowBuilderApi } from "../hooks/useToolFlowBuilder";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarBody } from "./sidebar/SidebarBody";

export function ToolFlowBuilderSidebar({ api }: { api: ToolFlowBuilderApi }) {
  const { sidebarWidth, isResizingSidebar, setIsResizingSidebar } = api;

  return (
                <div
                  className="border-l border-zinc-200 bg-white overflow-hidden flex flex-col relative"
                  style={{ width: sidebarWidth }}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full w-1 cursor-col-resize z-50",
                      isResizingSidebar ? "bg-indigo-200/60" : "hover:bg-indigo-200/40"
                    )}
                    onMouseDown={() => setIsResizingSidebar(true)}
                  />
      <SidebarHeader api={api} />
                  <div className="flex-1 overflow-auto px-4 py-4">
        <SidebarBody api={api} />
                        </div>
                          </div>
  );
}
