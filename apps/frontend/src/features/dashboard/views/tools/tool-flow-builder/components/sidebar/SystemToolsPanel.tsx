"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SidebarPanelProps } from "./types";

export function SystemToolsPanel(props: SidebarPanelProps) {
  const { api } = props;
  const { toolStepSidebarQuery, setToolStepSidebarQuery, isSyncingTools, systemToolsQuery, syncSystemTools, addSystemToolStep } = api;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={toolStepSidebarQuery}
          onChange={(e) => setToolStepSidebarQuery(e.target.value)}
          placeholder="Search system tools..."
          className="h-9 flex-1 text-sm bg-white border border-zinc-200 rounded-md focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden cursor-text"
        />
      </div>
      {(systemToolsQuery.data ?? []).length === 0 && !systemToolsQuery.isLoading ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-900">
          <p className="font-medium">No system tools found</p>
          <p className="mt-1 text-xs text-amber-800">Run sync to populate from the registry. Ensure the backend is running.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" disabled={isSyncingTools} onClick={syncSystemTools}>
            {isSyncingTools ? "Syncing..." : "Sync system tools"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {(systemToolsQuery.data ?? [])
            .filter((t: any) => {
              const q = toolStepSidebarQuery.trim().toLowerCase();
              if (!q) return true;
              return `${t?.name ?? ""} ${t?.displayName ?? ""} ${t?.description ?? ""}`.toLowerCase().includes(q);
            })
            .map((t: any) => (
              <button
                key={t.id}
                onClick={() => addSystemToolStep(t)}
                className="rounded-lg border border-zinc-300 bg-white p-3 text-left hover:bg-zinc-100 cursor-pointer shadow-sm"
              >
                <div className="text-sm font-medium text-zinc-900 truncate">{t.displayName ?? t.name}</div>
                <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{t.description || "System tool"}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
