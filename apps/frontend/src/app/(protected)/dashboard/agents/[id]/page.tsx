"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import ViewSwitcher from '@/features/dashboard/views/agent/ViewSwitcher';
import PageHeader from '@/entities/shared/components/PageHeader';
import { useToast } from "@/hooks/useToast";
import { useAgentContext } from "./layout";

export default function agentDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const activeTab = searchParams.get('tab') || 'overview';

  const {
    agentData: agent,
    isLoading,
    isPublished,
    isPublishing,
    handleTogglePublish,
    isOwner,
  } = useAgentContext();

  // Memoize header props
  const headerProps = useMemo(
    () => ({
      title: agent?.name || "Untitled agent",
      subtitle: "Agent Details",
      description: agent?.description ?? "Make changes to your agent",
    }),
    [agent?.name, agent?.description]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
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

  const isChatView = activeTab === 'chat' || activeTab === 'builder';

  return (
    <div className="flex flex-col h-full">
      {!isChatView && (
        <PageHeader
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          description={headerProps.description}
        />
      )}

      <div className={`flex-1 ${isChatView ? 'overflow-hidden' : 'overflow-auto'}`}>
        <div className={`w-full mx-auto ${isChatView ? 'h-full' : 'px-6 py-8'}`}>
          <ViewSwitcher
            activeTab={activeTab}
            agent={agent}
          />
        </div>
      </div>
    </div>
  );
}