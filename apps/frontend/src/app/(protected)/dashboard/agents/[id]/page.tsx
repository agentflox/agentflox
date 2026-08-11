"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAgentContext } from "./layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ViewSwitcher = dynamic(() => import('@/features/dashboard/views/agent/ViewSwitcher'));

export default function AgentDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'overview';
  const chatId = searchParams.get('chat');

  const {
    agentData: agent,
    isLoading,
  } = useAgentContext();

  const handleChatIdChange = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('chat', id);
    else params.delete('chat');
    if (!params.get('tab') && activeTab) params.set('tab', activeTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen py-20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Permission denied</h2>
          <p className="text-muted-foreground">You are not a member of this agent.</p>
        </div>
      </div>
    );
  }

  const isChatView = activeTab === 'chat' || activeTab === 'ai-builder';

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-2 flex-shrink-0 border-b-1 sticky">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/agents')}
          className="text-muted-foreground hover:text-foreground mb-[8px] -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Button>
      </div>

      <div className={`flex-1 ${isChatView ? 'overflow-hidden' : 'overflow-auto'}`}>
        <div className={`w-full mx-auto ${isChatView ? 'h-full' : ''}`}>
          <ViewSwitcher
            activeTab={activeTab}
            agent={agent}
            chatId={chatId}
            onChatIdChange={handleChatIdChange}
          />
        </div>
      </div>
    </div>
  );
}
