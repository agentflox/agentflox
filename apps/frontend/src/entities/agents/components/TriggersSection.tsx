import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar, Zap, Clock } from 'lucide-react';

interface TriggersSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

const triggerTypes = [
  { value: 'MANUAL', label: 'Manual', desc: 'Triggered manually by user' },
  { value: 'SCHEDULED', label: 'Scheduled', desc: 'Time-based trigger (cron)' },
  { value: 'EVENT', label: 'Event', desc: 'Event-based trigger' },
  { value: 'WEBHOOK', label: 'Webhook', desc: 'Webhook trigger' },
  { value: 'MESSAGE', label: 'Message', desc: 'Message trigger' },
  { value: 'TASK_CREATED', label: 'Task Created', desc: 'When task is created' },
  { value: 'TASK_UPDATED', label: 'Task Updated', desc: 'When task is updated' },
  { value: 'CONDITION_MET', label: 'Condition Met', desc: 'When condition is met' },
];

export const TriggersSection: React.FC<TriggersSectionProps> = ({ formData, updateFormData }) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Triggers & Scheduling
        </CardTitle>
        <CardDescription>
          Configure when and how your agent is triggered
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trigger Type */}
        <div className="space-y-2">
          <Label htmlFor="triggerType">Trigger Type</Label>
          <Select
            value={formData.triggerType || 'MANUAL'}
            onValueChange={(value) => updateFormData('triggerType', value)}
          >
            <SelectTrigger id="triggerType">
              <SelectValue placeholder="Select trigger type" />
            </SelectTrigger>
            <SelectContent>
              {triggerTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.desc}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule (for SCHEDULED trigger) */}
        {formData.triggerType === 'SCHEDULED' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cron Schedule
              </Label>
              <Input
                id="schedule"
                placeholder="0 9 * * * (daily at 9 AM)"
                value={formData.schedule || ''}
                onChange={(e) => updateFormData('schedule', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cron expression (e.g., 0 9 * * * for daily at 9 AM)
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isScheduleActive" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable scheduled execution
                </p>
              </div>
              <Switch
                id="isScheduleActive"
                checked={formData.isScheduleActive || false}
                onCheckedChange={(checked) => updateFormData('isScheduleActive', checked)}
              />
            </div>
          </>
        )}

        {/* Trigger Config (for other trigger types) */}
        {formData.triggerType !== 'MANUAL' && formData.triggerType !== 'SCHEDULED' && (
          <div className="space-y-2">
            <Label htmlFor="triggerConfig">Trigger Configuration (JSON)</Label>
            <textarea
              id="triggerConfig"
              className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
              placeholder='{"event": "task.created", "conditions": {...}}'
              value={formData.triggerConfig ? JSON.stringify(formData.triggerConfig, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateFormData('triggerConfig', parsed);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              JSON configuration for the trigger
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

