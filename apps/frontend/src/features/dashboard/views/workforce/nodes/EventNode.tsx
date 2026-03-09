import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';
import { WorkforceNode } from '../store/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { GlowHandle } from './AgentNode';
import { cn } from '@/lib/utils';

export const EventNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    return (
        <div className="flex flex-col relative min-w-[220px]">
            <AttachedStickyNote nodeId={id} data={data} />
            <div className={cn("relative", data?.skipped && "opacity-40 grayscale pointer-events-none")}>
                {/* Main Content */}
                <div className={cn(
                    "bg-white rounded-[20px] px-6 py-6 flex items-center gap-4 group transition-all duration-500 cursor-pointer pointer-events-auto",
                    "border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_36px_-12px_rgba(0,0,0,0.08)]",
                    "hover:border-zinc-400 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1",
                    "ring-1 ring-zinc-200/50"
                )}>
                    <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-100 transition-colors">
                        <MessageCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-0.5">Trigger Event</div>
                        <div className="text-[15px] font-bold text-zinc-900 leading-tight">{data?.label || 'User message received'}</div>
                    </div>
                    <NodeContextMenu nodeId={id} />
                </div>
            </div>

            {/* Glowing source handle at bottom */}
            <GlowHandle isConnectable={isConnectable} />
        </div>
    );
});

EventNode.displayName = 'EventNode';
