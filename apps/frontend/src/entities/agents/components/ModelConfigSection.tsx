import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Settings, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ModelConfigSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

const models = [
  { value: 'gpt_4o', label: 'GPT-4o', desc: 'Most capable, balanced performance' },
  { value: 'gpt_4o_mini', label: 'GPT-4o Mini', desc: 'Faster, cost-effective' },
  { value: 'gpt_4_turbo', label: 'GPT-4 Turbo', desc: 'High performance, large context' },
  { value: 'gpt_3_5_turbo', label: 'GPT-3.5 Turbo', desc: 'Fast and efficient' },
  { value: 'claude_3_5_sonnet_20240620', label: 'Claude 3.5 Sonnet', desc: 'Excellent reasoning' },
  { value: 'claude_3_opus_20240229', label: 'Claude 3 Opus', desc: 'Most capable Claude' },
  { value: 'gemini_1_5_pro', label: 'Gemini 1.5 Pro', desc: 'Google\'s advanced model' },
];

export const ModelConfigSection: React.FC<ModelConfigSectionProps> = ({ formData, updateFormData }) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Model Configuration
        </CardTitle>
        <CardDescription>
          Configure the AI model settings for your agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="modelId">AI Model *</Label>
          <Select
            value={formData.modelId || 'gpt_4o'}
            onValueChange={(value) => updateFormData('modelId', value)}
          >
            <SelectTrigger id="modelId">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  <div>
                    <div className="font-medium">{model.label}</div>
                    <div className="text-xs text-muted-foreground">{model.desc}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Temperature: {formData.temperature || 0.7}</Label>
            <span className="text-xs text-muted-foreground">
              {formData.temperature < 0.3 ? 'Deterministic' : formData.temperature < 0.7 ? 'Balanced' : 'Creative'}
            </span>
          </div>
          <Slider
            value={[formData.temperature || 0.7]}
            onValueChange={([value]) => updateFormData('temperature', value)}
            min={0}
            max={2}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Controls randomness. Lower = more focused, Higher = more creative
          </p>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            min={100}
            max={32000}
            step={100}
            value={formData.maxTokens || 2000}
            onChange={(e) => updateFormData('maxTokens', parseInt(e.target.value) || 2000)}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of tokens in the response
          </p>
        </div>

        {/* Advanced Parameters */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Advanced Parameters
          </h4>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Top P: {formData.topP || 1.0}</Label>
            </div>
            <Slider
              value={[formData.topP || 1.0]}
              onValueChange={([value]) => updateFormData('topP', value)}
              min={0}
              max={1}
              step={0.1}
            />
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Frequency Penalty: {formData.frequencyPenalty || 0.0}</Label>
            </div>
            <Slider
              value={[formData.frequencyPenalty || 0.0]}
              onValueChange={([value]) => updateFormData('frequencyPenalty', value)}
              min={-2}
              max={2}
              step={0.1}
            />
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Presence Penalty: {formData.presencePenalty || 0.0}</Label>
            </div>
            <Slider
              value={[formData.presencePenalty || 0.0]}
              onValueChange={([value]) => updateFormData('presencePenalty', value)}
              min={-2}
              max={2}
              step={0.1}
            />
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            These settings affect the quality and style of responses. Start with defaults and adjust based on your needs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

