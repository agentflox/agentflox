'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeEntryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string;
    entry?: any | null;
    onSuccess?: () => void;
}

export function TimeEntryModal({
    open,
    onOpenChange,
    taskId,
    entry,
    onSuccess
}: TimeEntryModalProps) {
    const [hours, setHours] = React.useState('0');
    const [minutes, setMinutes] = React.useState('0');
    const [description, setDescription] = React.useState('');
    const [date, setDate] = React.useState<Date>(new Date());
    const [startTime, setStartTime] = React.useState('09:00');
    const [endTime, setEndTime] = React.useState('');

    const utils = trpc.useUtils();

    // Initialize form with entry data if editing
    React.useEffect(() => {
        if (entry) {
            const totalMinutes = Math.floor(entry.duration / 60);
            setHours(Math.floor(totalMinutes / 60).toString());
            setMinutes((totalMinutes % 60).toString());
            setDescription(entry.description || '');
            setDate(new Date(entry.startTime));
            setStartTime(format(new Date(entry.startTime), 'HH:mm'));
            if (entry.endTime) {
                setEndTime(format(new Date(entry.endTime), 'HH:mm'));
            }
        } else {
            // Reset form
            setHours('0');
            setMinutes('0');
            setDescription('');
            setDate(new Date());
            setStartTime('09:00');
            setEndTime('');
        }
    }, [entry, open]);

    const createEntry = trpc.task.timeEntries.create.useMutation({
        onSuccess: () => {
            utils.task.timeEntries.list.invalidate({ taskId });
            utils.task.get.invalidate({ id: taskId });
            toast.success('Time entry added');
            onSuccess?.();
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to add time entry');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const totalSeconds = (parseInt(hours) * 3600) + (parseInt(minutes) * 60);
        
        if (totalSeconds === 0) {
            toast.error('Please enter a duration');
            return;
        }

        // Construct start and end times
        const [startHour, startMin] = startTime.split(':').map(Number);
        const startDateTime = new Date(date);
        startDateTime.setHours(startHour, startMin, 0, 0);

        let endDateTime: Date | undefined;
        if (endTime) {
            const [endHour, endMin] = endTime.split(':').map(Number);
            endDateTime = new Date(date);
            endDateTime.setHours(endHour, endMin, 0, 0);
        }

        createEntry.mutate({
            taskId,
            duration: totalSeconds,
            description: description.trim() || undefined,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime?.toISOString(),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {entry ? 'Edit Time Entry' : 'Add Time Entry'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Duration */}
                    <div className="space-y-2">
                        <Label>Duration</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    placeholder="0"
                                    className="text-center"
                                />
                                <div className="text-xs text-zinc-500 text-center mt-1">
                                    Hours
                                </div>
                            </div>
                            <span className="text-2xl text-zinc-400">:</span>
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    placeholder="0"
                                    className="text-center"
                                />
                                <div className="text-xs text-zinc-500 text-center mt-1">
                                    Minutes
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(newDate) => newDate && setDate(newDate)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time (Optional)</Label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What did you work on?"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createEntry.isLoading}
                        >
                            {entry ? 'Update' : 'Add'} Entry
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
