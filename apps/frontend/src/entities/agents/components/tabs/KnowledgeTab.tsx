"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Plus, 
  Globe, 
  X
} from 'lucide-react';
import { ContextKnowledgeModal } from '../ContextKnowledgeModal';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface KnowledgeTabProps {
  agentId: string;
  knowledgeConfig: any;
  isReconfiguring: boolean;
  onUpdate?: () => void;
}

export function KnowledgeTab({ 
  agentId, 
  knowledgeConfig = {},
  isReconfiguring,
  onUpdate 
}: KnowledgeTabProps) {
  const [contexts, setContexts] = useState<Record<string, any[]>>(
    knowledgeConfig?.contexts || {}
  );
  const [externalSearch, setExternalSearch] = useState({
    webSearch: knowledgeConfig?.external?.webSearch ?? false,
  });
  const [contextModalOpen, setContextModalOpen] = useState(false);

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success('Knowledge settings updated successfully');
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update knowledge settings');
    },
  });

  const handleContextSelect = (selectedContexts: Record<string, any[]>) => {
    setContexts(selectedContexts);
    
    updateMutation.mutate({
      id: agentId,
      metadata: {
        ...knowledgeConfig,
        contexts: selectedContexts,
        external: externalSearch,
      },
    });
  };

  const handleContextToggle = (type: string, itemId: string) => {
    const current = contexts[type] || [];
    const exists = current.some((item: any) => item.id === itemId);
    
    const updated = {
      ...contexts,
      [type]: exists
        ? current.filter((item: any) => item.id !== itemId)
        : [...current, current.find((item: any) => item.id === itemId) || { id: itemId }],
    };

    // Remove empty arrays
    if (updated[type].length === 0) {
      delete updated[type];
    }

    setContexts(updated);
    
    updateMutation.mutate({
      id: agentId,
      metadata: {
        ...knowledgeConfig,
        contexts: updated,
        external: externalSearch,
      },
    });
  };

  const handleContextRemove = (type: string, itemId: string) => {
    const current = contexts[type] || [];
    const updated = {
      ...contexts,
      [type]: current.filter((item: any) => item.id !== itemId),
    };

    if (updated[type].length === 0) {
      delete updated[type];
    }

    setContexts(updated);
    
    updateMutation.mutate({
      id: agentId,
      metadata: {
        ...knowledgeConfig,
        contexts: updated,
        external: externalSearch,
      },
    });
  };

  const handleExternalToggle = (key: keyof typeof externalSearch) => {
    const updated = { ...externalSearch, [key]: !externalSearch[key] };
    setExternalSearch(updated);
    
    updateMutation.mutate({
      id: agentId,
      metadata: {
        ...knowledgeConfig,
        contexts,
        external: updated,
      },
    });
  };

  const getContextTypeIcon = (type: string) => {
    switch (type) {
      case 'workspaces':
        return '📁';
      case 'projects':
        return '💼';
      case 'teams':
        return '👥';
      case 'spaces':
        return '📂';
      default:
        return '📄';
    }
  };

  const totalContexts = Object.values(contexts).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Workspace Access / Context Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Workspace Access</h3>
        
        {/* Context Items */}
        {Object.entries(contexts).map(([type, items]) => (
          <div key={type} className="space-y-2">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg">{getContextTypeIcon(type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name || item.title || type}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={true}
                    onCheckedChange={() => handleContextRemove(type, item.id)}
                    disabled={updateMutation.isPending || isReconfiguring}
                  />
                    <Button
                      variant="ghost"
                      onClick={() => handleContextRemove(type, item.id)}
                      disabled={updateMutation.isPending || isReconfiguring}
                      className="h-8 w-8 p-0 text-sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Add Context Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setContextModalOpen(true)}
          disabled={isReconfiguring || updateMutation.isPending}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add from ClickUp
        </Button>
      </div>

      {/* External Search Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">External Search</h3>
        
        <div className="space-y-3">
          {/* Web Search */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 flex-1">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <Label htmlFor="webSearch" className="flex-1 cursor-pointer font-medium">
                Web Search
              </Label>
            </div>
            <Switch
              id="webSearch"
              checked={externalSearch.webSearch}
              onCheckedChange={() => handleExternalToggle('webSearch')}
              disabled={updateMutation.isPending || isReconfiguring}
            />
          </div>
        </div>

      </div>

      <ContextKnowledgeModal
        open={contextModalOpen}
        onOpenChange={setContextModalOpen}
        selectedContexts={contexts}
        onSelect={handleContextSelect}
      />
    </div>
  );
}

