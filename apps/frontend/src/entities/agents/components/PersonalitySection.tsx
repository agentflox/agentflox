import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Brain, Plus, X } from 'lucide-react';

interface PersonalitySectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

const toneOptions = ['professional', 'casual', 'friendly', 'formal', 'creative', 'technical'];
const styleOptions = ['concise', 'detailed', 'conversational', 'structured', 'narrative'];

export const PersonalitySection: React.FC<PersonalitySectionProps> = ({ formData, updateFormData }) => {
  const [newCapability, setNewCapability] = React.useState('');
  const [newConstraint, setNewConstraint] = React.useState('');

  const addCapability = () => {
    if (newCapability.trim()) {
      updateFormData('capabilities', [...(formData.capabilities || []), newCapability.trim()]);
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    updateFormData('capabilities', (formData.capabilities || []).filter((c: string) => c !== capability));
  };

  const addConstraint = () => {
    if (newConstraint.trim()) {
      updateFormData('constraints', [...(formData.constraints || []), newConstraint.trim()]);
      setNewConstraint('');
    }
  };

  const removeConstraint = (constraint: string) => {
    updateFormData('constraints', (formData.constraints || []).filter((c: string) => c !== constraint));
  };

  const updatePersonality = (field: string, value: any) => {
    updateFormData('personality', {
      ...(formData.personality || {}),
      [field]: value,
    });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Personality & Instructions
        </CardTitle>
        <CardDescription>
          Define how your agent behaves and what it can do
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt *</Label>
          <Textarea
            id="systemPrompt"
            placeholder="You are a helpful AI assistant that..."
            value={formData.systemPrompt || ''}
            onChange={(e) => updateFormData('systemPrompt', e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Define the core instructions and behavior for your agent
          </p>
        </div>

        {/* Personality Settings */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium">Personality Settings</h4>
          
          {/* Tone */}
          <div className="space-y-2">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((tone) => (
                <Badge
                  key={tone}
                  variant={formData.personality?.tone === tone ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => updatePersonality('tone', tone)}
                >
                  {tone}
                </Badge>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="space-y-2">
            <Label>Style</Label>
            <div className="flex flex-wrap gap-2">
              {styleOptions.map((style) => (
                <Badge
                  key={style}
                  variant={formData.personality?.style === style ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => updatePersonality('style', style)}
                >
                  {style}
                </Badge>
              ))}
            </div>
          </div>

          {/* Formality Level */}
          <div className="space-y-2">
            <Label>Formality Level: {formData.personality?.formality || 50}%</Label>
            <Slider
              value={[formData.personality?.formality || 50]}
              onValueChange={([value]) => updatePersonality('formality', value)}
              min={0}
              max={100}
              step={10}
            />
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <Label>Capabilities</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a capability..."
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCapability()}
            />
            <Button type="button" onClick={addCapability} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.capabilities || []).map((cap: string) => (
              <Badge key={cap} variant="secondary" className="gap-1">
                {cap}
                <button
                  type="button"
                  onClick={() => removeCapability(cap)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div className="space-y-2">
          <Label>Constraints</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a constraint..."
              value={newConstraint}
              onChange={(e) => setNewConstraint(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addConstraint()}
            />
            <Button type="button" onClick={addConstraint} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.constraints || []).map((constraint: string) => (
              <Badge key={constraint} variant="destructive" className="gap-1">
                {constraint}
                <button
                  type="button"
                  onClick={() => removeConstraint(constraint)}
                  className="ml-1 hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

