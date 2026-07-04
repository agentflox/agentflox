// app/projects/[id]/layout.tsx
"use client";

import { createContext, useContext, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc';
import Layout from '@/features/dashboard/layouts/agent';

interface AgentContextValue {
  agentData: any;
  isLoading: boolean;
  isPublished: boolean;
  currentStatus: string;
  isPublishing: boolean;
  localDraft: any;
  refetch: () => void;
  handleTogglePublish: () => Promise<void>;
  isOwner: boolean;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within AgentLayout');
  }
  return context;
};

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const agentId = params.id as string;
  const activeTab = searchParams.get('tab') || 'overview';

  const conversationType = useMemo(() => {
    switch (activeTab) {
      case 'ai-builder': return 'AGENT_OPERATOR';
      case 'chat': return 'AGENT_EXECUTOR';
      default: return 'AGENT_BUILDER';
    }
  }, [activeTab]);

  const includeSections = useMemo(() => {
    switch (activeTab) {
      case 'settings':
        return { tools: true, triggers: true, schedules: true, collaborators: true };
      case 'automation':
        return { triggers: true, schedules: true };
      case 'overview':
        return { counts: true };
      case 'chat':
      case 'ai-builder':
        return { conversations: true };
      default:
        return {};
    }
  }, [activeTab]);

  const { data: agent, isLoading, refetch } = trpc.agent.get.useQuery(
    { id: agentId, conversationType, includeSections },
    { enabled: !!agentId, staleTime: 30_000 }
  );

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const isOwner = useMemo(() => {
    if (!agent || !session?.user) return false;
    return (agent as { ownerId?: string }).ownerId === session.user.id;
  }, [agent, session]);

  const isPublished = agent?.status === 'ACTIVE';
  const currentStatus = agent?.status || 'DRAFT';

  const handleTogglePublish = async () => {
    if (!agent) return;

    const newStatus = agent.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    updateAgent.mutate({
      id: agent.id,
      status: newStatus,
      isActive: newStatus === 'ACTIVE',
    });
  };

  const contextValue: AgentContextValue = {
    agentData: agent,
    isLoading,
    isPublished,
    currentStatus,
    isPublishing: updateAgent.isPending,
    localDraft: null,
    refetch,
    handleTogglePublish,
    isOwner,
  };

  const isChatView = activeTab === 'chat' || activeTab === 'ai-builder';

  return (
    <AgentContext.Provider value={contextValue}>
      <Layout>
        <div className={`flex-1 ${isChatView ? 'overflow-hidden flex flex-col h-full min-h-0' : 'overflow-auto'}`}>
          {children}
        </div>
      </Layout>
    </AgentContext.Provider>
  );
}