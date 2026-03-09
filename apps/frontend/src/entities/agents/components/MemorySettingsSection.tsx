import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Brain, Database } from 'lucide-react';

interface MemorySettingsSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

const memoryTypes = [
  { value: 'SHORT_TERM', label: 'Short Term', desc: 'Session-based memory' },
  { value: 'LONG_TERM', label: 'Long Term', desc: 'Persistent memory' },
  { value: 'EPISODIC', label: 'Episodic', desc: 'Event-based memory' },
  { value: 'SEMANTIC', label: 'Semantic', desc: 'Knowledge-based memory' },
  { value: 'PROCEDURAL', label: 'Procedural', desc: 'Skill-based memory' },
  { value: 'WORKING', label: 'Working', desc: 'Active reasoning memory' },
];

export const MemorySettingsSection: React.FC<MemorySettingsSectionProps> = ({ formData, updateFormData }) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Memory & Context
        </CardTitle>
        <CardDescription>
          Configure how your agent remembers and uses context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Memory Type */}
        <div className="space-y-2">
          <Label htmlFor="memoryType">Memory Type</Label>
          <Select
            value={formData.memoryType || 'SHORT_TERM'}
            onValueChange={(value) => updateFormData('memoryType', value)}
          >
            <SelectTrigger id="memoryType">
              <SelectValue placeholder="Select memory type" />
            </SelectTrigger>
            <SelectContent>
              {memoryTypes.map((type) => (
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

        {/* Context Window */}
        <div className="space-y-2">
          <Label htmlFor="contextWindow">Context Window</Label>
          <Input
            id="contextWindow"
            type="number"
            min={1}
            max={50}
            value={formData.contextWindow || 5}
            onChange={(e) => updateFormData('contextWindow', parseInt(e.target.value) || 5)}
          />
          <p className="text-xs text-muted-foreground">
            Number of previous interactions to include in context
          </p>
        </div>

        {/* Vector Memory */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="useVectorMemory" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Use Vector Memory
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable semantic search for better context retrieval
            </p>
          </div>
          <Switch
            id="useVectorMemory"
            checked={formData.useVectorMemory || false}
            onCheckedChange={(checked) => updateFormData('useVectorMemory', checked)}
          />
        </div>

        {/* Memory Retention */}
        {formData.memoryType !== 'SHORT_TERM' && (
          <div className="space-y-2">
            <Label htmlFor="memoryRetention">Memory Retention (days)</Label>
            <Input
              id="memoryRetention"
              type="number"
              min={1}
              max={365}
              value={formData.memoryRetention || 7}
              onChange={(e) => updateFormData('memoryRetention', parseInt(e.target.value) || 7)}
            />
            <p className="text-xs text-muted-foreground">
              How long to retain memories before cleanup
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

