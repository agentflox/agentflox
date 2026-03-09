"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, Brain, Link as LinkIcon, Wrench, Shield, 
  Plus, X, ExternalLink, FileText, Folder, Users, 
  Briefcase, Rocket, Package
} from 'lucide-react';
import { ContextKnowledgeModal } from './ContextKnowledgeModal';
import { AutonomySettingsSection } from './AutonomySettingsSection';
import { MarketplaceFindTool } from './MarketplaceFindTool';

interface ActionsSectionProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

export const ActionsSection: React.FC<ActionsSectionProps> = ({ formData, updateFormData }) => {
  const [showContextModal, setShowContextModal] = useState(false);
  const [externalLinkUrl, setExternalLinkUrl] = useState('');
  const selectedTools = formData.availableTools || [];

  const handleAddExternalLink = () => {
    if (externalLinkUrl.trim()) {
      const links = formData.externalLinks || [];
      updateFormData('externalLinks', [...links, externalLinkUrl.trim()]);
      setExternalLinkUrl('');
    }
  };

  const handleRemoveExternalLink = (index: number) => {
    const links = formData.externalLinks || [];
    updateFormData('externalLinks', links.filter((_: any, i: number) => i !== index));
  };

  const handleAddTool = (toolId: string) => {
    if (!selectedTools.includes(toolId)) {
      const updated = [...selectedTools, toolId];
      updateFormData('availableTools', updated);
    }
  };

  const handleRemoveTool = (toolId: string) => {
    const updated = selectedTools.filter(id => id !== toolId);
    updateFormData('availableTools', updated);
  };

  const handleContextSelect = (contexts: any) => {
    updateFormData('knowledgeContext', contexts);
  };

  const availableToolOptions = [
    { id: 'create_task', name: 'Create Task', icon: Plus },
    { id: 'update_task', name: 'Update Task', icon: FileText },
    { id: 'delete_task', name: 'Delete Task', icon: X },
    { id: 'create_project', name: 'Create Project', icon: Rocket },
    { id: 'update_project', name: 'Update Project', icon: Briefcase },
    { id: 'send_message', name: 'Send Message', icon: FileText },
    { id: 'create_document', name: 'Create Document', icon: FileText },
    { id: 'search', name: 'Search', icon: Brain },
    { id: 'analyze_data', name: 'Analyze Data', icon: Brain },
    { id: 'generate_report', name: 'Generate Report', icon: FileText },
  ];

  const knowledgeContext = formData.knowledgeContext || {};

  return (
    <div className="space-y-6">
      {/* Agent Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Name
          </CardTitle>
          <CardDescription>
            Give your agent a unique name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name *</Label>
            <Input
              id="agent-name"
              placeholder="e.g., Task Automation Bot"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Instructions
          </CardTitle>
          <CardDescription>
            Define what your agent should do and how it should behave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt *</Label>
            <Textarea
              id="system-prompt"
              placeholder="You are a helpful AI assistant that..."
              value={formData.systemPrompt}
              onChange={(e) => updateFormData('systemPrompt', e.target.value)}
              rows={8}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This is the core instruction that defines your agent's behavior and capabilities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge / Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Knowledge / Context
          </CardTitle>
          <CardDescription>
            Provide context from your workspace to help the agent understand your domain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowContextModal(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Context
          </Button>

          {(Object.keys(knowledgeContext).length > 0 || (formData.externalLinks && formData.externalLinks.length > 0)) && (
            <div className="space-y-3">
              {/* Selected Context Items */}
              {Object.entries(knowledgeContext).map(([type, items]: [string, any]) => {
                if (!items || items.length === 0) return null;
                const icons: Record<string, any> = {
                  projects: Briefcase,
                  workspaces: Folder,
                  teams: Users,
                  proposals: Rocket,
                  spaces: Folder,
                  tools: Wrench,
                  materials: Package,
                  documents: FileText,
                };
                const Icon = icons[type] || FileText;
                const labels: Record<string, string> = {
                  projects: 'Projects',
                  workspaces: 'Workspaces',
                  teams: 'Teams',
                  proposals: 'Proposals',
                  spaces: 'Spaces',
                  tools: 'Tools',
                  materials: 'Materials',
                  documents: 'Documents',
                };

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {labels[type] || type}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item: any) => (
                        <Badge key={item.id} variant="secondary" className="flex items-center gap-1">
                          {item.name || item.title}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...knowledgeContext };
                              updated[type] = updated[type].filter((i: any) => i.id !== item.id);
                              if (updated[type].length === 0) delete updated[type];
                              handleContextSelect(updated);
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* External Links */}
              {formData.externalLinks && formData.externalLinks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <LinkIcon className="h-4 w-4" />
                    External Links
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.externalLinks.map((link: string, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span className="max-w-[200px] truncate">{link}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExternalLink(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* External Links Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            External Links
          </CardTitle>
          <CardDescription>
            Add external URLs for additional context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com"
              value={externalLinkUrl}
              onChange={(e) => setExternalLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddExternalLink();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddExternalLink}
              disabled={!externalLinkUrl.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Tools
          </CardTitle>
          <CardDescription>
            Select tools your agent can use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Marketplace Find Tool */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">Marketplace Find Tool</h4>
                <p className="text-xs text-muted-foreground">
                  Find best matches from marketplace based on criteria
                </p>
              </div>
            </div>
            <MarketplaceFindTool
              onAddToTools={(toolConfig) => {
                const toolId = `marketplace_find_${Date.now()}`;
                if (!selectedTools.includes(toolId)) {
                  handleAddTool(toolId);
                  // Store tool config in formData
                  const toolConfigs = formData.toolConfigs || {};
                  toolConfigs[toolId] = toolConfig;
                  updateFormData('toolConfigs', toolConfigs);
                }
              }}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            {availableToolOptions.map((tool) => {
              const isSelected = selectedTools.includes(tool.id);
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      handleRemoveTool(tool.id);
                    } else {
                      handleAddTool(tool.id);
                    }
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : ''}`} />
                  <span className="text-sm font-medium">{tool.name}</span>
                </button>
              );
            })}
          </div>
          {selectedTools.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Selected tools:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTools.map((toolId) => {
                  if (toolId.startsWith('marketplace_find_')) {
                    return (
                      <Badge key={toolId} variant="default">
                        Marketplace Find
                      </Badge>
                    );
                  }
                  const tool = availableToolOptions.find(t => t.id === toolId);
                  return tool ? (
                    <Badge key={toolId} variant="default">
                      {tool.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Autonomy Settings */}
      <AutonomySettingsSection formData={formData} updateFormData={updateFormData} />

      {/* Context Knowledge Modal */}
      <ContextKnowledgeModal
        open={showContextModal}
        onOpenChange={setShowContextModal}
        selectedContexts={knowledgeContext}
        onSelect={handleContextSelect}
      />
    </div>
  );
};

