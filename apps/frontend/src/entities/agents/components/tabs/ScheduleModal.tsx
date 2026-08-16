"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addMonths, setHours, setMinutes, isBefore } from "date-fns";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export interface Schedule {
  id?: string;
  repeat: "daily" | "weekly" | "monthly" | "custom";
  repeatDay?: number; // 0-6 for weekly, 1-31 for monthly
  time: string; // HH:mm format
  startDate: Date;
  instructions?: string;
  isActive: boolean;
}

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (schedule: Omit<Schedule, "id">) => void;
  initialSchedule?: Schedule;
  isLoading?: boolean;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function formatTime12h(time: string) {
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getTimezoneLabel(date: Date) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
  return `${offset}, ${tz}`;
}

function toRepeatSelectValue(repeat: Schedule["repeat"], repeatDay?: number) {
  if (repeat === "weekly") {
    const day = repeatDay ?? new Date().getDay();
    return `weekly-${day}`;
  }
  return repeat;
}

function fromRepeatSelectValue(value: string): {
  repeat: Schedule["repeat"];
  repeatDay?: number;
} {
  if (value.startsWith("weekly-")) {
    return { repeat: "weekly", repeatDay: Number(value.split("-")[1]) || 0 };
  }
  return { repeat: value as Schedule["repeat"] };
}

export function ScheduleModal({
  open,
  onOpenChange,
  onSave,
  initialSchedule,
  isLoading = false,
}: ScheduleModalProps) {
  const defaultDay = new Date().getDay();
  const [repeat, setRepeat] = useState<Schedule["repeat"]>(
    initialSchedule?.repeat || "weekly",
  );
  const [repeatDay, setRepeatDay] = useState<number | undefined>(
    initialSchedule?.repeatDay ?? defaultDay,
  );
  const [time, setTime] = useState(initialSchedule?.time || format(new Date(), "HH:mm"));
  const [startDate, setStartDate] = useState<Date>(
    initialSchedule?.startDate || new Date(),
  );
  const [instructions, setInstructions] = useState(initialSchedule?.instructions || "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ends, setEnds] = useState<"never">("never");
  const [monthlyDay, setMonthlyDay] = useState(
    initialSchedule?.repeat === "monthly" ? initialSchedule.repeatDay || 1 : 1,
  );

  useEffect(() => {
    if (!open) return;
    const day = initialSchedule?.repeatDay ?? new Date().getDay();
    setRepeat(initialSchedule?.repeat || "weekly");
    setRepeatDay(initialSchedule?.repeatDay ?? day);
    setTime(initialSchedule?.time || format(new Date(), "HH:mm"));
    setStartDate(initialSchedule?.startDate || new Date());
    setInstructions(initialSchedule?.instructions || "");
    setShowAdvanced(false);
    setEnds("never");
    setMonthlyDay(
      initialSchedule?.repeat === "monthly" ? initialSchedule.repeatDay || 1 : 1,
    );
  }, [open, initialSchedule]);

  const repeatSelectValue = toRepeatSelectValue(repeat, repeatDay);
  const timezoneLabel = getTimezoneLabel(startDate);

  const handleRepeatChange = (value: string) => {
    const next = fromRepeatSelectValue(value);
    setRepeat(next.repeat);
    if (next.repeat === "weekly") setRepeatDay(next.repeatDay);
    if (next.repeat === "monthly") setRepeatDay(monthlyDay);
  };

  const handleSave = () => {
    const schedule: Omit<Schedule, "id"> = {
      repeat,
      repeatDay:
        repeat === "weekly"
          ? repeatDay
          : repeat === "monthly"
            ? monthlyDay
            : undefined,
      time,
      startDate,
      instructions: instructions.trim() || undefined,
      isActive: true,
    };
    onSave(schedule);
  };

  const getRepeatText = () => {
    switch (repeat) {
      case "daily":
        return "Daily";
      case "weekly":
        return `Weekly on ${WEEKDAYS[repeatDay ?? 0]}`;
      case "monthly":
        return `Monthly on day ${monthlyDay}`;
      case "custom":
        return "Custom schedule";
      default:
        return "Weekly on Sunday";
    }
  };

  const nextRunDate = useMemo(() => {
    const [hours, minutes] = time.split(":").map(Number);
    let nextRun = setMinutes(setHours(new Date(startDate), hours || 0), minutes || 0);
    const now = new Date();

    if (isBefore(nextRun, now) || nextRun.getTime() === now.getTime()) {
      if (repeat === "daily") {
        nextRun = addDays(nextRun, 1);
      } else if (repeat === "weekly") {
        nextRun = addDays(nextRun, 7);
      } else if (repeat === "monthly") {
        nextRun = addMonths(nextRun, 1);
      } else {
        nextRun = addDays(nextRun, 1);
      }
    }

    return format(nextRun, "M/d/yyyy");
  }, [startDate, time, repeat]);

  const fieldClass =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-none focus:border-zinc-300 focus:ring-0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[420px] w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl",
          "[&>button]:right-4 [&>button]:top-4 [&>button]:h-8 [&>button]:w-8",
          "[&>button]:rounded-full [&>button]:bg-zinc-100 [&>button]:opacity-100",
          "[&>button]:hover:bg-zinc-200 [&>button]:border-0",
        )}
      >
        <DialogHeader className="px-6 pt-5 pb-3 pr-14 shrink-0">
          <DialogTitle className="text-base font-semibold text-zinc-900">
            {initialSchedule ? "Edit schedule" : "Add schedule"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-5 space-y-4">
          {/* Repeat */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-500">Repeat</Label>
            <Select value={repeatSelectValue} onValueChange={handleRepeatChange}>
              <SelectTrigger className={cn(fieldClass, "justify-between")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                {WEEKDAYS.map((day, index) => (
                  <SelectItem key={day} value={`weekly-${index}`}>
                    Weekly on {day}
                  </SelectItem>
                ))}
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {repeat === "monthly" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-500">Day of month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={monthlyDay}
                onChange={(e) => setMonthlyDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                className={fieldClass}
              />
            </div>
          )}

          {/* At */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-500">At</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cn(fieldClass, "appearance-none")}
            />
          </div>

          {/* Starts */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-500">Starts</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    fieldClass,
                    "flex items-center justify-between text-left cursor-pointer hover:bg-zinc-50",
                  )}
                >
                  <span className="truncate">
                    {format(startDate, "EEEE, MMMM d, yyyy")}
                  </span>
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Advanced: timezone + ends */}
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs font-medium text-zinc-500 underline decoration-dotted underline-offset-4 hover:text-zinc-900 cursor-pointer"
              >
                {showAdvanced ? "Hide advanced" : "Show advanced"}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500">Timezone</Label>
                  <Select value={timezoneLabel} disabled>
                    <SelectTrigger className={cn(fieldClass, "justify-between")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={timezoneLabel}>{timezoneLabel}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500">Ends</Label>
                  <Select value={ends} onValueChange={(v) => setEnds(v as "never")}>
                    <SelectTrigger className={cn(fieldClass, "justify-between")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-500">Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write your instructions here"
              disabled={isLoading}
              className="min-h-[120px] max-h-[220px] rounded-xl border-zinc-200 text-sm resize-y"
            />
            <p className="text-[11px] text-zinc-400 px-0.5">
              Reference tasks, Docs, people to guide your agent
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-zinc-100/90 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-zinc-900 leading-snug">
              {getRepeatText()} at {formatTime12h(time)} ({timezoneLabel})
            </p>
            <p className="text-xs text-zinc-500">
              Next scheduled run: {nextRunDate}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-white px-6 py-4 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-10 min-w-[96px] rounded-xl border-zinc-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isLoading}
            className="h-10 min-w-[96px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
