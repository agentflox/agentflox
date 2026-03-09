import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { WorkforceNode } from '../store/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { GlowHandle } from './AgentNode';
import { cn } from '@/lib/utils';

export const ConditionNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    const firstGroup = data?.conditionGroups?.[0];
    const firstRule = firstGroup?.rules?.[0];
    const preview = firstRule
        ? `${firstRule.leftLabel || firstRule.leftVariable} ${firstRule.operator} "${firstRule.rightValue}"`
        : data?.expression || 'Define a rule...';

    const mode = data?.conditionMode || 'rule';

    return (
        <div className="flex flex-col relative min-w-[220px]">
            <AttachedStickyNote nodeId={id} data={data} />
            <div className={cn(
                "bg-white rounded-2xl w-full overflow-hidden group transition-all duration-500 cursor-pointer pointer-events-auto",
                "border border-purple-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_36px_-12px_rgba(147,51,234,0.1)]",
                "hover:border-purple-400 hover:shadow-[0_20px_60px_-15px_rgba(147,51,234,0.2)] hover:-translate-y-1",
                "ring-1 ring-purple-100",
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )}>
                {/* Header */}
                <div className="bg-gradient-to-br from-purple-50/50 to-white px-4 py-3 border-b border-purple-100 flex items-center justify-between group-hover:from-purple-50 group-hover:to-white transition-all duration-500 pointer-events-auto">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center">
                            <GitBranch size={14} className="text-purple-600" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Condition</div>
                            <div className="text-xs font-semibold text-zinc-700 truncate max-w-[130px]">{data?.label || 'Untitled condition'}</div>
                        </div>
                    </div>
                    <NodeContextMenu nodeId={id} />
                </div>

                {/* Rule preview */}
                <div className="px-4 py-3 bg-white pointer-events-auto">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                        {mode === 'rule' ? 'Rule-based' : 'Code'}
                    </div>
                    <div className="text-[11px] text-zinc-600 truncate italic opacity-80">{preview}</div>
                </div>
            </div>

            {/* Top target handle */}
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!opacity-0 !w-5 !h-5 pointer-events-auto"
            />

            {/* Single centered source handle — same glow as other nodes */}
            <GlowHandle isConnectable={isConnectable} />
        </div>
    );
});

ConditionNode.displayName = 'ConditionNode';
