"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AgentCreationChat } from './AgentCreationChat';
import { AgentActivationStep } from './AgentActivationStep';
import { AgentProgressTracker, ProgressStep } from './AgentProgressTracker';
import { CreationStep, creationPrompts, getStepPrompt, validateStepResponse } from './AgentCreationPrompts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AgentCreationWizardProps {
  agentId: string;
  workspaceId?: string;
  agent?: any; // Pass agent data to avoid redundant query
}

const STEP_ORDER: CreationStep[] = [
  'purpose',
  'role',
  'capabilities',
  'instructions',
  'triggers',
  'tools',
  'knowledge',
  'review',
];

const STEP_LABELS: Record<CreationStep, string> = {
  purpose: 'Purpose',
  role: 'Role Definition',
  capabilities: 'Capabilities',
  instructions: 'Instructions',
  triggers: 'Triggers',
  tools: 'Tools & Resources',
  knowledge: 'Knowledge & Memory',
  review: 'Review & Activate',
};

export const AgentCreationWizard: React.FC<AgentCreationWizardProps> = ({
  agentId,
  workspaceId,
  agent: initialAgent,
}) => {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<CreationStep>>(new Set());
  const [stepData, setStepData] = useState<Record<CreationStep, string>>({
    purpose: '',
    role: '',
    capabilities: '',
    instructions: '',
    triggers: '',
    tools: '',
    knowledge: '',
    review: '',
  });

  // Only fetch if agent data wasn't passed from parent
  const { data: agent, isLoading, refetch } = trpc.agent.get.useQuery(
    { id: agentId, conversationType: 'AGENT_BUILDER' },
    {
      enabled: !!agentId && !initialAgent,
      initialData: initialAgent
    }
  );

  const agentData = initialAgent || agent;

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save agent');
    },
  });

  const currentStep = STEP_ORDER[currentStepIndex];
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Initialize progress steps
  const progressSteps: ProgressStep[] = STEP_ORDER.map((step, index) => ({
    id: step,
    label: STEP_LABELS[step],
    status:
      index < currentStepIndex ? 'completed' :
        index === currentStepIndex ? 'in_progress' :
          'pending',
    description: creationPrompts[step].initial.substring(0, 60) + '...',
  }));

  // Save step data to agent
  const saveStepData = useCallback(async (step: CreationStep, data: string) => {
    if (!agentData) return;

    const updates: any = {};

    // Map step data to agent fields
    switch (step) {
      case 'purpose':
        if (!agentData.description || agentData.description.length < data.length) {
          updates.description = data;
        }
        break;
      case 'role':
        // Role is part of systemPrompt
        if (data) {
          const currentPrompt = agentData.systemPrompt || '';
          const roleSection = `Role and Objective\n${data}\n\n`;
          updates.systemPrompt = currentPrompt.includes('Role and Objective')
            ? currentPrompt.replace(/Role and Objective[\s\S]*?(?=\n\n|$)/, roleSection.trim())
            : roleSection + currentPrompt;
        }
        break;
      case 'capabilities':
        // Extract capabilities and constraints from data
        const capabilitiesMatch = data.match(/can[:\s]+([^cannot]+)/i);
        const constraintsMatch = data.match(/cannot[:\s]+(.+)/i);
        if (capabilitiesMatch) {
          updates.capabilities = capabilitiesMatch[1].split(',').map((c: string) => c.trim()).filter(Boolean);
        }
        if (constraintsMatch) {
          updates.constraints = constraintsMatch[1].split(',').map((c: string) => c.trim()).filter(Boolean);
        }
        break;
      case 'instructions':
        // Append to systemPrompt
        if (data) {
          const currentPrompt = agentData.systemPrompt || '';
          const instructionsSection = `\n\nInstructions\n${data}\n`;
          updates.systemPrompt = currentPrompt + instructionsSection;
        }
        break;
      case 'triggers':
        // Parse trigger type and config
        if (data.includes('Event-based') || data.includes('task created')) {
          updates.triggerType = 'TASK_CREATED';
        } else if (data.includes('Schedule') || data.includes('cron')) {
          updates.triggerType = 'SCHEDULED';
          const cronMatch = data.match(/\(schedule[:\s]+([^)]+)\)/);
          if (cronMatch) {
            updates.schedule = cronMatch[1].trim();
            updates.isScheduleActive = true;
          }
        } else if (data.includes('Manual')) {
          updates.triggerType = 'MANUAL';
        } else if (data.includes('Webhook')) {
          updates.triggerType = 'WEBHOOK';
        }
        break;
      case 'tools':
        // Extract tool names
        const toolMatches = data.match(/(?:Tools?[:\s]+|tool[:\s]+)([^.]+)/i);
        if (toolMatches) {
          updates.availableTools = toolMatches[1].split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        break;
      case 'knowledge':
        // Update memory settings
        if (data.includes('30 days') || data.includes('30')) {
          updates.memoryRetention = 30;
        } else if (data.includes('7 days') || data.includes('7')) {
          updates.memoryRetention = 7;
        }
        if (data.includes('Long-term') || data.includes('LONG_TERM')) {
          updates.memoryType = 'LONG_TERM';
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      updateAgent.mutate({
        id: agentData.id,
        ...updates,
      });
    }

    // Store step data
    setStepData(prev => ({ ...prev, [step]: data }));
  }, [agentData, updateAgent]);

  const handleStepComplete = useCallback((step: CreationStep, data: string) => {
    const validation = validateStepResponse(step, data);

    if (!validation.valid) {
      toast.error(validation.message || 'Please provide more information');
      return false;
    }

    setCompletedSteps(prev => new Set([...prev, step]));
    saveStepData(step, data);
    return true;
  }, [saveStepData]);

  const handleNext = () => {
    if (isLastStep) return;
    setCurrentStepIndex(prev => Math.min(prev + 1, STEP_ORDER.length - 1));
  };

  const handlePrevious = () => {
    if (isFirstStep) return;
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow clicking on completed steps or current step
    if (stepIndex <= currentStepIndex || completedSteps.has(STEP_ORDER[stepIndex])) {
      setCurrentStepIndex(stepIndex);
    }
  };

  const handleAgentCreated = (createdAgentId: string) => {
    // Agent creation is handled by the chat component
    // This is called when agent is fully configured
    if (createdAgentId === agentId) {
      // Move to review step
      setCurrentStepIndex(STEP_ORDER.length - 1);
    }
  };

  const handleActivated = () => {
    router.push(`/dashboard/agents/${agentId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Agent not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Side - Chat/Wizard Interface */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Card className="flex h-full flex-col overflow-hidden border-0 bg-white shadow-none lg:rounded-2xl lg:border lg:shadow-2xl">
          {isLastStep ? (
            // Review & Activate Step
            <div className="flex-1 overflow-y-auto p-6">
              <AgentActivationStep
                agent={agent}
                onActivated={handleActivated}
                onEdit={(section) => {
                  // Find the step that corresponds to this section
                  const stepMap: Record<string, CreationStep> = {
                    overview: 'purpose',
                    role: 'role',
                    capabilities: 'capabilities',
                    constraints: 'capabilities',
                    triggers: 'triggers',
                    tools: 'tools',
                    knowledge: 'knowledge',
                    execution: 'knowledge',
                  };
                  const step = stepMap[section];
                  if (step) {
                    const stepIndex = STEP_ORDER.indexOf(step);
                    if (stepIndex >= 0) {
                      setCurrentStepIndex(stepIndex);
                    }
                  }
                }}
              />
            </div>
          ) : (
            // Chat-based Steps
            <AgentCreationChat
              workspaceId={workspaceId}
              agentId={agentId}
              onAgentCreated={handleAgentCreated}
              onProgressUpdate={(progress) => {
                // Update progress based on chat
                if (progress.currentStep) {
                  // Map chat progress to wizard steps
                }
              }}
            />
          )}

          {/* Navigation */}
          {!isLastStep && (
            <div className="border-t p-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {STEP_ORDER.length}
              </div>
              <Button
                onClick={handleNext}
                disabled={isLastStep}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Right Side - Progress Tracker */}
      <div className="w-96 flex flex-col bg-gradient-to-b from-background to-muted/20 border-l p-6">
        <AgentProgressTracker
          steps={progressSteps}
          currentStep={currentStep}
        />
      </div>
    </div>
  );
};

