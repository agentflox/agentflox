"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChatMessageList,
  RenderedMessage,
  MessageFollowup,
  MessageAction,
} from '@/entities/chats/components/MessageList';
import { ChatComposer } from '@/entities/chats/components/ChatComposer';
import { trpc } from '@/lib/trpc';
import { toolService } from '@/services/tool.service';
import { toast } from 'sonner';
import { MessageRole } from '@agentflox/database/src/generated/prisma/client';
import { ToolPreview } from '../../../../entities/tools/components/ToolBuilderPreview';
import { StreamingMessage } from '../../../../entities/tools/components/StreamingMessage';
import { useBuilderStream } from '@/entities/tools/hooks/useBuilderStream';
import { ResizableSplitLayout } from '@/components/layout/ResizableSplitLayout';
import { ToolChatSkeleton } from '../../../../entities/tools/components/ToolChatSkeleton';
import type { ToolDraft, UserContext, ConversationState } from '@/entities/tools/types';
import {
  ChevronLeft, Hammer, FileText, Share2, Globe, MoreHorizontal, Home, CopyPlus, Settings2,
  Wrench, Copy, Download, Trash2, HelpCircle, Bot, Check, History, GitBranch, Flag, Play, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { SupportAssistantModal } from "@/components/assistant/SupportAssistantModal";
import { ToolVersionsSheet } from "@/entities/tools/components/ToolVersionsSheet";
import { useDefaultModel } from "@/entities/models/hooks/useModels";
import { formatModelErrorMessage } from "@/entities/models/utils/formatModelError";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { BugReportModal } from "@/entities/tools/components/BugReportModal";
import dynamic from "next/dynamic";
import { ToolCodeView, type ToolCodeSavePayload, type ToolCodeViewHandle } from "./ToolCodeView";
import { useToolRun } from "@/entities/tools/hooks/useToolRun";
import { useToolRunHistory } from "@/entities/tools/hooks/useToolRunHistory";
import type { BuilderInputField } from "@/entities/tools/types/builder";

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// Lazy-load secondary panels — Code view stays eager (needs imperative ref)
const ToolNoCodeView = dynamic(() => import("./ToolNoCodeView").then((m) => m.ToolNoCodeView), {
  ssr: false,
  loading: () => <PanelLoading label="Loading builder…" />,
});
const ToolLogView = dynamic(() => import("./ToolLogView").then((m) => m.ToolLogView), {
  ssr: false,
  loading: () => <PanelLoading label="Loading logs…" />,
});

interface ToolAIBuilderViewProps {
  toolId?: string;
  onClose?: () => void;
  onToolCreated?: (toolId: string) => void;
  onProgressUpdate?: (progress: {
    toolName?: string;
    avatar?: string;
    description?: string;
    toolType?: string;
    completedSteps?: string[];
    currentStep?: string;
  }) => void;
}

export const ToolAIBuilderView: React.FC<ToolAIBuilderViewProps> = ({
  toolId,
  onClose,
  onToolCreated,
  onProgressUpdate,
}) => {
  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [followupsMap, setFollowupsMap] = useState<Map<string, MessageFollowup[]>>(new Map());
  const [toolDraft, setToolDraft] = useState<ToolDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showToolProfile, setShowToolProfile] = useState(false);
  const [hasStepsForPreview, setHasStepsForPreview] = useState(false);
  const [toolDescription, setToolDescription] = useState<string>("");

  // Track optimistic message IDs to remove them when confirmed
  const optimisticMessageIds = useRef<Set<string>>(new Set());

  // Fetch messages from database
  const { data: messagesData, refetch: refetchMessages, isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 30_000,
    }
  );

  // Reuses page-level cache when navigating from /tools/build/ai/[id]
  const { data: toolData, isLoading: isLoadingTool, refetch: refetchTool } = trpc.tool.get.useQuery(
    { id: toolId!, conversationType: 'TOOL_BUILDER' },
    {
      enabled: !!toolId,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  // --- Tool Builder Header State ---
  const router = useRouter();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"build" | "run">("build");
  const [viewCode, setViewCode] = useState(false);
  const [name, setName] = useState("");
  const [toolIcon, setToolIcon] = useState("");
  const [toolColor, setToolColor] = useState("");
  const [sopOverride, setSopOverride] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (toolData?.name) setName(toolData.name);
    if ((toolData as any)?.icon) setToolIcon((toolData as any).icon);
    if ((toolData as any)?.color) setToolColor((toolData as any).color);
    setSopOverride(null);
  }, [toolData?.name, (toolData as any)?.icon, (toolData as any)?.color, toolData?.id, (toolData as any)?.systemPrompt]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Modals
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [agentPromptOpen, setAgentPromptOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentPromptDraft, setAgentPromptDraft] = useState("");
  useEffect(() => {
    const p = (toolData as any)?.functionSchema?.["x-agentPrompt"];
    if (p) setAgentPromptDraft(p);
  }, [toolData]);

  const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();
  const [publishOpen, setPublishOpen] = useState(false);
  const isEditing = !!toolData?.id;

  const codeViewRef = useRef<ToolCodeViewHandle>(null);
  const codeDraftRef = useRef<ToolCodeSavePayload | null>(null);
  const updateMutation = trpc.compositeTool.update.useMutation({
    onSuccess: (updated) => {
      toast.success("Changes saved.");
      setHasChanges(false);
      utils.tool.list.invalidate();
      if (toolData?.id) {
        utils.tool.get.setData(
          { id: toolData.id, conversationType: "TOOL_BUILDER" },
          (prev: any) => (prev ? { ...prev, ...updated } : updated)
        );
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.compositeTool.delete.useMutation({
    onSuccess: () => {
      toast.success("Tool deleted.");
      utils.tool.list.invalidate();
      if (onClose) onClose();
      else router.push("/tools");
    },
    onError: (err) => toast.error(err.message),
  });

  const cloneMutation = trpc.compositeTool.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success(`"${cloned.name}" created.`);
      utils.tool.list.invalidate();
      setCloneOpen(false);
      router.push(`/tools/flow/${cloned.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConvertToFlowMode = async () => {
    if (!toolData?.id) return;
    try {
      await updateMutation.mutateAsync({
        id: toolData.id,
        mode: "MANUAL",
      });
      router.push(`/dashboard/tools/build/flow/${toolData.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to convert tool");
    }
  };

  const agentPromptMutation = trpc.compositeTool.update.useMutation({
    onSuccess: () => {
      toast.success("Agent prompt saved.");
      setAgentPromptOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Inputs state (must be declared before handleSave)
  const [inputs, setInputs] = React.useState<BuilderInputField[]>([]);
  React.useEffect(() => {
    const fn =
      (toolData as any)?.functionSchema ||
      (toolDraft as any)?.functionSchema ||
      null;
    if (!fn && !toolData && !toolDraft) return;

    const props =
      fn?.parameters?.properties ||
      (toolData as any)?.params_schema?.properties ||
      {};
    const required: string[] =
      fn?.parameters?.required ||
      (toolData as any)?.params_schema?.required ||
      [];

    const nextInputs = Object.entries(props)
      .sort(([, a]: [string, any], [, b]: [string, any]) => (a?.order ?? 999) - (b?.order ?? 999))
      .map(([propName, schema]: [string, any]) => ({
        name: propName,
        label: schema.title || propName.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        type: (schema.type as any) || "string",
        description: schema.description || "",
        required: required.includes(propName),
        defaultValue: schema.default ?? schema.examples?.[0] ?? undefined,
        placeholder: schema.examples?.[0] ?? "",
        uiType: schema.metadata?.content_type ?? undefined,
        fillMode: schema.metadata?.fillMode ?? undefined,
      })) as BuilderInputField[];

    setInputs((prev) =>
      JSON.stringify(prev) === JSON.stringify(nextInputs) ? prev : nextInputs
    );
  }, [toolData, toolDraft]);

  const handleSetInputs = useCallback<React.Dispatch<React.SetStateAction<BuilderInputField[]>>>((value) => {
    setHasChanges(true);
    setInputs(value);
  }, []);

  // Handlers
  const saveCodeViewPayload = useCallback((data: ToolCodeSavePayload) => {
    if (!isEditing || !toolData?.id) {
      toast.error("Save the tool first before updating.");
      return;
    }

    const existingSteps: any[] = (toolData as any)?.steps ?? [];
    const codeStepRaw = existingSteps.find(
      (s: any) => s.type === "PYTHON" || s.type === "JAVASCRIPT"
    ) ?? existingSteps[0];

    const normalizedSteps = existingSteps.map((s: any) => {
      let cfg: any = {};
      try { cfg = s.config ? (typeof s.config === "string" ? JSON.parse(s.config) : s.config) : {}; } catch { }
      if (s.id === codeStepRaw?.id) {
        cfg = {
          ...cfg,
          code: data.code,
          packages: data.packages,
          runtimeCommands: data.runtimeCommands,
          ...(data.advancedSettings || {}),
        };
      }
      return {
        id: s.id,
        name: s.name,
        type: data.language === "JAVASCRIPT" && s.id === codeStepRaw?.id ? "JAVASCRIPT" : s.type,
        config: cfg,
      };
    });

    const properties: any = {};
    const required: string[] = [];
    data.inputs.forEach((input, index) => {
      if (!input.name) return;
      properties[input.name] = {
        type: input.type,
        title: input.label || input.name,
        description: input.description || "",
        order: index,
        ...(input.defaultValue !== undefined ? { default: input.defaultValue } : {}),
        ...(input.placeholder ? { examples: [input.placeholder] } : {}),
        metadata: {
          ...(input.uiType ? { content_type: input.uiType } : {}),
          ...(input.fillMode ? { fillMode: input.fillMode } : {}),
        },
      };
      if (input.required) required.push(input.name);
    });

    const currentSchema = ((toolData as any)?.functionSchema as any) ?? {};
    updateMutation.mutate({
      id: toolData.id,
      name,
      systemPrompt: sopOverride ?? (toolData as any)?.systemPrompt ?? (toolDraft as any)?.systemPrompt ?? undefined,
      functionSchema: {
        ...currentSchema,
        parameters: { ...currentSchema?.parameters, type: "object", properties, required },
      },
      steps: normalizedSteps,
    });
  }, [isEditing, toolData, name, updateMutation, sopOverride, toolDraft]);

  const handleSave = useCallback(() => {
    if (!isEditing) { toast.error("Save the tool first before updating."); return; }
    if (!name.trim()) { toast.error("Tool name cannot be empty."); return; }

    const codePayload = codeViewRef.current?.getSavePayload() ?? codeDraftRef.current;
    if (codePayload) {
      saveCodeViewPayload({ ...codePayload, inputs });
      return;
    }

    const properties: any = {};
    const required: string[] = [];
    inputs.forEach((input, index) => {
      properties[input.name] = {
        type: input.type,
        title: input.label || input.name,
        description: input.description,
        order: index,
        default: input.defaultValue,
        examples: input.placeholder ? [input.placeholder] : undefined,
        metadata: {
          content_type: input.uiType,
          fillMode: input.fillMode,
        }
      };
      if (input.required) required.push(input.name);
    });

    const currentSchema = ((toolData as any)?.functionSchema as any) ?? {};

    updateMutation.mutate({
      id: toolData.id,
      name,
      systemPrompt: sopOverride ?? (toolData as any)?.systemPrompt ?? (toolDraft as any)?.systemPrompt ?? undefined,
      functionSchema: {
        ...currentSchema,
        parameters: {
          ...currentSchema?.parameters,
          type: "object",
          properties,
          required,
        },
      },
    });
  }, [isEditing, name, toolData?.id, updateMutation, inputs, toolData, saveCodeViewPayload, sopOverride, toolDraft]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/dashboard/tools/build/flow/${toolData?.id ?? ""}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setLinkCopied(false), 2000);
  }, [toolData?.id]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/dashboard/tools/build/flow/${toolData?.id ?? ""}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard.");
  }, [toolData?.id]);

  const handleExport = useCallback(() => {
    if (!toolData) { toast.error("No tool to export."); return; }
    const blob = new Blob([JSON.stringify(toolData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toolData.name ?? "tool"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tool exported.");
  }, [toolData]);

  const handlePublish = useCallback(() => {
    checkProfileAndProceed(() => setPublishOpen(true));
  }, [checkProfileAndProceed]);

  const handleDelete = useCallback(() => setDeleteOpen(true), []);

  const handleCloneOpen = useCallback(() => {
    setCloneName(`${toolData?.name ?? "Tool"} (copy)`);
    setCloneOpen(true);
  }, [toolData?.name]);

  const handleSaveAgentPrompt = useCallback(() => {
    if (!isEditing) return;
    const currentSchema = ((toolData as any)?.functionSchema as any) ?? {};
    agentPromptMutation.mutate({
      id: toolData.id,
      functionSchema: { ...currentSchema, "x-agentPrompt": agentPromptDraft },
    });
  }, [isEditing, toolData, agentPromptDraft, agentPromptMutation]);

  const handleBack = useCallback(() => {
    if (onClose) onClose();
    else router.push("/dashboard/tools");
  }, [onClose, router]);

  const toolRunState = useToolRun({ initialTool: toolData, inputs });
  const toolRunHistory = useToolRunHistory(toolData?.id);

  // Merge DB runs into live run history (DB as base, live runs override/prepend)
  const mergedRunHistory = React.useMemo(() => {
    const liveIds = new Set<string>();
    for (const r of toolRunState.runHistory) {
      liveIds.add(r.id);
      if (r.serverRunId) liveIds.add(r.serverRunId);
    }
    const dbOnly = toolRunHistory.dbRuns.filter(
      (r) => !liveIds.has(r.id) && !(r.serverRunId && liveIds.has(r.serverRunId)),
    );
    return [...toolRunState.runHistory, ...dbOnly];
  }, [toolRunState.runHistory, toolRunHistory.dbRuns]);

  // Sync completed live runs into DB history cache
  React.useEffect(() => {
    for (const run of toolRunState.runHistory) {
      if (run.status !== "running") {
        toolRunHistory.mergeLiveRun(run);
      }
    }
  }, [toolRunState.runHistory, toolRunHistory.mergeLiveRun]);

  // --- End Tool Builder Header State ---

  // Mutations
  const [isInitializingBuilder, setIsInitializingBuilder] = useState(false);
  // Prevent duplicate initialize calls (also reset on failure so remount/retry can proceed)
  const hasInitialized = useRef(false);
  const initializeBuilder = async (params: { toolId?: string; conversationId?: string; skipWelcome?: boolean }) => {
    try {
      setIsInitializingBuilder(true);
      const res = await toolService.tools.builder.initialize(params);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.userMessage || error.message || error.error || 'Failed to initialize conversation');
      }
      const data = await res.json();

      setConversationId(data.conversationId);
      setConversationState(data.conversationState);
      setUserContext(data.userContext);
      setToolDraft(data.conversationState.toolDraft);

      if (toolId) {
        await refetchTool();
      }

      const result = await refetchMessages();

      if (result.data?.messages) {
        const followupsMapFromDB = new Map<string, MessageFollowup[]>();
        result.data.messages.forEach(msg => {
          const followupsFromMetadata = (msg as any).followups;
          if (followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
            followupsMapFromDB.set(msg.id, followupsFromMetadata);
          }
        });

        if (data.followups?.length) {
          const assistantMessages = result.data.messages.filter(m => m.role === 'ASSISTANT');
          const latestAssistant = assistantMessages[assistantMessages.length - 1];
          if (latestAssistant) {
            followupsMapFromDB.set(latestAssistant.id, data.followups);
          }
        }

        setFollowupsMap(followupsMapFromDB);
      }

      setIsInitializing(false);
    } catch (error: any) {
      hasInitialized.current = false;
      toast.error(error.message || 'Failed to initialize conversation');
      setIsInitializing(false);
    } finally {
      setIsInitializingBuilder(false);
    }
  };

  // ─── Streaming message handler callbacks ──────────────────────────────────

  const handleMessageComplete = useCallback(async (data: any) => {
    // Do NOT call setIsSending(false) yet — keep <StreamingMessage> visible
    // while we wait for the DB refetch. The component already renders
    // streamingContent when isStreaming=false, so the user sees the full
    // response text uninterrupted.
    setConversationState(data.conversationState);
    setToolDraft(data.toolDraft);

    const result = await refetchMessages();

    // Now batch setIsSending(false) together with setMessages() in one render.
    // React 18 automatic batching ensures StreamingMessage and DB messages
    // swap in the same frame — zero blank gap.
    if (result.data?.messages) {
      optimisticMessageIds.current.clear();
      const allMessages = result.data.messages;
      const dbMessages: RenderedMessage[] = allMessages.map((msg, index) => {
        const followupsFromMetadata = (msg as any).followups;
        let followups: MessageFollowup[] | undefined = undefined;
        if (msg.role === 'ASSISTANT') {
          const metadata = (msg as any).metadata || {};
          const followupsConsumed = metadata.followupsConsumed === true;
          const hasUserMessageAfter = allMessages.slice(index + 1).some(m => m.role === 'USER');
          if (!followupsConsumed && !hasUserMessageAfter && followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
            followups = followupsFromMetadata;
          }
        }
        return { id: msg.id, role: msg.role as MessageRole, content: msg.content, createdAt: msg.createdAt, followups };
      });
      // Batch: hide streaming indicator + show DB messages in one paint
      isSendingRef.current = false;
      setIsSending(false);
      setMessages(dbMessages);
      const newFollowupsMap = new Map<string, MessageFollowup[]>();
      dbMessages.forEach(msg => { if (msg.followups) newFollowupsMap.set(msg.id, msg.followups); });
      setFollowupsMap(newFollowupsMap);
    } else {
      // Fallback: no data returned — still need to clear sending state
      isSendingRef.current = false;
      setIsSending(false);
    }

    if (data.followups?.length && result.data?.messages) {
      const assistantMessages = result.data.messages.filter(m => m.role === 'ASSISTANT');
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      if (latestAssistant) {
        const metadata = (latestAssistant as any).metadata || {};
        const followupsConsumed = metadata.followupsConsumed === true;
        if (!followupsConsumed) {
          setFollowupsMap(prev => { const m = new Map(prev); m.set(latestAssistant.id, data.followups!); return m; });
          setMessages(prev => prev.map(msg => msg.id === latestAssistant.id ? { ...msg, followups: data.followups } : msg));
        }
      }
    }

    const isLaunchStage = data.conversationState?.stage === 'launch';
    const hasSteps = data.toolDraft?.steps && Array.isArray(data.toolDraft.steps) && data.toolDraft.steps.length > 0;
    // Trigger the ready animation in ToolPreview; actual profile reveal happens in onReadyComplete after 3s
    if ((isLaunchStage || hasSteps) && !showToolProfile && !hasStepsForPreview) setHasStepsForPreview(true);
    // Pull persisted steps + functionSchema into toolData after AI generation
    if ((isLaunchStage || hasSteps) && toolId) {
      void refetchTool();
    }

    onProgressUpdate?.({
      toolName: data.toolDraft.name,
      avatar: data.toolDraft.avatar,
      description: data.toolDraft.description,
      toolType: data.toolDraft.toolType,
      currentStep: data.conversationState.stage,
    });
  }, [refetchMessages, toolData, showToolProfile, hasStepsForPreview, toolId, refetchTool, onProgressUpdate]);

  const handleMessageError = useCallback((errorMessage: string) => {
    isSendingRef.current = false;
    setIsSending(false);
    setMessages(prev => prev.filter(msg => !optimisticMessageIds.current.has(msg.id)));
    optimisticMessageIds.current.clear();
    const friendly = formatModelErrorMessage(errorMessage, 'Failed to process message');
    toast.error(friendly);
    setMessages(prev => [...prev, {
      id: `error_${Date.now()}`,
      role: 'ASSISTANT' as MessageRole,
      content: `Error: ${friendly}`,
      createdAt: new Date(),
    }]);
  }, []);

  // SSE-based streaming hook — replaces the old TRPC messageMutation
  const {
    thinkingSteps,
    thinkingStep,
    thinkingNode,
    streamingContent,
    isStreaming,
    sendMessage: sendStreamMessage,
  } = useBuilderStream({
    onComplete: handleMessageComplete,
    onError: handleMessageError,
  });

  const [isLaunching, setIsLaunching] = useState(false);
  const launchBuilder = async (params: { conversationId: string; toolId: string }) => {
    try {
      setIsLaunching(true);
      const res = await toolService.tools.builder.launch(params);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.userMessage || error.message || error.error || 'Failed to launch tool');
      }
      const data = await res.json();

      toast.success('Tool created successfully!');
      onToolCreated?.(data.toolId);

      if (toolId) {
        await refetchTool();
      }

      setShowToolProfile(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch tool');
    } finally {
      setIsLaunching(false);
    }
  };

  // Sync messages from database (only when not sending to avoid conflicts)
  useEffect(() => {
    if (messagesData?.messages && conversationId && !isSendingRef.current) {
      const allMessages = messagesData.messages;

      const dbMessages: RenderedMessage[] = allMessages.map((msg, index) => {
        // Get follow-ups from message data (persisted in metadata)
        const followupsFromMetadata = (msg as any).followups;

        // Only show follow-ups if:
        // 1. The message has follow-ups in metadata
        // 2. The follow-ups haven't been consumed (check metadata.followupsConsumed)
        // 3. This is the LAST assistant message (no user messages after it)
        let followups: MessageFollowup[] | undefined = undefined;

        if (msg.role === 'ASSISTANT') {
          // Check if follow-ups are consumed in metadata (persisted state)
          const metadata = (msg as any).metadata || {};
          const followupsConsumed = metadata.followupsConsumed === true;

          // Check if there are any user messages after this assistant message
          const hasUserMessageAfter = allMessages.slice(index + 1).some(m => m.role === 'USER');

          // ✅ CRITICAL: Only show follow-ups if not consumed AND no user message after AND has follow-ups in metadata
          if (!followupsConsumed && !hasUserMessageAfter && followupsFromMetadata && Array.isArray(followupsFromMetadata)) {
            followups = followupsFromMetadata;
          }
        }

        return {
          id: msg.id,
          role: msg.role as MessageRole,
          content: msg.content,
          createdAt: msg.createdAt,
          followups,
        };
      });

      if (dbMessages.length > 0) {
        setMessages(dbMessages);
        // Clear optimistic messages since we have DB messages
        optimisticMessageIds.current.clear();

        // ✅ Update followupsMap to only include follow-ups that are actually shown
        const newFollowupsMap = new Map<string, MessageFollowup[]>();
        dbMessages.forEach(msg => {
          if (msg.followups) {
            newFollowupsMap.set(msg.id, msg.followups);
          }
        });
        setFollowupsMap(newFollowupsMap);
      }
    }
  }, [messagesData, conversationId]);

  // Show ToolProfile when steps have been generated in the draft
  useEffect(() => {
    const hasSteps = toolDraft?.steps && Array.isArray(toolDraft.steps) && toolDraft.steps.length > 0;
    // Also check persisted steps on the CompositeTool (stored as Json, cast needed)
    const hasDataSteps = toolData && Array.isArray((toolData as any).steps) && ((toolData as any).steps as any[]).length > 0;

    if ((hasSteps || hasDataSteps) && !showToolProfile) {
      setShowToolProfile(true);
    }
  }, [toolData, toolDraft, showToolProfile]);

  // Initialize conversation on mount (hasInitialized ref is declared above initializeBuilder)
  useEffect(() => {
    // Prevent multiple initializations
    if (conversationId || isInitializingBuilder || hasInitialized.current) return;

    // If toolId is provided, wait for tool data to load first
    if (toolId && isLoadingTool) return;

    hasInitialized.current = true;

    // Pass toolId to the backend — it will find the existing conversation for
    // this tool (or create a new one on first open). No need to look up
    // toolData?.conversations here; the backend owns that logic now.
    initializeBuilder({ toolId });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, isLoadingTool, conversationId]);


  // Mutation to mark follow-ups as consumed
  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation();
  const { data: defaultModel } = useDefaultModel();
  const selectedModelId = defaultModel?.id ?? null;

  // ✅ Update handleSendMessage to update UI optimistically before mutation
  const handleSendMessage = useCallback(async (
    message: string,
    options?: { contexts?: any[]; mentions?: any[]; attachments?: any[]; modelId?: string }
  ) => {
    if (!message.trim() || isSending || !conversationId) return;

    const optimisticId = `optimistic_${Date.now()}`;
    const userMessage: RenderedMessage = {
      id: optimisticId,
      role: 'USER' as MessageRole,
      content: message,
      createdAt: new Date(),
    };

    // Track this optimistic message
    optimisticMessageIds.current.add(optimisticId);
    isSendingRef.current = true;

    // ✅ IMMEDIATELY clear follow-ups from UI and show user message (optimistic update)
    setMessages(prev => [
      ...prev.map(msg => ({ ...msg, followups: undefined })),
      userMessage
    ]);
    setFollowupsMap(new Map()); // Clear all followups from state
    setIsSending(true);

    // Mark all existing assistant messages' follow-ups as consumed in the database (background operation)
    const assistantMessages = messages.filter(msg => msg.role === 'ASSISTANT');

    const consumePromises = assistantMessages.map(msg =>
      markFollowupsConsumedMutation.mutateAsync({ messageId: msg.id }).catch(err => {
        console.error('Failed to mark follow-ups as consumed:', err);
      })
    );

    // Run follow-up mutations in background without blocking
    Promise.all(consumePromises).catch(() => { });

    const resolvedToolId = toolId || (toolDraft as any)?.id || toolData?.id;
    await sendStreamMessage({
      conversationId,
      message,
      toolId: resolvedToolId,
      modelId: options?.modelId ?? selectedModelId,
      contexts: options?.contexts,
      mentions: options?.mentions,
      attachments: options?.attachments,
    });
  }, [sendStreamMessage, conversationId, isSending, messages, markFollowupsConsumedMutation, toolId, toolDraft, toolData, selectedModelId]);

  // ✅ Update handleFollowupClick to wait for mutation
  const handleFollowupClick = useCallback(async (messageId: string, followup: MessageFollowup) => {
    // ✅ IMMEDIATELY remove follow-ups from UI (optimistic update)
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, followups: undefined } : msg
    ));

    // Remove from state map
    setFollowupsMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });

    // ✅ Wait for mutation to complete before sending message
    try {
      await markFollowupsConsumedMutation.mutateAsync({ messageId });
    } catch (error) {
      console.error('Failed to mark follow-ups as consumed:', error);
    }

    // Send the follow-up message
    handleSendMessage(followup.label);
  }, [handleSendMessage, markFollowupsConsumedMutation]);

  const handleActionClick = useCallback((messageId: string, action: MessageAction) => {
    const resolvedToolId = toolId || (toolDraft as any)?.id || toolData?.id;
    const canLaunch = action.id === 'launch-tool' &&
      (toolDraft?.status === 'ready' || conversationState?.stage === 'launch') &&
      conversationId &&
      resolvedToolId;
    if (canLaunch) {
      launchBuilder({ conversationId: conversationId!, toolId: resolvedToolId! });
      return;
    }
    if (action.label) handleSendMessage(action.label);
  }, [handleSendMessage, conversationId, toolDraft, toolId, toolData, conversationState]);

  // Resize functionality replaced by ResizableSplitLayout

  if (isInitializing) {
    return <ToolChatSkeleton />;
  }

  // Merge messages with followups (messages already have follow-ups set correctly from useEffect)
  // Prefer follow-ups from the message object (which respects consumed state) over the map
  const messagesWithFollowups = messages.map(msg => ({
    ...msg,
    followups: msg.followups || followupsMap.get(msg.id),
  }));

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* ── Top Bar / Header ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b shrink-0 h-14 gap-3">
        {/* Left: back + name */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleBack}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer"
          >
            <Home className="h-4 w-4 text-zinc-600" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <IconColorSelector
              icon={toolIcon}
              color={toolColor}
              onIconChange={(newIcon) => {
                setToolIcon(newIcon);
                if (toolData?.id) updateMutation.mutate({ id: toolData.id, icon: newIcon });
              }}
              onColorChange={(newColor) => {
                setToolColor(newColor);
                if (toolData?.id) updateMutation.mutate({ id: toolData.id, color: newColor });
              }}
            >
              <div
                className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md text-base font-semibold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: toolIcon ? toolColor : '#f4f4f5', color: toolIcon ? '#ffffff' : '#27272a' }}
              >
                {toolIcon ? <EntityIcon icon={toolIcon} size={16} fallback={Hammer} /> : "T"}
              </div>
            </IconColorSelector>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false); }}
                autoFocus
                className="h-8 text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1.5 outline-none focus:ring-1 ring-indigo-500/50 w-auto min-w-[120px] py-1"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="h-8 text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1.5 rounded-sm transition-colors py-1.5 truncate max-w-[200px]"
              >
                {name || "New Tool"}
              </h1>
            )}
          </div>

          {/* Status pill */}
          {isEditing && hasChanges ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-orange-100 bg-orange-50/50 text-sm font-medium text-orange-600 shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Unsaved
            </div>
          ) : isEditing ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-emerald-100 bg-emerald-50/50 text-sm font-medium text-emerald-600 shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-amber-100 bg-amber-50/50 text-sm font-medium text-amber-600 shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </div>
          )}
        </div>

        {/* Center: Build / Run tabs */}
        <div className="flex items-center justify-center flex-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="build" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Hammer className="w-3 h-3" />Build
              </TabsTrigger>
              <TabsTrigger value="run" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Play className="w-3 h-3" />Run
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {toolRunState.isRunningTool ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs font-semibold gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
              onClick={() => toolRunState.cancelCompositeTool()}
            >
              <X className="h-3.5 w-3.5" />
              Cancel run
            </Button>
          ) : showToolProfile && toolData ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs hover:border-zinc-300 hover:bg-zinc-100"
              onClick={() => {
                setActiveTab("run");
                toolRunState.runCompositeTool();
              }}
            >
              <Play className="h-3 w-3 mr-1.5" />
              Run tool
            </Button>
          ) : null}

          {showToolProfile && toolData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1.5 ${activeTab === "run" ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <Label htmlFor="view-code" className="text-xs text-gray-500 whitespace-nowrap">View code</Label>
                  <Switch
                    id="view-code"
                    checked={viewCode}
                    onCheckedChange={setViewCode}
                    disabled={activeTab === "run"}
                  />
                </div>
              </TooltipTrigger>
              {activeTab === "run" && (
                <TooltipContent side="bottom">Switch to Build mode to view code</TooltipContent>
              )}
            </Tooltip>
          )}

          <Button className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={updateMutation.isPending || !isEditing}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-200 text-zinc-600 hover:border-zinc-300">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="gap-4"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-4" onClick={() => setAgentPromptOpen(true)} disabled={!isEditing}>
                <Bot className="h-4 w-4" />Edit agent prompt
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-4" onClick={handleConvertToFlowMode} disabled={!isEditing || updateMutation.isPending}>
                <GitBranch className="h-4 w-4" />Convert to flow mode
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-4" onClick={handleCloneOpen} disabled={!isEditing}>
                <CopyPlus className="h-4 w-4" />Clone
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-4" onClick={handleCopyLink} disabled={!isEditing}>
                <Copy className="h-4 w-4" />Copy link
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-4" onClick={handleExport} disabled={!isEditing}>
                <Download className="h-4 w-4" />Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-4" onClick={() => setVersionsOpen(true)} disabled={!isEditing}>
                <History className="h-4 w-4" />Version history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-4" onClick={() => setBugReportOpen(true)}>
                <Flag className="h-4 w-4" />Report bug
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-4" onClick={() => setSupportModalOpen(true)}>
                <HelpCircle className="h-4 w-4" />Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-4 text-red-600 focus:text-red-700" onClick={handleDelete} disabled={!isEditing}>
                <Trash2 className="h-4 w-4" />Delete tool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 ml-1 cursor-pointer"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 min-h-0">
        <ResizableSplitLayout
          mainPanelDefaultSize={40}
          mainPanelMinSize={30}
          sidePanelDefaultSize={60}
          sidePanelMinSize={50}
          MainContent={
            <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden relative">
                <ChatMessageList
                  messages={messagesWithFollowups}
                  label="Agentflox Tool Builder"
                  pendingAssistantMessage={
                    isSending ? (
                      <StreamingMessage
                        thinkingSteps={thinkingSteps}
                        currentStep={thinkingStep}
                        currentNode={thinkingNode}
                        streamingContent={streamingContent}
                        isStreaming={isStreaming}
                        label="Agentflox Tool Builder"
                      />
                    ) : null
                  }
                  onFollowupClick={handleFollowupClick}
                  onActionClick={handleActionClick}
                />
              </div>
              <div className="flex-shrink-0 border-t bg-white px-4 py-3">
                <ChatComposer
                  onSend={handleSendMessage}
                  isSending={isSending}
                  disabled={isSending || !conversationId}
                  modelId={selectedModelId}
                  minHeight={80}
                />
              </div>
            </div>
          }
          SidePanelContent={
            <div className="h-full border-l bg-gradient-to-b from-background to-muted/20 overflow-hidden flex flex-col">
              {showToolProfile && toolData ? (
                <main className="flex-1 overflow-hidden h-full flex flex-col relative">
                  {activeTab === "build" ? (
                    <>
                      <div className={viewCode ? "h-full flex flex-col" : "hidden"}>
                        <ToolCodeView
                          ref={codeViewRef}
                          toolData={toolData}
                          toolDraft={toolDraft}
                          inputs={inputs}
                          setInputs={handleSetInputs}
                          runInput={toolRunState.runInput}
                          setRunInput={toolRunState.setRunInput}
                          isRunningTool={toolRunState.isRunningTool}
                          runCompositeTool={toolRunState.runCompositeTool}
                          runHistory={toolRunState.runHistory}
                          liveRunState={toolRunState.liveRunState}
                          selectedRunId={toolRunState.selectedRunId}
                          onDraftChange={(draft) => { codeDraftRef.current = draft; }}
                          onDirtyChange={() => setHasChanges(true)}
                          isSaving={updateMutation.isPending}
                        />
                      </div>
                      <div className={!viewCode ? "flex-1 min-h-0 h-full w-full flex flex-col" : "hidden"}>
                        <ToolNoCodeView
                          toolData={{
                            ...toolData,
                            systemPrompt:
                              sopOverride ??
                              (toolData as any)?.systemPrompt ??
                              (toolDraft as any)?.systemPrompt,
                          }}
                          toolDraft={
                            toolDraft
                              ? {
                                ...toolDraft,
                                systemPrompt:
                                  sopOverride ??
                                  (toolDraft as any)?.systemPrompt ??
                                  (toolData as any)?.systemPrompt,
                              }
                              : toolDraft
                          }
                          inputs={inputs}
                          runInput={toolRunState.runInput}
                          setRunInput={toolRunState.setRunInput}
                          isRunningTool={toolRunState.isRunningTool}
                          runCompositeTool={toolRunState.runCompositeTool}
                          runHistory={toolRunState.runHistory}
                          selectedRunId={toolRunState.selectedRunId}
                          onSopChange={(sop) => {
                            setSopOverride(sop);
                            setHasChanges(true);
                            setToolDraft((prev) =>
                              prev ? ({ ...prev, systemPrompt: sop } as any) : prev
                            );
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 min-h-0 h-full w-full flex flex-col">
                      <ToolLogView
                        {...toolRunState}
                        runHistory={mergedRunHistory}
                        setRunHistory={(updater) => {
                          // Forward local deletes back into the live state
                          toolRunState.setRunHistory(updater);
                        }}
                        inputs={inputs}
                        onDeleteRun={toolRunHistory.deleteRun}
                        onLoadMore={toolRunHistory.loadMore}
                        hasMore={toolRunHistory.hasMore}
                        loadingMore={toolRunHistory.loadingMore}
                      />
                    </div>
                  )}
                </main>
              ) : (
                <ToolPreview
                  hasSteps={hasStepsForPreview}
                  onReadyComplete={() => setShowToolProfile(true)}
                />
              )}
            </div>
          }
          isPanelOpen={true}
        />
      </div>

      {/* ── Modals ── */}
      <BugReportModal isOpen={bugReportOpen} onClose={() => setBugReportOpen(false)} entityType="tool" entityId={toolData?.id} onOpenSupport={() => setSupportModalOpen(true)} />
      <SupportAssistantModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
      <ToolVersionsSheet toolId={toolData?.id as string} isOpen={versionsOpen} onClose={() => setVersionsOpen(false)} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toolData?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The tool and all its configuration will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteMutation.mutate({ id: toolData!.id })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Clone Tool</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm">New tool name</Label>
            <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="Tool name…" className="h-9" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloneOpen(false)}>Cancel</Button>
            <Button onClick={() => cloneMutation.mutate({ id: toolData!.id, name: cloneName })} disabled={!cloneName.trim() || cloneMutation.isPending}>
              {cloneMutation.isPending ? "Cloning…" : "Clone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={agentPromptOpen} onOpenChange={setAgentPromptOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bot className="h-4 w-4" />Edit Agent Prompt</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-zinc-500">This prompt is injected when an AI agent uses this tool to understand its purpose and constraints.</p>
            <Textarea value={agentPromptDraft} onChange={(e) => setAgentPromptDraft(e.target.value)} placeholder="You are a helpful assistant that…" className="min-h-[180px] text-sm resize-none focus-visible:ring-1" />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="border border-zinc-200 hover:border-zinc-300" onClick={() => setAgentPromptOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAgentPrompt} disabled={agentPromptMutation.isPending}>{agentPromptMutation.isPending ? "Saving…" : "Save prompt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings modal for workforce icon / title / description */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tool settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <IconColorSelector
                icon={toolIcon}
                color={toolColor}
                onIconChange={(newIcon) => {
                  setToolIcon(newIcon);
                  if (toolData?.id) updateMutation.mutate({ id: toolData.id, icon: newIcon });
                }}
                onColorChange={(newColor) => {
                  setToolColor(newColor);
                  if (toolData?.id) updateMutation.mutate({ id: toolData.id, color: newColor });
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                  style={{ backgroundColor: toolIcon ? toolColor : '#f4f4f5', color: toolIcon ? '#ffffff' : '#27272a', border: 'none' }}
                >
                  {toolIcon ? <EntityIcon icon={toolIcon} size={20} fallback={Hammer} /> : "T"}
                </Button>
              </IconColorSelector>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 !mb-1.5">
                  Title
                </label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                  placeholder="New tool"
                  className="h-8 text-sm w-full border border-zinc-200 rounded-md px-2 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 !mb-1.5">
                Description
              </label>
              <Textarea
                value={toolDescription}
                onChange={(e) => setToolDescription(e.target.value)}
                placeholder="Describe what this tool does…"
                className="min-h-[80px] text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 shadow-none"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="h-8 px-4 text-xs font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
                onClick={() => setSettingsOpen(false)}
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {publishOpen && (
        <PublishEntityModal open={publishOpen} onOpenChange={setPublishOpen} entityType="tool" entityId={toolData?.id || ""} initialTitle={toolData?.name ?? ""} initialDescription={toolData?.description ?? ""} />
      )}
      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
    </div>
  );
};
