"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Clock, History, Sunrise, Calendar as CalendarIcon, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, addHours, addDays, startOfTomorrow, nextMonday, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";

interface RemindMePopoverProps {
    children: React.ReactNode;
    taskId: string;
}

export function RemindMePopover({ children, taskId }: RemindMePopoverProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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
        toast.success(`Reminder set for ${format(reminderDate, "PPP p")}`);
        setOpen(false);
    };

    const quickOptions = [
        {
            label: "In 20 minutes",
            detail: format(addMinutes(new Date(), 20), "h:mm a"),
            icon: History,
            action: () => handleSetReminder(addMinutes(new Date(), 20))
        },
        {
            label: "In 2 hours",
            detail: format(addHours(new Date(), 2), "h:mm a"),
            icon: Clock,
            action: () => handleSetReminder(addHours(new Date(), 2))
        },
        {
            label: "Tomorrow",
            detail: format(addHours(startOfTomorrow(), 8), "EEE, h:mm a"),
            icon: Sunrise,
            action: () => handleSetReminder(addHours(startOfTomorrow(), 8)) // 8am tomorrow
        },
        {
            label: "In 2 days",
            detail: format(addHours(addDays(startOfTomorrow(), 1), 8), "EEE, h:mm a"),
            icon: Clock,
            action: () => handleSetReminder(addHours(addDays(startOfTomorrow(), 1), 8)) // 8am in 2 days
        },
        {
            label: "Next week",
            detail: format(addHours(nextMonday(new Date()), 8), "EEE, h:mm a"),
            icon: CalendarIcon,
            action: () => handleSetReminder(addHours(nextMonday(new Date()), 8)) // 8am next monday
        },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className={cn(
                    "w-[336px] p-0 rounded-2xl border border-black/[0.06]",
                    "shadow-[0_1px_2px_rgba(15,15,15,0.04),0_12px_28px_-6px_rgba(15,15,15,0.14),0_0_0_1px_rgba(15,15,15,0.02)]",
                    "bg-white overflow-hidden"
                )}
                align="start"
                side="right"
            >
                {/* Search input */}
                <div className="p-2 border-b border-zinc-100">
                    <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
                        <Search className="h-4 w-4 shrink-0 text-zinc-400 mr-2" />
                        <Input
                            variant="ghost"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder='Try "Tomorrow at 2 PM"…'
                            className="h-full w-full bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-sm shadow-none border-0 placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Quick options */}
                <div className="px-1.5 pb-1.5">
                    {quickOptions.map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={opt.action}
                            className={cn(
                                "group flex w-full items-center justify-between rounded-lg px-2.5 py-[7px] cursor-pointer",
                                "transition-colors duration-100",
                                "hover:bg-zinc-100/70 active:bg-zinc-100",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100/80 text-zinc-500 group-hover:bg-white group-hover:text-zinc-700 group-hover:shadow-sm transition-all">
                                    <opt.icon className="h-3.5 w-3.5" strokeWidth={2} />
                                </span>
                                <span className="text-[13.5px] font-normal text-zinc-900 tracking-[-0.01em]">
                                    {opt.label}
                                </span>
                            </div>
                            <span className="text-[12px] tabular-nums text-zinc-400 group-hover:text-zinc-500 transition-colors">
                                {opt.detail}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Divider with label */}
                <div className="relative border-t mt-2 border-zinc-100">
                    <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[10.5px] font-medium uppercase tracking-wider text-zinc-400">
                        Or pick a date
                    </span>
                </div>

                <div className="p-2 pt-3 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                            setDate(d);
                            if (d) {
                                // Default to 8 AM when picking a calendar date
                                handleSetReminder(addHours(d, 8));
                            }
                        }}
                        className={cn(
                            "rounded-lg p-0 w-full",
                            "[&_.rdp-caption_label]:text-[13.5px] [&_.rdp-caption_label]:font-semibold",
                            "[&_.rdp-head_cell]:text-[11px] [&_.rdp-head_cell]:font-medium [&_.rdp-head_cell]:text-zinc-400",
                            "[&_.rdp-day]:text-[13px] [&_.rdp-day]:font-normal [&_.rdp-day]:rounded-full [&_.rdp-day]:cursor-pointer",
                            "[&_.rdp-nav_button]:cursor-pointer",
                            "[&_.rdp-day_selected]:bg-red-500 [&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:font-semibold",
                            "[&_.rdp-day:hover]:bg-zinc-100"
                        )}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}