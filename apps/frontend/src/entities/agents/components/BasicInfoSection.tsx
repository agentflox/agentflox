import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Target, Workflow, Database, Code, FileText, MessageSquare, Brain, Sparkles } from 'lucide-react';

interface BasicInfoSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

const agentTypes = [
  { value: 'TASK_EXECUTOR', label: 'Task Executor', icon: Target, desc: 'Executes specific tasks efficiently' },
  { value: 'WORKFLOW_MANAGER', label: 'Workflow Manager', icon: Workflow, desc: 'Manages complex workflows' },
  { value: 'DATA_ANALYST', label: 'Data Analyst', icon: Database, desc: 'Analyzes data and generates insights' },
  { value: 'CODE_GENERATOR', label: 'Code Generator', icon: Code, desc: 'Generates and reviews code' },
  { value: 'CONTENT_CREATOR', label: 'Content Creator', icon: FileText, desc: 'Creates various content types' },
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support', icon: MessageSquare, desc: 'Handles customer queries' },
  { value: 'RESEARCHER', label: 'Researcher', icon: Brain, desc: 'Conducts research and analysis' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager', icon: Target, desc: 'Manages projects and tasks' },
  { value: 'GENERAL_ASSISTANT', label: 'General Assistant', icon: Sparkles, desc: 'Multi-purpose assistant' },
  { value: 'CUSTOM', label: 'Custom', icon: Bot, desc: 'Custom agent type' },
];

const avatarEmojis = ['🤖', '🎯', '⚡', '🧠', '🚀', '💡', '🔮', '🎨', '📊', '🔧', '💼', '🎓'];

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ formData, updateFormData }) => {
  const selectedType = agentTypes.find(t => t.value === formData.agentType);

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Basic Information
        </CardTitle>
        <CardDescription>
          Set up the fundamental details for your AI agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Agent Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Task Automation Bot"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what this agent does..."
            value={formData.description || ''}
            onChange={(e) => updateFormData('description', e.target.value)}
            rows={3}
          />
        </div>

        {/* Avatar Selection */}
        <div className="space-y-2">
          <Label>Avatar</Label>
          <div className="flex flex-wrap gap-2">
            {avatarEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => updateFormData('avatar', emoji)}
                className={`text-2xl p-2 rounded-lg border-2 transition-all hover:scale-110 ${
                  formData.avatar === emoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Type */}
        <div className="space-y-2">
          <Label htmlFor="agentType">Agent Type *</Label>
          <Select
            value={formData.agentType}
            onValueChange={(value) => updateFormData('agentType', value)}
          >
            <SelectTrigger id="agentType">
              <SelectValue placeholder="Select agent type" />
            </SelectTrigger>
            <SelectContent>
              {agentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.desc}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedType && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedType.desc}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

