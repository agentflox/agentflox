"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Wrench, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ToolsSelectionModal } from './ToolsSelectionModal';
import { cn } from '@/lib/utils';

type AgentToolWithSkills = {
  id: string;
  name: string;
  description: string;
  category: string;
  toolType: string;
  isActive: boolean;
  isEnabled?: boolean;
  systemToolId?: string;
  skills?: { id: string; displayName: string }[];
};

interface ToolsTabProps {
  agentId: string;
  tools: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    toolType: string;
    isActive: boolean;
  }>;
  isReconfiguring: boolean;
  onUpdate?: () => void;
}

export function ToolsTab({
  agentId,
  tools = [],
  isReconfiguring,
  onUpdate,
}: ToolsTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const {
    data: agentTools,
    isLoading: loadingAgentTools,
  } = trpc.agent.getAgentTools.useQuery(
    { agentId },
    { refetchOnWindowFocus: false },
  );

  const addToolsMutation = trpc.agent.addTools.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.agent.getAgentTools.invalidate({ agentId }),
        utils.agent.get.invalidate({ id: agentId }),
      ]);
      onUpdate?.();
      toast.success('Tools updated');
    },
    onError: (error) => {
      console.error('Failed to add tools', error);
      toast.error(error.message || 'Failed to add tools');
    },
  });

  const removeToolMutation = trpc.agent.removeTool.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.agent.getAgentTools.invalidate({ agentId }),
        utils.agent.get.invalidate({ id: agentId }),
      ]);
      onUpdate?.();
      toast.success('Tool removed from agent');
    },
    onError: (error) => {
      console.error('Failed to remove tool', error);
      toast.error(error.message || 'Failed to remove tool');
    },
  });

  const effectiveTools: AgentToolWithSkills[] = useMemo(() => {
    if (agentTools && Array.isArray(agentTools)) {
      return agentTools as AgentToolWithSkills[];
    }
    // Fallback to tools from agent relation (no skills metadata)
    return tools as AgentToolWithSkills[];
  }, [agentTools, tools]);

  const activeTools = useMemo(
    () =>
      effectiveTools.filter(
        (t) => t.isActive && (t.isEnabled === undefined || t.isEnabled),
      ),
    [effectiveTools],
  );

  const groupedBySkill = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      tools: AgentToolWithSkills[];
    }[] = [];

    const map = new Map<string, { label: string; tools: AgentToolWithSkills[] }>();

    for (const tool of activeTools) {
      const skills = tool.skills && tool.skills.length
        ? tool.skills
        : [{ id: 'ungrouped', displayName: 'Ungrouped tools' }];

      for (const skill of skills) {
        const key = skill.id;
        const existing = map.get(key);
        if (existing) {
          existing.tools.push(tool);
        } else {
          map.set(key, { label: skill.displayName, tools: [tool] });
        }
      }
    }

    map.forEach((value, key) => {
      groups.push({ key, label: value.label, tools: value.tools });
    });

    return groups;
  }, [activeTools]);

  const handleRemoveTool = async (toolId: string) => {
    if (!toolId) return;
    await removeToolMutation.mutateAsync({ agentId, toolId });
  };

  const handleAddTools = async (toolIds: string[]) => {
    if (!toolIds || toolIds.length === 0) {
      setModalOpen(false);
      return;
    }
    await addToolsMutation.mutateAsync({ agentId, toolIds });
    setModalOpen(false);
  };

  const selectedSystemToolIds = useMemo(
    () =>
      activeTools
        .map((t) => t.systemToolId)
        .filter((id): id is string => Boolean(id)),
    [activeTools],
  );

  if (loadingAgentTools) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-zinc-900" />
            Tools
          </h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            What can this agent use to complete tasks?
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-zinc-900" />
          Tools
        </h3>
        <p className="text-sm text-zinc-500 mt-0.5">
          What can this agent use to complete tasks?
        </p>
      </div>
      {groupedBySkill.length > 0 ? (
        <div className="space-y-4">
          {groupedBySkill.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {group.tools.length} tool{group.tools.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {group.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-primary/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{tool.name}</p>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleRemoveTool(tool.id)}
                      disabled={isReconfiguring || removeToolMutation.isPending}
                      className="h-8 w-8 p-0 text-sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-6 py-12 text-center dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950">
          <div className="relative mx-auto flex max-w-sm flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl" />
              <div
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-2xl",
                  "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(79,70,229,0.35)]",
                  "ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-700",
                )}
              >
                <Wrench className="h-6 w-6 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                No tools yet
              </p>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Equip this agent with built-in actions, integrations, or your own tools so it can get work done.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-1 h-9 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={() => setModalOpen(true)}
              disabled={isReconfiguring || addToolsMutation.isPending}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add your first tool
            </Button>
          </div>
        </div>
      )}

      {groupedBySkill.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setModalOpen(true)}
          disabled={isReconfiguring || addToolsMutation.isPending}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add tools
        </Button>
      )}

      <ToolsSelectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedToolIds={selectedSystemToolIds}
        onSelect={handleAddTools}
        isLoading={addToolsMutation.isPending}
      />
    </div>
  );
}