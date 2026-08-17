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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Calendar,
  MessageSquare,
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
import { MemoryTab } from "./tabs/MemoryTab";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AgentSettingsModal } from "./AgentSettingsModal";
import { AgentMoreActions } from "./AgentMoreActions";
import { AgentModelShareBar } from "./AgentModelShareBar";
import {
  AgentSettingsSaveProvider,
  SaveChangesButton,
} from "./AgentSettingsSaveContext";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";

interface AgentProfileProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    modelId?: string | null;
    aiModel?: { id?: string | null } | null;
    status: "ACTIVE" | "DRAFT" | "INACTIVE" | "BUILDING" | "RECONFIGURING" | "EXECUTING";
    isActive: boolean;
    agentType?: string | null;
    systemPrompt?: string | null;
    capabilities?: string[] | null;
    constraints?: string[] | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    metadata?: any;
    viewerIsOwner?: boolean;
    ownerId?: string;
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
  onEdit,
  onConfigure,
}: AgentProfileProps) {
  const [activeTab, setActiveTab] = useState("instructions");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const router = useRouter();
  const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();

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

  const handlePublishClick = () => {
    checkProfileAndProceed(() => {
      setIsPublishModalOpen(true);
    });
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
    <AgentSettingsSaveProvider
      activeSection={activeTab}
      onActiveSectionChange={setActiveTab}
    >
    <div className="space-y-0 h-full flex flex-col">

      {/* Model + Share — separate top bar */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-zinc-50/60 dark:border-zinc-900 dark:bg-zinc-950/40">
        <SaveChangesButton size="sm" />
        <AgentModelShareBar
          agentId={agent.id}
          modelId={agent.modelId ?? agent.aiModel?.id ?? null}
          onUpdated={handleUpdate}
          disabled={isActuallyReconfiguring}
          onClose={onConfigure}
        />
      </div>

      {/* Agent Header Card */}
      <Card className="rounded-none border-none">
        <CardHeader className="space-y-4 px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
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
                  <CardTitle className="text-xl truncate">{agent.name}</CardTitle>
                  {getStatusBadge()}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Message + Run, grouped into a single segmented control */}
              <div className="flex items-center rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMessage}
                      disabled={isActuallyReconfiguring}
                      className="h-9 w-9 rounded-none rounded-l-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Message this agent</p>
                  </TooltipContent>
                </Tooltip>

                <div className="h-9 w-px bg-zinc-200 dark:bg-zinc-800" />

                {/* Run Agent Dropdown */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isActuallyReconfiguring}
                          className="h-9 w-9 rounded-none rounded-r-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Run this agent</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-64 p-1.5">
                    <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Run options
                    </div>
                    <DropdownMenuItem onClick={handleSendDM} className="gap-2.5 rounded-md px-2 py-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <Send className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-tight">Send a direct message</span>
                        <span className="text-xs text-muted-foreground">
                          Open a live chat with the agent
                        </span>
                      </div>
                    </DropdownMenuItem>
                    {hasSchedules && (
                      <DropdownMenuItem onClick={handleScheduleRun} className="gap-2.5 rounded-md px-2 py-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-tight">Preview scheduled run</span>
                          <span className="text-xs text-muted-foreground">
                            See how the next scheduled run will behave
                          </span>
                        </div>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* More Options */}
              <AgentMoreActions
                agent={agent}
                onUpdated={handleUpdate}
                onDeleted={() => router.push("/dashboard/agents")}
                onOpenSettings={() => setSettingsOpen(true)}
                onPublish={handlePublishClick}
                trigger={
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isActuallyReconfiguring}
                    className="h-9 w-9 border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                }
              />

              <AgentSettingsModal
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                agent={agent}
                onUpdate={handleUpdate}
              />
            </div>
          </div>
          {agent.description && (
            <div className="pt-2">
              <CardDescription className="text-sm leading-relaxed">
                {agent.description}
              </CardDescription>
            </div>
          )}
        </CardHeader>
      </Card>

      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
      {isPublishModalOpen && (
        <PublishEntityModal
          open={isPublishModalOpen}
          onOpenChange={setIsPublishModalOpen}
          entityType="agent"
          entityId={agent.id}
          initialTitle={agent.name}
          initialDescription={agent.systemPrompt ?? undefined}
          entityContext={{
            avatar: agent.avatar ?? undefined,
            description: agent.systemPrompt ?? undefined,
            status: agent.agentType ?? "Agent",
            metadata: [
              ...(agent.tools?.length ? [{ label: "Tools", value: agent.tools.length }] : []),
              ...(agent.triggers?.length ? [{ label: "Triggers", value: agent.triggers.length }] : []),
              ...(agent.schedules?.length ? [{ label: "Schedules", value: agent.schedules.length }] : []),
            ],
            capabilities: agent.tools?.map((t) => t.name ?? t.id) ?? [],
          }}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-1.5 pt-4">
        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <TabsList className="inline-flex w-full min-w-max border-b border-zinc-100/0 rounded-none bg-transparent h-auto p-0 justify-start gap-1.5">
            <TabsTrigger
              value="instructions"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              Instructions
            </TabsTrigger>
            <TabsTrigger
              value="triggers"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              Triggers
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Wrench className="w-4 h-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger
              value="knowledge"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Brain className="w-4 h-4" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Memory
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

          <TabsContent value="memory" className="mt-0 px-4 pb-4">
            <MemoryTab
              agentId={agent.id}
              agent={agent}
              isReconfiguring={isActuallyReconfiguring}
              onUpdate={handleUpdate}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
    </AgentSettingsSaveProvider>
  );
}