"use client";

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AgentChatBuilder } from '@/entities/agents/components/AgentChatBuilder';
import { AgentChatSkeleton } from '@/entities/agents/components/AgentChatSkeleton';
import Shell from "@/components/layout/Shell";

export default function AgentCreationPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  // Fetch agent
  const { data: agent, isLoading, error } = trpc.agent.get.useQuery(
    { id: agentId, conversationType: 'AGENT_BUILDER' },
    { enabled: !!agentId }
  );

  // If agent doesn't exist, redirect
  useEffect(() => {
    if (!isLoading && !agent && error) {
      toast.error('Agent not found');
      router.push('/dashboard/agents');
    }
  }, [agentId, isLoading, agent, error, router]);

  const handleAgentCreated = (createdAgentId: string) => {
    toast.success('Agent created successfully!');
    router.push(`/dashboard/agents/${createdAgentId}`);
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="h-[calc(100vh-5.5rem)] md:h-[calc(100vh-3.5rem)]">
          <AgentChatSkeleton />
        </div>
      </Shell>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <Shell>
      <div className="h-[calc(100vh-5.5rem)] md:h-[calc(100vh-3.5rem)]">
        <AgentChatBuilder
          agentId={agentId}
          onAgentCreated={handleAgentCreated}
        />
      </div>
    </Shell>
  );
}
