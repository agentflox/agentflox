'use client';

import React from 'react';
import { useWorkforceStore } from '../../../../../entities/workforce/hooks/useWorkforceStore';
import { Activity, Brain, CheckSquare, Clock } from 'lucide-react';

export default function SwarmCoordinatorInspector() {
    const { swarmEvents } = useWorkforceStore();

    // Get last 5 relevant orchestration events
    const latestEvents = [...swarmEvents]
        .filter(e => ['CYCLE_STARTED', 'CYCLE_INSPECT', 'CYCLE_COMPLETED', 'SESSION_STARTED', 'CYCLE_IDLE'].includes(e.type))
        .slice(0, 5);

    if (latestEvents.length === 0) return null;

    const currentCycle = latestEvents[0];

    return (
        <div className="flex flex-col gap-3 w-64 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl p-4 ring-1 ring-primary/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Coordinator Brain</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                </div>
            </div>

            <div className="space-y-4">
                {/* Current Action */}
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/40">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mb-1">Current Focus</p>
                    <p className="text-xs font-medium text-foreground leading-tight">
                        {currentCycle?.type === 'CYCLE_STARTED' ? 'Scanning backlog for high-priority units...' :
                            currentCycle?.type === 'CYCLE_INSPECT' ? `Inspecting ${currentCycle.payload.taskCount} candidate tasks...` :
                                currentCycle?.type === 'CYCLE_IDLE' ? `Backoff engaged: Next tick in ${currentCycle.payload.nextTickIn / 1000}s` :
                                    'Awaiting next synchronization tick...'}
                    </p>
                </div>

                {/* Event Audit Mini-Feed */}
                <div className="space-y-2">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Recent Decisions</p>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                        {latestEvents.map((event, i) => (
                            <div key={i} className="flex gap-2 group">
                                <div className="mt-1">
                                    {event.type === 'CYCLE_INSPECT' ? <CheckSquare className="h-2.5 w-2.5 text-blue-500" /> :
                                        event.type === 'CYCLE_IDLE' ? <Clock className="h-2.5 w-2.5 text-yellow-500" /> :
                                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                                        {event.type === 'CYCLE_INSPECT' ? `Analyzed ${event.payload.taskCount} units` :
                                            event.type === 'CYCLE_COMPLETED' ? 'Cycle finalized successfully' :
                                                event.type === 'CYCLE_IDLE' ? 'No actionable tasks found' :
                                                    event.type === 'SESSION_STARTED' ? 'Swarm kernel initialized' : event.type}
                                    </p>
                                    <span className="text-[8px] text-muted-foreground tabular-nums">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[9px] font-bold text-muted-foreground">Cycle T+5s</span>
                <button className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tighter">View Full Trace</button>
            </div>
        </div>
    );
}
