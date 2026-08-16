"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { GitBranch, Repeat, Wand2, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { STEP_LIBRARY } from "@/entities/tools/constants/builder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SidebarPanelProps } from "./types";
import { IoLogoJavascript, IoLogoPython } from "react-icons/io";
import { TbApi } from "react-icons/tb";
import { LuBrain } from "react-icons/lu";
import { INTEGRATIONS_V2_ENABLED } from "@/features/integrations/catalogMapping";
import { IntegrationPickerPanel } from "@/features/integrations/components/IntegrationPickerPanel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ToolAIBuilderView = dynamic(
  () => import("../../../ToolAIBuilderView").then((m) => ({ default: m.ToolAIBuilderView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading AI tool builder…
      </div>
    ),
  },
);

const BUILTIN_STEP_IDS = new Set(["llm", "api", "branch", "loop", "python", "javascript"]);

export function ToolStepPickerPanel(props: SidebarPanelProps) {
  const { api } = props;
  const {
    toolStepSidebarQuery,
    setToolStepSidebarQuery,
    addStepFromLibrary,
    addSystemToolStep,
    addCompositeToolStep,
    initialTool,
  } = api;

  const [integrationBrowseOpen, setIntegrationBrowseOpen] = useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: compositeToolsData, isLoading: isLoadingCompositeTools } =
    trpc.compositeTool.list.useQuery(
      {
        // Match tools page / useToolList: list owned tools without workspace filter.
        // Filtering by workspaceId hides tools created outside the current workspace
        // (and skips the query entirely when workspaceId is undefined).
        query: toolStepSidebarQuery || undefined,
        page: 1,
        pageSize: 100,
      },
      { staleTime: 30_000 },
    );

  const builtinSteps = useMemo(
    () =>
      STEP_LIBRARY.filter((s) => {
        if (!BUILTIN_STEP_IDS.has(s.id)) return false;
        const q = toolStepSidebarQuery.trim().toLowerCase();
        if (!q) return true;
        return (s.label + " " + s.description).toLowerCase().includes(q);
      }),
    [toolStepSidebarQuery],
  );

  const yourTools = useMemo(() => {
    const items = (compositeToolsData?.items ?? []) as Array<{
      id: string;
      name?: string | null;
      description?: string | null;
    }>;
    const currentId = initialTool?.id as string | undefined;
    const q = toolStepSidebarQuery.trim().toLowerCase();
    return items.filter((tool) => {
      if (currentId && tool.id === currentId) return false;
      if (!q) return true;
      return (
        String(tool.name || "").toLowerCase().includes(q) ||
        String(tool.description || "").toLowerCase().includes(q)
      );
    });
  }, [compositeToolsData?.items, initialTool?.id, toolStepSidebarQuery]);

  return (
    <div className="space-y-6">
      {!integrationBrowseOpen && (
        <>
          <Input
            value={toolStepSidebarQuery}
            onChange={(e) => setToolStepSidebarQuery(e.target.value)}
            placeholder="Search tool steps..."
            className="h-9 flex-1 text-sm bg-white border border-zinc-200 rounded-md focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden cursor-text"
          />

          <button
            type="button"
            onClick={() => setAiBuilderOpen(true)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-50 transition-colors text-left cursor-pointer"
          >
            <div className="h-9 w-9 rounded-lg border border-zinc-200 bg-white flex items-center justify-center shrink-0">
              <Wand2 className="h-4 w-4 text-zinc-700" />
            </div>
            <span className="text-sm font-normal text-zinc-700">Create a tool with AI</span>
          </button>
        </>
      )}

      {!integrationBrowseOpen && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[14px] font-semibold text-zinc-900">
              <Wrench className="h-3.5 w-3.5 text-violet-600" />
              Built in tools
            </div>
            <div className="grid grid-cols-2 gap-1">
              {builtinSteps.map((s) => (
                <TooltipProvider key={s.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => addStepFromLibrary(s.id)}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                          {s.id === "llm" ? <LuBrain className="h-4 w-4 text-indigo-600" /> : null}
                          {s.id === "api" ? <TbApi className="h-4 w-4 text-sky-600" /> : null}
                          {s.id === "branch" ? <GitBranch className="h-4 w-4 text-violet-600" /> : null}
                          {s.id === "loop" ? <Repeat className="h-4 w-4 text-blue-600" /> : null}
                          {s.id === "python" ? <IoLogoPython className="h-4 w-4 text-emerald-600" /> : null}
                          {s.id === "javascript" ? (
                            <IoLogoJavascript className="h-4 w-4 text-amber-600" />
                          ) : null}
                        </span>
                        <span className="text-sm font-medium text-zinc-800 truncate">{s.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {s.description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[14px] font-semibold text-zinc-900">Your tools</div>
            {isLoadingCompositeTools ? (
              <p className="px-2 py-3 text-xs text-zinc-400">Loading tools...</p>
            ) : yourTools.length === 0 ? (
              <p className="px-2 py-3 text-xs text-zinc-400">No tools yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {yourTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => addCompositeToolStep({ id: tool.id, name: tool.name })}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                      <Wrench className="h-4 w-4 text-violet-500" />
                    </span>
                    <span className="text-sm font-medium text-zinc-800 truncate">
                      {tool.name || "Untitled tool"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {INTEGRATIONS_V2_ENABLED && (
        <div className={cn(integrationBrowseOpen ? "" : "space-y-2")}>
          {!integrationBrowseOpen && (
            <div className="text-[14px] font-semibold text-zinc-900">Integrations</div>
          )}
          <IntegrationPickerPanel
            initialView="overview"
            searchQuery={integrationBrowseOpen ? undefined : toolStepSidebarQuery}
            requireVerifiedActions
            compact
            onViewChange={(view) => {
              setIntegrationBrowseOpen(view !== "overview");
              if (view !== "overview") setToolStepSidebarQuery("");
            }}
            onExitNested={() => setIntegrationBrowseOpen(false)}
            onSelectAction={(action) => {
              if (!action.systemTool) {
                toast.error("This integration action is not available as a tool step yet.");
                return;
              }
              addSystemToolStep(action.systemTool);
              setIntegrationBrowseOpen(false);
            }}
          />
        </div>
      )}

      <Dialog open={aiBuilderOpen} onOpenChange={setAiBuilderOpen}>
        <DialogContent className="sm:max-w-[1400px] sm:w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-white border-0 rounded-2xl shadow-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">Create a tool with AI</DialogTitle>
          {aiBuilderOpen && (
            <div className="flex-1 min-h-0 h-full">
              <ToolAIBuilderView
                onClose={() => setAiBuilderOpen(false)}
                onToolCreated={async (toolId) => {
                  void utils.compositeTool.list.invalidate();
                  try {
                    const tool = await utils.compositeTool.get.fetch({ id: toolId });
                    addCompositeToolStep({ id: toolId, name: tool?.name });
                  } catch {
                    addCompositeToolStep({ id: toolId, name: "New AI tool" });
                  }
                  setAiBuilderOpen(false);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
