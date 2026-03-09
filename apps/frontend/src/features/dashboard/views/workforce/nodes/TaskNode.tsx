import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Files } from 'lucide-react';
import { WorkforceNode } from '../store/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { GlowHandle } from './AgentNode';
import { cn } from '@/lib/utils';

export const TaskNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    return (
        <div className="flex flex-col relative min-w-[220px]">
            <AttachedStickyNote nodeId={id} data={data} />
            <div className={cn(
                "bg-white rounded-2xl w-full overflow-hidden group transition-all duration-500 cursor-pointer pointer-events-auto",
                "border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_36px_-12px_rgba(0,0,0,0.08)]",
                "hover:border-indigo-400/50 hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)] hover:-translate-y-1",
                "ring-1 ring-zinc-200/50 hover:ring-indigo-500/10",
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )}>
                <div className="relative z-20 bg-gradient-to-br from-zinc-50/80 to-white px-4 py-3 border-b border-zinc-100 flex items-center justify-between group-hover:from-indigo-50/40 group-hover:to-white transition-all duration-500">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-white transition-colors">
                            <Files size={14} className="text-indigo-600" />
                        </div>
                        <span className="text-[12px] font-bold text-zinc-900 uppercase tracking-wider">Task Node</span>
                    </div>
                    <div className="relative z-30 flex items-center gap-2">
                        <NodeContextMenu nodeId={id} />
                    </div>
                </div>
                <div className="p-4 bg-white pointer-events-auto">
                    <div className="space-y-3">
                        <div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Target Task</div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-md bg-zinc-100 flex items-center justify-center">
                                    <Files size={10} className="text-zinc-400" />
                                </div>
                                <div className="text-[13px] font-semibold text-zinc-700 truncate">
                                    {data?.label || 'Select a task...'}
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-50">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 text-right">Task Status</div>
                            <div className="text-[12px] font-medium text-zinc-600 text-right leading-relaxed flex items-center gap-1 justify-end">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {data?.status || 'Active'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Fold Effect for Task - z-0 so menu stays on top */}
                <div className="absolute top-0 right-0 z-0 w-8 h-8 pointer-events-none overflow-hidden group-hover:w-10 group-hover:h-10 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-full h-full bg-[#fcfcfc] border-l border-b border-zinc-200/80 rounded-bl-xl shadow-[-2px_2px_8px_rgba(0,0,0,0.05)] z-10" />
                    <div className="absolute top-0 right-0 w-0 h-0 border-[16px] group-hover:border-[20px] transition-all duration-300 border-transparent border-t-white border-r-white z-20" />
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

TaskNode.displayName = 'TaskNode';
