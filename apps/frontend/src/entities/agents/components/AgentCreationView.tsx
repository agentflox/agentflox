"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AgentCreationWizard } from './AgentCreationWizard';

interface AgentCreationViewProps {
  workspaceId?: string;
  agentId: string;
  agent?: any; // Pass agent data to avoid redundant query
}

export const AgentCreationView: React.FC<AgentCreationViewProps> = ({
  workspaceId,
  agentId,
  agent: initialAgent
}) => {
  const router = useRouter();

  // Only fetch if agent data wasn't passed from parent
  const { data: agent, isLoading: loadingAgent } = trpc.agent.get.useQuery(
    { id: agentId, conversationType: 'AGENT_BUILDER' },
    {
      enabled: !!agentId && !initialAgent,
      initialData: initialAgent
    }
  );

  const agentData = initialAgent || agent;

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Create AI Agent
        </h1>
        <p className="text-muted-foreground mt-1">
          Follow the guided steps to build and configure your autonomous AI agent
        </p>
      </div>

      {/* Wizard */}
      <div className="flex-1 min-h-[600px]">
        <AgentCreationWizard
          agentId={agentId}
          workspaceId={workspaceId || agentData?.workspaceId}
          agent={agentData}
        />
      </div>
    </div>
  );
};
