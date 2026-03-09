"use client";

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Calendar,
  MessageSquare,
  Eye,
  FileText,
  Wrench,
  Brain,
  MoreVertical,
  Send,
  Play
} from "lucide-react";
import { InstructionsTab } from "./tabs/InstructionsTab";
import { TriggersTab } from "./tabs/TriggersTab";
import { ToolsTab } from "./tabs/ToolsTab";
import { KnowledgeTab } from "./tabs/KnowledgeTab";
import { SkillsTab } from "./tabs/SkillsTab";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AgentSettingsModal } from "./AgentSettingsModal";

interface AgentProfileProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    status: "ACTIVE" | "DRAFT" | "INACTIVE" | "BUILDING" | "RECONFIGURING" | "EXECUTING";
    isActive: boolean;
    agentType?: string | null;
    systemPrompt?: string | null;
    capabilities?: string[] | null;
    constraints?: string[] | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    metadata?: any;
    triggers?: Array<{
      id: string;
      triggerType: string;
      triggerConfig?: any;
      name?: string | null;
      description?: string | null;
      isActive: boolean;
      priority: number;
      tags?: string[];
    }>;
    tools?: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      toolType: string;
      isActive: boolean;
    }>;
    schedules?: Array<{
      id: string;
      name?: string | null;
      description?: string | null;
      repeatTime: string;
      startTime?: Date | string | null;
      endTime?: Date | string | null;
      timezone: string;
      instructions?: string | null;
      isActive: boolean;
      priority: number;
    }>;
  };
  conversationType?: string;
  isReconfiguring?: boolean;
  onEdit?: () => void;
  onConfigure?: () => void;
}

export function AgentProfile({
  agent,
  conversationType,
  isReconfiguring = false,
  onEdit
}: AgentProfileProps) {
  const [activeTab, setActiveTab] = useState("instructions");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  // Refetch agent data on update
  const { refetch: refetchAgent } = trpc.agent.get.useQuery(
    { id: agent.id, conversationType },
    { enabled: false }
  );

  const isLive = agent.status === "ACTIVE" && agent.isActive;
  const isDraft = agent.status === "DRAFT";
  const isBuilding = agent.status === "BUILDING";
  const isReconfiguringStatus = agent.status === "RECONFIGURING";
  const isExecuting = agent.status === "EXECUTING";

  // Check if agent is being reconfigured
  const metadata = agent.metadata || {};

  const hasActiveReconfiguration = Boolean(
    isLive &&
    metadata?.stage &&
    typeof metadata.stage === 'string' &&
    ['review', 'testing'].includes(metadata.stage)
  );

  const isActuallyReconfiguring = Boolean(isReconfiguring || hasActiveReconfiguration);

  // Check if agent has schedules
  const hasSchedules = agent.schedules && agent.schedules.length > 0;

  const handleUpdate = async () => {
    await refetchAgent();
  };

  const handleMessage = () => {
    router.push(`/dashboard/agents/${agent.id}?tab=chat`);
  };

  const handleSendDM = () => {
    router.push(`/dashboard/agents/${agent.id}?tab=chat`);
  };

  const handleScheduleRun = () => {
    toast.info('Schedule run feature coming soon!');
  };

  const getStatusBadge = () => {
    if (isExecuting) {
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          Executing
        </Badge>
      );
    }

    if (isReconfiguringStatus || isActuallyReconfiguring) {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          Reconfiguring
        </Badge>
      );
    }

    if (isBuilding) {
      return (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
          <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
          Building
        </Badge>
      );
    }

    if (isLive) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1.5" />
          Live
        </Badge>
      );
    }

    if (isDraft) {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1.5" />
          Draft
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <AlertCircle className="w-3 h-3 mr-1.5" />
        Inactive
      </Badge>
    );
  };

  const getTriggerIcon = (triggerType: string | null | undefined) => {
    switch (triggerType) {
      case "SCHEDULED":
        return <Calendar className="w-4 h-4" />;
      case "EVENT":
        return <Zap className="w-4 h-4" />;
      case "MANUAL":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">

      {/* Agent Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 relative">
              {agent.avatar ? (
                <div className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl ${isActuallyReconfiguring ? 'animate-pulse' : ''
                  }`}>
                  {agent.avatar}
                </div>
              ) : (
                <div className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ${isActuallyReconfiguring ? 'animate-pulse' : ''
                  }`}>
                  <Bot className="w-8 h-8 text-primary" />
                </div>
              )}
              {isActuallyReconfiguring && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl">{agent.name}</CardTitle>
                {getStatusBadge()}
              </div>
              {agent.description && (
                <CardDescription className="text-sm">
                  {agent.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {agent.agentType && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span className="capitalize">{agent.agentType.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                )}
                {agent.triggers && agent.triggers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {getTriggerIcon(agent.triggers[0].triggerType)}
                    <span>{agent.triggers.length} trigger{agent.triggers.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {agent.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Created {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Message Button */}
              <Button
                variant="default"
                onClick={handleMessage}
                disabled={isActuallyReconfiguring}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </Button>

              {/* Run Agent Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isActuallyReconfiguring}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run agent
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleSendDM} className="gap-2">
                    <Send className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Send DM</span>
                      <span className="text-xs text-muted-foreground">
                        Start a direct chat with the agent
                      </span>
                    </div>
                  </DropdownMenuItem>
                  {hasSchedules && (
                    <DropdownMenuItem onClick={handleScheduleRun} className="gap-2">
                      <Calendar className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">Scheduled run</span>
                        <span className="text-xs text-muted-foreground">
                          Preview how the agent will run at its scheduled time
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Options Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isActuallyReconfiguring}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.info('View feature coming soon!')}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AgentSettingsModal
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                agent={agent}
                onUpdate={handleUpdate}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-max">
            <TabsTrigger value="instructions" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="w-4 h-4" />
              Instructions
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="w-4 h-4" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-2 whitespace-nowrap">
              <Zap className="w-4 h-4" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2 whitespace-nowrap">
              <Wrench className="w-4 h-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2 whitespace-nowrap">
              <Brain className="w-4 h-4" />
              Knowledge
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto mt-4">
          <TabsContent value="instructions" className="mt-0 px-4 pb-4">
            {isActuallyReconfiguring && activeTab === 'instructions' && (
              <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating instructions...</span>
              </div>
            )}
            <InstructionsTab
              agentId={agent.id}
              systemPrompt={agent.systemPrompt}
              isReconfiguring={isActuallyReconfiguring}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="skills" className="mt-0 px-4 pb-4">
            {isActuallyReconfiguring && activeTab === 'skills' && (
              <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating skills...</span>
              </div>
            )}
            <SkillsTab
              agentId={agent.id}
              isReconfiguring={isActuallyReconfiguring}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="triggers" className="mt-0 px-4 pb-4">
            {isActuallyReconfiguring && activeTab === 'triggers' && (
              <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating triggers...</span>
              </div>
            )}
            <TriggersTab
              agentId={agent.id}
              triggers={agent.triggers || []}
              schedules={agent.schedules || []}
              isReconfiguring={isActuallyReconfiguring}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="tools" className="mt-0 px-4 pb-4">
            {isActuallyReconfiguring && activeTab === 'tools' && (
              <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating tools...</span>
              </div>
            )}
            <ToolsTab
              agentId={agent.id}
              tools={agent.tools || []}
              isReconfiguring={isActuallyReconfiguring}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0 px-4 pb-4">
            {isActuallyReconfiguring && activeTab === 'knowledge' && (
              <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating knowledge settings...</span>
              </div>
            )}
            <KnowledgeTab
              agentId={agent.id}
              knowledgeConfig={agent.metadata?.knowledge || agent.metadata}
              isReconfiguring={isActuallyReconfiguring}
              onUpdate={handleUpdate}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
