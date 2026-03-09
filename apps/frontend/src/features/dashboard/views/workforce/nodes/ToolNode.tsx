import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import { WorkforceNode } from '../store/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { GlowHandle } from './AgentNode';
import { cn } from '@/lib/utils';

export const ToolNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    return (
        <div className="flex flex-col relative min-w-[220px]">
            <AttachedStickyNote nodeId={id} data={data} />
            <div className={cn(
                "bg-white rounded-2xl w-full overflow-hidden group transition-all duration-500 cursor-pointer pointer-events-auto",
                "border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_36px_-12px_rgba(0,0,0,0.08)]",
                "hover:border-emerald-400/50 hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] hover:-translate-y-1",
                "ring-1 ring-zinc-200/50 hover:ring-emerald-500/10",
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )}>
                <div className="bg-gradient-to-br from-zinc-50/80 to-white px-4 py-3 border-b border-zinc-100 flex items-center justify-between group-hover:from-emerald-50/40 group-hover:to-white transition-all duration-500">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-white transition-colors">
                            <Wrench size={14} className="text-emerald-600" />
                        </div>
                        <span className="text-[12px] font-bold text-zinc-900 uppercase tracking-wider">Tool Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <NodeContextMenu nodeId={id} />
                    </div>
                </div>
                <div className="p-4 bg-white pointer-events-auto">
                    <div className="space-y-3">
                        <div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Target Tool</div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-md bg-zinc-100 flex items-center justify-center">
                                    <Wrench size={10} className="text-zinc-400" />
                                </div>
                                <div className="text-[13px] font-semibold text-zinc-700 truncate">
                                    {data?.label || 'Select a tool...'}
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-50">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 text-right">Status</div>
                            <div className="text-[12px] font-medium text-zinc-600 text-right leading-relaxed flex items-center justify-end gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Ready
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!opacity-0 !w-5 !h-5 pointer-events-auto"
            />
            <GlowHandle isConnectable={isConnectable} />
        </div>
    );
});

ToolNode.displayName = 'ToolNode';
