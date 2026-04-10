import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Wrench, Plus, Pencil } from 'lucide-react';
import { WorkforceNode } from '../store/useWorkforceStore';
import { useWorkforceStore } from '../store/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { GlowHandle } from './AgentNode';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const ToolNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    const isEmpty = !data?.toolId;

    return (
        <div className="flex flex-col relative" style={{ width: 260 }}>
            <AttachedStickyNote nodeId={id} data={data} />

            <div className={cn(
                "relative bg-white rounded-2xl w-full flex flex-col cursor-pointer pointer-events-auto transition-all duration-200 group",
                isEmpty
                    ? "border border-emerald-400 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    : "border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:border-emerald-300 hover:shadow-[0_4px_24px_rgba(16,185,129,0.14)] hover:-translate-y-0.5",
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )} style={{ height: isEmpty ? 88 : 140 }}>

                {isEmpty ? (
                    <>
                        <div className="flex items-center justify-between px-3 pt-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                                    <Wrench size={12} /> Tool
                                </div>
                                <div className="h-5 w-24 bg-zinc-100 rounded-md" />
                            </div>
                            <NodeContextMenu nodeId={id} />
                        </div>
                        <div className="px-4 mt-auto mb-3 flex items-center gap-2 text-zinc-600">
                            <Plus size={16} className="text-zinc-500" />
                            <span className="text-[15px] text-zinc-600 font-medium">Add tool</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Top row: badge + menu */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                                <Wrench size={12} />
                                Tool
                            </div>
                            <div className="flex items-center gap-1">
                                {data?.toolId && (
                                    <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); useWorkforceStore.getState().setEditNodeModal({ nodeId: id, type: 'tool' }); }}
                                                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">Edit tool</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <NodeContextMenu nodeId={id} />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-3 pb-3 flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 pr-1">
                                <div className="text-[14px] font-bold text-zinc-900 leading-snug truncate">
                                    {data?.label || 'Select a tool...'}
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

                <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!opacity-0 !w-5 !h-5 pointer-events-auto" />
                <GlowHandle isConnectable={isConnectable} />
            </div>
        </div>
    );
});

ToolNode.displayName = 'ToolNode';
