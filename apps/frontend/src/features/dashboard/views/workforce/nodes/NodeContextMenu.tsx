import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Copy, Files, Repeat, SkipForward, Trash2, User, Wrench, Zap, GitBranch, StickyNote } from 'lucide-react';
import { useWorkforceStore } from '../store/useWorkforceStore';

export function NodeContextMenu({ nodeId }: { nodeId: string }) {
    const { nodes, setNodes, edges, setEdges, addNode, setActiveNodeId, setSidebarOpen, updateNodeData } = useWorkforceStore();
    const node = nodes.find(n => n.id === nodeId);

    // ── Duplicate ─────────────────────────────────────────────────
    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node) return;
        const newNode = {
            ...node,
            id: `${node.type}-${Date.now()}`,
            position: { x: node.position.x + 60, y: node.position.y + 60 },
            data: { ...node.data },
        };
        addNode(newNode as any);
    };

    // ── Copy (to clipboard as JSON) ───────────────────────────────
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node) return;
        try {
            navigator.clipboard.writeText(JSON.stringify(node, null, 2));
        } catch { }
    };

    // ── Skip node (toggle opacity + disabled visual) ───────────────
    const handleSkip = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node) return;
        updateNodeData(nodeId, { skipped: !node.data?.skipped });
    };

    // ── Toggle sticky note ─────────────────────────────────────────
    const handleToggleStickyNote = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node) return;
        updateNodeData(nodeId, { stickyNoteVisible: !node.data?.stickyNoteVisible });
    };

    // ── Replace node ──────────────────────────────────────────────
    const handleReplace = (type: string, label: string) => {
        if (!node) return;
        const newNode = {
            id: `${type}-${Date.now()}`,
            type,
            position: node.position,
            data: { label },
        };
        setNodes([...nodes.filter(n => n.id !== nodeId), newNode as any]);
        setEdges(edges.map(e => ({
            ...e,
            source: e.source === nodeId ? newNode.id : e.source,
            target: e.target === nodeId ? newNode.id : e.target,
        })));
        setActiveNodeId(newNode.id);
        if (type === 'agentNode') setSidebarOpen(true, 'AGENT');
        if (type === 'toolNode') setSidebarOpen(true, 'TOOL');
        if (type === 'eventNode') setSidebarOpen(true, 'TRIGGER');
        if (type === 'conditionNode') setSidebarOpen(true, 'CONDITION');
        if (type === 'taskNode') setSidebarOpen(true, 'TASK');
    };

    // ── Delete ────────────────────────────────────────────────────
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNodes(nodes.filter(n => n.id !== nodeId));
        setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    };

    const isSkipped = node?.data?.skipped;
    const hasStickyNote = node?.data?.stickyNoteVisible;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-all opacity-0 group-hover:opacity-100"
                >
                    <MoreVertical size={14} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={handleDuplicate} disabled={nodeId === 'trigger-1'}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                    <Files className="mr-2 h-4 w-4" />
                    <span>Copy</span>
                </DropdownMenuItem>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={nodeId === 'trigger-1'}>
                        <Repeat className="mr-2 h-4 w-4" />
                        <span>Replace node</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44">
                        <DropdownMenuItem onClick={() => handleReplace('agentNode', 'New Agent')}>
                            <User className="mr-2 h-4 w-4 text-blue-500" /><span>Agent</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReplace('conditionNode', 'New Condition')}>
                            <GitBranch className="mr-2 h-4 w-4 text-purple-500" /><span>Condition</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReplace('eventNode', 'New Trigger')}>
                            <Zap className="mr-2 h-4 w-4 text-orange-500" /><span>Trigger</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReplace('toolNode', 'New Tool')}>
                            <Wrench className="mr-2 h-4 w-4 text-emerald-500" /><span>Tool</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReplace('taskNode', 'New Task')}>
                            <Files className="mr-2 h-4 w-4 text-indigo-500" /><span>Task</span>
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleSkip}>
                    <SkipForward className="mr-2 h-4 w-4" />
                    <span>{isSkipped ? 'Unskip node' : 'Skip node'}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleToggleStickyNote}>
                    <StickyNote className="mr-2 h-4 w-4" />
                    <span>{hasStickyNote ? 'Hide Sticky Note' : 'Show Sticky Note'}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleDelete} disabled={nodeId === 'trigger-1'} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
