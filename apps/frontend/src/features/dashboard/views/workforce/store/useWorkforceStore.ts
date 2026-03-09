import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';

export type ConditionOperator =
    | 'equals' | 'not_equals'
    | 'contains' | 'not_contains'
    | 'starts_with' | 'ends_with'
    | 'greater_than' | 'less_than'
    | 'is_empty' | 'is_not_empty'
    | 'regex';

export type ConditionRule = {
    id: string;
    // e.g. "agent-1.output.response"
    leftVariable: string;
    leftLabel: string;   // display name, e.g. "Agent A / output / response"
    operator: ConditionOperator;
    // can be a static string or a variable reference (prefixed with "var:")
    rightValue: string;
    rightLabel: string;
};

export type ConditionGroup = {
    id: string;
    label: string;         // "IF", "ELSE IF", etc.
    matchMode: 'all' | 'any';
    rules: ConditionRule[];
    // which source handle this group activates: "true", "false", "path-N"
    targetHandle: string;
};

export type WorkforceNodeData = {
    label: string;
    type?: string;
    action?: string;
    // condition fields
    conditionMode?: 'rule' | 'code';
    conditionGroups?: ConditionGroup[];
    conditionCode?: string;
    // legacy single expression kept for backward compat
    expression?: string;
    conditionType?: string;
    [key: string]: any;
};

export type WorkforceNode = Node<WorkforceNodeData>;

export type WorkforceEdgeData = {
    label?: string;
    prompt?: string;
    taskBehavior?: string;
    connectionType?: string;
    messageTemplate?: string;
    approvalMode?: string;
    maxAutoRuns?: number | null;
    [key: string]: any;
};

export type WorkforceEdge = Edge<WorkforceEdgeData>;

export type SidebarType = 'AGENT' | 'TOOL' | 'TRIGGER' | 'CONDITION' | 'EDGE' | 'TASK' | 'VERSIONS' | null;

export interface WorkforceState {
    nodes: WorkforceNode[];
    edges: Edge[];
    activeNodeId: string | null;
    activeEdgeId: string | null;
    isSidebarOpen: boolean;
    sidebarType: SidebarType;
    isTestSidebarOpen: boolean;
    mode: 'FLOW' | 'SWARM';
    hasChanges: boolean;

    // Actions
    setMode: (mode: 'FLOW' | 'SWARM') => void;
    setHasChanges: (val: boolean) => void;
    onNodesChange: OnNodesChange<WorkforceNode>;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: WorkforceNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (node: WorkforceNode) => void;
    setSidebarOpen: (isOpen: boolean, type?: SidebarType) => void;
    setTestSidebarOpen: (isOpen: boolean) => void;
    setActiveNodeId: (id: string | null) => void;
    setActiveEdgeId: (id: string | null) => void;
    updateNodeData: (id: string, data: Partial<WorkforceNodeData>) => void;
    updateEdgeData: (id: string, data: Partial<WorkforceEdgeData>) => void;
}

const initialNodes: WorkforceNode[] = [
    {
        id: 'trigger-1',
        type: 'eventNode',
        position: { x: 250, y: 100 },
        data: { label: 'Task Created', action: 'ON_TASK_CREATE' },
    },
];

const initialEdges: Edge[] = [];

export const useWorkforceStore = create<WorkforceState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    mode: 'FLOW',
    isSidebarOpen: false,
    sidebarType: null,
    activeNodeId: null,
    activeEdgeId: null,
    hasChanges: false,

    setMode: (mode) => set({ mode }),
    setHasChanges: (val) => set({ hasChanges: val }),

    onNodesChange: (changes: NodeChange<WorkforceNode>[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
            hasChanges: true
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
            hasChanges: true
        });
    },
    onConnect: (connection: Connection) => {
        const { nodes } = get();
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        const isAgentToAgent = sourceNode?.type === 'agentNode' && targetNode?.type === 'agentNode';
        const isFromCondition = sourceNode?.type === 'conditionNode';
        const edgeData: WorkforceEdgeData = {
            label: isAgentToAgent ? 'AI connection' : undefined,
            taskBehavior: 'CONTINUE_SAME_TASK',
            connectionType: isAgentToAgent ? 'AI_CONNECTION' : 'FLOW',
            approvalMode: 'AUTO_RUN',
            maxAutoRuns: null,
            sourceNodeType: sourceNode?.type,
            targetNodeType: targetNode?.type,
        };
        set({
            edges: addEdge({ ...connection, id: `e-${Date.now()}`, type: 'flowEdge', animated: true, data: edgeData }, get().edges),
            hasChanges: true,
            // When a condition node creates a new edge, activate it and open CONDITION sidebar
            ...(isFromCondition && {
                activeNodeId: connection.source,
                activeEdgeId: null,
                isSidebarOpen: true,
                sidebarType: 'CONDITION' as SidebarType,
            }),
        });
    },
    setNodes: (nodes: WorkforceNode[]) => {
        set({ nodes, hasChanges: true });
    },
    setEdges: (edges: Edge[]) => {
        set({ edges, hasChanges: true });
    },
    addNode: (node: WorkforceNode) => {
        set({ nodes: [...get().nodes, node], hasChanges: true });
    },
    setSidebarOpen: (isSidebarOpen: boolean, sidebarType: SidebarType = null) => {
        set({
            isSidebarOpen,
            sidebarType: isSidebarOpen ? (sidebarType || get().sidebarType) : null
        });
    },
    setTestSidebarOpen: (isTestSidebarOpen: boolean) => set({ isTestSidebarOpen }),
    setActiveNodeId: (activeNodeId: string | null) => {
        set({ activeNodeId, activeEdgeId: null });
    },
    setActiveEdgeId: (activeEdgeId: string | null) => {
        set({ activeEdgeId, activeNodeId: null });
    },
    updateNodeData: (id: string, data: Partial<WorkforceNodeData>) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            }),
            hasChanges: true
        });
    },
    updateEdgeData: (id: string, data: Partial<WorkforceEdgeData>) => {
        set({
            edges: get().edges.map((edge) => {
                if (edge.id === id) {
                    return { ...edge, data: { ...edge.data, ...data } as WorkforceEdgeData };
                }
                return edge;
            }),
            hasChanges: true
        });
    },
}));
