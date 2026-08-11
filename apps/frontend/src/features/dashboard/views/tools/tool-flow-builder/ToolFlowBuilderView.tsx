"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ToolEditorAssistantPanel } from "@/entities/tools/components/assistant/ToolEditorAssistantPanel";
import { ToolFlowCanvas } from "@/entities/tools/components/builder/ToolFlowCanvas";
import { ToolLogView } from "../ToolLogView";
import { useToolRunHistory } from "@/entities/tools/hooks/useToolRunHistory";
import { useToolFlowBuilder } from "./hooks/useToolFlowBuilder";
import { ToolFlowBuilderHeader } from "./components/ToolFlowBuilderHeader";
import { ToolFlowBuilderSidebar } from "./components/ToolFlowBuilderSidebar";
import { ToolFlowBuilderModals } from "./components/ToolFlowBuilderModals";
import type { ToolFlowBuilderViewProps } from "./types";
export type { ToolFlowBuilderViewProps } from "./types";

export function ToolFlowBuilderView(props: ToolFlowBuilderViewProps) {
  const api = useToolFlowBuilder(props);
  const toolId = api.initialTool?.id as string | undefined;
  const toolRunHistory = useToolRunHistory(toolId);

  const mergedRunHistory = React.useMemo(() => {
    const liveIds = new Set<string>();
    for (const r of api.runHistory) {
      liveIds.add(r.id);
      if (r.serverRunId) liveIds.add(r.serverRunId);
    }
    const dbOnly = toolRunHistory.dbRuns.filter(
      (r) => !liveIds.has(r.id) && !(r.serverRunId && liveIds.has(r.serverRunId)),
    );
    return [...api.runHistory, ...dbOnly];
  }, [api.runHistory, toolRunHistory.dbRuns]);

  React.useEffect(() => {
    for (const run of api.runHistory) {
      if (run.status !== "running") {
        toolRunHistory.mergeLiveRun(run);
      }
    }
  }, [api.runHistory, toolRunHistory.mergeLiveRun]);

  return (
    <>
      <div className="flex h-full flex-col bg-white">
        <ToolFlowBuilderModals api={api} />
        <ToolFlowBuilderHeader api={api} />

        <div className="flex-1 flex overflow-hidden relative">
          {api.assistantOpen ? (
            <div className="border-r border-zinc-200 bg-white w-[420px] shrink-0 flex flex-col">
              <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-900">Assistant</div>
                <button
                  type="button"
                  onClick={() => api.setAssistantOpen(false)}
                  className="h-8 w-8 rounded-md hover:bg-zinc-50 text-zinc-500 cursor-pointer"
                  aria-label="Close assistant"
                >
                  x
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ToolEditorAssistantPanel
                  title="Tool Assistant"
                  entityId={String(api.initialTool?.id ?? "new")}
                  entityName={api.name || "Tool"}
                  context={{
                    tool: {
                      id: api.initialTool?.id ?? null,
                      name: api.name,
                      description: api.description,
                      category: api.category,
                    },
                    inputs: api.inputs,
                    outputs: api.outputs,
                    steps: api.steps.map((s) => {
                      let cfg: any = {};
                      try {
                        cfg = JSON.parse(s.config || "{}");
                      } catch {
                        cfg = { raw: s.config };
                      }
                      return { ...s, config: cfg };
                    }),
                  }}
                  onApplyOps={(ops) => api.applyToolOps(ops)}
                  onPersist={async () => {
                    await api.upsert();
                  }}
                  className="h-full"
                />
              </div>
            </div>
          ) : null}
          {api.activeTopTab === "run" ? (
            <div className="flex-1 min-h-0 h-full w-full flex flex-col">
              <ToolLogView
                inputs={api.inputs}
                runHistory={mergedRunHistory}
                setRunHistory={(updater) => {
                  api.setRunHistory(updater);
                }}
                selectedRunId={api.selectedRunId}
                setSelectedRunId={api.setSelectedRunId}
                runInput={api.runInput}
                setRunInput={api.setRunInput}
                selectedRun={api.selectedRun}
                isRunningTool={api.isRunningTool}
                runCompositeTool={(opts) => api.runCompositeTool(opts)}
                cancelCompositeTool={() => api.cancelCompositeTool()}
                onDeleteRun={toolRunHistory.deleteRun}
                onLoadMore={toolRunHistory.loadMore}
                hasMore={toolRunHistory.hasMore}
                loadingMore={toolRunHistory.loadingMore}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden bg-zinc-50 relative">
                <ReactFlowProvider>
                  <ToolFlowCanvas
                    viewMode={api.viewMode}
                    setViewMode={api.setViewMode}
                    computedNodes={api.computedNodes}
                    computedEdges={api.computedEdges}
                    nodeTypes={api.nodeTypes}
                    edgeTypes={api.edgeTypes}
                    navigatorOpen={api.navigatorOpen}
                    setNavigatorOpen={api.setNavigatorOpen}
                    navigatorQuery={api.navigatorQuery}
                    setNavigatorQuery={api.setNavigatorQuery}
                    setSidebarOpen={api.setSidebarOpen}
                    setToolStepSidebarOpen={api.setToolStepSidebarOpen}
                    setSystemToolsListOpen={api.setSystemToolsListOpen}
                    setInputSidebarOpen={api.setInputSidebarOpen}
                    setSelectedInputField={api.setSelectedInputField}
                    setSelectedNode={api.setSelectedNode}
                    setActivePanelTab={api.setActivePanelTab}
                    setSelectedStepId={api.setSelectedStepId}
                  />
                </ReactFlowProvider>
              </div>
              {api.sidebarOpen ? <ToolFlowBuilderSidebar api={api} /> : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ToolFlowBuilderView;
