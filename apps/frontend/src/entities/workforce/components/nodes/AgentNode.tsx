import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, ArrowDown, Crown, Maximize2, Plus, Pencil } from 'lucide-react';
import { WorkforceNode } from '../../hooks/useWorkforceStore';
import { useWorkforceStore } from '../../hooks/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * GlowHandle — shared bottom connection point for all nodes.
 */
export function GlowHandle({ isConnectable }: { isConnectable?: boolean }) {
    const [hovered, setHovered] = useState(false);
    return (
        <>
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 pointer-events-none"
                aria-hidden="true"
            >
                <div className={cn(
                    "absolute rounded-full transition-all duration-300 ease-out pointer-events-none",
                    hovered
                        ? "-inset-2.5 bg-violet-400/12 ring-[1.5px] ring-violet-400/30"
                        : "inset-0 bg-transparent"
                )} />
                <div className={cn(
                    "w-5 h-5 rounded-full border-2 border-white transition-all duration-300 flex items-center justify-center",
                    hovered
                        ? "bg-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.3),0_0_14px_rgba(139,92,246,0.5)]"
                        : "bg-zinc-200"
                )}>
                    {hovered && <ArrowDown size={10} className="text-white" />}
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="z-20 !w-8 !h-8 !border-0 !bg-transparent !opacity-0 cursor-crosshair"
            />
        </>
    );
}

export const AgentNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    const isCoordinator = data?.isCoordinator;
    const isEmpty = !isCoordinator && !data?.agentId;

    return (
        <div className="flex flex-col relative" style={{ width: isCoordinator ? 300 : 260 }}>
            <AttachedStickyNote nodeId={id} data={data} />

            <div className={cn(
                "relative bg-white rounded-2xl w-full flex flex-col pointer-events-auto transition-all duration-200 group",
                isCoordinator ? "cursor-default" : "cursor-pointer",
                isEmpty
                    ? "border border-indigo-400 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    : cn(
                        "border shadow-[0_2px_12px_rgba(0,0,0,0.08)]",
                        isCoordinator
                            ? "border-purple-300 hover:border-purple-400 hover:shadow-[0_4px_24px_rgba(147,51,234,0.16)]"
                            : "border-zinc-200 hover:border-indigo-300 hover:shadow-[0_4px_24px_rgba(79,70,229,0.14)] hover:-translate-y-0.5"
                    ),
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )} style={{ height: isEmpty ? 88 : 140 }}>

                {isEmpty ? (
                    <>
                        <div className="flex items-center justify-between px-3 pt-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-600">
                                    <Bot size={12} /> Agent
                                </div>
                                <div className="h-5 w-24 bg-zinc-100 rounded-md" />
                            </div>
                            <NodeContextMenu nodeId={id} />
                        </div>
                        <div className="px-4 mt-auto mb-3 flex items-center gap-2 text-zinc-600">
                            <Plus size={16} className="text-zinc-500" />
                            <span className="text-[15px] text-zinc-600 font-medium">Add agent</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* ── Top row: badge + actions ── */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-2">
                            {/* Type badge — inside card, pill with soft bg */}
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                                isCoordinator
                                    ? "bg-purple-50 text-purple-600"
                                    : "bg-sky-50 text-sky-600"
                            )}>
                                {isCoordinator ? <Crown size={12} /> : <Bot size={12} />}
                                {isCoordinator ? 'Coordinator' : 'Agent'}
                                {(data?.agentCount ?? 1) > 1 && (
                                    <span className="bg-sky-100 text-sky-700 px-1 rounded-full text-[10px]">×{data.agentCount}</span>
                                )}
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                {data?.agentId && (
                                    <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); useWorkforceStore.getState().setEditNodeModal({ nodeId: id, type: 'agent' }); }}
                                                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">Edit agent</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <NodeContextMenu nodeId={id} />
                            </div>
                        </div>

                        {/* ── Main content: name + description ── */}
                        <div className="px-3 pb-3 flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 pr-1">
                                <div className="text-[14px] font-bold text-zinc-900 leading-snug truncate">
                                    {data?.label || 'Select an agent...'}
                                </div>
                                {data?.description && (
                                    <div className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed line-clamp-2">
                                        {data.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Target handle */}
                <Handle
                    type="target"
                    position={Position.Top}
                    isConnectable={isConnectable}
                    className="!opacity-0 !w-5 !h-5 pointer-events-auto"
                />
                {/* Source glow handle */}
                <GlowHandle isConnectable={isConnectable} />
            </div>
        </div>
    );
});

AgentNode.displayName = 'AgentNode';

