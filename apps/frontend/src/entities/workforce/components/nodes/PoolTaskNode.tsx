'use client';
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Files } from 'lucide-react';
import { WorkforceNode } from '../../hooks/useWorkforceStore';

export const PoolTaskNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    return (
        <div className="relative" style={{ width: 380 }}>
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!opacity-0 !w-5 !h-5 pointer-events-auto"
            />
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(99,102,241,0.2)] hover:shadow-[0_8px_30px_-8px_rgba(99,102,241,0.35)] hover:border-indigo-300 transition-all duration-300">
                {/* Header stripe */}
                <div className="px-4 py-3 flex items-center gap-3 border-b border-indigo-100/80 bg-indigo-500/[0.06]">
                    <div className="h-8 w-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                        <Files size={15} className="text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">Task Pool</div>
                        <div className="text-[10px] text-indigo-500 font-medium mt-0.5">Shared tasks across all agents</div>
                    </div>
                    <div className="ml-auto">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            {data?.taskCount ?? 0} tasks
                        </span>
                    </div>
                </div>
                {/* Body */}
                <div className="px-4 py-3">
                    <div className="text-[11px] text-indigo-600/70 font-medium">
                        Click to manage tasks in the config panel
                    </div>
                </div>
            </div>
        </div>
    );
});

PoolTaskNode.displayName = 'PoolTaskNode';
