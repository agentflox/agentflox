'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter, Clock, CheckCircle2, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { useWorkforceStore } from '../../../../../entities/workforce/hooks/useWorkforceStore';
import { toast } from 'sonner';
import { fetchAuthToken } from '@/utils/backend-request';
import { BACKEND_URL } from '@/hooks/useSSEStream';

export default function SwarmBacklog() {
    const { swarmSessionId, swarmTasks, setSwarmTasks, backlogFilters, setBacklogFilters } = useWorkforceStore();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const token = await fetchAuthToken();
            const url = new URL(`${BACKEND_URL}/v1/workforces/swarm/tasks`);
            url.searchParams.set('status', 'PENDING,OPEN,IN_PROGRESS');
            if (swarmSessionId) {
                url.searchParams.set('sessionId', swarmSessionId);
            }

            const resp = await fetch(url.toString(), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error('Failed to fetch backlog');
            const data = await resp.json();
            setSwarmTasks(data.tasks);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Clock className="h-3 w-3 text-muted-foreground" />;
            case 'IN_PROGRESS': return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
            case 'COMPLETED': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
            case 'FAILED': return <AlertCircle className="h-3 w-3 text-red-500" />;
            default: return <PlayCircle className="h-3 w-3 text-yellow-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-600 border-red-500/20';
            case 'HIGH': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            case 'LOW': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            default: return 'bg-secondary/50 text-muted-foreground border-border';
        }
    };

    const filteredTasks = swarmTasks.filter(t => {
        const matchesSearch = !backlogFilters.search ||
            t.title.toLowerCase().includes(backlogFilters.search.toLowerCase()) ||
            t.description?.toLowerCase().includes(backlogFilters.search.toLowerCase());

        const matchesStatus = backlogFilters.status.length === 0 ||
            backlogFilters.status.includes(t.status);

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full bg-background/40 border-r border-border">
            <div className="p-4 border-b border-border bg-background/60 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Swarm Backlog</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {filteredTasks.length} Units
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={backlogFilters.search}
                            onChange={(e) => setBacklogFilters({ search: e.target.value })}
                            className="w-full bg-secondary/30 border-border/50 rounded-lg pl-8 p-2 text-xs focus:ring-1 focus:ring-primary/30 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            className="p-3 bg-background border border-border/60 rounded-xl hover:border-primary/40 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                        {task.priority || 'NORMAL'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium">#{task.id.slice(0, 4)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded">
                                    {getStatusIcon(task.status)}
                                    {task.status}
                                </div>
                            </div>

                            <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-relaxed truncate">
                                {task.title}
                            </h3>

                            {task.description && (
                                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                    {task.description}
                                </p>
                            )}

                            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-[10px] font-bold text-primary hover:underline">View Details</button>
                                <button className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Re-Prioritize</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 grayscale">
                        <Filter className="h-10 w-10 mb-3" />
                        <p className="text-xs font-medium italic">Backlog Empty</p>
                    </div>
                )}
            </div>

            <div className="p-3 bg-background/60 border-t border-border">
                <button className="w-full py-2 bg-primary/5 hover:bg-primary/10 text-primary text-[11px] font-bold rounded-lg border border-primary/20 transition-all uppercase tracking-wider">
                    + Insert Work Packet
                </button>
            </div>
        </div>
    );
}
