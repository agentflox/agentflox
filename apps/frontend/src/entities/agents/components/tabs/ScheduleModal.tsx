"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Schedule {
  id?: string;
  repeat: 'daily' | 'weekly' | 'monthly' | 'custom';
  repeatDay?: number; // 0-6 for weekly, 1-31 for monthly
  time: string; // HH:mm format
  startDate: Date;
  instructions?: string;
  isActive: boolean;
}

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (schedule: Omit<Schedule, 'id'>) => void;
  initialSchedule?: Schedule;
  isLoading?: boolean;
}

export function ScheduleModal({
  open,
  onOpenChange,
  onSave,
  initialSchedule,
  isLoading = false,
}: ScheduleModalProps) {
  const [repeat, setRepeat] = useState<Schedule['repeat']>(initialSchedule?.repeat || 'weekly');
  const [repeatDay, setRepeatDay] = useState<number | undefined>(initialSchedule?.repeatDay);
  const [time, setTime] = useState(initialSchedule?.time || '10:00');
  const [startDate, setStartDate] = useState<Date>(initialSchedule?.startDate || new Date());
  const [instructions, setInstructions] = useState(initialSchedule?.instructions || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSave = () => {
    const schedule: Omit<Schedule, 'id'> = {
      repeat,
      repeatDay: repeat === 'weekly' || repeat === 'monthly' ? repeatDay : undefined,
      time,
      startDate,
      instructions: instructions.trim() || undefined,
      isActive: true,
    };
    onSave(schedule);
  };

  const getRepeatText = () => {
    switch (repeat) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${repeatDay !== undefined ? days[repeatDay] : 'Sunday'}`;
      case 'monthly':
        return `Monthly on day ${repeatDay || 1}`;
      case 'custom':
        return 'Custom schedule';
      default:
        return 'Weekly on Sunday';
    }
  };

  const getNextRunDate = () => {
    // Simple calculation for next run
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date(startDate);
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (nextRun < now) {
      if (repeat === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (repeat === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (repeat === 'monthly') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }
    
    return format(nextRun, 'M/d/yyyy');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add schedule</DialogTitle>
          <DialogDescription>
            Configure when your agent should run automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Repeat */}
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={repeat} onValueChange={(value) => setRepeat(value as Schedule['repeat'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day selection for weekly/monthly */}
          {(repeat === 'weekly' || repeat === 'monthly') && (
            <div className="space-y-2">
              <Label>{repeat === 'weekly' ? 'Day of week' : 'Day of month'}</Label>
              {repeat === 'weekly' ? (
                <Select
                  value={repeatDay?.toString()}
                  onValueChange={(value) => setRepeatDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={repeatDay || 1}
                  onChange={(e) => setRepeatDay(parseInt(e.target.value) || 1)}
                />
              )}
            </div>
          )}

          {/* Time */}
          <div className="space-y-2">
            <Label>At</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Starts</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-auto p-0 text-xs"
              >
                Advanced
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
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

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write your instructions here"
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Write instructions here. Type <span className="font-mono">[checkbox]</span> to specify tools or <span className="font-mono">[@]</span> to mention items.
            </p>
          </div>

          {/* Schedule Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">
              {getRepeatText()} at {time} {time.includes('AM') || time.includes('PM') ? '' : (parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM')} (GMT+07:00, Asia/Bangkok)
            </p>
            <p className="text-xs text-muted-foreground">
              Next scheduled run: {getNextRunDate()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-sm py-2 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="text-sm py-2 px-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

