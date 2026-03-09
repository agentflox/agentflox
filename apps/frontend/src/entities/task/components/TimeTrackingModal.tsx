'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
    Clock,
    Play,
    Square,
    ChevronDown,
    Link2,
    List,
    Paperclip,
    Trash2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

/** Parse "3h 20m", "1h", "45m", "90m" etc. to total seconds. */
function parseTimeInput(input: string): number | null {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;
    let totalSeconds = 0;
    const hMatch = trimmed.match(/(\d+)\s*h/);
    const mMatch = trimmed.match(/(\d+)\s*m/);
    if (hMatch) totalSeconds += parseInt(hMatch[1], 10) * 3600;
    if (mMatch) totalSeconds += parseInt(mMatch[1], 10) * 60;
    if (!hMatch && !mMatch && /^\d+$/.test(trimmed)) {
        totalSeconds = parseInt(trimmed, 10) * 60;
    }
    return totalSeconds > 0 ? totalSeconds : null;
}

/** Format seconds to "3h 20m" or "45m". */
function formatDurationShort(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
}

interface TimeTrackingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    workspaceId?: string | null;
    taskTitle?: string;
    totalTrackedSeconds?: number;
}

export function TimeTrackingModal({
    open,
    onOpenChange,
    taskId,
    workspaceId,
    taskTitle,
    totalTrackedSeconds = 0,
}: TimeTrackingModalProps) {
    const [manualTimeInput, setManualTimeInput] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [tagsInput, setTagsInput] = React.useState('');
    const [billable, setBillable] = React.useState(false);
    const [entryDate, setEntryDate] = React.useState<Date>(new Date());
    const [entryStartTime, setEntryStartTime] = React.useState(format(new Date(), 'HH:mm'));
    const [entryEndTime, setEntryEndTime] = React.useState(format(new Date(), 'HH:mm'));
    const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

    const utils = trpc.useUtils();
    const { data: session } = trpc.user.me.useQuery();
    const currentUser = session ? { id: session.id, name: session.name ?? session.email ?? 'You', image: session.image } : null;

    const { data: workspaceData } = trpc.workspace.get.useQuery(
        { id: workspaceId || '' },
        { enabled: !!workspaceId && open }
    );
    const workspaceMembers = React.useMemo(() => {
        const fromWs = (workspaceData?.members ?? []).map((m: { user: { id: string; name: string | null; email: string | null; image: string | null } }) => ({
            id: m.user.id,
            name: m.user.name ?? m.user.email ?? 'Unknown',
            image: m.user.image,
        }));
        if (currentUser && !fromWs.some((m: { id: string }) => m.id === currentUser.id)) {
            return [{ id: currentUser.id, name: currentUser.name, image: currentUser.image }, ...fromWs];
        }
        return fromWs;
    }, [workspaceData, currentUser]);

    const displayUser = React.useMemo(() => {
        const id = selectedUserId ?? currentUser?.id;
        if (id === currentUser?.id) return currentUser;
        return workspaceMembers.find((m) => m.id === id) ?? currentUser;
    }, [selectedUserId, currentUser, workspaceMembers]);

    const { data: timeEntries = [] } = trpc.task.timeEntries.list.useQuery({ taskId }, { enabled: open });
    const { data: runningTimer } = trpc.task.timeEntries.getRunning.useQuery(undefined, {
        enabled: open,
        refetchInterval: 1000,
    });

    const startTimer = trpc.task.timeEntries.start.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.timeEntries.getRunning.invalidate();
            toast.success('Timer started');
        },
    });

    const stopTimer = trpc.task.timeEntries.stop.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.timeEntries.getRunning.invalidate();
            toast.success('Timer stopped');
        },
    });

    const createEntry = trpc.task.timeEntries.create.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            setManualTimeInput('');
            setNotes('');
            setTagsInput('');
            toast.success('Time entry saved');
        },
        onError: (e) => toast.error(e.message || 'Failed to save'),
    });

    const deleteEntry = trpc.task.timeEntries.delete.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Entry deleted');
        },
    });

    const totalTracked = React.useMemo(
        () => timeEntries.reduce((sum, e) => sum + e.duration, 0),
        [timeEntries]
    );
    const totalWithoutSubtask = totalTracked;

    const isTimerRunning = runningTimer?.taskId === taskId;
    const [timerSeconds, setTimerSeconds] = React.useState(0);
    React.useEffect(() => {
        if (runningTimer && runningTimer.taskId === taskId) {
            const interval = setInterval(() => {
                setTimerSeconds(Math.floor((Date.now() - new Date(runningTimer.startTime).getTime()) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimerSeconds(0);
        }
    }, [runningTimer, taskId]);

    const parsedSeconds = React.useMemo(
        () => (manualTimeInput ? parseTimeInput(manualTimeInput) : null),
        [manualTimeInput]
    );
    const canSave = parsedSeconds !== null && parsedSeconds > 0;

    const handleSaveManual = () => {
        if (!canSave || !parsedSeconds) return;
        const [sh, sm] = entryStartTime.split(':').map(Number);
        const startDt = new Date(entryDate);
        startDt.setHours(sh, sm, 0, 0);
        const endDt = new Date(startDt.getTime() + parsedSeconds * 1000);
        createEntry.mutate({
            taskId,
            duration: parsedSeconds,
            description: notes.trim() || undefined,
            startTime: startDt.toISOString(),
            endTime: endDt.toISOString(),
            billable,
            userId: displayUser?.id !== currentUser?.id ? displayUser?.id : undefined,
        });
    };

    const displayTotal = isTimerRunning ? totalTracked + timerSeconds : totalTracked;
    const displayWithout = isTimerRunning ? totalWithoutSubtask + timerSeconds : totalWithoutSubtask;

    const entriesByUser = React.useMemo(() => {
        const map = new Map<string, { user: { id: string; name?: string | null; image?: string | null }; entries: typeof timeEntries }>();
        for (const e of timeEntries) {
            const uid = e.user?.id ?? 'unknown';
            if (!map.has(uid)) {
                map.set(uid, { user: e.user ?? { id: uid }, entries: [] });
            }
            map.get(uid)!.entries.push(e);
        }
        return Array.from(map.entries()).map(([_, v]) => v);
    }, [timeEntries]);

    const expandedUsers = React.useMemo(
        () => entriesByUser.map((g) => g.user.id),
        [entriesByUser]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl"
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">Time Tracking</DialogTitle>

                <div className="p-4 space-y-4">
                    {/* Header: Time on task + total */}
                    <div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-zinc-900">
                                Time on this task
                            </h2>
                            <span className="text-base font-semibold text-zinc-900 tabular-nums">
                                {formatDurationShort(displayTotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-sm text-zinc-500">
                            <span className="flex items-center gap-1.5">
                                <Link2 className="h-3.5 w-3.5" />
                                Without Subtasks
                            </span>
                            <span className="tabular-nums">{formatDurationShort(displayWithout)}</span>
                        </div>
                    </div>

                    {/* Middle section - bordered box */}
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-3 space-y-3">
                        {/* User selector (pill) */}
                        {displayUser && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-full bg-zinc-900 text-white pl-1 pr-2 py-1 text-sm font-medium hover:bg-zinc-800 transition-colors"
                                    >
                                        <Avatar className="h-6 w-6 border border-zinc-700">
                                            <AvatarImage src={displayUser.image ?? undefined} />
                                            <AvatarFallback className="text-[10px] bg-zinc-600 text-white">
                                                {(displayUser.name ?? 'U').substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="max-w-[160px] truncate">{displayUser.name}</span>
                                        <ChevronDown className="h-4 w-4 opacity-80 shrink-0" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-64 p-2">
                                    <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                                        {workspaceMembers.length === 0 && currentUser && (
                                            <button
                                                type="button"
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left"
                                                onClick={() => setSelectedUserId(null)}
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={currentUser.image ?? undefined} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {(currentUser.name ?? 'U').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm truncate">{currentUser.name}</span>
                                            </button>
                                        )}
                                        {workspaceMembers.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 text-left"
                                                onClick={() => setSelectedUserId(m.id)}
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={m.image ?? undefined} />
                                                    <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-600">
                                                        {(m.name ?? 'U').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm truncate">{m.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}

                        <Separator orientation="horizontal" /> 

                        {/* Manual time input + Start timer button */}
                        <div className="flex items-center gap-2">
                            <Input
                                value={manualTimeInput}
                                onChange={(e) => setManualTimeInput(e.target.value)}
                                placeholder="Enter time (ex: 3h 20m) or start timer"
                                className="flex-1 h-11 rounded-md border-zinc-200 bg-white text-sm"
                            />
                            <Button
                                size="icon"
                                variant={isTimerRunning ? 'destructive' : 'default'}
                                className={cn(
                                    'h-9 w-9 rounded-full shrink-0 text-white',
                                    isTimerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-400 hover:bg-zinc-500'
                                )}
                                onClick={() => {
                                    if (isTimerRunning && runningTimer) {
                                        stopTimer.mutate({ id: runningTimer.id });
                                    } else {
                                        startTimer.mutate({
                                            taskId,
                                            description: notes.trim() || undefined,
                                            userId: displayUser?.id !== currentUser?.id ? displayUser?.id : undefined,
                                        });
                                    }
                                }}
                                disabled={startTimer.isLoading || stopTimer.isLoading}
                            >
                                {isTimerRunning ? (
                                    <Square className="h-4 w-4 fill-current" />
                                ) : (
                                    <Play className="h-4 w-4 fill-current ml-0.5" />
                                )}
                            </Button>
                        </div>

                        {/* Date and time range */}
                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" className="hover:underline text-left">
                                        {format(entryDate, 'EEE, MMM d')} {entryStartTime} - {entryEndTime}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3 space-y-3" align="start">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-500">Date</label>
                                        <Calendar
                                            mode="single"
                                            selected={entryDate}
                                            onSelect={(d) => d && setEntryDate(d)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-zinc-500">Start</label>
                                            <Input type="time" value={entryStartTime} onChange={(e) => setEntryStartTime(e.target.value)} className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-zinc-500">End</label>
                                            <Input type="time" value={entryEndTime} onChange={(e) => setEntryEndTime(e.target.value)} className="h-8" />
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Separator orientation="horizontal" /> 

                        {/* Notes */}
                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <List className="h-4 w-4 text-zinc-400 shrink-0" />
                            <span className="text-zinc-500">Notes</span>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes..."
                                className="flex-1 h-8 text-sm border-0 bg-transparent px-0 focus-visible:ring-0"
                            />
                        </div>

                        {/* Add tags */}
                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <Paperclip className="h-4 w-4 text-zinc-400 shrink-0" />
                            <span className="text-zinc-500">Add tags</span>
                            <Input
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="Tags..."
                                className="flex-1 h-8 text-sm border-0 bg-transparent px-0 focus-visible:ring-0"
                            />
                        </div>

                        {/* Billable toggle + Save */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={billable}
                                    onCheckedChange={setBillable}
                                    className="data-[state=unchecked]:bg-zinc-200"
                                />
                                <span className="text-xs text-zinc-500">Billable</span>
                            </div>
                            <Button
                                size="sm"
                                disabled={!canSave || createEntry.isLoading}
                                onClick={handleSaveManual}
                                className="h-8 w-16 text-sm bg-black text-white hover:bg-black/80"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Time Entries list - accordion by user */}
                <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50/50">
                    <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                        Time Entries
                    </h3>
                    <div className="max-h-[220px] overflow-y-auto">
                        {timeEntries.length === 0 && !isTimerRunning && (
                            <p className="text-sm text-zinc-400 py-2">No time entries yet.</p>
                        )}
                        {isTimerRunning && (
                            <div className="flex items-center gap-2 text-sm mb-2 rounded border border-zinc-100 bg-white px-3 py-2">
                                <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={currentUser?.image ?? undefined} />
                                    <AvatarFallback className="text-[10px]">
                                        {(currentUser?.name ?? 'U').substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-green-600 font-medium tabular-nums">
                                    {formatDurationShort(timerSeconds)} (running)
                                </span>
                            </div>
                        )}
                        <Accordion type="multiple" defaultValue={expandedUsers} className="w-full">
                            {entriesByUser.map((group) => (
                                <AccordionItem key={group.user.id} value={group.user.id} className="border-0">
                                    <AccordionTrigger className="py-2 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                        <div className="flex items-center gap-2 flex-1">
                                            <Avatar className="h-6 w-6 shrink-0">
                                                <AvatarImage src={group.user.image ?? undefined} />
                                                <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-600">
                                                    {group.user.name?.substring(0, 2).toUpperCase() ?? 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium truncate">{group.user.name ?? 'Unknown'}</span>
                                            <span className="text-sm text-zinc-500 tabular-nums ml-auto mr-2">
                                                {formatDurationShort(group.entries.reduce((s, e) => s + e.duration, 0))}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-1.5 pl-8 pr-0 pb-2">
                                            {group.entries.map((entry) => (
                                                <div
                                                    key={entry.id}
                                                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-zinc-100 bg-white text-sm"
                                                >
                                                    <span className="text-zinc-600 truncate flex-1 min-w-0">
                                                        {(entry as { startTime?: string; endTime?: string }).startTime && (entry as { endTime?: string }).endTime
                                                            ? `${format(new Date((entry as any).startTime), 'EEE, MMM d, h:mm a')} - ${format(new Date((entry as any).endTime), 'h:mm a')} +07 (UTC+7)`
                                                            : format(new Date((entry as any).startTime ?? (entry as any).createdAt ?? Date.now()), 'EEE, MMM d')}
                                                    </span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="tabular-nums text-zinc-700 font-medium">
                                                            {formatDurationShort(entry.duration)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteEntry.mutate({ id: entry.id })}
                                                            className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600"
                                                            disabled={deleteEntry.isLoading}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
