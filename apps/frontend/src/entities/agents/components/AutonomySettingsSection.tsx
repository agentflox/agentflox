import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Shield, Lock, Unlock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AutonomySettingsSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

const autonomyLevels = [
  { value: 'SUPERVISED', label: 'Supervised', desc: 'Requires approval for all actions', color: 'text-red-600' },
  { value: 'SEMI_AUTONOMOUS', label: 'Semi-Autonomous', desc: 'Requires approval for critical actions', color: 'text-yellow-600' },
  { value: 'AUTONOMOUS', label: 'Autonomous', desc: 'Fully autonomous operation', color: 'text-green-600' },
  { value: 'COLLABORATIVE', label: 'Collaborative', desc: 'Works with human in the loop', color: 'text-blue-600' },
];

const permissionLevels = [
  { value: 'RESTRICTED', label: 'Restricted', desc: 'Can only use assigned tools' },
  { value: 'STANDARD', label: 'Standard', desc: 'Can use standard workspace tools' },
  { value: 'ELEVATED', label: 'Elevated', desc: 'Can use privileged tools' },
  { value: 'ADMIN', label: 'Admin', desc: 'Full access to all tools' },
];

export const AutonomySettingsSection: React.FC<AutonomySettingsSectionProps> = ({ formData, updateFormData }) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autonomy & Permissions
        </CardTitle>
        <CardDescription>
          Control how independently your agent can operate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Autonomy Level */}
        <div className="space-y-2">
          <Label htmlFor="autonomyLevel">Autonomy Level</Label>
          <Select
            value={formData.autonomyLevel || 'SEMI_AUTONOMOUS'}
            onValueChange={(value) => updateFormData('autonomyLevel', value)}
          >
            <SelectTrigger id="autonomyLevel">
              <SelectValue placeholder="Select autonomy level" />
            </SelectTrigger>
            <SelectContent>
              {autonomyLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div>
                    <div className={`font-medium ${level.color}`}>{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.desc}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Requires Approval */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="requiresApproval" className="flex items-center gap-2">
              {formData.requiresApproval ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              Requires Approval
            </Label>
            <p className="text-xs text-muted-foreground">
              Require human approval before executing actions
            </p>
          </div>
          <Switch
            id="requiresApproval"
            checked={formData.requiresApproval !== false}
            onCheckedChange={(checked) => updateFormData('requiresApproval', checked)}
          />
        </div>

        {/* Approval Threshold */}
        {formData.requiresApproval !== false && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Approval Threshold: {((formData.approvalThreshold || 0.8) * 100).toFixed(0)}%</Label>
            </div>
            <Slider
              value={[formData.approvalThreshold || 0.8]}
              onValueChange={([value]) => updateFormData('approvalThreshold', value)}
              min={0}
              max={1}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Confidence threshold for requiring approval
            </p>
          </div>
        )}

        {/* Permission Level */}
        <div className="space-y-2">
          <Label htmlFor="permissionLevel">Permission Level</Label>
          <Select
            value={formData.permissionLevel || 'RESTRICTED'}
            onValueChange={(value) => updateFormData('permissionLevel', value)}
          >
            <SelectTrigger id="permissionLevel">
              <SelectValue placeholder="Select permission level" />
            </SelectTrigger>
            <SelectContent>
              {permissionLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div>
                    <div className="font-medium">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.desc}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.autonomyLevel === 'AUTONOMOUS' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Autonomous agents can execute actions without approval. Use with caution.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

