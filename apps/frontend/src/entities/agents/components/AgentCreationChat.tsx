"use client";

import React from 'react';
import { AgentChatBuilder } from './AgentChatBuilder';

interface AgentCreationChatProps {
  agentId: string;
  workspaceId: string;
  onAgentCreated?: (agentId: string) => void;
  onProgressUpdate?: (progress: {
    agentName?: string;
    avatar?: string;
    description?: string;
    agentType?: string;
    completedSteps?: string[];
    currentStep?: string;
  }) => void;
}

export const AgentCreationChat: React.FC<AgentCreationChatProps> = ({
  agentId,
  workspaceId,
  onAgentCreated,
  onProgressUpdate,
}) => {
  return (
    <AgentChatBuilder
      agentId={agentId}
      onAgentCreated={onAgentCreated}
      onProgressUpdate={onProgressUpdate}
    />
  );
};
