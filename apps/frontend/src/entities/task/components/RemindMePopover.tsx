"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Clock, ChevronRight, Calendar as CalendarIcon, Sun, Moon, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addHours, addDays, startOfTomorrow, nextMonday } from "date-fns";

interface RemindMePopoverProps {
    children: React.ReactNode;
    taskId: string;
}

export function RemindMePopover({ children, taskId }: RemindMePopoverProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [open, setOpen] = useState(false);

    // Mock mutation - in reality would use a reminder endpoint
    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => {
            toast.success("Reminder set");
            setOpen(false);
        },
        onError: () => toast.error("Failed to set reminder")
    });

    const handleSetReminder = (reminderDate: Date) => {
        // Simulation, as we don't have a direct reminder field in the schema yet for "inbox reminders"
        // It might be stored in `TaskWatcher` or a new `TaskReminder` model.
        // For now, we'll pretend it updates the task or notifies backend.
        toast.success(`Reminder set for ${format(reminderDate, "PPP p")}`);
        setOpen(false);
    };

    const quickOptions = [
        {
            label: "Later",
            detail: "in 2 hours",
            icon: Clock,
            action: () => handleSetReminder(addHours(new Date(), 2))
        },
        {
            label: "Tomorrow",
            detail: format(startOfTomorrow(), "EEE, h:mm a"),
            icon: Sun,
            action: () => handleSetReminder(addHours(startOfTomorrow(), 9)) // 9am tomorrow
        },
        {
            label: "Next week",
            detail: format(nextMonday(new Date()), "EEE, h:mm a"),
            icon: CalendarDays,
            action: () => handleSetReminder(addHours(nextMonday(new Date()), 9)) // 9am next monday
        },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="right">
                <div className="p-2 space-y-1 border-b">
                    <div className="relative">
                        <input
                            className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            placeholder="Try &quot;Tomorrow at 2 PM&quot;..."
                        />
                    </div>
                </div>

                <div className="p-1">
                    {quickOptions.map((opt, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 rounded-sm cursor-pointer group"
                            onClick={opt.action}
                        >
                            <div className="flex items-center gap-2">
                                <opt.icon className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm font-medium text-zinc-700">{opt.label}</span>
                            </div>
                            <span className="text-xs text-zinc-400 group-hover:text-zinc-500">{opt.detail}</span>
                        </div>
                    ))}
                </div>

                <div className="p-2 border-t">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border shadow-sm mx-auto"
                    // Simplistic calendar integration, could be sophisticated date-time picker
                    />
                    <div className="mt-2 flex justify-end">
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => date && handleSetReminder(date)}
                        >
                            Set Reminder
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
