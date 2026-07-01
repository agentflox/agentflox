import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { MessageSquare, Zap, Globe, Slack, Mail, Calendar, Hash, Clock, Plus } from 'lucide-react';
import { WorkforceNode } from '../../hooks/useWorkforceStore';
import { NodeContextMenu } from './NodeContextMenu';
import { AttachedStickyNote } from './AttachedStickyNote';
import { GlowHandle } from './AgentNode';
import { cn } from '@/lib/utils';

const TRIGGER_ICONS: Record<string, React.ElementType> = {
    slack: Slack,
    outlook: Mail,
    gmail: Mail,
    calendar: Calendar,
    teams: Calendar,
    salesforce: Globe,
    hubspot: Hash,
    webhook: Globe,
    schedule: Clock,
};

export const EventNode = memo(({ id, data, isConnectable }: NodeProps<WorkforceNode>) => {
    const isDefaultTrigger = id === 'trigger-1' || data?.label === 'User message received';
    const hasIntegration = !!data?.triggerType && data?.triggerType !== 'user_message';
    const isNewTrigger = !isDefaultTrigger && !hasIntegration;

    const triggerType = data?.triggerType as string | undefined;
    const Icon = triggerType && TRIGGER_ICONS[triggerType] ? TRIGGER_ICONS[triggerType] : Zap;

    return (
        <div className="flex flex-col relative" style={{ width: 260 }}>
            <AttachedStickyNote nodeId={id} data={data} />

            {/* Floating Top Badge */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 px-4 h-8 bg-[#fffcf5] text-amber-600 text-[11px] font-semibold border-t border-l border-r border-amber-100/60 rounded-t-[12px] z-0" style={{ paddingBottom: '4px' }}>
                <Zap size={11.5} className="text-amber-500" />
                <span>Trigger</span>
            </div>

            {isNewTrigger ? (
                // Add Trigger Variant
                <div className={cn(
                    "relative z-10 w-full flex items-center gap-2.5 px-4 h-[44px] bg-white rounded-xl cursor-pointer pointer-events-auto transition-all duration-200 group",
                    "border border-indigo-400 shadow-sm",
                    "hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5",
                    data?.skipped && "opacity-40 grayscale pointer-events-none"
                )}>
                    <Plus size={15} className="text-zinc-500" />
                    <span className="text-[13.5px] font-medium text-zinc-600">Add trigger</span>
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20"><NodeContextMenu nodeId={id} /></div>
                    <GlowHandle isConnectable={isConnectable} />
                </div>
            ) : isDefaultTrigger ? (
                // User Message Received Variant
                <div className={cn(
                    "relative z-10 w-full flex items-center gap-3 px-3.5 h-[52px] bg-white rounded-xl cursor-pointer pointer-events-auto transition-all duration-200 group",
                    "border border-zinc-200 shadow-sm",
                    "hover:border-orange-300 hover:shadow-[0_4px_16px_rgba(249,115,22,0.12)] hover:-translate-y-0.5",
                    data?.skipped && "opacity-40 grayscale pointer-events-none"
                )}>
                    <div className="flex items-center justify-center text-slate-600">
                        <MessageSquare size={18} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold text-slate-900 leading-tight truncate">
                            {data?.label || 'User message received'}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">From the Run tab or from Chat</div>
                    </div>
                    <GlowHandle isConnectable={isConnectable} />
                </div>
            ) : (
                // Integration Variant
                <div className={cn(
                    "relative z-10 w-full flex items-center gap-3 px-3.5 h-[52px] bg-white rounded-xl cursor-pointer pointer-events-auto transition-all duration-200 group",
                    "border border-emerald-200 shadow-sm",
                    "hover:border-emerald-300 hover:shadow-[0_4px_16px_rgba(16,185,129,0.12)] hover:-translate-y-0.5",
                    data?.skipped && "opacity-40 grayscale pointer-events-none"
                )}>
                    <div className="flex items-center justify-center h-8 w-8 text-orange-600 bg-orange-50 rounded-lg">
                        <Icon size={16} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold text-slate-900 leading-tight truncate">
                            {data?.label || 'Integration Trigger'}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">Event received</div>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20"><NodeContextMenu nodeId={id} /></div>
                    <GlowHandle isConnectable={isConnectable} />
                </div>
            )}
        </div>
    );
});

EventNode.displayName = 'EventNode';
