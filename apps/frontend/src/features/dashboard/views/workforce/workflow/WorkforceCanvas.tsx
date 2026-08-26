'use client';

import React, { useMemo, useCallback } from 'react';
import {
    ReactFlow,
    MiniMap,
    Background,
    BackgroundVariant,
    Panel,
    ColorMode,
    ReactFlowProvider,
    useReactFlow,
    NodeTypes,
    EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkforceStore } from '../../../../../entities/workforce/hooks/useWorkforceStore';
import { EventNode } from '../../../../../entities/workforce/components/nodes/EventNode';
import { AgentNode } from '../../../../../entities/workforce/components/nodes/AgentNode';
import { ToolNode } from '../../../../../entities/workforce/components/nodes/ToolNode';
import { ConditionNode } from '../../../../../entities/workforce/components/nodes/ConditionNode';
import { TaskNode } from '../../../../../entities/workforce/components/nodes/TaskNode';
import { StickyNoteNode } from '../../../../../entities/workforce/components/nodes/StickyNoteNode';
import FlowEdge from '../../../../../entities/workforce/components/edges/FlowEdge';
import { useTheme } from 'next-themes';
import {
    Plus,
    Minus,
    Maximize2,
    Lock,
    Undo2,
    Redo2,
    MousePointer2,
    ChevronDown,
    User,
    Wrench,
    Zap,
    GitBranch,
    Files,
    StickyNote,
    MessageCircle,
    ExternalLink,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ResizableSplitLayout } from '@/components/layout/ResizableSplitLayout';
import { WorkforceEditorAssistantPanel } from '@/entities/workforce/components/assistant/WorkforceEditorAssistantPanel';
import type { WorkforceOp } from '@/entities/workforce/components/assistant/types';
import { AgentSettingsModal } from '@/entities/agents/components/AgentSettingsModal';

const ToolBuilderView = dynamic(
    () => import('../../tools/ToolFlowBuilderView').then((m) => m.ToolBuilderView),
    { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading tool builder…</div> }
);
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TaskDetailModal } from '@/entities/task/components/TaskDetailModal';
import { trpc } from '@/lib/trpc';

const nodeTypes: NodeTypes = {
    eventNode: EventNode as any,
    agentNode: AgentNode as any,
    conditionNode: ConditionNode as any,
    toolNode: ToolNode as any,
    taskNode: TaskNode as any,
    stickyNoteNode: StickyNoteNode as any,
};

const edgeTypes: EdgeTypes = {
    flowEdge: FlowEdge,
};

const FIT_VIEW_OPTIONS = { padding: 0.55, maxZoom: 0.75, minZoom: 0.25 } as const;

function WorkforceFlow({ workforceId, workforceName, workspaceId }: { workforceId: string; workforceName?: string; workspaceId?: string }) {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setNodes,
        setEdges,
        setSidebarOpen,
        setActiveNodeId,
        setActiveEdgeId,
        editNodeModal,
        setEditNodeModal,
    } = useWorkforceStore();
    const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
    const { theme } = useTheme();
    const [assistantOpen, setAssistantOpen] = React.useState(false);
    const didInitialFit = React.useRef(false);

    // Fit once after mount so a single node doesn't dominate the viewport
    React.useEffect(() => {
        if (didInitialFit.current || nodes.length === 0) return;
        didInitialFit.current = true;
        const id = requestAnimationFrame(() => {
            fitView(FIT_VIEW_OPTIONS);
        });
        return () => cancelAnimationFrame(id);
    }, [nodes.length, fitView]);

    // Derive the active node data for the edit modal
    const editModalNode = React.useMemo(
        () => editNodeModal ? nodes.find(n => n.id === editNodeModal.nodeId) : null,
        [editNodeModal, nodes]
    );

    // Load agent details for AgentSettingsModal
    const { data: editAgentData, refetch: refetchAgent } = trpc.agent.get.useQuery(
        { id: editModalNode?.data?.agentId || '' },
        { enabled: editNodeModal?.type === 'agent' && !!editModalNode?.data?.agentId }
    );

    // Load full tool details (including steps) for ToolBuilderView via get, not list (list strips steps)
    const editToolId = editNodeModal?.type === 'tool' ? (editModalNode?.data?.toolId || '') : '';
    const { data: editTool } = trpc.compositeTool.get.useQuery({ id: editToolId }, { enabled: !!editToolId, staleTime: 60_000, gcTime: 5 * 60_000 });

    const applyWorkforceOps = React.useCallback((ops: WorkforceOp[]) => {
        for (const op of ops) {
            const state = useWorkforceStore.getState();
            const curNodes = state.nodes;
            const curEdges = state.edges;
            try {
                if (op.op === "addNode") {
                    const id = op.node.id ?? `${op.node.type}-${Date.now()}`;
                    const position = op.node.position ?? { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 };
                    addNode({ id, type: op.node.type as any, position, data: op.node.data as any } as any);
                    continue;
                }
                if (op.op === "deleteNode") {
                    setNodes(curNodes.filter(n => n.id !== op.nodeId));
                    setEdges(curEdges.filter(e => e.source !== op.nodeId && e.target !== op.nodeId));
                    continue;
                }
                if (op.op === "updateNodeData") {
                    useWorkforceStore.getState().updateNodeData(op.nodeId, op.patch as any);
                    continue;
                }
                if (op.op === "addEdge") {
                    const id = op.edge.id ?? `e-${Date.now()}`;
                    setEdges([
                        ...curEdges,
                        {
                            id,
                            source: op.edge.source,
                            target: op.edge.target,
                            sourceHandle: op.edge.sourceHandle,
                            targetHandle: op.edge.targetHandle,
                            type: (op.edge.type ?? "flowEdge") as any,
                            data: op.edge.data as any,
                            animated: true,
                        } as any,
                    ]);
                    continue;
                }
                if (op.op === "deleteEdge") {
                    setEdges(curEdges.filter(e => e.id !== op.edgeId));
                    continue;
                }
                if (op.op === "updateEdgeData") {
                    useWorkforceStore.getState().updateEdgeData(op.edgeId, op.patch as any);
                    continue;
                }
                if (op.op === "replaceNode") {
                    const node = curNodes.find(n => n.id === op.nodeId);
                    if (!node) continue;
                    const newId = `${op.replacement.type}-${Date.now()}`;
                    const newNode = {
                        id: newId,
                        type: op.replacement.type as any,
                        position: node.position,
                        data: { ...(op.replacement.data as any) },
                    };
                    setNodes([...curNodes.filter(n => n.id !== op.nodeId), newNode as any]);
                    setEdges(curEdges.map(e => ({
                        ...e,
                        source: e.source === op.nodeId ? newId : e.source,
                        target: e.target === op.nodeId ? newId : e.target,
                    })) as any);
                    setActiveNodeId(newId);
                    if (newNode.type === 'agentNode') setSidebarOpen(true, 'AGENT');
                    if (newNode.type === 'toolNode') setSidebarOpen(true, 'TOOL');
                    if (newNode.type === 'eventNode') setSidebarOpen(true, 'TRIGGER');
                    if (newNode.type === 'conditionNode') setSidebarOpen(true, 'CONDITION');
                    if (newNode.type === 'taskNode') setSidebarOpen(true, 'TASK');
                    continue;
                }
            } catch {
                // ignore
            }
        }
    }, [addNode, setActiveNodeId, setEdges, setNodes, setSidebarOpen]);

    const onNodeClick = (event: React.MouseEvent, node: any) => {
        if (node.type === 'stickyNoteNode') {
            // Sticky notes are self-contained — leave sidebar state completely untouched.
            return;
        }
        setActiveNodeId(node.id);
        if (node.type === 'agentNode') {
            setSidebarOpen(true, 'AGENT');
        } else if (node.type === 'toolNode') {
            setSidebarOpen(true, 'TOOL');
        } else if (node.type === 'eventNode') {
            setSidebarOpen(true, 'TRIGGER');
        } else if (node.type === 'conditionNode') {
            setSidebarOpen(true, 'CONDITION');
        } else if (node.type === 'taskNode') {
            setSidebarOpen(true, 'TASK');
        }
    };

    // Close sidebar when clicking empty canvas space (replaces the sidebar's overlay approach).
    const onPaneClick = useCallback(() => {
        setSidebarOpen(false);
    }, [setSidebarOpen]);

    const onEdgeClick = (event: React.MouseEvent, edge: any) => {
        setActiveEdgeId(edge.id);
        setSidebarOpen(true, 'EDGE');
    };

    const colorMode = useMemo<ColorMode>(() => {
        return theme === 'dark' ? 'dark' : 'light';
    }, [theme]);

    const onAddNode = (type: string, label: string) => {
        const id = `${type}-${Date.now()}`;
        const newNode = {
            id,
            type,
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label },
        };
        addNode(newNode);
        setActiveNodeId(id);

        if (newNode.type === 'agentNode') setSidebarOpen(true, 'AGENT');
        if (newNode.type === 'toolNode') setSidebarOpen(true, 'TOOL');
        if (newNode.type === 'eventNode') setSidebarOpen(true, 'TRIGGER');
        if (newNode.type === 'conditionNode') setSidebarOpen(true, 'CONDITION');
        if (newNode.type === 'taskNode') setSidebarOpen(true, 'TASK');
    };

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const id = `${type}-${Date.now()}`;
            const newNode = {
                id,
                type,
                position,
                data: {
                    label:
                        type === 'conditionNode'
                            ? 'Untitled condition'
                            : `New ${type.replace('Node', '')}`,
                },
            };

            addNode(newNode);
            setActiveNodeId(id);

            if (type === 'agentNode') setSidebarOpen(true, 'AGENT');
            if (type === 'toolNode') setSidebarOpen(true, 'TOOL');
            if (type === 'eventNode') setSidebarOpen(true, 'TRIGGER');
            if (type === 'conditionNode') setSidebarOpen(true, 'CONDITION');
            if (type === 'taskNode') setSidebarOpen(true, 'TASK');
        },
        [screenToFlowPosition, addNode, setActiveNodeId, setSidebarOpen]
    );

    return (
        <div className="h-full w-full overflow-hidden">
            <ResizableSplitLayout
                isPanelOpen={assistantOpen}
                mainPanelDefaultSize={68}
                mainPanelMinSize={35}
                sidePanelDefaultSize={32}
                sidePanelMinSize={20}
                sidePanelMinSizePixels={340}
                MainContent={
                    <div className="relative h-full w-full">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onPaneClick={onPaneClick}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            colorMode={colorMode}
                            fitView
                            fitViewOptions={FIT_VIEW_OPTIONS}
                            minZoom={0.25}
                            maxZoom={1.5}
                            className="bg-[#fafafa]"
                        >
                            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#64748b" className="opacity-10" />

                            <MiniMap
                                pannable
                                zoomable
                                position="top-left"
                                className="!bg-white !border-zinc-200 !shadow-sm !rounded-xl !m-4"
                                maskColor="rgba(0, 0, 0, 0.05)"
                            />

                            <Panel position="top-right" className="m-4">
                                <button
                                    type="button"
                                    onClick={() => setAssistantOpen((v) => !v)}
                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm flex items-center gap-2"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    {assistantOpen ? 'Hide assistant' : 'Assistant'}
                                </button>
                            </Panel>

                    {/* Floating Sidebar Controls */}
                    <Panel position="bottom-left" className="m-4">
                        <div className="flex flex-col gap-1 bg-white border border-zinc-200 rounded-lg shadow-sm p-1">
                            {[
                                { icon: Plus, label: 'Zoom In', action: () => zoomIn() },
                                { icon: Minus, label: 'Zoom Out', action: () => zoomOut() },
                                { icon: Maximize2, label: 'Fit View', action: () => fitView(FIT_VIEW_OPTIONS) },
                                { icon: Lock, label: 'Lock', action: () => { } },
                                { icon: Undo2, label: 'Undo', action: () => { } },
                                { icon: Redo2, label: 'Redo', action: () => { } },
                                { icon: MousePointer2, label: 'Select', action: () => { } },
                            ].map((btn, i) => (
                                <button
                                    key={i}
                                    title={btn.label}
                                    type="button"
                                    onClick={btn.action}
                                    className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-colors"
                                >
                                    <btn.icon className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    </Panel>

                    {/* Bottom Node Tray */}
                    <Panel position="bottom-center" className="w-full max-w-6xl px-4 mb-24 pointer-events-none">
                        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[40px] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.02)] py-4 px-10 flex items-center justify-center pointer-events-auto w-fit mx-auto transition-all duration-700 hover:bg-white/90 hover:shadow-[0_30px_100px_-25px_rgba(0,0,0,0.2)]">
                            <div className="flex items-center gap-10 px-4">
                                {[
                                    { icon: User, label: 'Agent', type: 'agentNode', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                                    { icon: Wrench, label: 'Tool', type: 'toolNode', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                                    { icon: Zap, label: 'Trigger', type: 'eventNode', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
                                    { icon: GitBranch, label: 'Condition', type: 'conditionNode', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
                                    { icon: Files, label: 'Task', type: 'taskNode', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                                    { icon: StickyNote, label: 'Note', type: 'stickyNoteNode', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, item.type)}
                                        onClick={() =>
                                            onAddNode(
                                                item.type,
                                                item.type === 'conditionNode' ? 'Untitled condition' : `New ${item.label}`,
                                            )
                                        }
                                        className="relative flex flex-col items-center group cursor-grab active:cursor-grabbing transition-all duration-500 hover:-translate-y-12 px-2"
                                    >
                                        {/* Stacked background cards effect - Dynamic rotation on hover */}
                                        <div className="absolute inset-x-3 inset-y-0 bg-white/30 border border-zinc-200/40 rounded-[28px] -z-30 translate-x-3 -translate-y-1 rotate-[3deg] transition-all duration-500 group-hover:translate-x-5 group-hover:-translate-y-2 group-hover:rotate-[6deg] group-hover:opacity-40" />
                                        <div className="absolute inset-x-1.5 inset-y-0 bg-white/50 border border-zinc-200/60 rounded-[28px] -z-20 translate-x-1 rotate-[1deg] transition-all duration-500 group-hover:translate-x-2 group-hover:-translate-y-1 group-hover:rotate-[3deg] group-hover:opacity-70" />

                                        {/* Main card body */}
                                        <div className="w-[140px] h-[110px] bg-white border border-zinc-200/80 rounded-[28px] shadow-sm flex flex-col items-start justify-between p-4 transition-all duration-500 group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)] group-hover:border-zinc-300 relative overflow-hidden">

                                            {/* Task Fold Effect - Visualized as a peel-off corner */}
                                            {item.type === 'taskNode' && (
                                                <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-full h-full bg-[#fcfcfc] border-l border-b border-zinc-200/80 rounded-bl-3xl shadow-[-4px_4px_12px_rgba(0,0,0,0.03)] z-10" />
                                                    <div className="absolute top-0 right-0 w-0 h-0 border-[24px] border-transparent border-t-white border-r-white z-20" />
                                                </div>
                                            )}

                                            {/* Top Label Badge */}
                                            <div className={cn(
                                                "flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-colors",
                                                item.bg,
                                                item.border
                                            )}>
                                                <item.icon className={cn("h-4 w-4", item.color)} />
                                                <span className={cn("text-[11px] font-bold uppercase tracking-widest", item.color)}>
                                                    {item.label}
                                                </span>
                                            </div>

                                            {/* Interactive Hover Prompt */}
                                            <div className="flex items-center gap-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-75 ease-out">
                                                <span className="text-[13px] font-semibold text-zinc-500">Drag to add</span>
                                                <MousePointer2 className="h-4 w-4 text-zinc-400 rotate-[-15deg] group-hover:animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Panel>
                        </ReactFlow>

                        {/* ── Agent Settings Modal ─────────────────────────────────── */}
                        {editNodeModal?.type === 'agent' && editAgentData && (
                            <AgentSettingsModal
                                open={true}
                                onOpenChange={(open) => !open && setEditNodeModal(null)}
                                agent={editAgentData}
                                onUpdate={() => refetchAgent()}
                            />
                        )}

                        {/* ── Tool Builder Dialog ───────────────────────────────────── */}
                        <Dialog open={editNodeModal?.type === 'tool' && !!editTool} onOpenChange={(val) => !val && setEditNodeModal(null)}>
                            <DialogContent className="sm:max-w-[1400px] sm:w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-zinc-50 border-0 rounded-2xl shadow-2xl [&>button]:hidden">
                                <DialogTitle className="sr-only">Edit Tool</DialogTitle>
                                {editTool && (
                                    <ToolBuilderView
                                        workspaceId={workspaceId!}
                                        initialTool={editTool}
                                        onClose={() => setEditNodeModal(null)}
                                    />
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* ── Task Detail Modal ─────────────────────────────────────── */}
                        <TaskDetailModal
                            taskId={editNodeModal?.type === 'task' ? (editModalNode?.data?.taskId || null) : null}
                            open={editNodeModal?.type === 'task'}
                            onOpenChange={(val) => !val && setEditNodeModal(null)}
                        />
                    </div>
                }
                SidePanelContent={
                    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
                        <WorkforceEditorAssistantPanel
                            title="Workforce Assistant"
                            entityId={workforceId}
                            entityName={workforceName || "Workforce"}
                            context={{
                                nodes,
                                edges,
                                activeNodeId: useWorkforceStore.getState().activeNodeId,
                                activeEdgeId: useWorkforceStore.getState().activeEdgeId,
                            }}
                            onApplyOps={(ops) => applyWorkforceOps(ops as any)}
                            onClose={() => setAssistantOpen(false)}
                            className="h-full w-full"
                        />
                    </div>
                }
            />
        </div>
    );
}

export default function WorkforceCanvas({ workforceId, workforceName, workspaceId }: { workforceId: string; workforceName?: string; workspaceId?: string }) {
    return (
        <ReactFlowProvider>
            <WorkforceFlow workforceId={workforceId} workforceName={workforceName} workspaceId={workspaceId} />
        </ReactFlowProvider>
    );
}
