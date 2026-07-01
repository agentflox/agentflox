'use client';

import React, { useMemo } from 'react';
import { useWorkforceStore } from '../../../../../entities/workforce/hooks/useWorkforceStore';
import { GanttChartSquare, ChevronUp, ChevronDown, ListCheck } from 'lucide-react';

export default function SwarmTimeline() {
    const { swarmTasks } = useWorkforceStore();
    const [isOpen, setIsOpen] = React.useState(false);

    // Filter tasks that have timing info
    const timelineTasks = useMemo(() => {
        return swarmTasks.filter(t => t.createdAt && (t.completedAt || t.status === 'RUNNING'));
    }, [swarmTasks]);

    if (timelineTasks.length === 0 && !isOpen) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-40 transition-all duration-300 ${isOpen ? 'h-64' : 'h-10'
            }`}>
            {/* Header / Toggle */}
            <div
                className="h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <GanttChartSquare className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Execution Timeline</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground ml-2">
                        {timelineTasks.length} Active Intervals
                    </span>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>

            {/* Timeline Content */}
            {isOpen && (
                <div className="p-4 h-[calc(100%-40px)] overflow-x-auto overflow-y-auto custom-scrollbar">
                    <div className="min-w-[800px] flex flex-col gap-3">
                        {timelineTasks.length > 0 ? (
                            timelineTasks.map((task) => {
                                const start = new Date(task.createdAt).getTime();
                                const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
                                const duration = (end - start) / 1000;

                                return (
                                    <div key={task.id} className="flex items-center gap-4 group">
                                        <div className="w-40 flex-shrink-0">
                                            <p className="text-[11px] font-bold text-foreground truncate">{task.title}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase">{task.status}</p>
                                        </div>
                                        <div className="flex-1 h-6 bg-secondary/20 rounded-md relative overflow-hidden group-hover:bg-secondary/40 transition-colors">
                                            <div
                                                className={`h-full rounded-md flex items-center px-2 transition-all duration-1000 ${task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-600 border border-green-500/30' :
                                                        'bg-primary/20 text-primary border border-primary/30 animate-pulse'
                                                    }`}
                                                style={{
                                                    width: `${Math.min(100, (duration / 300) * 100)}%`, // Scale relative to 5 min
                                                    marginLeft: '0%'
                                                }}
                                            >
                                                <span className="text-[9px] font-bold truncate">
                                                    {duration.toFixed(1)}s
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <ListCheck className="h-8 w-8 mb-2" />
                                <p className="text-xs italic">Awaiting workforce execution data...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
