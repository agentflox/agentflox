'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Clock, Play, Pause, Plus, Trash2, Edit2, 
    Timer, MoreHorizontal 
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { TimeEntryModal } from './TimeEntryModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface TimeTrackingSectionProps {
    taskId: string;
    timeEstimate?: number | null; // in minutes
}

export function TimeTrackingSection({ taskId, timeEstimate }: TimeTrackingSectionProps) {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingEntry, setEditingEntry] = React.useState<any>(null);
    const [timerSeconds, setTimerSeconds] = React.useState(0);

    const utils = trpc.useUtils();

    // Fetch time entries
    const { data: timeEntries = [] } = trpc.task.timeEntries.list.useQuery({ taskId });
    
    // Get running timer
    const { data: runningTimer } = trpc.task.timeEntries.getRunning.useQuery(undefined, {
        refetchInterval: 1000, // Update every second
    });

    // Mutations
    const startTimer = trpc.task.timeEntries.start.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.timeEntries.getRunning.invalidate();
            toast.success('Timer started');
        }
    });

    const stopTimer = trpc.task.timeEntries.stop.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.timeEntries.getRunning.invalidate();
            toast.success('Timer stopped');
        }
    });

    const deleteEntry = trpc.task.timeEntries.delete.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            toast.success('Time entry deleted');
        }
    });

    // Calculate total tracked time
    const totalTracked = React.useMemo(() => {
        return timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    }, [timeEntries]);

    // Update timer display
    React.useEffect(() => {
        if (runningTimer && runningTimer.taskId === taskId) {
            const interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - new Date(runningTimer.startTime).getTime()) / 1000);
                setTimerSeconds(elapsed);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimerSeconds(0);
        }
    }, [runningTimer, taskId]);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    const isTimerRunning = runningTimer && runningTimer.taskId === taskId;
    const progressPercentage = timeEstimate ? Math.min((totalTracked / (timeEstimate * 60)) * 100, 100) : 0;

    return (
        <div className="space-y-4">
            {/* Header with Timer Control */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-900">Time Tracking</span>
                </div>

                <div className="flex items-center gap-2">
                    {isTimerRunning && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 font-mono">
                            <Clock className="h-3 w-3 mr-1 animate-pulse" />
                            {formatDuration(timerSeconds)}
                        </Badge>
                    )}
                    
                    {isTimerRunning ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => stopTimer.mutate({ id: runningTimer.id })}
                            disabled={stopTimer.isLoading}
                        >
                            <Pause className="h-3.5 w-3.5" />
                            Stop
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => startTimer.mutate({ taskId })}
                            disabled={startTimer.isLoading}
                        >
                            <Play className="h-3.5 w-3.5" />
                            Start
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5"
                        onClick={() => {
                            setEditingEntry(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                    </Button>
                </div>
            </div>

            {/* Time Summary */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="text-xs text-zinc-500">Tracked</div>
                            <div className="text-lg font-semibold text-zinc-900">
                                {formatTime(totalTracked)}
                            </div>
                        </div>
                        {timeEstimate && (
                            <>
                                <div className="h-8 w-px bg-zinc-300" />
                                <div>
                                    <div className="text-xs text-zinc-500">Estimate</div>
                                    <div className="text-lg font-semibold text-zinc-700">
                                        {formatTime(timeEstimate * 60)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {timeEstimate && (
                        <div className="text-xs font-medium text-zinc-600">
                            {progressPercentage.toFixed(0)}%
                        </div>
                    )}
                </div>
                {timeEstimate && (
                    <Progress 
                        value={progressPercentage} 
                        className={cn(
                            "h-2",
                            progressPercentage > 100 && "bg-red-100"
                        )}
                    />
                )}
            </div>

            {/* Time Entries List */}
            {timeEntries.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Time Entries ({timeEntries.length})
                    </div>
                    <div className="space-y-1">
                        {timeEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-50 group"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-zinc-900">
                                                {formatDuration(entry.duration)}
                                            </span>
                                            {entry.isRunning && (
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] h-4">
                                                    Running
                                                </Badge>
                                            )}
                                        </div>
                                        {entry.description && (
                                            <div className="text-xs text-zinc-500 truncate">
                                                {entry.description}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-zinc-400">
                                            {new Date(entry.startTime).toLocaleDateString()} • {entry.user.name}
                                        </div>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEditingEntry(entry);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <Edit2 className="h-3.5 w-3.5 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => deleteEntry.mutate({ id: entry.id })}
                                            className="text-red-600 focus:text-red-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Time Entry Modal */}
            <TimeEntryModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                taskId={taskId}
                entry={editingEntry}
                onSuccess={() => {
                    setIsModalOpen(false);
                    setEditingEntry(null);
                }}
            />
        </div>
    );
}
