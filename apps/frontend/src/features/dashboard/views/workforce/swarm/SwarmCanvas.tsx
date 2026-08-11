'use client';

import React, { useMemo, useCallback } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    BackgroundVariant,
    Panel,
    Node,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Minus, Maximize2, Undo2, Redo2, MousePointer2 } from 'lucide-react';
import { useWorkforceStore } from '../../../../../entities/workforce/hooks/useWorkforceStore';
import { AgentNode } from '../../../../../entities/workforce/components/nodes/AgentNode';
import { TaskNode } from '../../../../../entities/workforce/components/nodes/TaskNode';
import { PoolTaskNode } from '../../../../../entities/workforce/components/nodes/PoolTaskNode';
import FlowEdge from '../../../../../entities/workforce/components/edges/FlowEdge';
import SwarmCoordinatorInspector from './SwarmCoordinatorInspector';

const nodeTypes = {
    agentNode: AgentNode as any,
    taskNode: TaskNode as any,
    poolTaskNode: PoolTaskNode as any,
};

const edgeTypes = {
    flowEdge: FlowEdge,
};

const FIT_VIEW_OPTIONS = { padding: 0.55, maxZoom: 0.75, minZoom: 0.25 } as const;

// ── Canvas skeleton shown on initial load ──────────────────────────────────
function SwarmCanvasSkeleton() {
    return (
        <div className="flex-1 relative h-full bg-[#fafafa] flex flex-col items-center justify-center gap-10 select-none">
            {/* Coordinator card */}
            <div className="w-[240px] h-[90px] rounded-2xl bg-white border border-zinc-200 shadow-sm animate-pulse flex items-center gap-4 px-5">
                <div className="h-10 w-10 rounded-xl bg-purple-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-zinc-200" />
                    <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
                </div>
            </div>
            {/* Connector line */}
            <div className="flex flex-col items-center gap-0">
                <div className="w-px h-8 bg-zinc-200 animate-pulse" />
            </div>
            {/* Worker row */}
            <div className="flex gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-[180px] h-[72px] rounded-xl bg-white border border-zinc-100 shadow-sm animate-pulse flex items-center gap-3 px-4" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-2/3 rounded bg-zinc-200" />
                            <div className="h-2 w-1/2 rounded bg-zinc-100" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Task pool */}
            <div className="w-[280px] h-[60px] rounded-xl bg-white border border-dashed border-zinc-200 animate-pulse flex items-center gap-3 px-5">
                <div className="h-6 w-6 rounded-md bg-indigo-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/2 rounded bg-zinc-200" />
                </div>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Preparing canvas…</span>
        </div>
    );
}

function SwarmFlow() {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const {
        nodes,
        setActiveNodeId,
        setSidebarOpen,
        setSwarmActiveTab,
        isAutonomousMode,
    } = useWorkforceStore();
    const didInitialFit = React.useRef(false);

    // ── Layout: coordinator top, workers middle, pool task bottom ──────────
    const arrangedNodes = useMemo(() => {
        const swAgents = nodes.filter(n => n.type === 'agentNode' && !n.data?.isCoordinator);
        const agentCount = swAgents.length;
        const agentWidth = 260;
        const coordWidth = 300;
        const gap = 40;

        const existingCoordinator = nodes.find(n => n.type === 'agentNode' && n.data?.isCoordinator);
        const coordinatorId = existingCoordinator ? existingCoordinator.id : 'swarm-coordinator';

        // Coordinator always at top-center
        const coordinator = {
            ...(existingCoordinator || {}),
            id: coordinatorId,
            type: 'agentNode',
            position: { x: -(coordWidth / 2), y: 0 },
            data: {
                ...(existingCoordinator?.data || {}),
                label: existingCoordinator?.data?.label || 'Swarm Coordinator',
                description: existingCoordinator?.data?.description || 'Orchestrates the swarm',
                isCoordinator: true,
            },
            draggable: false,
            deletable: false,
            selectable: false,
        };

        // Workers arranged in a row below coordinator
        const totalAgentWidth = agentCount * agentWidth + (agentCount - 1) * gap;
        const agentsArranged = swAgents.map((a, i) => ({
            ...a,
            position: {
                x: -(totalAgentWidth / 2) + i * (agentWidth + gap),
                y: 260,
            },
            draggable: false,
        }));

        const tasksNodes = nodes.filter(n => n.type === 'taskNode');

        // Single Pool Task node at the bottom center
        const poolTask = {
            id: 'pool-task-node',
            type: 'poolTaskNode',
            position: { x: -190, y: 520 },
            data: {
                label: 'Task Pool',
                taskCount: tasksNodes.length,
            },
            draggable: false,
            deletable: false,
            selectable: true,
        };

        const hiddenTasks = tasksNodes.map(t => ({ ...t, hidden: true }));

        return [coordinator, ...agentsArranged, poolTask, ...hiddenTasks];
    }, [nodes]);

    // Fit once after layout so nodes don't appear oversized
    React.useEffect(() => {
        if (didInitialFit.current || arrangedNodes.length === 0) return;
        didInitialFit.current = true;
        const id = requestAnimationFrame(() => {
            fitView(FIT_VIEW_OPTIONS);
        });
        return () => cancelAnimationFrame(id);
    }, [arrangedNodes.length, fitView]);

    // ── Edges ───────────────────────────────────────────────────────────────
    const generatedEdges = useMemo(() => {
        const swAgents = nodes.filter(n => n.type === 'agentNode' && !n.data?.isCoordinator);
        const edges: any[] = [];
        const existingCoordinator = nodes.find(n => n.type === 'agentNode' && n.data?.isCoordinator);
        const coordinatorId = existingCoordinator ? existingCoordinator.id : 'swarm-coordinator';

        // Coordinator → each worker (solid purple)
        swAgents.forEach((a) => {
            edges.push({
                id: `coord-to-${a.id}`,
                source: coordinatorId,
                target: a.id,
                type: 'step',
                animated: true,
                style: { stroke: '#7c3aed', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed', color: '#7c3aed' },
            });
        });

        // Peer ↔ peer (dashed blue, bidirectional)
        if (swAgents.length > 1) {
            for (let i = 0; i < swAgents.length - 1; i++) {
                const a = swAgents[i];
                const b = swAgents[i + 1];

                // Forward (Right of A -> Left of B)
                edges.push({
                    id: `peer-fwd-${a.id}-${b.id}`,
                    source: a.id,
                    target: b.id,
                    sourceHandle: 'right-source-fwd',
                    targetHandle: 'left-target-fwd',
                    type: 'straight',
                    animated: true,
                    style: { strokeDasharray: '4 4', stroke: '#3b82f6', strokeWidth: 1.5 },
                    markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
                });

                // Reverse (Left of B -> Right of A)
                edges.push({
                    id: `peer-rev-${b.id}-${a.id}`,
                    source: b.id,
                    target: a.id,
                    sourceHandle: 'left-source-rev',
                    targetHandle: 'right-target-rev',
                    type: 'straight',
                    animated: true,
                    style: { strokeDasharray: '4 4', stroke: '#3b82f6', strokeWidth: 1.5 },
                    markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
                });
            }
        }

        // Each Worker → Pool Task (dashed grey)
        swAgents.forEach((a) => {
            edges.push({
                id: `worker-to-pool-${a.id}`,
                source: a.id,
                target: 'pool-task-node',
                type: 'step',
                animated: false,
                style: { strokeDasharray: '5 4', stroke: '#a1a1aa', strokeWidth: 1.5 },
                markerEnd: { type: 'arrowclosed', color: '#a1a1aa' },
            });
        });

        return edges;
    }, [nodes]);

    // NOTE: The canvas intentionally does NOT sync arranged nodes back to the
    // store. The store contains only the raw agent/task nodes that the sidebar
    // manages. arrangedNodes is a pure visual transformation for ReactFlow.

    // ── Click handlers ──────────────────────────────────────────────────────
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if ((node.data as any)?.isCoordinator) return;
        if (node.id === 'pool-task-node') {
            setSwarmActiveTab('tasks');
            setSidebarOpen(false);
            return;
        }
        setActiveNodeId(node.id);
        if (node.type === 'agentNode') setSidebarOpen(true, 'AGENT');
    }, [setActiveNodeId, setSidebarOpen, setSwarmActiveTab]);

    const onPaneClick = useCallback(() => {
        setSidebarOpen(false);
    }, [setSidebarOpen]);

    return (
        <div className="flex-1 relative h-full bg-[#fafafa]">
            <ReactFlow
                nodes={arrangedNodes}
                edges={generatedEdges}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                fitView
                fitViewOptions={FIT_VIEW_OPTIONS}
                minZoom={0.25}
                maxZoom={1.5}
                colorMode="light"
                className="bg-[#fafafa]"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="#94a3b8"
                    className="opacity-10"
                />

                {isAutonomousMode && (
                    <Panel position="top-right" className="bg-white/80 backdrop-blur-md border border-purple-200/50 p-2 rounded-lg shadow-sm m-4">
                        <div className="flex items-center gap-2 px-2 py-1">
                            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Swarm Active</span>
                        </div>
                    </Panel>
                )}

                {isAutonomousMode && (
                    <Panel position="top-right" className="mt-16 mr-0">
                        <SwarmCoordinatorInspector />
                    </Panel>
                )}

                {/* Toolbar — same style as WorkforceCanvas */}
                <Panel position="bottom-left" className="m-4">
                    <div className="flex flex-col gap-1 bg-white border border-zinc-200 rounded-lg shadow-sm p-1">
                        {[
                            { icon: Plus, label: 'Zoom In', action: () => zoomIn() },
                            { icon: Minus, label: 'Zoom Out', action: () => zoomOut() },
                            { icon: Maximize2, label: 'Fit View', action: () => fitView(FIT_VIEW_OPTIONS) },
                            { icon: Undo2, label: 'Undo', action: () => { } },
                            { icon: Redo2, label: 'Redo', action: () => { } },
                            { icon: MousePointer2, label: 'Select', action: () => { } },
                        ].map((btn, i) => (
                            <button
                                key={i}
                                title={btn.label}
                                onClick={btn.action}
                                className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-colors cursor-pointer"
                            >
                                <btn.icon className="h-4 w-4" />
                            </button>
                        ))}
                    </div>
                </Panel>
            </ReactFlow>

            {isAutonomousMode && (
                <div className="absolute inset-0 pointer-events-none ring-1 ring-purple-300/20 ring-inset" />
            )}
        </div>
    );
}

export default function SwarmCanvas({ dataLoaded }: { dataLoaded: boolean }) {
    return (
        <ReactFlowProvider>
            <SwarmFlow />
        </ReactFlowProvider>
    );
}
