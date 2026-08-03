import React from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type Node, type Edge, type NodeTypes, type EdgeTypes } from "@xyflow/react";

export type ToolFlowCanvasProps = {
  viewMode: "flow" | "notebook";
  setViewMode: (mode: "flow" | "notebook") => void;
  computedNodes: Node<any>[];
  computedEdges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
  navigatorOpen: boolean;
  setNavigatorOpen: (open: boolean) => void;
  navigatorQuery: string;
  setNavigatorQuery: (query: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setToolStepSidebarOpen: (open: boolean) => void;
  setSystemToolsListOpen: (open: boolean) => void;
  setInputSidebarOpen: (open: boolean) => void;
  setSelectedInputField: (field: any) => void;
  setSelectedNode: (node: any) => void;
  setActivePanelTab: (tab: any) => void;
  setSelectedStepId: (id: string | null) => void;
};

export function ToolFlowCanvas({
  viewMode,
  setViewMode,
  computedNodes,
  computedEdges,
  nodeTypes,
  edgeTypes,
  navigatorOpen,
  setNavigatorOpen,
  navigatorQuery,
  setNavigatorQuery,
  setSidebarOpen,
  setToolStepSidebarOpen,
  setSystemToolsListOpen,
  setInputSidebarOpen,
  setSelectedInputField,
  setSelectedNode,
  setActivePanelTab,
  setSelectedStepId,
}: ToolFlowCanvasProps) {
  const rf = useReactFlow();

  // Fit once on mount
  React.useEffect(() => {
    rf.fitView({ padding: 0.5, duration: 0 });
  }, [rf]);

  const navigatorItems = React.useMemo(() => {
    const items = computedNodes.map((n) => ({
      id: n.id,
      label: (n.data as any)?.title || "Untitled",
    }));
    const q = navigatorQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [computedNodes, navigatorQuery]);

  const focusNode = (nodeId: string) => {
    const node = computedNodes.find((n) => n.id === nodeId);
    if (!node) return;
    setNavigatorOpen(false);
    requestAnimationFrame(() => {
      rf.fitView({ nodes: [node], padding: 0.5, duration: 450 });
    });

    // Selection logic
    if (nodeId === "node_inputs") {
      setSelectedNode("inputs");
      setActivePanelTab("configure");
    } else if (nodeId === "node_steps_empty") {
      setSelectedNode("step");
      setSelectedStepId(null);
      setActivePanelTab("configure");
    } else if (nodeId === "node_outputs") {
      setSelectedNode("outputs");
      setActivePanelTab("outputs");
    } else if (nodeId.startsWith("node_step_")) {
      const stepId = nodeId.replace("node_step_", "");
      setSelectedNode("step");
      setSelectedStepId(stepId);
      setActivePanelTab("configure");
    } else if (nodeId.startsWith("node_branch_")) {
      const stepId = nodeId.replace("node_branch_", "").replace(/_a$|_b$|_a_end$|_b_end$/, "");
      setSelectedNode("step");
      setSelectedStepId(stepId);
      setActivePanelTab("configure");
    }
  };

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={computedNodes}
        edges={computedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ markerEnd: MarkerType.ArrowClosed as any }}
        fitView={false}
        nodeOrigin={[0.5, 0]}
        className="bg-[#fafafa]"
        nodesDraggable={viewMode !== "notebook"}
        panOnDrag={true}
        onNodeClick={(_, node) => {
          if (viewMode === "notebook") {
            // In notebook mode, click header to expand, click setting to open sidebar
            return;
          }
          setSidebarOpen(true);
          setToolStepSidebarOpen(false);
          setSystemToolsListOpen(false);
          setInputSidebarOpen(false);
          setSelectedInputField(null);
          (node.data as any)?.onOpen?.();
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#64748b" className="opacity-10" />

        {/* Flow/Notebook toggle and Navigator */}
        <Panel position="top-left" className="m-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-zinc-300 bg-white p-1 flex items-center gap-1">
              <button
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md cursor-pointer",
                  viewMode === "flow" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                )}
                onClick={() => setViewMode("flow")}
              >
                Flow
              </button>
              <button
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md cursor-pointer",
                  viewMode === "notebook" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                )}
                onClick={() => setViewMode("notebook")}
              >
                Notebook
              </button>
            </div>

            <Popover open={navigatorOpen} onOpenChange={setNavigatorOpen}>
              <PopoverTrigger asChild>
                <button className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                  Navigator
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={8} className="w-72 p-3">
                <div className="text-sm font-semibold text-zinc-900 mb-2">Navigator</div>
                <Input
                  value={navigatorQuery}
                  onChange={(e) => setNavigatorQuery(e.target.value)}
                  placeholder="Search tool contents..."
                  className="h-8 text-xs"
                />
                <div className="mt-2 space-y-1 max-h-64 overflow-auto">
                  {navigatorItems.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => focusNode(i.id)}
                      className="w-full text-left rounded-md px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Panel>

        {/* Zoom controls + fit (bottom-left) */}
        <Panel position="bottom-left" className="m-4">
          <div className="flex flex-col rounded-lg border border-zinc-300 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              onClick={() => rf.zoomIn({ duration: 200 })}
              aria-label="Zoom in"
            >
              <span className="text-base leading-none">+</span>
            </button>
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center border-t border-b border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              onClick={() => rf.zoomOut({ duration: 200 })}
              aria-label="Zoom out"
            >
              <span className="text-base leading-none">−</span>
            </button>
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              onClick={() => rf.fitView({ padding: 0.4, duration: 250 })}
              aria-label="Fit to screen"
            >
              <span className="text-[13px] leading-none">▢</span>
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
