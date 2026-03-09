'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    X, Search, Bot, Plus, ChevronRight, Loader2,
    Wrench, Zap, GitBranch, ShoppingBag, ExternalLink,
    Slack, Mail, Calendar, Hash, Globe,
    Clock, Trash2, ArrowRight, Settings, Filter, Files, ListTree, List, History,
    MessageCircle, MoreVertical
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useWorkforceStore } from './store/useWorkforceStore';
import type { ConditionGroup, ConditionRule, ConditionOperator } from './store/useWorkforceStore';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AgentProfile } from '@/entities/agents/components/AgentProfile';

// ─── Node type icon helper ─────────────────────────────────────────────────
function NodeTypeIcon({ nodeType, size = 14 }: { nodeType?: string; size?: number }) {
    if (nodeType === 'agentNode') return <Bot size={size} className="text-blue-600" />;
    if (nodeType === 'toolNode') return <Wrench size={size} className="text-emerald-600" />;
    if (nodeType === 'eventNode') return <MessageCircle size={size} className="text-orange-500" />;
    if (nodeType === 'conditionNode') return <GitBranch size={size} className="text-purple-600" />;
    if (nodeType === 'taskNode') return <Files size={size} className="text-indigo-600" />;
    return <Bot size={size} className="text-blue-600" />;
}

function nodeTypeBgColor(nodeType?: string) {
    if (nodeType === 'agentNode') return 'bg-blue-50';
    if (nodeType === 'toolNode') return 'bg-emerald-50';
    if (nodeType === 'eventNode') return 'bg-orange-50';
    if (nodeType === 'conditionNode') return 'bg-purple-50';
    if (nodeType === 'taskNode') return 'bg-indigo-50';
    return 'bg-blue-50';
}

function nodeTypeLabel(nodeType?: string) {
    if (nodeType === 'agentNode') return 'Agent';
    if (nodeType === 'toolNode') return 'Tool';
    if (nodeType === 'eventNode') return 'Trigger';
    if (nodeType === 'conditionNode') return 'Condition';
    if (nodeType === 'taskNode') return 'Task';
    return 'Node';
}

// ─── Operator definitions ──────────────────────────────────────────────────
const OPERATORS: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'equals (text)' },
    { value: 'not_equals', label: 'does not equal (text)' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
    { value: 'greater_than', label: 'greater than (number)' },
    { value: 'less_than', label: 'less than (number)' },
    { value: 'regex', label: 'matches regex' },
];

const noRightValue = (op: string) => op === 'is_empty' || op === 'is_not_empty';

// ─── Types ─────────────────────────────────────────────────────────────────
type VarLeaf = { value: string; label: string; type: string; field: string; };
type VarSection = { id: string; label: string; leaves: VarLeaf[]; };
type VarSubNode = { id: string; name: string; nodeType: string; sections: VarSection[]; };
type VarTreeEntry = { nodeId: string; nodeName: string; nodeType: string; sections: VarSection[]; subNodes: VarSubNode[]; };

// ─── VariableInput – Relevance AI tree picker (Popover, side=left) ──────────
function VariableInput({
    value, label, varTree, onChange, onClear,
}: {
    value: string; label: string;
    varTree: VarTreeEntry[];
    onChange: (val: string, lbl: string) => void;
    onClear: () => void;
}) {
    const isVar = value.startsWith('nodes.') || value.startsWith('trigger');
    const displayLabel = isVar ? label : value;

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [inputValue, setInputValue] = React.useState(displayLabel || '');
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
    const [highlightedIdx, setHighlightedIdx] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const openTimestampRef = React.useRef<number>(0);

    React.useEffect(() => {
        setInputValue(displayLabel || '');
    }, [displayLabel]);

    const toggleCollapse = (key: string) =>
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    const selectLeaf = (leaf: VarLeaf) => {
        onChange(leaf.value, leaf.label);
        setOpen(false);
        setQuery('');
    };

    // Filter tree
    const filteredTree = React.useMemo(() => {
        if (!query) return varTree;
        const q = query.toLowerCase();
        const filterSections = (secs: VarSection[]) =>
            secs.map(s => ({ ...s, leaves: s.leaves.filter(l => l.field.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)) }))
                .filter(s => s.leaves.length > 0);
        return varTree.map(entry => ({
            ...entry,
            sections: filterSections(entry.sections),
            subNodes: entry.subNodes
                .map(sub => ({ ...sub, sections: filterSections(sub.sections) }))
                .filter(sub => sub.sections.length > 0),
        })).filter(e => e.sections.length > 0 || e.subNodes.length > 0);
    }, [varTree, query]);

    // Flat leaves for keyboard nav
    const allLeaves: VarLeaf[] = React.useMemo(() => {
        const collect = (secs: VarSection[], prefix: string) =>
            secs.flatMap(s => collapsed[`${prefix}:${s.id}`] ? [] : s.leaves);
        return filteredTree.flatMap(entry => [
            ...collect(entry.sections, entry.nodeId),
            ...entry.subNodes.flatMap(sub => collect(sub.sections, sub.id)),
        ]);
    }, [filteredTree, collapsed]);

    // Icon helpers
    const entryIcon = (nt: string) => {
        if (nt === 'agentNode') return <Bot className="h-3.5 w-3.5 text-blue-500" />;
        if (nt === 'toolNode') return <Wrench className="h-3.5 w-3.5 text-emerald-500" />;
        if (nt === 'eventNode') return <MessageCircle className="h-3.5 w-3.5 text-orange-500" />;
        if (nt === 'taskNode') return <Files className="h-3.5 w-3.5 text-indigo-500" />;
        return <Bot className="h-3.5 w-3.5 text-violet-500" />;
    };
    const typeColor = (t: string) => {
        if (t === 'String') return 'text-amber-600';
        if (t === 'Object') return 'text-violet-600';
        if (t === 'Number') return 'text-sky-600';
        if (t === 'Any') return 'text-zinc-500';
        return 'text-zinc-500';
    };
    const typeIcon = (t: string) => {
        if (t === 'Number') return <span className="text-[9px] font-black text-sky-600">#</span>;
        return <span className="text-[9px] font-black text-amber-600">T</span>;
    };

    // Render leaf rows
    const renderLeaves = (leaves: VarLeaf[], indent: number) =>
        leaves.map(leaf => {
            const flatIdx = allLeaves.indexOf(leaf);
            const isHighlighted = flatIdx === highlightedIdx;
            return (
                <button
                    key={leaf.value}
                    className={cn(
                        'w-full flex items-center gap-2.5 pr-4 py-1.5 text-left transition-colors',
                        isHighlighted ? 'bg-violet-50' : 'hover:bg-zinc-50'
                    )}
                    style={{ paddingLeft: indent }}
                    onClick={() => selectLeaf(leaf)}
                    onMouseEnter={() => setHighlightedIdx(flatIdx)}
                >
                    <span className="h-4 w-4 rounded flex items-center justify-center bg-amber-50 border border-amber-100 shrink-0">
                        {typeIcon(leaf.type)}
                    </span>
                    <span className="flex-1 text-[12px] text-zinc-700 font-medium">{leaf.field}</span>
                    <span className={cn('text-[11px] font-semibold', typeColor(leaf.type))}>{leaf.type}</span>
                </button>
            );
        });

    // Render a section (input/output group) with collapse
    const renderSection = (sec: VarSection, collapseKey: string, indent: number) => {
        const isOpen = collapsed[collapseKey] !== true;
        return (
            <div key={sec.id}>
                <button
                    className="w-full flex items-center gap-2 py-1.5 hover:bg-zinc-50 transition-colors"
                    style={{ paddingLeft: indent - 8, paddingRight: 16 }}
                    onClick={() => toggleCollapse(collapseKey)}
                >
                    <div className="h-4 w-4 rounded flex items-center justify-center bg-violet-50 border border-violet-100 shrink-0">
                        <svg width="8" height="8" viewBox="0 0 8 8" className="text-violet-500">
                            <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5"
                                strokeLinecap="round" strokeLinejoin="round" fill="none"
                                style={{ transform: isOpen ? 'none' : 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'transform 0.15s' }}
                            />
                        </svg>
                    </div>
                    <span className="flex-1 text-[12px] font-medium text-zinc-600 text-left">{sec.label}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Object</span>
                </button>
                {isOpen && renderLeaves(sec.leaves, indent + 16)}
            </div>
        );
    };

    const handleOpenChange = (next: boolean) => {
        if (next) {
            openTimestampRef.current = Date.now();
            setOpen(true);
            setHighlightedIdx(0);
        } else {
            // Guard: ignore close if it happens within 150ms of open (prevents open-then-close flicker)
            const elapsed = Date.now() - openTimestampRef.current;
            if (elapsed < 150) return;
            setOpen(false);
            setQuery('');
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
            <PopoverTrigger asChild>
                <div
                    className={cn(
                        'flex items-center h-10 border rounded-lg bg-white px-3 gap-2 transition-all',
                        open ? 'border-violet-400 ring-2 ring-violet-100' : 'border-zinc-200 hover:border-zinc-300'
                    )}
                    onPointerDown={(e) => {
                        if (!open) {
                            e.preventDefault();
                            handleOpenChange(true);
                        }
                    }}
                    onClick={(e) => open && e.stopPropagation()}
                >
                    {isVar && <span className="text-[9px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded uppercase shrink-0 tracking-wide">VAR</span>}
                    <input
                        className={cn('flex-1 text-[12px] bg-transparent outline-none min-w-0', inputValue ? 'text-zinc-800' : 'text-zinc-400')}
                        value={inputValue}
                        onChange={e => {
                            const val = e.target.value;
                            setInputValue(val);
                            onChange(val, val);
                        }}
                        onFocus={() => { if (!open) handleOpenChange(true); }}
                        placeholder="Select variable or input a constant value"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); e.preventDefault(); onClear(); setOpen(false); }}
                            className="shrink-0 h-4 w-4 rounded flex items-center justify-center text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </PopoverTrigger>

            <PopoverContent side="left" align="start" sideOffset={8}
                className="p-0 w-[380px] rounded-xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col"
                onOpenAutoFocus={e => e.preventDefault()}
                onCloseAutoFocus={e => e.preventDefault()}
            >
                {/* Search */}
                <div className="p-2 border-b border-zinc-100">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input ref={inputRef} autoFocus
                            className="w-full h-9 pl-8 pr-3 text-[13px] bg-zinc-50 rounded-lg border border-zinc-100 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-all placeholder:text-zinc-400"
                            placeholder="Select variable or input a constant value"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setHighlightedIdx(0); }}
                            onKeyDown={e => {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, allLeaves.length - 1)); }
                                if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)); }
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (allLeaves[highlightedIdx]) { selectLeaf(allLeaves[highlightedIdx]); return; }
                                    if (query.trim()) { onChange(query.trim(), query.trim()); setOpen(false); setQuery(''); }
                                }
                                if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                            }}
                        />
                    </div>
                </div>

                {/* Tree */}
                <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                    {filteredTree.length === 0 ? (
                        <div className="py-8 text-center text-[12px] text-zinc-400">
                            {query ? 'No variables match' : 'No variables available'}
                        </div>
                    ) : filteredTree.map(entry => (
                        <div key={entry.nodeId}>
                            {/* Top-level node row */}
                            <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                                <div className="h-5 w-5 rounded flex items-center justify-center bg-white border border-zinc-200 shadow-sm shrink-0">
                                    {entryIcon(entry.nodeType)}
                                </div>
                                <span className="flex-1 text-[12px] font-semibold text-zinc-800">{entry.nodeName}</span>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Object</span>
                            </div>

                            {/* Agent input / output sections */}
                            {entry.sections.map(sec =>
                                renderSection(sec, `${entry.nodeId}:${sec.id}`, 24)
                            )}

                            {/* Sub-nodes (tools within agent) */}
                            {entry.subNodes.map(sub => (
                                <div key={sub.id}>
                                    {/* Tool header */}
                                    <div className="flex items-center gap-2.5 pl-8 pr-3 py-1.5 border-b border-zinc-50 bg-white">
                                        <div className="h-4 w-4 rounded flex items-center justify-center bg-emerald-50 border border-emerald-100 shrink-0">
                                            <Wrench className="h-2.5 w-2.5 text-emerald-600" />
                                        </div>
                                        <span className="flex-1 text-[11px] font-semibold text-zinc-700">{sub.name}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Object</span>
                                    </div>
                                    {/* Tool sections (input/output) */}
                                    {sub.sections.map(sec =>
                                        renderSection(sec, `${sub.id}:${sec.id}`, 40)
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-3 py-2 border-t border-zinc-100 bg-zinc-50/50">
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                        <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">↑</kbd>
                        <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">↓</kbd>
                        Navigate
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                        <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">↵</kbd>
                        Insert
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                        <kbd className="px-1 py-0.5 bg-white border border-zinc-200 rounded text-[9px]">Esc</kbd>
                        Close/Exit
                    </span>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ─── ConditionRuleRow – responsive: row when wide, col when narrow ────────────
function ConditionRuleRow({
    rule, varTree, onUpdate, onRemove,
}: {
    rule: ConditionRule;
    varTree: VarTreeEntry[];
    onUpdate: (patch: Partial<ConditionRule>) => void;
    onRemove: () => void;
}) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isWide, setIsWide] = React.useState(false);
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver(entries => {
            for (const e of entries) setIsWide(e.contentRect.width > 500);
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const leftInput = (
        <VariableInput
            value={rule.leftVariable} label={rule.leftLabel}
            varTree={varTree}
            onChange={(val, lbl) => onUpdate({ leftVariable: val, leftLabel: lbl })}
            onClear={() => onUpdate({ leftVariable: '', leftLabel: '' })}
        />
    );
    const operatorSelect = (
        <Select value={rule.operator} onValueChange={val => onUpdate({ operator: val as ConditionOperator })}>
            <SelectTrigger className={cn('h-9 text-[12px] bg-white border-zinc-200 rounded-lg', isWide ? 'w-44 shrink-0' : 'w-full')}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value} className="text-[12px]">{op.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
    const rightInput = !noRightValue(rule.operator) && (
        <VariableInput
            value={rule.rightValue} label={rule.rightLabel}
            varTree={varTree}
            onChange={(val, lbl) => onUpdate({ rightValue: val, rightLabel: lbl })}
            onClear={() => onUpdate({ rightValue: '', rightLabel: '' })}
        />
    );
    const deleteBtn = (
        <button onClick={onRemove}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
        </button>
    );

    return (
        <div ref={containerRef} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
            {isWide ? (
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">{leftInput}</div>
                    {operatorSelect}
                    {rightInput && <div className="flex-1 min-w-0">{rightInput}</div>}
                    {deleteBtn}
                </div>
            ) : (
                <div className="space-y-2">
                    {leftInput}
                    {operatorSelect}
                    {rightInput}
                    <div className="flex justify-end pt-0.5">{deleteBtn}</div>
                </div>
            )}
        </div>
    );
}

export default function WorkforceSidebar({ workspaceId }: { workspaceId?: string }) {
    const {
        isSidebarOpen,
        sidebarType,
        setSidebarOpen,
        activeNodeId,
        activeEdgeId,
        updateNodeData,
        updateEdgeData,
        nodes,
        edges,
        setEdges
    } = useWorkforceStore();

    const [search, setSearch] = useState('');
    const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all');
    const [taskViewMode, setTaskViewMode] = useState<'FLAT' | 'HIERARCHICAL'>('FLAT');
    const [showAgentList, setShowAgentList] = useState(false);

    // Sidebar resizer
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        // Reset showAgentList when active node changes
        setShowAgentList(false);
    }, [activeNodeId]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const w = window.innerWidth - e.clientX;
            if (w > 300 && w < 800) setSidebarWidth(w);
        };
        const onUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isResizing]);

    // ─── Derived state ─────────────────────────────────────────────────────
    const activeNode = useMemo(() => nodes.find(n => n.id === activeNodeId), [nodes, activeNodeId]);
    const activeEdge = useMemo(() => edges.find(e => e.id === activeEdgeId), [edges, activeEdgeId]);
    const incomingEdge = useMemo(() => activeNodeId ? edges.find(e => e.target === activeNodeId) : null, [edges, activeNodeId]);
    const outgoingEdges = useMemo(() => activeNodeId ? edges.filter(e => e.source === activeNodeId) : [], [edges, activeNodeId]);
    const trueEdge = useMemo(() => outgoingEdges.find(e => e.sourceHandle === 'true'), [outgoingEdges]);
    const falseEdge = useMemo(() => outgoingEdges.find(e => e.sourceHandle === 'false'), [outgoingEdges]);
    const trueTargetNode = useMemo(() => trueEdge ? nodes.find(n => n.id === trueEdge.target) : null, [nodes, trueEdge]);
    const falseTargetNode = useMemo(() => falseEdge ? nodes.find(n => n.id === falseEdge.target) : null, [nodes, falseEdge]);
    const availableNodes = useMemo(() => nodes.filter(n => n.id !== activeNodeId && n.type !== 'triggerNode'), [nodes, activeNodeId]);
    const sourceNode = useMemo(() => {
        if (sidebarType === 'EDGE' && activeEdge) return nodes.find(n => n.id === activeEdge.source);
        if (sidebarType === 'CONDITION' && incomingEdge) return nodes.find(n => n.id === incomingEdge.source);
        return null;
    }, [nodes, activeEdge, incomingEdge, sidebarType]);
    const targetNode = useMemo(() => {
        if (sidebarType === 'EDGE' && activeEdge) return nodes.find(n => n.id === activeEdge.target);
        return null;
    }, [nodes, activeEdge, sidebarType]);

    // ─── Route handler ─────────────────────────────────────────────────────
    const handleRouteSelect = (handle: 'true' | 'false', targetNodeId: string) => {
        if (!activeNodeId) return;
        const filtered = edges.filter(e => !(e.source === activeNodeId && e.sourceHandle === handle));
        if (targetNodeId === 'none') { setEdges(filtered); return; }
        setEdges([...filtered, {
            id: `edge-${activeNodeId}-${handle}-${targetNodeId}`,
            source: activeNodeId, target: targetNodeId,
            sourceHandle: handle, type: 'flowEdge', animated: true,
            data: { label: handle === 'true' ? 'True' : 'False' }
        } as any]);
    };

    // ─── TRPC Queries ──────────────────────────────────────────────────────
    const { data: agents, isLoading: isLoadingAgents } = trpc.agent.list.useQuery(
        { query: search || undefined, agentType: agentTypeFilter !== 'all' ? [agentTypeFilter as any] : undefined, includeRelations: true, page: 1, pageSize: 50 },
        { enabled: isSidebarOpen && sidebarType === 'AGENT' }
    );
    const { data: agentDetails, isLoading: isLoadingAgentDetails } = trpc.agent.get.useQuery(
        { id: activeNode?.data?.agentId || '' },
        { enabled: isSidebarOpen && sidebarType === 'AGENT' && !!activeNode?.data?.agentId && !showAgentList }
    );

    // Auto-sync node data with latest agent details from DB
    useEffect(() => {
        if (agentDetails && activeNode && activeNodeId && sidebarType === 'AGENT') {
            const hasUpdate =
                activeNode.data?.label !== agentDetails.name ||
                activeNode.data?.description !== agentDetails.description;

            if (hasUpdate) {
                updateNodeData(activeNodeId, {
                    label: agentDetails.name,
                    description: agentDetails.description || ''
                });
            }
        }
    }, [agentDetails, activeNode, activeNodeId, sidebarType, updateNodeData]);

    const { data: tasks, isLoading: isLoadingTasks } = trpc.task.list.useQuery(
        { query: search || undefined, workspaceId: workspaceId || undefined, scope: 'all', includeRelations: true, page: 1, pageSize: 50 },
        { enabled: isSidebarOpen && sidebarType === 'TASK' }
    );

    const { data: dbToolsData, isLoading: isLoadingTools } = trpc.tool.systemList.useQuery(
        { query: search || undefined }
    );
    const { data: compositeToolsData } = trpc.compositeTool.list.useQuery(
        workspaceId ? { workspaceId, query: search || undefined } : undefined,
        { enabled: !!workspaceId }
    );
    const dbTools = [
        ...(dbToolsData || []),
        ...((compositeToolsData || []) as any[]),
    ];

    // ─── Static data ───────────────────────────────────────────────────────
    // tools list is now sourced from dbTools
    const triggers = [
        { id: 'slack', name: 'Slack', icon: Slack },
        { id: 'outlook', name: 'Microsoft Outlook', icon: Mail },
        { id: 'gmail', name: 'Google Mail', icon: Mail },
        { id: 'calendar', name: 'Google Calendar', icon: Calendar },
        { id: 'teams', name: 'Microsoft Teams Calendar', icon: Calendar },
        { id: 'salesforce', name: 'Salesforce', icon: Globe },
        { id: 'hubspot', name: 'Hubspot', icon: Hash },
        { id: 'webhook', name: 'Webhook', icon: Globe },
        { id: 'schedule', name: 'Recurring Schedule', icon: Clock },
    ];

    const handleSelect = (item: any) => {
        if (activeNodeId) {
            updateNodeData(activeNodeId, {
                label: item.title || item.name,
                description: item.description,
                ...(sidebarType === 'AGENT' && { agentId: item.id }),
                ...(sidebarType === 'TOOL' && { toolId: item.id }),
                ...(sidebarType === 'TRIGGER' && { triggerType: item.id }),
                ...(sidebarType === 'TASK' && { taskId: item.id }),
            });
            setSidebarOpen(false);
        }
    };

    // ─── Variable tree: built from connected canvas nodes ──────────────────────
    const varTree: VarTreeEntry[] = useMemo(() => {
        // Nodes that feed INTO the active condition node (upstream)
        const upstreamNodeIds = new Set<string>();
        const visited = new Set<string>();
        const walk = (nid: string) => {
            if (visited.has(nid)) return;
            visited.add(nid);
            for (const e of edges) {
                if (e.target === nid) { upstreamNodeIds.add(e.source); walk(e.source); }
            }
        };
        if (activeNodeId) walk(activeNodeId);

        const relevantNodes = nodes.filter(n =>
            n.id !== activeNodeId &&
            ['agentNode', 'toolNode', 'eventNode', 'taskNode'].includes(n.type || '')
        );

        return relevantNodes.map(n => {
            const name = (n.data?.label as string) || n.id;

            if (n.type === 'agentNode') {
                // Find tool nodes connected to this agent
                const connectedToolNodes = edges
                    .filter(e => e.target === n.id || e.source === n.id)
                    .flatMap(e => [e.source, e.target])
                    .filter(nid => nid !== n.id)
                    .map(nid => nodes.find(cn => cn.id === nid))
                    .filter(cn => cn?.type === 'toolNode') as typeof nodes;

                const agentSubNodes: VarSubNode[] = connectedToolNodes
                    .filter(t => t.data?.toolId)
                    .map(t => {
                        const tName = (t.data?.label as string) || t.id;
                        const toolObj = dbTools.find(d => d.id === t.data?.toolId);
                        if (!toolObj) return null;

                        const schemaProps = (toolObj?.functionSchema as any)?.parameters?.properties || {};
                        const returnProps = (toolObj?.functionSchema as any)?.returns?.properties || {};

                        const inputLeaves: VarLeaf[] = Object.keys(schemaProps).map(key => ({
                            value: `nodes.${t.id}.input.${key}`, label: `${tName} / input / ${key}`,
                            type: schemaProps[key].type === 'number' ? 'Number' : schemaProps[key].type === 'boolean' ? 'String' : 'String',
                            field: key
                        }));

                        const outputLeaves: VarLeaf[] = [
                            { value: `nodes.${t.id}.output.status`, label: `${tName} / output / status`, type: 'Number', field: 'status' },
                            { value: `nodes.${t.id}.output.error`, label: `${tName} / output / error`, type: 'String', field: 'error' },
                            ...Object.keys(returnProps).map(key => ({
                                value: `nodes.${t.id}.output.${key}`, label: `${tName} / output / ${key}`,
                                type: returnProps[key].type === 'number' ? 'Number' : returnProps[key].type === 'boolean' ? 'String' : 'String',
                                field: key
                            }))
                        ];

                        return {
                            id: t.id,
                            name: tName,
                            nodeType: 'toolNode',
                            sections: [
                                { id: 'input', label: 'input', leaves: inputLeaves },
                                { id: 'output', label: 'output', leaves: outputLeaves },
                            ],
                        };
                    })
                    .filter(Boolean) as VarSubNode[];

                return {
                    nodeId: n.id, nodeName: name, nodeType: 'agentNode',
                    sections: [
                        {
                            id: 'input', label: `${name} input`,
                            leaves: [
                                { value: `nodes.${n.id}.input.input_message`, label: `${name} / input / input_message`, type: 'String', field: 'input_message' },
                            ],
                        },
                        {
                            id: 'output', label: `${name} output`,
                            leaves: [
                                { value: `nodes.${n.id}.output.response`, label: `${name} / output / response`, type: 'String', field: 'response' },
                            ],
                        },
                    ],
                    subNodes: agentSubNodes,
                };
            }

            if (n.type === 'toolNode') {
                if (!n.data?.toolId) return null;

                const tName = name;
                const toolObj = dbTools.find(d => d.id === n.data?.toolId);
                if (!toolObj) return null;

                const schemaProps = (toolObj?.functionSchema as any)?.parameters?.properties || {};
                const returnProps = (toolObj?.functionSchema as any)?.returns?.properties || {};

                const inputLeaves: VarLeaf[] = Object.keys(schemaProps).map(key => ({
                    value: `nodes.${n.id}.input.${key}`, label: `${tName} / input / ${key}`,
                    type: schemaProps[key].type === 'number' ? 'Number' : schemaProps[key].type === 'boolean' ? 'String' : 'String',
                    field: key
                }));

                const outputLeaves: VarLeaf[] = [
                    { value: `nodes.${n.id}.output.status`, label: `${tName} / output / status`, type: 'Number', field: 'status' },
                    { value: `nodes.${n.id}.output.error`, label: `${tName} / output / error`, type: 'String', field: 'error' },
                    ...Object.keys(returnProps).map(key => ({
                        value: `nodes.${n.id}.output.${key}`, label: `${tName} / output / ${key}`,
                        type: returnProps[key].type === 'number' ? 'Number' : returnProps[key].type === 'boolean' ? 'String' : 'String',
                        field: key
                    }))
                ];

                return {
                    nodeId: n.id, nodeName: tName, nodeType: 'toolNode',
                    sections: [
                        { id: 'input', label: 'input', leaves: inputLeaves },
                        { id: 'output', label: 'output', leaves: outputLeaves },
                    ],
                    subNodes: [],
                };
            }
            // eventNode removed

            if (n.type === 'taskNode') {
                return {
                    nodeId: n.id, nodeName: name, nodeType: 'taskNode',
                    sections: [
                        {
                            id: 'output', label: `${name} output`,
                            leaves: [
                                { value: `nodes.${n.id}.output.status`, label: `${name} / output / status`, type: 'String', field: 'status' },
                                { value: `nodes.${n.id}.output.title`, label: `${name} / output / title`, type: 'String', field: 'title' },
                            ],
                        },
                    ],
                    subNodes: [],
                };
            }

            return null;
        }).filter(Boolean) as VarTreeEntry[];
    }, [nodes, edges, activeNodeId, dbTools]);

    // ─── Task Hierarchy ────────────────────────────────────────────────────
    const taskHierarchy = useMemo(() => {
        if (!tasks?.items) return [];

        const spacesMap = new Map<string, any>();
        const orphanTasks: any[] = [];

        tasks.items.forEach((task: any) => {
            if (task.spaceId) {
                if (!spacesMap.has(task.spaceId)) {
                    spacesMap.set(task.spaceId, {
                        ...task.space,
                        lists: new Map<string, any>(),
                        rootTasks: []
                    });
                }
                const space = spacesMap.get(task.spaceId);
                if (task.listId) {
                    if (!space.lists.has(task.listId)) {
                        space.lists.set(task.listId, {
                            ...task.list,
                            tasks: []
                        });
                    }
                    space.lists.get(task.listId).tasks.push(task);
                } else {
                    space.rootTasks.push(task);
                }
            } else {
                orphanTasks.push(task);
            }
        });

        const hierarchyArr: any[] = Array.from(spacesMap.values()).map(space => ({
            ...space,
            lists: Array.from(space.lists.values())
        }));

        if (orphanTasks.length > 0) {
            hierarchyArr.unshift({
                id: 'orphan',
                name: 'Personal Tasks',
                lists: [],
                rootTasks: orphanTasks,
                color: '#A1A1AA' // zinc-400
            });
        }

        return hierarchyArr;
    }, [tasks?.items]);

    if (!isSidebarOpen) return null;

    // ─── Condition panel helpers ───────────────────────────────────────────
    const conditionGroups: ConditionGroup[] = activeNode?.data?.conditionGroups ?? [
        { id: 'if-default', label: 'IF', matchMode: 'all', rules: [], targetHandle: 'true' }
    ];

    const saveGroups = (next: ConditionGroup[]) => {
        if (!activeNode) return;
        updateNodeData(activeNode.id, { conditionGroups: next, conditionMode: 'rule' });
    };

    const addGroup = () => saveGroups([...conditionGroups, {
        id: `elseif-${Date.now()}`, label: 'ELSE IF', matchMode: 'all', rules: [], targetHandle: `path-${conditionGroups.length}`
    }]);

    const removeGroup = (gid: string) => saveGroups(conditionGroups.filter(g => g.id !== gid));
    const setMatchMode = (gid: string, mode: 'all' | 'any') =>
        saveGroups(conditionGroups.map(g => g.id === gid ? { ...g, matchMode: mode } : g));
    const setGroupConditionType = (gid: string, ct: 'llm' | 'rule') =>
        saveGroups(conditionGroups.map(g => g.id === gid ? { ...g, conditionType: ct } : g));

    const addRule = (gid: string) => saveGroups(conditionGroups.map(g =>
        g.id === gid ? { ...g, rules: [...g.rules, { id: `rule-${Date.now()}`, leftVariable: '', leftLabel: '', operator: 'equals' as ConditionOperator, rightValue: '', rightLabel: '' }] } : g
    ));
    const removeRule = (gid: string, rid: string) => saveGroups(conditionGroups.map(g =>
        g.id === gid ? { ...g, rules: g.rules.filter(r => r.id !== rid) } : g
    ));
    const updateRule = (gid: string, rid: string, patch: Partial<ConditionRule>) => saveGroups(conditionGroups.map(g =>
        g.id === gid ? { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, ...patch } : r) } : g
    ));

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <>
            <div
                className={cn("absolute top-0 right-0 bottom-0 bg-white border-l border-zinc-200 shadow-2xl flex flex-col z-[50] animate-in slide-in-from-right", isResizing ? "transition-none" : "transition-all duration-300")}
                style={{ width: `${sidebarWidth}px` }}
            >
                {/* Resizer Handle */}
                <div
                    className={cn("absolute top-0 bottom-0 left-0 w-1 cursor-col-resize z-50 hover:bg-indigo-400/50 transition-colors", isResizing && "bg-indigo-500")}
                    onMouseDown={(e) => { setIsResizing(true); e.preventDefault(); }}
                />

                {/* Header - Hidden when showing Agent Profile to avoid redundancy */}
                {!(sidebarType === 'AGENT' && activeNode?.data?.agentId && agentDetails && !showAgentList) && (
                    <div className="p-5 border-b border-zinc-100 flex items-center bg-zinc-50/50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
                                sidebarType === 'AGENT' && "bg-blue-50 text-blue-600",
                                sidebarType === 'TOOL' && "bg-emerald-50 text-emerald-600",
                                sidebarType === 'TRIGGER' && "bg-orange-50 text-orange-600",
                                sidebarType === 'CONDITION' && "bg-purple-50 text-purple-600",
                                sidebarType === 'TASK' && "bg-indigo-50 text-indigo-600",
                                sidebarType === 'EDGE' && "bg-zinc-100 text-zinc-600",
                            )}>
                                {sidebarType === 'AGENT' && <Bot className="h-5 w-5" />}
                                {sidebarType === 'TOOL' && <Wrench className="h-5 w-5" />}
                                {sidebarType === 'TRIGGER' && (!activeNode ? <Zap className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />)}
                                {sidebarType === 'CONDITION' && <GitBranch className="h-5 w-5" />}
                                {sidebarType === 'TASK' && <Files className="h-5 w-5" />}
                                {sidebarType === 'EDGE' && <Settings className="h-5 w-5" />}
                                {sidebarType === 'VERSIONS' && <History className="h-5 w-5 text-indigo-600" />}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-900">
                                    {sidebarType === 'AGENT' && (activeNode?.data?.agentId && agentDetails && !showAgentList ? agentDetails.name : 'Select Agent')}
                                    {sidebarType === 'TOOL' && 'Add tool'}
                                    {sidebarType === 'TRIGGER' && (!activeNode ? 'Select a trigger' : (activeNode.data?.label || 'Trigger'))}
                                    {sidebarType === 'CONDITION' && 'Condition settings'}
                                    {sidebarType === 'TASK' && 'Select a Task'}
                                    {sidebarType === 'EDGE' && 'Edge settings'}
                                    {sidebarType === 'VERSIONS' && 'Version History'}
                                </h3>
                                <p className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-widest">
                                    {sidebarType === 'AGENT' && (activeNode?.data?.agentId && agentDetails && !showAgentList ? agentDetails.agentType?.replace(/_/g, ' ') : 'Workforce Participant')}
                                    {sidebarType === 'TOOL' && 'Capability Extension'}
                                    {sidebarType === 'TRIGGER' && 'Workflow Entry Point'}
                                    {sidebarType === 'CONDITION' && 'Logic & Branching'}
                                    {sidebarType === 'TASK' && 'Agent Objective'}
                                    {sidebarType === 'EDGE' && 'Communication Protocol'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <ScrollArea className="flex-1">

                    {/* ── AGENT ──────────────────────────────────────────────── */}
                    {sidebarType === 'AGENT' && (
                        <div className="p-4 space-y-4">
                            {activeNode?.data?.agentId ? (
                                isLoadingAgentDetails ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Agent Profile...</span>
                                    </div>
                                ) : agentDetails ? (
                                    <div className="space-y-4">
                                        <AgentProfile
                                            agent={agentDetails as any}
                                            onEdit={() => setShowAgentList(true)}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <Bot className="h-10 w-10 text-zinc-200" />
                                        <span className="text-sm text-zinc-500">Agent not found</span>
                                        <Button variant="outline" size="sm" onClick={() => setShowAgentList(true)}>
                                            Select another agent
                                        </Button>
                                    </div>
                                )
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input placeholder="Search agents..." className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                                        </div>
                                        <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
                                            <SelectTrigger className="w-[140px] h-11 bg-zinc-50 border-zinc-200 focus:bg-white rounded-xl">
                                                <Filter className="h-4 w-4 mr-2 text-zinc-400" />
                                                <SelectValue placeholder="All roles" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Roles</SelectItem>
                                                <SelectItem value="TASK_EXECUTOR">Task Executor</SelectItem>
                                                <SelectItem value="WORKFLOW_MANAGER">Workflow Manager</SelectItem>
                                                <SelectItem value="DATA_ANALYST">Data Analyst</SelectItem>
                                                <SelectItem value="CODE_GENERATOR">Code Generator</SelectItem>
                                                <SelectItem value="CONTENT_CREATOR">Content Creator</SelectItem>
                                                <SelectItem value="GENERAL_ASSISTANT">General Assistant</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {isLoadingAgents ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Scaling Workforce...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {(agents?.items || agents || [])?.map((agent: any) => (
                                                <button key={agent.id} onClick={() => { handleSelect(agent); setShowAgentList(false); }} className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-blue-50/50 group transition-all text-left border border-transparent hover:border-blue-100">
                                                    <Avatar className="h-12 w-12 rounded-xl shadow-sm border border-zinc-200">
                                                        <AvatarImage src={agent.avatar} />
                                                        <AvatarFallback className="bg-zinc-100 text-zinc-600 rounded-xl"><Bot className="h-6 w-6 opacity-40" /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">{agent.name}</div>
                                                        <div className="text-[11px] text-zinc-500 truncate mt-0.5">{agent.description || 'Ready for assignments'}</div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-blue-400 translate-x-0 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── TOOL ───────────────────────────────────────────────── */}
                    {sidebarType === 'TOOL' && (
                        <div className="p-4 space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <Input placeholder="Search tools..." className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-purple-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600"><ShoppingBag className="h-5 w-5" /></div>
                                    <div>
                                        <div className="text-sm font-bold text-purple-900">Browse Marketplace</div>
                                        <div className="text-xs text-purple-600 font-medium">1000+ Tools available</div>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
                            </div>
                            <Button variant="outline" className="w-full h-12 rounded-xl border-zinc-200 text-zinc-600 font-bold gap-2">
                                <Plus className="h-4 w-4" /> Create new tool
                            </Button>
                            {isLoadingTools ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Tools...</span>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(dbTools as any[]).map((tool) => (
                                        <div
                                            key={tool.id}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50/50 group transition-all text-left border border-transparent hover:border-emerald-100"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleSelect({ ...tool, category: tool.category?.replace(/_/g, ' ') })}
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                            >
                                                <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shadow-sm">
                                                    <Wrench className="h-4 w-4 text-emerald-600" />
                                                </div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="text-sm font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors truncate">
                                                        {tool.name}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                                                        <span>{tool.category?.replace(/_/g, ' ')}</span>
                                                        {tool.isComposite && (
                                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 border border-emerald-100">
                                                                Builder
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                            {tool.isComposite && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        window.open(`/dashboard/tools/${tool.id}`, "_blank", "noopener,noreferrer");
                                                    }}
                                                    className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded-md border border-emerald-100 bg-white"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TRIGGER ────────────────────────────────────────────── */}
                    {sidebarType === 'TRIGGER' && (
                        activeNode ? (
                            <div className="p-5">
                                <p className="text-[13px] text-zinc-600 mb-6">All Messages sent from the Run tab, or from Chat.</p>
                                <div className="space-y-1 mb-2">
                                    <div className="text-sm font-bold text-zinc-900">Guide for using workforce</div>
                                    <div className="text-[12px] text-zinc-500">These instructions will be visible on the 'New task' page.</div>
                                </div>
                                <Textarea
                                    className="h-32 resize-none bg-zinc-50 border-zinc-200 outline-none p-3 text-[13px] rounded-xl"
                                    placeholder="Provide instructions for how to use this workforce"
                                    value={activeNode?.data?.instructions || ''}
                                    onChange={(e) => updateNodeData(activeNode.id, { instructions: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="p-4 space-y-1">
                                {triggers.map((trigger) => (
                                    <button key={trigger.id} onClick={() => handleSelect(trigger)} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50/50 group transition-all text-left">
                                        <div className="h-11 w-11 rounded-xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm group-hover:border-orange-200 transition-colors">
                                            <trigger.icon className="h-6 w-6 text-zinc-700 group-hover:text-orange-600 transition-colors" />
                                        </div>
                                        <div className="text-sm font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">{trigger.name}</div>
                                    </button>
                                ))}
                            </div>
                        )
                    )}

                    {/* ── CONDITION ──────────────────────────────────────── */}
                    {sidebarType === 'CONDITION' && (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                                <GitBranch className="h-4 w-4 text-violet-500 flex-shrink-0" />
                                <input
                                    className="flex-1 text-[14px] font-semibold text-zinc-900 bg-transparent outline-none placeholder:text-zinc-300"
                                    placeholder="Untitled condition"
                                    value={activeNode?.data?.label || ''}
                                    onChange={e => activeNode && updateNodeData(activeNode.id, { label: e.target.value })}
                                />
                            </div>
                            {outgoingEdges.length === 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-500 text-[13px]">&#9888;</span>
                                        <span className="text-amber-600 text-[13px] font-semibold">Missing connection</span>
                                    </div>
                                    <p className="text-[13px] text-zinc-600">Connect this to another node to set up your condition.</p>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-zinc-700">LLM Model</label>
                                        <Select value={activeNode?.data?.llmModel || 'claude-opus-4-6'} onValueChange={val => activeNode && updateNodeData(activeNode.id, { llmModel: val })}>
                                            <SelectTrigger className="h-10 text-[13px] bg-white border-violet-400 border-2 rounded-lg">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="claude-opus-4-6" className="text-[13px]">Claude Opus 4.6</SelectItem>
                                                <SelectItem value="claude-sonnet-3-7" className="text-[13px]">Claude Sonnet 3.7</SelectItem>
                                                <SelectItem value="gpt-4o" className="text-[13px]">GPT-4o</SelectItem>
                                                <SelectItem value="gpt-4o-mini" className="text-[13px]">GPT-4o mini</SelectItem>
                                                <SelectItem value="gemini-2-0-flash" className="text-[13px]">Gemini 2.0 Flash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                            {outgoingEdges.map(edge => {
                                const tNode = nodes.find(n => n.id === edge.target);
                                const eCondType: 'llm' | 'rule' = (edge.data as any)?.conditionType ?? 'rule';
                                const eMatchMode: 'all' | 'any' = (edge.data as any)?.conditionMatchMode ?? 'all';
                                const eRules: ConditionRule[] = (edge.data as any)?.conditionRules ?? [];
                                const eLlm: string = (edge.data as any)?.conditionLlmExpression ?? '';
                                const setEC = (patch: Record<string, any>) => updateEdgeData(edge.id, patch);
                                const addER = () => setEC({ conditionRules: [...eRules, { id: `rule-${Date.now()}`, leftVariable: '', leftLabel: '', operator: 'equals' as ConditionOperator, rightValue: '', rightLabel: '' }] });
                                const removeER = (rid: string) => setEC({ conditionRules: eRules.filter(r => r.id !== rid) });
                                const updateER = (rid: string, patch: Partial<ConditionRule>) => setEC({ conditionRules: eRules.map(r => r.id === rid ? { ...r, ...patch } : r) });
                                return (
                                    <div key={edge.id} className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
                                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", nodeTypeBgColor(tNode?.type))}>
                                                <NodeTypeIcon nodeType={tNode?.type} size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[13px] font-semibold text-zinc-800 truncate block">{tNode?.data?.label || 'Unnamed node'}</span>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{nodeTypeLabel(tNode?.type)}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[13px] font-semibold text-zinc-700">Condition type</label>
                                                <Select value={eCondType} onValueChange={val => setEC({ conditionType: val })}>
                                                    <SelectTrigger className="h-10 text-[13px] bg-white border-zinc-200 rounded-lg"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="llm" className="text-[13px]">LLM-based</SelectItem>
                                                        <SelectItem value="rule" className="text-[13px]">Rule-based</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {eCondType === 'llm' && (
                                                <textarea rows={3}
                                                    className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-zinc-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none bg-white placeholder:text-zinc-400 transition-all"
                                                    placeholder="Go down this path if: e.g. the customer meets the requirements"
                                                    value={eLlm} onChange={e => setEC({ conditionLlmExpression: e.target.value })}
                                                />
                                            )}
                                            {eCondType === 'rule' && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-[13px] text-zinc-600">
                                                        <span className="font-medium">Match</span>
                                                        <Select value={eMatchMode} onValueChange={val => setEC({ conditionMatchMode: val })}>
                                                            <SelectTrigger className="h-8 w-[80px] text-[13px] bg-white border-zinc-200 rounded-lg px-2"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all" className="text-[13px]">All</SelectItem>
                                                                <SelectItem value="any" className="text-[13px]">Any</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <span className="font-medium">conditions in this group</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {eRules.map(rule => (
                                                            <ConditionRuleRow key={rule.id} rule={rule} varTree={varTree}
                                                                onUpdate={patch => updateER(rule.id, patch)}
                                                                onRemove={() => removeER(rule.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button onClick={addER} className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 py-1 transition-colors border border-dashed border-zinc-200 rounded-lg px-3 hover:border-zinc-300 hover:bg-zinc-50 w-full justify-center">
                                                        <Plus className="h-3.5 w-3.5" /> Add condition
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}


                    {/* ── EDGE ───────────────────────────────────────────────── */}
                    {sidebarType === 'EDGE' && activeEdge && (() => {
                        const edgeSrcNode = nodes.find(n => n.id === activeEdge.source);
                        const isConditionEdge = edgeSrcNode?.type === 'conditionNode';

                        if (isConditionEdge) {
                            // Condition edge: show compact condition settings
                            const edgeCondType: 'llm' | 'rule' = (activeEdge.data as any)?.conditionType ?? 'rule';
                            const edgeMatchMode: 'all' | 'any' = (activeEdge.data as any)?.conditionMatchMode ?? 'all';
                            const edgeRules: ConditionRule[] = (activeEdge.data as any)?.conditionRules ?? [];
                            const edgeLlm: string = (activeEdge.data as any)?.conditionLlmExpression ?? '';
                            const setEdgeCond = (patch: Record<string, any>) => updateEdgeData(activeEdge.id, patch);
                            const addEdgeRule = () => setEdgeCond({ conditionRules: [...edgeRules, { id: `rule-${Date.now()}`, leftVariable: '', leftLabel: '', operator: 'equals' as ConditionOperator, rightValue: '', rightLabel: '' }] });
                            const removeEdgeRule = (rid: string) => setEdgeCond({ conditionRules: edgeRules.filter(r => r.id !== rid) });
                            const updateEdgeRule = (rid: string, patch: Partial<ConditionRule>) => setEdgeCond({ conditionRules: edgeRules.map(r => r.id === rid ? { ...r, ...patch } : r) });

                            return (
                                <div className="p-5 space-y-5">
                                    {/* Breadcrumb */}
                                    <div className="flex items-center gap-2 text-[13px]">
                                        <div className="flex items-center gap-1.5 text-violet-600 font-semibold">
                                            <GitBranch className="h-4 w-4" />
                                            <span>{edgeSrcNode?.data?.label || 'Condition'}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-zinc-400" />
                                        <div className="flex items-center gap-1.5 text-zinc-700 font-semibold">
                                            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", nodeTypeBgColor(targetNode?.type))}>
                                                <NodeTypeIcon nodeType={targetNode?.type} size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span>{targetNode?.data?.label || nodeTypeLabel(targetNode?.type)}</span>
                                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{nodeTypeLabel(targetNode?.type)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Condition type */}
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-zinc-700">Condition type</label>
                                        <Select value={edgeCondType} onValueChange={val => setEdgeCond({ conditionType: val })}>
                                            <SelectTrigger className="h-10 text-[13px] bg-white border-zinc-200 rounded-lg">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="llm" className="text-[13px]">LLM-based</SelectItem>
                                                <SelectItem value="rule" className="text-[13px]">Rule-based</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {edgeCondType === 'llm' && (
                                        <textarea
                                            rows={3}
                                            className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-zinc-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none bg-white placeholder:text-zinc-400 transition-all"
                                            placeholder="Go down this path if: e.g. the customer meets the requirements"
                                            value={edgeLlm}
                                            onChange={e => setEdgeCond({ conditionLlmExpression: e.target.value })}
                                        />
                                    )}

                                    {edgeCondType === 'rule' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[13px] text-zinc-600">
                                                <span className="font-medium">Match</span>
                                                <Select value={edgeMatchMode} onValueChange={val => setEdgeCond({ conditionMatchMode: val })}>
                                                    <SelectTrigger className="h-8 w-[80px] text-[13px] bg-white border-zinc-200 rounded-lg px-2">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all" className="text-[13px]">All</SelectItem>
                                                        <SelectItem value="any" className="text-[13px]">Any</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <span className="font-medium">conditions in this group</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {edgeRules.map(rule => (
                                                    <ConditionRuleRow
                                                        key={rule.id}
                                                        rule={rule}
                                                        varTree={varTree}
                                                        onUpdate={patch => updateEdgeRule(rule.id, patch)}
                                                        onRemove={() => removeEdgeRule(rule.id)}
                                                    />
                                                ))}
                                            </div>
                                            <button onClick={addEdgeRule} className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 py-1 transition-colors">
                                                <Plus className="h-3.5 w-3.5" /> Add condition
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100"><Bot className="h-5 w-5" /></div>
                                        <span className="text-[11px] font-bold text-zinc-600 truncate w-full text-center px-2">{sourceNode?.data?.label || 'Parent agent'}</span>
                                        <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-tighter">Parent agent</span>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-zinc-300 mx-2" />
                                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100"><Bot className="h-5 w-5" /></div>
                                        <span className="text-[11px] font-bold text-zinc-600 truncate w-full text-center px-2">{targetNode?.data?.label || 'Subagent'}</span>
                                        <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-tighter">Subagent</span>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Default label</label>
                                        <Input value={activeEdge.data?.label || ''} onChange={(e) => updateEdgeData(activeEdge.id, { label: e.target.value })} className="h-11 rounded-xl bg-white border-zinc-200" placeholder="AI connection..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Task behavior</label>
                                        <Select value={activeEdge.data?.taskBehavior || 'CONTINUE_SAME_TASK'} onValueChange={(val) => updateEdgeData(activeEdge.id, { taskBehavior: val })}>
                                            <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CONTINUE_SAME_TASK">Continue same task</SelectItem>
                                                <SelectItem value="NEW_TASK">Create new task</SelectItem>
                                                <SelectItem value="DELEGATE">Delegate and wait</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Connection type</label>
                                        <Select value={activeEdge.data?.connectionType || 'AI_CONNECTION'} onValueChange={(val) => updateEdgeData(activeEdge.id, { connectionType: val })}>
                                            <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AI_CONNECTION">AI connection</SelectItem>
                                                <SelectItem value="DIRECT_HANDOFF">Direct handoff</SelectItem>
                                                <SelectItem value="STATIC_PROMPT">Static prompt</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Prompt</label>
                                        <Textarea placeholder="Describe when and what to send between agents..." value={activeEdge.data?.prompt || ''} onChange={(e) => updateEdgeData(activeEdge.id, { prompt: e.target.value })} className="min-h-[100px] rounded-xl border-zinc-200 resize-none py-3" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Message template</label>
                                        <Select value={activeEdge.data?.messageTemplate || 'FULL_AUTONOMY'} onValueChange={(val) => updateEdgeData(activeEdge.id, { messageTemplate: val })}>
                                            <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FULL_AUTONOMY">Full agent autonomy</SelectItem>
                                                <SelectItem value="STRUCTURED">Structured report</SelectItem>
                                                <SelectItem value="SUMMARY">Brief summary</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Approval mode</label>
                                            <Select value={activeEdge.data?.approvalMode || 'AUTO_RUN'} onValueChange={(val) => updateEdgeData(activeEdge.id, { approvalMode: val })}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="AUTO_RUN">Auto run</SelectItem>
                                                    <SelectItem value="MANUAL">Manual approval</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Max auto-runs</label>
                                            <Input type="text" placeholder="No limit" className="h-11 rounded-xl bg-white border-zinc-200"
                                                value={activeEdge.data?.maxAutoRuns === null ? '' : activeEdge.data?.maxAutoRuns}
                                                onChange={(e) => updateEdgeData(activeEdge.id, { maxAutoRuns: e.target.value === '' ? null : parseInt(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── TASK ───────────────────────────────────────────────── */}
                    {sidebarType === 'TASK' && (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input placeholder="Search tasks..." className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                                </div>
                                <Select value={taskViewMode} onValueChange={(val: any) => setTaskViewMode(val)}>
                                    <SelectTrigger className="w-12 h-11 px-0 flex justify-center bg-zinc-50 border-zinc-200 rounded-xl shadow-sm">
                                        {taskViewMode === 'FLAT' ? <List size={16} className="text-zinc-600" /> : <ListTree size={16} className="text-zinc-600" />}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FLAT"><div className="flex items-center gap-2"><List size={14} /> Flat List</div></SelectItem>
                                        <SelectItem value="HIERARCHICAL"><div className="flex items-center gap-2"><ListTree size={14} /> Hierarchical</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {isLoadingTasks ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fetching Tasks...</span>
                                </div>
                            ) : tasks?.items?.length ? (
                                taskViewMode === 'FLAT' ? (
                                    <div className="space-y-2">
                                        {tasks.items.map((task: any) => (
                                            <button key={task.id} onClick={() => handleSelect(task)} className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-indigo-50/50 group transition-all text-left border border-transparent hover:border-indigo-100">
                                                <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0"><Files size={20} /></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors truncate">{task.title}</div>
                                                    <div className="text-[10px] text-zinc-500 truncate mt-0.5 flex items-center gap-1 font-medium italic">
                                                        {task.workspace?.name && <span>{task.workspace.name}</span>}
                                                        {task.space?.name && <span>/ {task.space.name}</span>}
                                                        {task.list?.name && <span>/ {task.list.name}</span>}
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400 translate-x-0 group-hover:translate-x-1 transition-all shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {taskHierarchy.map((space: any) => (
                                            <div key={space.id} className="mb-2">
                                                <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: space.color || '#818cf8' }} />
                                                    {space.name}
                                                </div>
                                                <div className="space-y-1">
                                                    {space.lists.map((list: any) => (
                                                        <div key={list.id}>
                                                            <div className="flex items-center px-2 py-1.5 text-[11px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-50/50 rounded-lg mb-1">
                                                                <List className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                                                                {list.name}
                                                            </div>
                                                            <div className="space-y-1 ml-2">
                                                                {list.tasks.map((task: any) => (
                                                                    <button key={task.id} onClick={() => handleSelect(task)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50/50 group transition-all text-left border border-transparent hover:border-indigo-100">
                                                                        <div className="h-7 w-7 rounded-lg bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 transition-colors shrink-0 shadow-sm"><Files size={14} /></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-[13px] font-semibold text-zinc-800 group-hover:text-indigo-600 transition-colors truncate">{task.title}</div>
                                                                        </div>
                                                                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all shrink-0" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="space-y-1 ml-2 mt-1">
                                                        {space.rootTasks.map((task: any) => (
                                                            <button key={task.id} onClick={() => handleSelect(task)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50/50 group transition-all text-left border border-transparent hover:border-indigo-100">
                                                                <div className="h-7 w-7 rounded-lg bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 transition-colors shrink-0 shadow-sm"><Files size={14} /></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[13px] font-semibold text-zinc-800 group-hover:text-indigo-600 transition-colors truncate">{task.title}</div>
                                                                </div>
                                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all shrink-0" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
                                    <Files className="h-10 w-10 text-zinc-400 mb-2" />
                                    <span className="text-sm font-semibold text-zinc-600">No tasks connected</span>
                                    <span className="text-xs text-zinc-400 text-center max-w-[250px]">Connect existing tasks from your workspaces here.</span>
                                </div>
                            )}
                        </div>
                    )}

                </ScrollArea>

                {/* ── VERSIONS ───────────────────────────────────────────── */}
                {
                    sidebarType === 'VERSIONS' && (
                        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                            <div className="text-xs font-bold text-zinc-400 mb-2">Published versions</div>
                            {[
                                { id: 1, text: 'Feb 27, 5:52 PM', status: 'Live', user: 'Đạt Nguyễn', initial: 'Đ' },
                                { id: 2, text: 'Feb 27, 5:47 PM', status: null, user: 'Đạt Nguyễn', initial: 'Đ' },
                                { id: 3, text: 'Feb 27, 5:45 PM', status: null, user: 'Đạt Nguyễn', initial: 'Đ' },
                                { id: 4, text: 'Feb 27, 5:42 PM', status: null, user: 'Đạt Nguyễn', initial: 'Đ' },
                                { id: 5, text: 'Feb 26, 9:51 AM', status: null, user: 'Đạt Nguyễn', initial: 'Đ' },
                                { id: 6, text: 'Feb 25, 10:22 PM', status: null, user: 'Đạt Nguyễn', initial: 'Đ' },
                            ].map(version => (
                                <div key={version.id} className="flex items-center justify-between p-3 py-4 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer group">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-bold text-zinc-700">{version.text}</span>
                                            {version.status && (
                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    {version.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                                            <div className="h-4 w-4 rounded-full bg-indigo-500 text-[9px] text-white flex items-center justify-center relative shadow-sm font-bold">
                                                {version.initial}
                                            </div>
                                            {version.user}
                                        </div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded text-zinc-400 transition-all">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                }

                {/* Footer */}
                {
                    (sidebarType === 'CONDITION' || sidebarType === 'EDGE') && (
                        <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 flex-shrink-0">
                            <Button className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-lg transition-all">
                                <Plus className="h-4 w-4 mr-2" />
                                {sidebarType === 'CONDITION' && 'Save Changes'}
                                {sidebarType === 'EDGE' && 'Save Protocol'}
                            </Button>
                        </div>
                    )
                }
            </div >
        </>
    );
}
