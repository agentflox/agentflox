"use client";

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AgentChatBuilder } from '@/entities/agents/components/AgentChatBuilder';
import { AgentChatSkeleton } from '@/entities/agents/components/AgentChatSkeleton';
import Shell from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";

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
      <Shell hideSidebar noPadding>
        <div className="flex flex-col h-screen w-full">
          <div className="px-6 pt-2 flex-shrink-0 border-b-1">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/agents')}
              className="text-muted-foreground hover:text-foreground mb-2 -ml-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentChatSkeleton />
          </div>
        </div>
      </Shell>
    );
  }


  return (
    <Shell hideSidebar noPadding>
      <div className="flex flex-col h-screen w-full">
        <div className="px-6 pt-2 flex-shrink-0 border-b-1">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/agents')}
            className="text-muted-foreground hover:text-foreground mb-2 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AgentChatBuilder
            agentId={agentId}
            onAgentCreated={handleAgentCreated}
          />
        </div>
      </div>
    </Shell>
  );
}
