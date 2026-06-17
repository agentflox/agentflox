'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Users, Bot, Search, Filter, Loader2, Files, List, Plus, X, BrainCircuit
} from 'lucide-react';
import { useWorkforceStore } from '../store/useWorkforceStore';
import type { WorkforceNode } from '../store/useWorkforceStore';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TaskDetailModal } from '@/entities/task/components/TaskDetailModal';

// ──── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ──── Skeleton helpers ─────────────────────────────────────────────────────────
function AgentSkeleton() {
    return (
        <div className="space-y-1">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl animate-pulse">
                    <div className="h-4 w-4 rounded bg-zinc-200 flex-shrink-0" />
                    <div className="h-8 w-8 rounded-lg bg-zinc-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-zinc-200" />
                        <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function TaskSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-2 px-1 py-1 mb-2">
                        <div className="h-4 w-4 rounded bg-zinc-200" />
                        <div className="h-2 w-2 rounded-full bg-zinc-300" />
                        <div className="h-3 w-24 rounded bg-zinc-200" />
                    </div>
                    <div className="pl-5 space-y-1.5">
                        {[...Array(3)].map((_, j) => (
                            <div key={j} className="flex items-center gap-2.5 p-1.5">
                                <div className="h-4 w-4 rounded bg-zinc-200" />
                                <div className="h-6 w-6 rounded-md bg-zinc-100 flex-shrink-0" />
                                <div className="h-3 w-3/4 rounded bg-zinc-200" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SidebarItemSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white border border-zinc-100 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-zinc-200 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-2/3 rounded bg-zinc-200" />
                            <div className="h-2.5 w-1/2 rounded bg-zinc-100" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ──── AgentSelector (receives pre-loaded data) ─────────────────────────────────
function AgentSelector({
    alreadySelectedAgentIds,
    agents,
    isLoadingAgents,
    search,
    onSearchChange,
    agentTypeFilter,
    onFilterChange,
    onAdd,
    onClose,
}: {
    alreadySelectedAgentIds: string[];
    agents: any[];
    isLoadingAgents: boolean;
    search: string;
    onSearchChange: (v: string) => void;
    agentTypeFilter: string;
    onFilterChange: (v: string) => void;
    onAdd: (agents: any[]) => void;
    onClose: () => void;
}) {
    // Store full objects so search updates don't discard them
    const [selectedAgentsMap, setSelectedAgentsMap] = useState<Map<string, any>>(new Map());
    const selectedAgentIds = new Set(selectedAgentsMap.keys());

    const toggleAgent = (agent: any) => {
        if (alreadySelectedAgentIds.includes(agent.id)) return;
        const newMap = new Map(selectedAgentsMap);
        if (newMap.has(agent.id)) newMap.delete(agent.id);
        else newMap.set(agent.id, agent);
        setSelectedAgentsMap(newMap);
    };

    const handleFinish = () => {
        onAdd(Array.from(selectedAgentsMap.values()));
        onClose();
    };

    return (
        <div className="flex flex-col h-[500px]">
            <div className="p-4 border-b border-zinc-100 flex-shrink-0 space-y-3 z-10 bg-white">
                <div className="text-sm font-bold text-zinc-900">Add Agents</div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <Input
                            placeholder="Search agents..."
                            className="pl-9 h-9 bg-zinc-50 border-zinc-200 focus:bg-white rounded-xl text-xs"
                            value={search}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                        {isLoadingAgents && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 animate-spin" />
                        )}
                    </div>
                    <Select value={agentTypeFilter} onValueChange={onFilterChange}>
                        <SelectTrigger className="w-10 h-9 px-0 flex justify-center bg-zinc-50 border-zinc-200 rounded-xl shadow-sm">
                            <Filter className="h-3.5 w-3.5 text-zinc-600" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="TASK_EXECUTOR">Executor</SelectItem>
                            <SelectItem value="WORKFLOW_MANAGER">Manager</SelectItem>
                            <SelectItem value="DATA_ANALYST">Analyst</SelectItem>
                            <SelectItem value="CODE_GENERATOR">Coder</SelectItem>
                            <SelectItem value="CONTENT_CREATOR">Creator</SelectItem>
                            <SelectItem value="GENERAL_ASSISTANT">Assistant</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 p-2">
                {isLoadingAgents && agents.length === 0 ? (
                    <AgentSkeleton />
                ) : agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-50">
                        <Users className="h-8 w-8 text-zinc-400" />
                        <span className="text-xs font-semibold text-zinc-600">No agents found</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {agents.map((agent: any) => {
                            const isAlreadySelected = alreadySelectedAgentIds.includes(agent.id);
                            const isChecked = isAlreadySelected || selectedAgentIds.has(agent.id);
                            const isCoordinator = agent.agentType === 'WORKFLOW_MANAGER' || agent.name?.toLowerCase().includes('coordinator');
                            return (
                                <label
                                    key={agent.id}
                                    className={cn('w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all',
                                        isAlreadySelected ? 'opacity-50 cursor-not-allowed border-transparent bg-white' :
                                            isCoordinator
                                                ? 'bg-purple-50/30 hover:bg-purple-50 cursor-pointer border-transparent hover:border-purple-200 group'
                                                : 'bg-white hover:bg-blue-50 cursor-pointer border-transparent hover:border-blue-100 group'
                                    )}
                                >
                                    <Checkbox
                                        checked={isChecked}
                                        disabled={isAlreadySelected}
                                        onCheckedChange={() => !isAlreadySelected && toggleAgent(agent)}
                                        className={cn(isCoordinator && 'data-[state=checked]:bg-purple-600')}
                                    />
                                    <Avatar className={cn('h-8 w-8 rounded-lg shadow-sm border flex-shrink-0',
                                        isCoordinator ? 'border-purple-200 bg-purple-100' : 'border-zinc-200 bg-blue-50/50'
                                    )}>
                                        <AvatarImage src={agent.avatar} />
                                        <AvatarFallback className={cn('rounded-lg', isCoordinator ? 'bg-purple-100 text-purple-600' : 'bg-blue-50/50 text-blue-600')}>
                                            {isCoordinator ? <BrainCircuit className="h-4 w-4 opacity-80" /> : <Bot className="h-4 w-4 opacity-80" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn('text-xs font-bold transition-colors truncate',
                                            isAlreadySelected ? 'text-zinc-500' :
                                                isCoordinator ? 'text-purple-900 group-hover:text-purple-700' : 'text-zinc-900 group-hover:text-blue-700'
                                        )}>{agent.name}</div>
                                        <div className={cn('text-[10px] truncate mt-0.5', isCoordinator ? 'text-purple-600/70' : 'text-zinc-500')}>
                                            {agent.description || (isCoordinator ? 'Swarm Coordinator' : 'Ready for assignments')}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex-shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative">
                <button
                    onClick={handleFinish}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                    Finish ({selectedAgentIds.size} agents)
                </button>
            </div>
        </div>
    );
}

// ──── TaskSelector (receives pre-loaded data) ──────────────────────────────────
function TaskSelector({
    alreadySelectedTaskIds,
    tasks,
    isLoadingTasks,
    search,
    onSearchChange,
    onAdd,
    onClose,
}: {
    alreadySelectedTaskIds: string[];
    tasks: any[];
    isLoadingTasks: boolean;
    search: string;
    onSearchChange: (v: string) => void;
    onAdd: (tasks: any[]) => void;
    onClose: () => void;
}) {
    // Store full task objects so changing search queries doesn't drop them
    const [selectedTasksMap, setSelectedTasksMap] = useState<Map<string, any>>(new Map());
    const selectedTaskIds = new Set(selectedTasksMap.keys());

    const taskHierarchy = useMemo(() => {
        if (!tasks.length) return [];
        const rootNodes = new Map<string, any>();
        const orphanTasks: any[] = [];

        tasks.forEach((task: any) => {
            const path: any[] = [];
            if (task.workspaceId) path.push({ id: `ws-${task.workspaceId}`, type: 'workspace', name: task.workspace?.name || 'Workspace', color: task.workspace?.color });
            if (task.spaceId) path.push({ id: `sp-${task.spaceId}`, type: 'space', name: task.space?.name || 'Space', color: task.space?.color });
            if (task.projectId) path.push({ id: `pj-${task.projectId}`, type: 'project', name: task.project?.name || 'Project' });
            if (task.teamId) path.push({ id: `tm-${task.teamId}`, type: 'team', name: task.team?.name || 'Team' });
            if (task.listId) path.push({ id: `ls-${task.listId}`, type: 'list', name: task.list?.name || 'List' });

            if (path.length === 0) { orphanTasks.push(task); return; }

            let currentMap = rootNodes;
            let currentNode: any;
            for (let i = 0; i < path.length; i++) {
                const part = path[i];
                if (!currentMap.has(part.id)) {
                    currentMap.set(part.id, { ...part, children: new Map(), tasks: [] });
                }
                currentNode = currentMap.get(part.id);
                currentMap = currentNode.children;
            }
            if (currentNode) currentNode.tasks.push(task);
        });

        const rootArr = Array.from(rootNodes.values());
        if (orphanTasks.length > 0) {
            rootArr.unshift({ id: 'orphan', type: 'orphan', name: 'Personal Tasks', color: '#A1A1AA', children: new Map(), tasks: orphanTasks });
        }
        return rootArr;
    }, [tasks]);

    const getAllTasksRecursive = useCallback((node: any): any[] => {
        let all = [...node.tasks];
        for (const child of Array.from(node.children.values())) {
            all = all.concat(getAllTasksRecursive(child as any));
        }
        return all;
    }, []);

    const toggleGroup = (node: any) => {
        const tasksInGroup = getAllTasksRecursive(node);
        const enabledTasks = tasksInGroup.filter((t: any) => !alreadySelectedTaskIds.includes(t.id));
        if (!enabledTasks.length) return;
        const allSelected = enabledTasks.every((t: any) => selectedTasksMap.has(t.id));
        const newMap = new Map(selectedTasksMap);
        if (allSelected) {
            enabledTasks.forEach((t: any) => newMap.delete(t.id));
        } else {
            enabledTasks.forEach((t: any) => newMap.set(t.id, t));
        }
        setSelectedTasksMap(newMap);
    };

    const getGroupCheckedState = (node: any) => {
        const tasksInGroup = getAllTasksRecursive(node);
        if (!tasksInGroup.length) return false;
        const enabledTasks = tasksInGroup.filter((t: any) => !alreadySelectedTaskIds.includes(t.id));
        if (tasksInGroup.length > 0 && enabledTasks.length === 0) return true;
        if (!enabledTasks.length) return false;
        const allSelected = enabledTasks.every((t: any) => selectedTasksMap.has(t.id));
        const someSelected = enabledTasks.some((t: any) => selectedTasksMap.has(t.id));
        const someDisabled = tasksInGroup.length > enabledTasks.length;
        if (allSelected && someDisabled) return 'indeterminate';
        if (allSelected) return true;
        if (someSelected || someDisabled) return 'indeterminate';
        return false;
    };

    const toggleTask = (task: any) => {
        if (alreadySelectedTaskIds.includes(task.id)) return;
        const newMap = new Map(selectedTasksMap);
        if (newMap.has(task.id)) newMap.delete(task.id);
        else newMap.set(task.id, task);
        setSelectedTasksMap(newMap);
    };

    const handleFinish = () => {
        onAdd(Array.from(selectedTasksMap.values()));
        onClose();
    };

    const TaskItem = ({ task }: { task: any }) => {
        const isAlreadySelected = alreadySelectedTaskIds.includes(task.id);
        const isChecked = isAlreadySelected || selectedTaskIds.has(task.id);
        return (
            <div className={cn('w-full flex items-center gap-2.5 p-1.5 rounded-lg border transition-all',
                isAlreadySelected ? 'opacity-50 cursor-not-allowed border-transparent bg-zinc-50/50' : 'hover:bg-indigo-50 group border-transparent hover:border-indigo-100'
            )}>
                <Checkbox
                    checked={isChecked}
                    disabled={isAlreadySelected}
                    onCheckedChange={() => !isAlreadySelected && toggleTask(task)}
                />
                <div
                    onClick={() => {
                        const event = new CustomEvent('open-task-modal', { detail: { taskId: task.id } });
                        window.dispatchEvent(event);
                    }}
                    className="flex-1 flex items-center gap-2.5 min-w-0 cursor-pointer"
                >
                    <div className={cn('h-6 w-6 rounded-md flex items-center justify-center shadow-sm flex-shrink-0 transition-colors',
                        isAlreadySelected ? 'bg-zinc-100 text-zinc-400 border border-zinc-200' : 'bg-zinc-50 border border-zinc-100 text-zinc-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    )}><Files size={12} /></div>
                    <div className="flex-1 min-w-0">
                        <div className={cn('text-[11px] font-semibold truncate transition-colors',
                            isAlreadySelected ? 'text-zinc-500' : 'text-zinc-800 group-hover:text-indigo-700'
                        )}>{task.title}</div>
                    </div>
                </div>
            </div>
        );
    };

    const TreeNodeRender = ({ node }: { node: any }) => {
        let icon = null;
        if (node.type === 'workspace') icon = <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: node.color || '#4f46e5' }} />;
        else if (node.type === 'list') icon = <div className="flex items-center justify-center h-4 w-4 bg-zinc-100 rounded-sm shadow-sm flex-shrink-0"><List className="h-2.5 w-2.5 text-zinc-500" /></div>;
        else icon = <div className="h-1.5 w-1.5 rounded-[2px] bg-zinc-300 flex-shrink-0" />;

        return (
            <div className="mb-1">
                <div className="flex items-center gap-2 px-1 py-1 mb-1 group cursor-pointer hover:bg-zinc-50 rounded-md transition-colors" onClick={() => toggleGroup(node)}>
                    <Checkbox
                        checked={getGroupCheckedState(node)}
                        disabled={getGroupCheckedState(node) === true && getAllTasksRecursive(node).every((t: any) => alreadySelectedTaskIds.includes(t.id))}
                        onCheckedChange={() => toggleGroup(node)}
                        onClick={e => e.stopPropagation()}
                    />
                    {icon}
                    <span className="text-[11px] select-none uppercase tracking-wider font-bold text-zinc-600 group-hover:text-indigo-600">
                        {node.name}
                    </span>
                </div>
                <div className="pl-3 ml-2 border-l border-zinc-100 space-y-1.5">
                    {node.children.size > 0 && Array.from(node.children.values()).map((child: any) => (
                        <TreeNodeRender key={child.id} node={child} />
                    ))}
                    {node.tasks.length > 0 && (
                        <div className="space-y-0.5 mt-1 pt-1">
                            {node.tasks.map((task: any) => <TaskItem key={task.id} task={task} />)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[500px]">
            <div className="p-4 border-b border-zinc-100 flex-shrink-0 space-y-3 z-10 bg-white">
                <div className="text-sm font-bold text-zinc-900">Add Tasks</div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <Input
                        placeholder="Search tasks..."
                        className="pl-9 h-9 bg-zinc-50 border-zinc-200 focus:bg-white rounded-xl text-xs w-full"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                    {isLoadingTasks && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 animate-spin" />
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 p-4">
                {isLoadingTasks && tasks.length === 0 ? (
                    <TaskSkeleton />
                ) : taskHierarchy.length > 0 ? (
                    <div className="space-y-3">
                        {taskHierarchy.map((rootNode: any) => <TreeNodeRender key={rootNode.id} node={rootNode} />)}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-50">
                        <Files className="h-8 w-8 text-zinc-400 mb-1" />
                        <span className="text-xs font-semibold text-zinc-600">No tasks found</span>
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex-shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative">
                <button
                    onClick={handleFinish}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                    Finish ({selectedTaskIds.size} tasks)
                </button>
            </div>
        </div>
    );
}

// ──── Main Sidebar ─────────────────────────────────────────────────────────────
export default function SwarmConfigSidebar() {
    const { nodes, setNodes, updateNodeData } = useWorkforceStore();
    const [activeTab, setActiveTab] = useState<'tasks' | 'agents'>('tasks');

    const [agentPopoverOpen, setAgentPopoverOpen] = useState(false);
    const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);

    // Modal state
    const [selectedTaskIdForModal, setSelectedTaskIdForModal] = useState<string | null>(null);

    // Listen for custom event from TaskItem
    useEffect(() => {
        const handleOpenTaskModal = (e: any) => {
            if (e.detail?.taskId) {
                setSelectedTaskIdForModal(e.detail.taskId);
            }
        };
        window.addEventListener('open-task-modal', handleOpenTaskModal);
        return () => window.removeEventListener('open-task-modal', handleOpenTaskModal);
    }, []);

    // Search state — hoisted here so popover doesn't reset when toggled
    const [agentSearch, setAgentSearch] = useState('');
    const [agentTypeFilter, setAgentTypeFilter] = useState('all');
    const [taskSearch, setTaskSearch] = useState('');

    // Debounced search — wait 350ms before hitting the API
    const debouncedAgentSearch = useDebounce(agentSearch, 350);
    const debouncedTaskSearch = useDebounce(taskSearch, 350);

    // ── Queries hoisted to parent ── queries live as long as sidebar lives,
    // so closing/opening the popover won't re-fetch.
    const { data: agentsData, isLoading: isLoadingAgents } = trpc.agent.list.useQuery(
        {
            query: debouncedAgentSearch || undefined,
            agentType: agentTypeFilter !== 'all' ? [agentTypeFilter as any] : undefined,
            includeRelations: true,
            page: 1,
            pageSize: 50,
        },
        {
            staleTime: 5 * 60 * 1000, // 5 minutes — agents don't change often
            gcTime: 10 * 60 * 1000,
        }
    );

    const { data: tasksData, isLoading: isLoadingTasks } = trpc.task.list.useQuery(
        {
            query: debouncedTaskSearch || undefined,
            scope: 'all',
            includeRelations: true,
            page: 1,
            pageSize: 50,
        },
        {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        }
    );

    const agents: any[] = agentsData?.items ?? (Array.isArray(agentsData) ? agentsData : []);
    const tasks: any[] = tasksData?.items ?? (Array.isArray(tasksData) ? tasksData : []);

    const selectedAgents = [...nodes]
        .filter(n => n.type === 'agentNode')
        .sort((a, b) => {
            if (a.data?.isCoordinator && !b.data?.isCoordinator) return -1;
            if (!a.data?.isCoordinator && b.data?.isCoordinator) return 1;
            return 0;
        });
    const selectedTasks = nodes.filter(n => n.type === 'taskNode');

    const handleRemoveNode = (nodeId: string) => {
        const nodeToRemove = nodes.find(n => n.id === nodeId);
        if (nodeToRemove?.data?.isCoordinator) {
            const coordinatorCount = nodes.filter(n => n.type === 'agentNode' && n.data?.isCoordinator).length;
            if (coordinatorCount <= 1) {
                toast.error('There must be at least one instance of swarm coordinator agent');
                return;
            }
        }
        setNodes(nodes.filter(n => n.id !== nodeId));
    };

    const handleAddAgents = (newAgents: any[]) => {
        const existingAgentIds = new Set(nodes.filter(n => n.type === 'agentNode').map(n => n.data.agentId));
        const nodesToAdd: WorkforceNode[] = [];
        newAgents.forEach(agent => {
            if (!existingAgentIds.has(agent.id)) {
                const isCoordinator = agent.agentType === 'WORKFLOW_MANAGER' || agent.name?.toLowerCase().includes('coordinator');
                nodesToAdd.push({
                    id: `agent-${agent.id}`,
                    type: 'agentNode',
                    position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
                    data: { label: agent.name, agentId: agent.id, description: agent.description, avatar: agent.avatar, isCoordinator },
                });
            }
        });
        setNodes([...nodes, ...nodesToAdd]);
    };

    const handleAddTasks = (newTasks: any[]) => {
        const existingTaskNodeIds = new Set(nodes.filter(n => n.type === 'taskNode').map(n => n.data.taskId));
        const nodesToAdd: WorkforceNode[] = [];
        newTasks.forEach(task => {
            if (!existingTaskNodeIds.has(task.id)) {
                nodesToAdd.push({
                    id: `task-${task.id}`,
                    type: 'taskNode',
                    position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
                    data: { label: task.title, taskId: task.id },
                });
            }
        });
        setNodes([...nodes, ...nodesToAdd]);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-200">
            {/* Header Tabs */}
            <div className="flex border-b border-zinc-200 bg-white shadow-sm z-10 flex-shrink-0">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'tasks'
                        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                        }`}
                >
                    <Files className="h-4 w-4" />
                    Tasks
                    {selectedTasks.length > 0 && (
                        <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {selectedTasks.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('agents')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'agents'
                        ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                        }`}
                >
                    <Users className="h-4 w-4" />
                    Agents
                    {selectedAgents.length > 0 && (
                        <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {selectedAgents.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1 p-4">
                {/* ── TASKS TAB ── */}
                {activeTab === 'tasks' && (
                    <div className="space-y-3">
                        {selectedTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60 bg-white rounded-2xl border border-dashed border-zinc-200">
                                <span className="text-sm font-semibold text-zinc-500">No tasks selected</span>
                                <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="flex items-center justify-center gap-1.5 w-[130px] py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-semibold text-xs shadow-sm">
                                            <Plus className="h-3.5 w-3.5" /> Select Task
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="right" sideOffset={64} align="start" alignOffset={-100} className="w-[370px] p-0 rounded-xl shadow-xl overflow-hidden z-[100]">
                                        <TaskSelector
                                            alreadySelectedTaskIds={selectedTasks.map(n => n.data.taskId)}
                                            tasks={tasks}
                                            isLoadingTasks={isLoadingTasks}
                                            search={taskSearch}
                                            onSearchChange={setTaskSearch}
                                            onAdd={handleAddTasks}
                                            onClose={() => setTaskPopoverOpen(false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : (
                            <>
                                {selectedTasks.map((node: any) => (
                                    <div
                                        key={node.id}
                                        onClick={() => setSelectedTaskIdForModal(node.data.taskId)}
                                        className="cursor-pointer relative group flex items-center gap-4 p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-sm transition-all hover:border-indigo-200"
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }} className="absolute top-2 right-2 p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                            <Files size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="text-sm font-bold text-zinc-900 truncate">{node.data.label}</div>
                                            <div className="text-[10px] text-zinc-500 truncate mt-0.5">Task node</div>
                                        </div>
                                    </div>
                                ))}

                                <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="w-full flex justify-center py-3 border-dashed border-2 border-zinc-200 rounded-2xl text-zinc-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors focus:outline-none">
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="right" sideOffset={16} align="start" alignOffset={-100} className="w-[370px] p-0 rounded-xl shadow-xl overflow-hidden z-[100]">
                                        <TaskSelector
                                            alreadySelectedTaskIds={selectedTasks.map(n => n.data.taskId)}
                                            tasks={tasks}
                                            isLoadingTasks={isLoadingTasks}
                                            search={taskSearch}
                                            onSearchChange={setTaskSearch}
                                            onAdd={handleAddTasks}
                                            onClose={() => setTaskPopoverOpen(false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </>
                        )}
                    </div>
                )}

                {/* ── AGENTS TAB ── */}
                {activeTab === 'agents' && (
                    <div className="space-y-3">
                        {selectedAgents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60 bg-white rounded-2xl border border-dashed border-zinc-200">
                                <span className="text-sm font-semibold text-zinc-500">No agents selected</span>
                                <Popover open={agentPopoverOpen} onOpenChange={setAgentPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="flex items-center justify-center gap-1.5 w-[130px] py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-xs shadow-sm">
                                            <Plus className="h-3.5 w-3.5" /> Add Agent
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="right" sideOffset={64} align="start" alignOffset={-100} className="w-[370px] p-0 rounded-xl shadow-xl overflow-hidden z-[100]">
                                        <AgentSelector
                                            alreadySelectedAgentIds={selectedAgents.map(n => n.data.agentId)}
                                            agents={agents}
                                            isLoadingAgents={isLoadingAgents}
                                            search={agentSearch}
                                            onSearchChange={setAgentSearch}
                                            agentTypeFilter={agentTypeFilter}
                                            onFilterChange={setAgentTypeFilter}
                                            onAdd={handleAddAgents}
                                            onClose={() => setAgentPopoverOpen(false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : (
                            <>
                                {selectedAgents.map((node: any) => {
                                    const isCoordinator = node.data.isCoordinator;
                                    return (
                                        <div key={node.id} className={cn('relative group flex flex-col gap-3 p-3.5 rounded-2xl bg-white border shadow-sm transition-all',
                                            isCoordinator ? 'border-purple-200 hover:border-purple-400 bg-purple-50/10' : 'border-zinc-200 hover:border-blue-200'
                                        )}>
                                            <button onClick={() => handleRemoveNode(node.id)} className="absolute top-2 right-2 p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                            <div className="flex items-center gap-4">
                                                <Avatar className={cn('h-10 w-10 rounded-xl shadow-sm border shrink-0',
                                                    isCoordinator ? 'border-purple-200 bg-purple-100' : 'border-zinc-200 bg-blue-50/50'
                                                )}>
                                                    <AvatarImage src={node.data.avatar} />
                                                    <AvatarFallback className={cn('rounded-xl', isCoordinator ? 'bg-purple-100 text-purple-600' : 'bg-blue-50/50 text-blue-600')}>
                                                        {isCoordinator ? <BrainCircuit className="h-5 w-5 opacity-80" /> : <Bot className="h-5 w-5 opacity-80" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <div className={cn('text-sm font-bold truncate', isCoordinator ? 'text-purple-900' : 'text-zinc-900')}>{node.data.label}</div>
                                                    <div className={cn('text-[10px] truncate mt-0.5', isCoordinator ? 'text-purple-600/80' : 'text-zinc-500')}>
                                                        {node.data.description || (isCoordinator ? 'Swarm Coordinator' : 'Agent node')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 mt-0.5">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Instances</span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => updateNodeData(node.id, { agentCount: Math.max(1, (node.data.agentCount || 1) - 1) })}
                                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                                    >-</button>
                                                    <span className="text-xs font-bold w-4 text-center">{node.data.agentCount || 1}</span>
                                                    <button
                                                        onClick={() => updateNodeData(node.id, { agentCount: (node.data.agentCount || 1) + 1 })}
                                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <Popover open={agentPopoverOpen} onOpenChange={setAgentPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="w-full flex justify-center py-3 border-dashed border-2 border-zinc-200 rounded-2xl text-zinc-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/50 transition-colors focus:outline-none">
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="right" sideOffset={16} align="start" alignOffset={-100} className="w-[370px] p-0 rounded-xl shadow-xl overflow-hidden z-[100]">
                                        <AgentSelector
                                            alreadySelectedAgentIds={selectedAgents.map(n => n.data.agentId)}
                                            agents={agents}
                                            isLoadingAgents={isLoadingAgents}
                                            search={agentSearch}
                                            onSearchChange={setAgentSearch}
                                            agentTypeFilter={agentTypeFilter}
                                            onFilterChange={setAgentTypeFilter}
                                            onAdd={handleAddAgents}
                                            onClose={() => setAgentPopoverOpen(false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </>
                        )}
                    </div>
                )}
            </ScrollArea>
            <TaskDetailModal
                taskId={selectedTaskIdForModal}
                open={!!selectedTaskIdForModal}
                onOpenChange={(open) => {
                    if (!open) setSelectedTaskIdForModal(null);
                }}
            />
        </div>
    );
}
