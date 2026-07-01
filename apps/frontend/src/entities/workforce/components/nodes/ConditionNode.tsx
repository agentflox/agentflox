import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Plus } from 'lucide-react';
import { WorkforceNode } from '../../hooks/useWorkforceStore';
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
    const isEmpty = !data?.conditionGroups?.length && !data?.expression && !data?.conditionCode;

    return (
        <div className="flex flex-col relative" style={{ width: 260 }}>
            <AttachedStickyNote nodeId={id} data={data} />

            <div className={cn(
                "relative bg-white rounded-2xl w-full flex flex-col cursor-pointer pointer-events-auto transition-all duration-200 group",
                isEmpty
                    ? "border border-violet-400 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    : "border border-violet-200 shadow-[0_2px_12px_rgba(139,92,246,0.10)] hover:border-violet-400 hover:shadow-[0_4px_24px_rgba(139,92,246,0.18)] hover:-translate-y-0.5",
                data?.skipped && "opacity-40 grayscale pointer-events-none"
            )} style={{ height: isEmpty ? 88 : 120 }}>

                {isEmpty ? (
                    <>
                        <div className="flex items-center justify-between px-3 pt-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600">
                                    <GitBranch size={12} /> Condition
                                </div>
                                <div className="h-5 w-24 bg-zinc-100 rounded-md" />
                            </div>
                            <NodeContextMenu nodeId={id} />
                        </div>
                        <div className="px-4 mt-auto mb-3 flex items-center gap-2 text-zinc-600">
                            <Plus size={16} className="text-zinc-500" />
                            <span className="text-[15px] text-zinc-600 font-medium">Add condition</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Top row: badge + menu */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600">
                                <GitBranch size={12} />
                                Condition
                            </div>
                            <NodeContextMenu nodeId={id} />
                        </div>

                        {/* Content */}
                        <div className="px-3 pb-3 flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 min-h-0 pr-1">
                                <div className="text-[14px] font-bold text-zinc-900 leading-snug truncate">
                                    {data?.label || 'Untitled condition'}
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-1 italic break-words line-clamp-2">{preview}</div>
                            </div>
                            <div className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mt-2 pt-1 border-t border-violet-50 shrink-0">
                                {mode === 'rule' ? 'Rule-based' : 'Code'}
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

ConditionNode.displayName = 'ConditionNode';
