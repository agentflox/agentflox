"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, AtSign, MessageSquare, UserPlus, Calendar, X, GripVertical } from 'lucide-react';
import { ScheduleModal, Schedule } from './ScheduleModal';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TriggersTabProps {
  agentId: string;
  triggers: Array<{
    id: string;
    triggerType: string;
    triggerConfig?: any;
    name?: string | null;
    description?: string | null;
    isActive: boolean;
    priority: number;
    tags?: string[];
  }>;
  schedules: Array<{
    id: string;
    name?: string | null;
    description?: string | null;
    repeatTime: string;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    timezone: string;
    instructions?: string | null;
    isActive: boolean;
    priority: number;
  }>;
  isReconfiguring: boolean;
  onUpdate?: () => void;
}

export function TriggersTab({ 
  agentId, 
  triggers = [],
  schedules = [],
  isReconfiguring,
  onUpdate 
}: TriggersTabProps) {
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Convert database schedules to Schedule format for the modal
  const dbSchedulesToSchedule = (dbSchedules: typeof schedules): Schedule[] => {
    return dbSchedules.map(s => ({
      id: s.id,
      repeat: s.repeatTime.includes('daily') ? 'daily' : 
              s.repeatTime.includes('weekly') ? 'weekly' :
              s.repeatTime.includes('monthly') ? 'monthly' : 'custom',
      repeatDay: s.repeatTime.includes('day') ? parseInt(s.repeatTime.match(/\d+/)?.[0] || '0') : undefined,
      time: s.startTime ? format(new Date(s.startTime), 'HH:mm') : '09:00',
      instructions: s.instructions || undefined,
      isActive: s.isActive,
    }));
  };

  // Get manual triggers (MENTION, DIRECT_MESSAGE, ASSIGN_TASK)
  const manualTriggers = {
    mention: triggers.find(t => t.triggerType === 'MENTION')?.isActive ?? false,
    directMessage: triggers.find(t => t.triggerType === 'DIRECT_MESSAGE')?.isActive ?? false,
    assignTask: triggers.find(t => t.triggerType === 'ASSIGN_TASK')?.isActive ?? false,
  };

  const manualTriggerIds = {
    mention: triggers.find(t => t.triggerType === 'MENTION')?.id,
    directMessage: triggers.find(t => t.triggerType === 'DIRECT_MESSAGE')?.id,
    assignTask: triggers.find(t => t.triggerType === 'ASSIGN_TASK')?.id,
  };

  // Note: We'll need to create mutations for trigger/tool/schedule management
  // For now, showing a placeholder message
  const handleManualTriggerToggle = async (key: keyof typeof manualTriggers) => {
    toast.info('Trigger update functionality coming soon. Please use the API to update triggers.');
    // TODO: Implement trigger update mutation
  };

  const handleScheduleSave = async (schedule: Omit<Schedule, 'id'>) => {
    toast.info('Schedule update functionality coming soon. Please use the API to update schedules.');
    // TODO: Implement schedule create/update mutation
  };

  const handleScheduleToggle = async (scheduleId: string) => {
    toast.info('Schedule update functionality coming soon. Please use the API to update schedules.');
    // TODO: Implement schedule toggle mutation
  };

  const handleScheduleDelete = async (scheduleId: string) => {
    toast.info('Schedule delete functionality coming soon. Please use the API to delete schedules.');
    // TODO: Implement schedule delete mutation
  };

  const getRepeatText = (schedule: typeof schedules[0]) => {
    const repeatTime = schedule.repeatTime.toLowerCase();
    if (repeatTime.includes('daily')) {
      return 'Daily';
    } else if (repeatTime.includes('weekly')) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayMatch = repeatTime.match(/day\s*(\d+)/);
      const dayIndex = dayMatch ? parseInt(dayMatch[1]) : 0;
      return `Weekly on ${days[dayIndex] || 'Sunday'}`;
    } else if (repeatTime.includes('monthly')) {
      const dayMatch = repeatTime.match(/day\s*(\d+)/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 1;
      return `Monthly on day ${day}`;
    }
    return 'Custom schedule';
  };

  const manualTriggerCount = Object.values(manualTriggers).filter(Boolean).length;
  const displaySchedules = dbSchedulesToSchedule(schedules);

  return (
    <div className="space-y-6">
      {/* Manual Triggers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Manual ({manualTriggerCount})</h3>
        </div>
        
        <div className="space-y-3">
          {/* @ Mention */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <AtSign className="w-5 h-5 text-muted-foreground" />
              <Label htmlFor="mention" className="flex-1 cursor-pointer">
                Mention
              </Label>
            </div>
            <Switch
              id="mention"
              checked={manualTriggers.mention}
              onCheckedChange={() => handleManualTriggerToggle('mention')}
              disabled={isReconfiguring}
            />
          </div>

          {/* Direct Message */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <Label htmlFor="directMessage" className="flex-1 cursor-pointer">
                Direct Message
              </Label>
            </div>
            <Switch
              id="directMessage"
              checked={manualTriggers.directMessage}
              onCheckedChange={() => handleManualTriggerToggle('directMessage')}
              disabled={isReconfiguring}
            />
          </div>

          {/* Assign Task */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <UserPlus className="w-5 h-5 text-muted-foreground" />
              <Label htmlFor="assignTask" className="flex-1 cursor-pointer">
                Assign task
              </Label>
            </div>
            <Switch
              id="assignTask"
              checked={manualTriggers.assignTask}
              onCheckedChange={() => handleManualTriggerToggle('assignTask')}
              disabled={isReconfiguring}
            />
          </div>
        </div>
      </div>

      {/* Scheduled */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Scheduled</h3>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Run your agent on a daily, weekly, monthly, or custom schedule
                </p>
                <Button
                  variant="default"
                  onClick={() => {
                    setEditingSchedule(undefined);
                    setScheduleModalOpen(true);
                  }}
                  disabled={isReconfiguring}
                >
                  + Add schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule List */}
        {schedules.length > 0 && (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={schedule.isActive}
                    onCheckedChange={() => handleScheduleToggle(schedule.id)}
                    disabled={isReconfiguring}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getRepeatText(schedule)} {schedule.startTime && `at ${format(new Date(schedule.startTime), 'HH:mm')}`}
                    </p>
                    {schedule.instructions && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {schedule.instructions}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const scheduleForEdit = displaySchedules.find(s => s.id === schedule.id);
                      setEditingSchedule(scheduleForEdit);
                      setScheduleModalOpen(true);
                    }}
                    disabled={isReconfiguring}
                    className="text-sm py-2 px-4"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleScheduleDelete(schedule.id)}
                    disabled={isReconfiguring}
                    className="text-sm py-2 px-4"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Automated */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Automated</h3>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto text-muted-foreground opacity-50 flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h8v8l10-12h-8V2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Build an automation that runs your agent when criteria is met
                </p>
                <Button
                  variant="outline"
                  onClick={() => toast.info('Automated triggers coming soon!')}
                  disabled={isReconfiguring}
                >
                  Learn more
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSave={handleScheduleSave}
        initialSchedule={editingSchedule}
        isLoading={false}
      />
    </div>
  );
}
