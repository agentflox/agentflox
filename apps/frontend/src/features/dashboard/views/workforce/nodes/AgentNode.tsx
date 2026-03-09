import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, ArrowDown } from 'lucide-react';
import { WorkforceNode } from '../store/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { cn } from '@/lib/utils';

/**
 * GlowHandle — shared bottom connection point for all nodes.
 *
 * Strategy: keep the real <Handle> at its natural ReactFlow position (bottom center),
 * but make it visually transparent. Overlay a purely visual glow dot using an
 * absolutely positioned div inside the node card — this avoids fighting ReactFlow's
 * inline-style positioning system.
 */
export function GlowHandle({ isConnectable }: { isConnectable?: boolean }) {
    const [hovered, setHovered] = useState(false);
    return (
        <>
            {/* Visual-only glow dot — positioned BEHIND the handle */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 pointer-events-none"
                aria-hidden="true"
            >
                {/* Expanding glow ring */}
                <div className={cn(
                    "absolute rounded-full transition-all duration-300 ease-out pointer-events-none",
                    hovered
                        ? "-inset-2.5 bg-violet-400/12 ring-[1.5px] ring-violet-400/30"
                        : "inset-0 bg-transparent"
                )} />
                {/* Dot */}
                <div className={cn(
                    "w-5 h-5 rounded-full border-2 border-white transition-all duration-300 flex items-center justify-center",
                    hovered
                        ? "bg-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.3),0_0_14px_rgba(139,92,246,0.5)]"
                        : "bg-zinc-200"
                )}>
                    {hovered && (
                        <ArrowDown size={10} className="text-white" />
                    )}
                </div>
            </div>

            {/* Real handle — must be on top (z-20) and have pointer-events to handle drag/click */}
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
    return (
        <div className="flex flex-col relative min-w-[220px]">
            <AttachedStickyNote nodeId={id} data={data} />
            <div className={cn(
                "relative bg-white rounded-2xl w-full overflow-hidden group transition-all duration-500 cursor-pointer pointer-events-auto",
                "border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_36px_-12px_rgba(0,0,0,0.08)]",
                "hover:border-indigo-400/50 hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)] hover:-translate-y-1",
                "ring-1 ring-zinc-200/50 hover:ring-indigo-500/10",
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )}>
                <div className="bg-gradient-to-br from-zinc-50/80 to-white px-4 py-3 border-b border-zinc-100 flex items-center justify-between group-hover:from-indigo-50/40 group-hover:to-white transition-all duration-500">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-white transition-colors">
                            <Bot size={14} className="text-indigo-600" />
                        </div>
                        <span className="text-[12px] font-bold text-zinc-900 uppercase tracking-wider">Agent Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <NodeContextMenu nodeId={id} />
                    </div>
                </div>
                <div className="p-4 bg-white pointer-events-auto">
                    <div className="space-y-3">
                        <div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Target Agent</div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-md bg-zinc-100 flex items-center justify-center">
                                    <Bot size={10} className="text-zinc-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="text-[13px] font-semibold text-zinc-700 truncate">
                                        {data?.label || 'Select an agent...'}
                                    </div>
                                    {data?.description && (
                                        <div className="text-[11px] text-zinc-500 truncate mt-1 font-medium">
                                            {data.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target handle — invisible dot on top, kept for connection logic */}
                <Handle
                    type="target"
                    position={Position.Top}
                    isConnectable={isConnectable}
                    className="!opacity-0 !w-5 !h-5 pointer-events-auto"
                />

                {/* Source handle — glowing dot at bottom */}
                <GlowHandle isConnectable={isConnectable} />
            </div>
        </div>
    );
});

AgentNode.displayName = 'AgentNode';
