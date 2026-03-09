import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import { Settings, Cpu } from 'lucide-react';
import { useWorkforceStore } from '../store/useWorkforceStore';
import { cn } from '@/lib/utils';

export default function FlowEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    animated,
    data,
    selected
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 0,
    });

    const { setActiveEdgeId, setSidebarOpen } = useWorkforceStore();

    const onEdgeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveEdgeId(id);
        setSidebarOpen(true, 'EDGE');
    };

    // Only show the "AI connection" label pill when both ends are agentNode
    const isAgentToAgent =
        (data as any)?.sourceNodeType === 'agentNode' &&
        (data as any)?.targetNodeType === 'agentNode';

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: 2,
                    stroke: selected ? '#6366f1' : (animated ? '#818cf8' : '#e2e8f0'),
                    strokeDasharray: animated ? '5,5' : 'none'
                }}
                className={cn(animated && 'animate-[dash_20s_linear_infinite]')}
            />
            {isAgentToAgent && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        <button
                            onClick={onEdgeClick}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white shadow-sm transition-all hover:scale-105 active:scale-95",
                                selected
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-indigo-100"
                                    : "border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:bg-slate-50"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center h-4 w-4 rounded-md",
                                selected ? "bg-indigo-100" : "bg-zinc-100"
                            )}>
                                <Cpu className={cn("h-2.5 w-2.5", selected ? "text-indigo-600" : "text-zinc-500")} />
                            </div>
                            <span className="text-[11px] font-bold whitespace-nowrap">
                                {(data as any)?.label || 'AI connection'}
                            </span>
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
