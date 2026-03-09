import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Zap, Clock, RefreshCw } from 'lucide-react';

interface ExecutionSettingsSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

export const ExecutionSettingsSection: React.FC<ExecutionSettingsSectionProps> = ({ formData, updateFormData }) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Execution Settings
        </CardTitle>
        <CardDescription>
          Configure how your agent executes tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max Iterations */}
        <div className="space-y-2">
          <Label htmlFor="maxIterations">Max Iterations</Label>
          <Input
            id="maxIterations"
            type="number"
            min={1}
            max={100}
            value={formData.maxIterations || 10}
            onChange={(e) => updateFormData('maxIterations', parseInt(e.target.value) || 10)}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of reasoning steps the agent can take
          </p>
        </div>

        {/* Max Execution Time */}
        <div className="space-y-2">
          <Label htmlFor="maxExecutionTime" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Max Execution Time (seconds)
          </Label>
          <Input
            id="maxExecutionTime"
            type="number"
            min={10}
            max={3600}
            step={10}
            value={formData.maxExecutionTime || 300}
            onChange={(e) => updateFormData('maxExecutionTime', parseInt(e.target.value) || 300)}
          />
          <p className="text-xs text-muted-foreground">
            Maximum time the agent can run before timeout
          </p>
        </div>

        {/* Auto Retry */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="autoRetry" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Auto Retry
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically retry failed executions
            </p>
          </div>
          <Switch
            id="autoRetry"
            checked={formData.autoRetry !== false}
            onCheckedChange={(checked) => updateFormData('autoRetry', checked)}
          />
        </div>

        {/* Max Retries */}
        {formData.autoRetry !== false && (
          <div className="space-y-2">
            <Label htmlFor="maxRetries">Max Retries</Label>
            <Input
              id="maxRetries"
              type="number"
              min={1}
              max={10}
              value={formData.maxRetries || 3}
              onChange={(e) => updateFormData('maxRetries', parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of retry attempts
            </p>
          </div>
        )}

        {/* Retry Delay */}
        {formData.autoRetry !== false && (
          <div className="space-y-2">
            <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
            <Input
              id="retryDelay"
              type="number"
              min={1}
              max={60}
              value={formData.retryDelay || 5}
              onChange={(e) => updateFormData('retryDelay', parseInt(e.target.value) || 5)}
            />
            <p className="text-xs text-muted-foreground">
              Wait time between retry attempts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

