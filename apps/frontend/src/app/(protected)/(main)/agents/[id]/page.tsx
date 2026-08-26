"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useAgentContext } from "./layout";
import {
  Home,
  Hammer,
  Play,
  Settings2,
  Share2,
  MoreHorizontal,
  Bot,
  Copy,
  Download,
  History,
  HelpCircle,
  Store,
  Bug,
  Trash2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { SupportAssistantModal } from "@/components/assistant/SupportAssistantModal";
import { BugReportModal } from "@/entities/tools/components/BugReportModal";

const AgentChatBuilder = dynamic(
  () => import("@/entities/agents/components/AgentChatBuilder").then((m) => m.AgentChatBuilder),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading builder…</div> }
);
const ChatView = dynamic(
  () => import("@/features/dashboard/views/agent/ChatView").then((m) => m.ChatView),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading runner…</div> }
);
const SettingsView = dynamic(
  () => import("@/features/dashboard/views/agent/SettingsView").then((m) => m.SettingsView),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading settings…</div> }
);

export function AgentDetailPage({ initialSlug }: { initialSlug?: string[] }) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const utils = trpc.useUtils();

  const {
    agentData: agent,
    isLoading,
    refetch,
    isPublished,
    isPublishing,
  } = useAgentContext();

  // Extract path slug segments
  const slugArray: string[] = useMemo(() => {
    if (initialSlug && initialSlug.length > 0) return initialSlug;
    const pSlug = (params as any)?.slug;
    if (Array.isArray(pSlug)) return pSlug;
    if (typeof pSlug === "string") return [pSlug];
    const segments = pathname.split("/").filter(Boolean);
    const agentIdx = segments.indexOf("agents");
    if (agentIdx !== -1 && segments.length > agentIdx + 2) {
      return segments.slice(agentIdx + 2);
    }
    return [];
  }, [initialSlug, params, pathname]);

  const { resolvedTab, resolvedRunSubTab, resolvedChatId, resolvedLogId } = useMemo(() => {
    const tabSegment = slugArray[0] || searchParams.get("tab") || "build";
    let tab: "build" | "run" | "settings" = "build";
    if (tabSegment === "run" || tabSegment === "chat") tab = "run";
    else if (tabSegment === "settings") tab = "settings";
    else tab = "build";

    let runSubTab: "chat" | "log" = "chat";
    let chatId: string | null = null;
    let logId: string | null = null;

    if (tab === "build") {
      chatId = slugArray[1] || searchParams.get("cid") || searchParams.get("chat") || null;
    } else if (tab === "run") {
      if (slugArray[1] === "log") {
        runSubTab = "log";
        logId = slugArray[2] || searchParams.get("lid") || null;
      } else if (slugArray[1] === "chat") {
        runSubTab = "chat";
        chatId = slugArray[2] || searchParams.get("cid") || searchParams.get("chat") || null;
      } else if (slugArray[1]) {
        chatId = slugArray[1];
      } else {
        chatId = searchParams.get("cid") || searchParams.get("chat") || null;
      }
    }

    return {
      resolvedTab: tab,
      resolvedRunSubTab: runSubTab,
      resolvedChatId: chatId,
      resolvedLogId: logId,
    };
  }, [slugArray, searchParams]);

  const [activeTab, setActiveTab] = useState<"build" | "run" | "settings">(resolvedTab);
  const [runSubTab, setRunSubTab] = useState<"chat" | "log">(resolvedRunSubTab);
  const [chatId, setChatId] = useState<string | null>(resolvedChatId);
  const [logId, setLogId] = useState<string | null>(resolvedLogId);

  const [name, setName] = useState("");
  const [agentIcon, setAgentIcon] = useState("");
  const [agentColor, setAgentColor] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();

  useEffect(() => {
    setActiveTab(resolvedTab);
    setRunSubTab(resolvedRunSubTab);
    setChatId(resolvedChatId);
    setLogId(resolvedLogId);
  }, [resolvedTab, resolvedRunSubTab, resolvedChatId, resolvedLogId]);

  useEffect(() => {
    if (agent?.name) setName(agent.name);
    if (agent?.icon) setAgentIcon(agent.icon);
    if (agent?.color) setAgentColor(agent.color);
    if (agent?.description) setAgentDescription(agent.description);
  }, [agent?.name, agent?.icon, agent?.color, agent?.description]);

  const updateAgentMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success("Changes saved.");
      setHasChanges(false);
      utils.agent.list.invalidate();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAgentMutation = trpc.agent.delete.useMutation({
    onSuccess: () => {
      toast.success("Agent deleted.");
      utils.agent.list.invalidate();
      router.push("/agents");
    },
    onError: (err) => toast.error(err.message),
  });

  const switchTab = (tab: "build" | "run" | "settings") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (!agent?.id) return;
    if (tab === "build") {
      router.push(chatId ? `/agents/${agent.id}/build/${chatId}` : `/agents/${agent.id}/build`, { scroll: false });
    } else if (tab === "run") {
      if (runSubTab === "log" && logId) {
        router.push(`/agents/${agent.id}/run/log/${logId}`, { scroll: false });
      } else if (chatId) {
        router.push(`/agents/${agent.id}/run/chat/${chatId}`, { scroll: false });
      } else {
        router.push(`/agents/${agent.id}/run`, { scroll: false });
      }
    } else {
      router.push(`/agents/${agent.id}/settings`, { scroll: false });
    }
  };

  const handleChatIdChange = useCallback((newChatId: string | null) => {
    setChatId(newChatId);
    if (!agent?.id) return;
    if (activeTab === "build") {
      if (newChatId) router.push(`/agents/${agent.id}/build/${newChatId}`, { scroll: false });
      else router.push(`/agents/${agent.id}/build`, { scroll: false });
    } else if (activeTab === "run") {
      if (newChatId) router.push(`/agents/${agent.id}/run/chat/${newChatId}`, { scroll: false });
      else router.push(`/agents/${agent.id}/run`, { scroll: false });
    }
  }, [activeTab, agent?.id, router]);

  const handlePaneTabChange = useCallback((paneTab: "chat" | "log") => {
    setRunSubTab(paneTab);
    if (!agent?.id) return;
    if (paneTab === "log") {
      if (logId) router.push(`/agents/${agent.id}/run/log/${logId}`, { scroll: false });
      else router.push(`/agents/${agent.id}/run/log`, { scroll: false });
    } else {
      if (chatId) router.push(`/agents/${agent.id}/run/chat/${chatId}`, { scroll: false });
      else router.push(`/agents/${agent.id}/run/chat`, { scroll: false });
    }
  }, [agent?.id, logId, chatId, router]);

  const handleSaveName = () => {
    setIsEditingName(false);
    if (!name.trim() || !agent?.id) return;
    updateAgentMutation.mutate({ id: agent.id, name });
  };

  const handleShare = async () => {
    if (!agent?.id) return;
    const url = `${window.location.origin}/agents/${agent.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard.");
  };

  const handleExport = () => {
    if (!agent) {
      toast.error("No agent to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(agent, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agent.name || "agent"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Agent exported.");
  };

  const handlePublishClick = () => {
    checkProfileAndProceed(() => setPublishOpen(true));
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-24 w-24 animate-pulse rounded-full bg-primary/5 blur-xl" />
          <div className="absolute h-16 w-16 animate-[spin_3s_linear_infinite] rounded-full border-b-2 border-l-2 border-primary/30" />
          <div className="absolute h-12 w-12 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-t-2 border-r-2 border-primary/60" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border shadow-sm backdrop-blur-sm">
            <Bot className="h-4 w-4 text-primary animate-pulse" />
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center space-y-2">
          <h3 className="text-sm font-medium tracking-widest text-foreground uppercase">Initializing</h3>
          <p className="text-xs text-muted-foreground animate-pulse">Loading agent configuration...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Agent not found</h2>
          <p className="text-muted-foreground">You do not have access to this agent or it has been removed.</p>
          <Button onClick={() => router.push("/agents")} variant="outline">
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white overscroll-none">
      {/* ── Top Bar / Header (Matches Workforce Page Style) ── */}
      <div className="flex-none border-b border-zinc-200 bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Home + Icon + Name + Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/agents")}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <Home className="h-4 w-4 text-zinc-600" />
            </button>

            <div className="flex items-center gap-2">
              <IconColorSelector
                icon={agentIcon}
                color={agentColor}
                onIconChange={(newIcon) => {
                  setAgentIcon(newIcon);
                  if (agent?.id) updateAgentMutation.mutate({ id: agent.id, icon: newIcon });
                }}
                onColorChange={(newColor) => {
                  setAgentColor(newColor);
                  if (agent?.id) updateAgentMutation.mutate({ id: agent.id, color: newColor });
                }}
              >
                <div
                  className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md text-base font-semibold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: agentIcon ? agentColor : "#f4f4f5",
                    color: agentIcon ? "#ffffff" : "#27272a",
                  }}
                >
                  {agentIcon ? (
                    <EntityIcon icon={agentIcon} size={16} fallback={Bot} />
                  ) : (
                    <Bot className="h-4 w-4 text-zinc-600" />
                  )}
                </div>
              </IconColorSelector>

              {/* Inline editable name */}
              <div className="flex items-center gap-3 group">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setHasChanges(true);
                    }}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                    }}
                    autoFocus
                    className="h-8 text-sm font-semibold text-zinc-900 bg-zinc-100 border-none rounded px-1.5 outline-none focus:ring-1 ring-indigo-500/50 w-auto min-w-[120px] py-1"
                  />
                ) : (
                  <h1
                    onClick={() => setIsEditingName(true)}
                    className="text-sm font-semibold text-zinc-900 cursor-pointer hover:bg-zinc-100 px-1.5 rounded-sm transition-colors py-1.5 h-8 truncate max-w-[220px]"
                  >
                    {name || "New agent"}
                  </h1>
                )}
              </div>

              {/* Status pill */}
              {hasChanges ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-orange-100 bg-orange-50/50 text-sm font-medium text-orange-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Unsaved
                </div>
              ) : isPublished ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-emerald-100 bg-emerald-50/50 text-sm font-medium text-emerald-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-amber-100 bg-amber-50/50 text-sm font-medium text-amber-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Draft
                </div>
              )}
            </div>
          </div>

          {/* Center: Build / Run / Settings Tabs */}
          <div className="flex items-center justify-center flex-1">
            <Tabs
              value={activeTab}
              onValueChange={(v) => switchTab(v as "build" | "run" | "settings")}
              className="w-[300px]"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="build" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Hammer className="w-3 h-3" />
                  Build
                </TabsTrigger>
                <TabsTrigger value="run" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Play className="w-3 h-3" />
                  Run
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Settings2 className="w-3 h-3" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 h-8 px-2 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer text-xs font-medium"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>

            <button
              onClick={handlePublishClick}
              disabled={isPublishing}
              className="h-8 px-4 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPublished ? "Published" : "Publish"}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-zinc-700 font-normal">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span>Agent settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Copy link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePublishClick} className="cursor-pointer">
                  <Store className="mr-2 h-4 w-4" />
                  <span>{isPublished ? "Update Marketplace listing" : "Submit to marketplace"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBugReportOpen(true)} className="cursor-pointer">
                  <Bug className="mr-2 h-4 w-4" />
                  <span>Report bug</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSupportModalOpen(true)} className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete agent</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Main Tabbed Content ── */}
      <div className="flex-1 w-full relative overflow-hidden flex flex-col min-h-0">
        <div
          className={cn(
            "h-full w-full flex flex-col min-h-0",
            activeTab === "build" ? "visible" : "hidden"
          )}
        >
          <AgentChatBuilder agentId={agent.id} presentation="split" />
        </div>

        <div
          className={cn(
            "h-full w-full flex flex-col min-h-0",
            activeTab === "run" ? "visible" : "hidden"
          )}
        >
          <ChatView
            agentId={agent.id}
            agent={agent}
            chatId={chatId}
            onChatIdChange={handleChatIdChange}
            paneTab={runSubTab}
            onPaneTabChange={handlePaneTabChange}
          />
        </div>

        <div
          className={cn(
            "h-full w-full flex flex-col min-h-0 overflow-y-auto",
            activeTab === "settings" ? "visible" : "hidden"
          )}
        >
          <SettingsView agent={agent} />
        </div>
      </div>

      {/* ── Settings Dialog ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agent settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <IconColorSelector
                icon={agentIcon}
                color={agentColor}
                onIconChange={(newIcon) => {
                  setAgentIcon(newIcon);
                  if (agent?.id) updateAgentMutation.mutate({ id: agent.id, icon: newIcon });
                }}
                onColorChange={(newColor) => {
                  setAgentColor(newColor);
                  if (agent?.id) updateAgentMutation.mutate({ id: agent.id, color: newColor });
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: agentIcon ? agentColor : "#f4f4f5",
                    color: agentIcon ? "#ffffff" : "#27272a",
                    border: "none",
                  }}
                >
                  {agentIcon ? <EntityIcon icon={agentIcon} size={20} fallback={Bot} /> : <Bot className="h-5 w-5" />}
                </Button>
              </IconColorSelector>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 !mb-1.5">
                  Title
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="New agent"
                  className="h-8 text-sm w-full border border-zinc-200 rounded-md px-2 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 !mb-1.5">
                Description
              </label>
              <Textarea
                value={agentDescription}
                onChange={(e) => {
                  setAgentDescription(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Describe what this agent does…"
                className="min-h-[80px] text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 shadow-none"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="h-8 px-4 text-xs font-semibold rounded-md bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer"
                onClick={() => {
                  if (agent?.id) {
                    updateAgentMutation.mutate({
                      id: agent.id,
                      name,
                      description: agentDescription,
                    });
                  }
                  setSettingsOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{agent.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The agent and all its conversation history, triggers, and configurations will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteAgentMutation.mutate({ id: agent.id })}
              disabled={deleteAgentMutation.isPending}
            >
              {deleteAgentMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Marketplace / Bug / Support Modals ── */}
      {publishOpen && (
        <PublishEntityModal
          open={publishOpen}
          onOpenChange={setPublishOpen}
          entityType="agent"
          entityId={agent.id}
          initialTitle={agent.name ?? ""}
          initialDescription={agent.description ?? ""}
        />
      )}
      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
      <BugReportModal
        isOpen={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
        entityType="agent"
        entityId={agent.id}
        onOpenSupport={() => setSupportModalOpen(true)}
      />
      <SupportAssistantModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
    </div>
  );
}

export default function Page() {
  return <AgentDetailPage />;
}
