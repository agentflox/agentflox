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
  ChevronLeft, Hammer, FileText, Share2, Globe, MoreHorizontal,
  Wrench, Copy, Download, Trash2, HelpCircle, Bot, Check, History, GitBranch,
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
import { BugReportModal } from "@/entities/tools/components/BugReportModal";
import { ToolCodeView } from "./ToolCodeView";
import { ToolNoCodeView } from "./ToolNoCodeView";
import { ToolLogView } from "./ToolLogView";
import { useToolRun } from "@/entities/tools/hooks/useToolRun";
import type { BuilderInputField } from "@/entities/tools/types/builder";

interface ToolAIBuilderViewProps {
  toolId?: string;
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

  // Track optimistic message IDs to remove them when confirmed
  const optimisticMessageIds = useRef<Set<string>>(new Set());

  // Fetch messages from database
  const { data: messagesData, refetch: refetchMessages, isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 0,
    }
  );

  // Load tool data if toolId provided
  const { data: toolData, isLoading: isLoadingTool, refetch: refetchTool } = trpc.tool.get.useQuery(
    { id: toolId!, conversationType: 'TOOL_BUILDER' },
    { enabled: !!toolId }
  );

  // --- Tool Builder Header State ---
  const router = useRouter();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"build" | "logs">("build");
  const [viewCode, setViewCode] = useState(false);
  const [name, setName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (toolData?.name) setName(toolData.name);
  }, [toolData?.name]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Modals
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [agentPromptOpen, setAgentPromptOpen] = useState(false);
  const [agentPromptDraft, setAgentPromptDraft] = useState("");
  useEffect(() => {
    const p = (toolData as any)?.functionSchema?.["x-agentPrompt"];
    if (p) setAgentPromptDraft(p);
  }, [toolData]);

  const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();
  const [publishOpen, setPublishOpen] = useState(false);
  const isEditing = !!toolData?.id;

  const updateMutation = trpc.compositeTool.update.useMutation({
    onSuccess: () => {
      toast.success("Changes saved.");
      setHasChanges(false);
      utils.tool.list.invalidate();
      if (toolData?.id) utils.tool.get.invalidate({ id: toolData.id });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.compositeTool.delete.useMutation({
    onSuccess: () => {
      toast.success("Tool deleted.");
      utils.tool.list.invalidate();
      router.push("/dashboard/tools");
    },
    onError: (err) => toast.error(err.message),
  });

  const cloneMutation = trpc.compositeTool.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success(`"${cloned.name}" created.`);
      utils.tool.list.invalidate();
      setCloneOpen(false);
      router.push(`/dashboard/tools/build/flow/${cloned.id}`);
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
    if (!toolData) return;
    const fn = (toolData as any).functionSchema as any;
    const props = fn?.parameters?.properties || (toolData as any).params_schema?.properties || {};
    const required: string[] = fn?.parameters?.required || (toolData as any).params_schema?.required || [];

    setInputs(Object.entries(props)
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
      })) as BuilderInputField[]);
  }, [toolData]);

  // Handlers
  const handleSave = useCallback(() => {
    if (!isEditing) { toast.error("Save the tool first before updating."); return; }
    if (!name.trim()) { toast.error("Tool name cannot be empty."); return; }

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
      functionSchema: {
        ...currentSchema,
        parameters: {
          ...currentSchema?.parameters,
          type: "object",
          properties,
          required,
        }
      }
    });
  }, [isEditing, name, toolData?.id, updateMutation, inputs, toolData]);

  // Save handler for ToolCodeView (persists code step config + inputs)
  const handleCodeViewSave = useCallback((data: {
    code: string;
    language: string;
    packages: string[];
    runtimeCommands: string[];
    inputs: BuilderInputField[];
  }) => {
    if (!isEditing) { toast.error("Save the tool first before updating."); return; }

    const existingSteps: any[] = (toolData as any)?.steps ?? [];
    const codeStepRaw = existingSteps.find(
      (s: any) => s.type === "PYTHON" || s.type === "JAVASCRIPT"
    ) ?? existingSteps[0];

    // Build normalised steps — update the code step config, keep the rest unchanged
    const normalizedSteps = existingSteps.map((s: any) => {
      let cfg: any = {};
      try { cfg = s.config ? (typeof s.config === "string" ? JSON.parse(s.config) : s.config) : {}; } catch { }
      if (s.id === codeStepRaw?.id) {
        cfg = { ...cfg, code: data.code, packages: data.packages, runtimeCommands: data.runtimeCommands };
      }
      return { id: s.id, name: s.name, type: data.language === "JAVASCRIPT" && s.id === codeStepRaw?.id ? "JAVASCRIPT" : s.type, config: cfg };
    });

    // Build functionSchema parameters from the updated inputs list
    const properties: any = {};
    const required: string[] = [];
    data.inputs.forEach((input, index) => {
      if (!input.name) return;
      properties[input.name] = {
        type: input.type,
        title: input.label || input.name,
        description: input.description,
        order: index,
        default: input.defaultValue,
        examples: input.placeholder ? [input.placeholder] : undefined,
        metadata: { content_type: input.uiType, fillMode: input.fillMode },
      };
      if (input.required) required.push(input.name);
    });

    const currentSchema = ((toolData as any)?.functionSchema as any) ?? {};
    updateMutation.mutate({
      id: toolData.id,
      name,
      functionSchema: {
        ...currentSchema,
        parameters: { ...currentSchema?.parameters, type: "object", properties, required },
      },
      steps: normalizedSteps,
    });
  }, [isEditing, toolData, name, updateMutation]);

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
    router.push("/dashboard/tools");
  }, [router]);

  const toolRunState = useToolRun({ initialTool: toolData, inputs });
  // --- End Tool Builder Header State ---

  // Mutations
  const [isInitializingBuilder, setIsInitializingBuilder] = useState(false);
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
    if (isLaunchStage && toolId) setTimeout(() => refetchTool(), 800);

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
    toast.error(errorMessage || 'Failed to process message');
    setMessages(prev => [...prev, {
      id: `error_${Date.now()}`,
      role: 'ASSISTANT' as MessageRole,
      content: `Error: ${errorMessage}. Please try again.`,
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

  // Initialize conversation - use ref to prevent multiple calls
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (conversationId || isInitializingBuilder || hasInitialized.current) return;

    // If toolId is provided, wait for tool data to load before initializing
    if (toolId) {
      // Still loading tool data, wait
      if (isLoadingTool) return;

      // Tool data loaded, check for existing conversation
      const storedConversationId = toolData?.conversations?.[0]?.id;

      hasInitialized.current = true;

      if (storedConversationId) {
        // Load existing conversation
        console.log('[ToolAIBuilderView] Loading existing conversation:', storedConversationId);
        initializeBuilder({
          conversationId: storedConversationId,
          toolId: toolId
        });
      } else {
        // No existing conversation, create a new one and link to tool
        console.log('[ToolAIBuilderView] Creating new conversation for tool:', toolId);
        initializeBuilder({
          toolId: toolId
        });
      }
    } else {
      // No toolId provided, create new conversation
      hasInitialized.current = true;
      initializeBuilder({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, toolData, isLoadingTool, conversationId]);

  // Mutation to mark follow-ups as consumed
  const markFollowupsConsumedMutation = trpc.chat.markFollowupsConsumed.useMutation();

  // ✅ Update handleSendMessage to update UI optimistically before mutation
  const handleSendMessage = useCallback(async (
    message: string,
    options?: { contexts?: any[]; mentions?: any[]; attachments?: any[] }
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
      contexts: options?.contexts,
      mentions: options?.mentions,
      attachments: options?.attachments,
    });
  }, [sendStreamMessage, conversationId, isSending, messages, markFollowupsConsumedMutation, toolId, toolDraft, toolData]);

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
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500 hover:text-gray-900 shrink-0" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false); }}
                autoFocus
                className="text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1.5 outline-none focus:ring-1 ring-indigo-500/50 w-auto min-w-[120px] py-1"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1.5 rounded-sm transition-colors py-1 truncate max-w-[200px]"
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
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50/50 text-sm font-medium text-emerald-600 shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-100 bg-amber-50/50 text-sm font-medium text-amber-600 shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </div>
          )}
        </div>

        {/* Center: Build / Logs tabs */}
        <div className="flex items-center justify-center flex-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="build" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Hammer className="w-3 h-3" />Build
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <FileText className="w-3 h-3" />Logs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {showToolProfile && toolData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1.5 ${activeTab === "logs" ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <Label htmlFor="view-code" className="text-xs text-gray-500 whitespace-nowrap">View code</Label>
                  <Switch
                    id="view-code"
                    checked={viewCode}
                    onCheckedChange={setViewCode}
                    disabled={activeTab === "logs"}
                  />
                </div>
              </TooltipTrigger>
              {activeTab === "logs" && (
                <TooltipContent side="bottom">Switch to Build mode to view code</TooltipContent>
              )}
            </Tooltip>
          )}

          <Button variant="ghost" className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900" onClick={handleShare} disabled={!isEditing}>
            {linkCopied ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
            {linkCopied ? "Copied!" : "Share"}
          </Button>

          <Button className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={updateMutation.isPending || !isEditing}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>

          <Button type="button" className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white gap-1.5" onClick={handlePublish} disabled={!isEditing}>
            <Globe className="h-3.5 w-3.5" />
            Publish
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-200 text-zinc-600">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setAgentPromptOpen(true)} disabled={!isEditing}>
                <Bot className="h-3.5 w-3.5" />Edit agent prompt
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={handleConvertToFlowMode} disabled={!isEditing || updateMutation.isPending}>
                <GitBranch className="h-3.5 w-3.5" />Convert to flow mode
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={handleCloneOpen} disabled={!isEditing}>
                <Copy className="h-3.5 w-3.5" />Clone
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={handleCopyLink} disabled={!isEditing}>
                <Copy className="h-3.5 w-3.5" />Copy link
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={handleExport} disabled={!isEditing}>
                <Download className="h-3.5 w-3.5" />Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setVersionsOpen(true)} disabled={!isEditing}>
                <History className="h-3.5 w-3.5" />Version history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setBugReportOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5" />Report bug
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setSupportModalOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5" />Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-700" onClick={handleDelete} disabled={!isEditing}>
                <Trash2 className="h-3.5 w-3.5" />Delete tool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    viewCode
                      ? <ToolCodeView
                        toolData={toolData}
                        toolDraft={toolDraft}
                        inputs={inputs}
                        setInputs={setInputs}
                        runInput={toolRunState.runInput}
                        setRunInput={toolRunState.setRunInput}
                        isRunningTool={toolRunState.isRunningTool}
                        runCompositeTool={toolRunState.runCompositeTool}
                        runHistory={toolRunState.runHistory}
                        liveRunState={toolRunState.liveRunState}
                        selectedRunId={toolRunState.selectedRunId}
                        onSave={handleCodeViewSave}
                        isSaving={updateMutation.isPending}
                      />
                      : <ToolNoCodeView
                        toolData={toolData}
                        toolDraft={toolDraft}
                        inputs={inputs}
                        runInput={toolRunState.runInput}
                        setRunInput={toolRunState.setRunInput}
                        isRunningTool={toolRunState.isRunningTool}
                        runCompositeTool={toolRunState.runCompositeTool}
                      />
                  ) : (
                    <ToolLogView {...toolRunState} inputs={inputs} />
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
            <Textarea value={agentPromptDraft} onChange={(e) => setAgentPromptDraft(e.target.value)} placeholder="You are a helpful assistant that…" className="min-h-[180px] text-sm resize-none" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgentPromptOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAgentPrompt} disabled={agentPromptMutation.isPending}>{agentPromptMutation.isPending ? "Saving…" : "Save prompt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {publishOpen && (
        <PublishEntityModal open={publishOpen} onOpenChange={setPublishOpen} entityType="tool" entityId={toolData?.id || ""} initialTitle={toolData?.name ?? ""} initialDescription={toolData?.description ?? ""} />
      )}
      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
    </div>
  );
};
