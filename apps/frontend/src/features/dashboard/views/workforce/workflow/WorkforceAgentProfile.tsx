"use client";

import { useState } from "react";
import { useWorkforceStore } from "@/entities/workforce/hooks/useWorkforceStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Play,
  Pencil,
  RefreshCw,
  Trash2,
  ExternalLink
} from "lucide-react";
import { InstructionsTab } from "@/entities/agents/components/tabs/InstructionsTab";
import { TriggersTab } from "@/entities/agents/components/tabs/TriggersTab";
import { ToolsTab } from "@/entities/agents/components/tabs/ToolsTab";
import { KnowledgeTab } from "@/entities/agents/components/tabs/KnowledgeTab";
import { SkillsTab } from "@/entities/agents/components/tabs/SkillsTab";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AgentSettingsModal } from "@/entities/agents/components/AgentSettingsModal";

interface WorkforceAgentProfileProps {
  agent: any;
  conversationType?: string;
  isReconfiguring?: boolean;
  onChangeAgent?: () => void;
  onDeleteAgent?: () => void;
}

export function WorkforceAgentProfile({
  agent,
  conversationType,
  isReconfiguring = false,
  onChangeAgent,
  onDeleteAgent
}: WorkforceAgentProfileProps) {
  const [activeTab, setActiveTab] = useState("instructions");
  const [popoverOpen, setPopoverOpen] = useState(false);
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

  const getStatusBadge = () => {
    if (isExecuting) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          Executing
        </span>
      );
    }

    if (isReconfiguringStatus || isActuallyReconfiguring) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          Reconfiguring
        </span>
      );
    }

    if (isBuilding) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
          <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
          Building
        </span>
      );
    }

    if (isLive) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="w-3 h-3 mr-1.5" />
          Live
        </span>
      );
    }

    if (isDraft) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
          <Clock className="w-3 h-3 mr-1.5" />
          Draft
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
        <AlertCircle className="w-3 h-3 mr-1.5" />
        Inactive
      </span>
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
    <div className="space-y-6 h-full flex flex-col p-5">

      <div className="space-y-6">
        {/* Agent Profile Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 text-slate-800">
            <div className="flex items-center justify-center shrink-0">
              <Avatar className="h-12 w-12 shadow-sm border border-zinc-200 rounded-xl relative">
                <AvatarImage src={agent.avatar || undefined} />
                <AvatarFallback className="bg-zinc-100 text-zinc-600 rounded-xl">
                  <Bot className="h-6 w-6 opacity-40" />
                </AvatarFallback>
                {isActuallyReconfiguring && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                    <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                  </div>
                )}
              </Avatar>
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate pr-2">
                {agent.name}
              </h3>
              <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-widest mt-0.5 truncate pr-2">
                {agent.agentType?.replace(/_/g, ' ') || 'AGENT NODE'}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center justify-end gap-0.5">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => toast.info('Run agent from canvas coming soon')}
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Run agent</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => window.open(`/dashboard/agents/${agent.id}`, '_blank', 'noopener,noreferrer')}
                    className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View agent details</TooltipContent>
              </Tooltip>

              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>More options</TooltipContent>
                </Tooltip>
                <PopoverContent align="end" className="w-44 p-1 rounded-xl shadow-lg border-zinc-200">
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 rounded-lg cursor-pointer text-sm text-zinc-700 font-medium transition-colors group"
                    onClick={() => {
                      setPopoverOpen(false);
                      window.open(`/dashboard/agents/${agent.id}?tab=chat`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-700 transition-colors" />
                    View agent
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 rounded-lg cursor-pointer text-sm text-zinc-700 font-medium transition-colors group"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPopoverOpen(false);
                      setSettingsOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-700 transition-colors" />
                    Edit agent
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 rounded-lg cursor-pointer text-sm text-zinc-700 font-medium transition-colors group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopoverOpen(false);
                      onChangeAgent?.();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-700 transition-colors" />
                    Change agent
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer text-sm font-medium transition-colors text-zinc-700 group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopoverOpen(false);
                      onDeleteAgent?.();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-zinc-500 group-hover:text-red-600 transition-colors" />
                    Delete node
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipProvider>
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <div className="space-y-2">
            <h4 className="text-[13px] font-bold text-zinc-900 tracking-wide">Description</h4>
            <p className="text-[14px] text-zinc-600 leading-relaxed">
              {agent.description || 'No description provided.'}
            </p>
          </div>
        )}

        {/* Sub-components / Settings modal */}
        <AgentSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          agent={agent}
          onUpdate={handleUpdate}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
          <TabsList className="inline-flex w-full min-w-max border-b border-zinc-100/0 rounded-none bg-transparent h-auto p-0 justify-start gap-1.5">
            <TabsTrigger
              value="instructions"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              Instructions
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="px-3.5 py-2.5 rounded-xl cursor-pointer outline-none data-[state=active]:bg-indigo-50/80 data-[state=active]:text-indigo-600 hover:bg-zinc-50 hover:text-zinc-700 font-semibold text-zinc-500 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Skills
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
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto mt-4 -mx-5 px-5">
          <TabsContent value="instructions" className="mt-0 pb-10">
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

          <TabsContent value="skills" className="mt-0 pb-10">
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

          <TabsContent value="triggers" className="mt-0 pb-10">
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

          <TabsContent value="tools" className="mt-0 pb-10">
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

          <TabsContent value="knowledge" className="mt-0 pb-10">
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
