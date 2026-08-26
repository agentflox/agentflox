import React, { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft, Hammer, FileText, Share2, Globe, MoreHorizontal,
  Wrench, Copy, Download, Trash2, HelpCircle, Bot, Check, History,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { BugReportModal } from "../../../entities/tools/components/BugReportModal";
import { ToolNoCodeView } from "../../dashboard/views/tools/ToolNoCodeView";
import { ToolCodeView } from "../../dashboard/views/tools/ToolCodeView";
import { ToolLogView } from "../../dashboard/views/tools/ToolLogView";
import { useToolRun } from "@/entities/tools/hooks/useToolRun";
import { useToolRunHistory } from "@/entities/tools/hooks/useToolRunHistory";
import type { BuilderInputField } from "@/entities/tools/types/builder";
import { SupportAssistantModal } from "@/components/assistant/SupportAssistantModal";
import { ToolVersionsSheet } from "../../../entities/tools/components/ToolVersionsSheet";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ToolBuilderProps {
  initialTool?: any;
  workspaceId?: string;
  onClose?: () => void;
  onDeleted?: () => void;
  onCloned?: (newId: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function ToolBuilder({
  initialTool,
  workspaceId,
  onClose,
  onDeleted,
  onCloned,
}: ToolBuilderProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"build" | "logs">("build");
  const [viewCode, setViewCode] = useState(false);
  const [name, setName] = useState(initialTool?.name ?? "");
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Modal / dialog state ──────────────────────────────────────────────────
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [agentPromptOpen, setAgentPromptOpen] = useState(false);
  const [agentPromptDraft, setAgentPromptDraft] = useState(
    (initialTool?.functionSchema as any)?.["x-agentPrompt"] ?? ""
  );

  // ── Tool run state ────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState<BuilderInputField[]>(
    Array.isArray(initialTool?.inputs) ? initialTool.inputs : []
  );
  const toolRunState = useToolRun({ initialTool, inputs });
  const toolRunHistory = useToolRunHistory(initialTool?.id);

  // ── Publish guard ─────────────────────────────────────────────────────────
  const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();
  const [publishOpen, setPublishOpen] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const isEditing = !!initialTool?.id;
  const isSaving = false; // surface if you wire a save mutation here

  const updateMutation = trpc.compositeTool.update.useMutation({
    onSuccess: () => {
      toast.success("Changes saved.");
      utils.compositeTool.list.invalidate();
      if (initialTool?.id) utils.compositeTool.get.invalidate({ id: initialTool.id });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.compositeTool.delete.useMutation({
    onSuccess: () => {
      toast.success("Tool deleted.");
      utils.compositeTool.list.invalidate();
      if (onDeleted) onDeleted();
      else router.push("/dashboard/tools");
    },
    onError: (err) => toast.error(err.message),
  });

  const cloneMutation = trpc.compositeTool.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success(`"${cloned.name}" created.`);
      utils.compositeTool.list.invalidate();
      setCloneOpen(false);
      if (onCloned) onCloned(cloned.id);
      else router.push(`/dashboard/tools/build/flow/${cloned.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const agentPromptMutation = trpc.compositeTool.update.useMutation({
    onSuccess: () => {
      toast.success("Agent prompt saved.");
      setAgentPromptOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!isEditing) { toast.error("Save the tool first before updating."); return; }
    if (!name.trim()) { toast.error("Tool name cannot be empty."); return; }
    updateMutation.mutate({ id: initialTool.id, name });
  }, [isEditing, name, initialTool?.id, updateMutation]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/dashboard/tools/build/flow/${initialTool?.id ?? ""}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setLinkCopied(false), 2000);
  }, [initialTool?.id]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/dashboard/tools/build/flow/${initialTool?.id ?? ""}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard.");
  }, [initialTool?.id]);

  const handleExport = useCallback(() => {
    if (!initialTool) { toast.error("No tool to export."); return; }
    const blob = new Blob([JSON.stringify(initialTool, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${initialTool.name ?? "tool"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tool exported.");
  }, [initialTool]);

  const handlePublish = useCallback(() => {
    checkProfileAndProceed(() => setPublishOpen(true));
  }, [checkProfileAndProceed]);

  const handleDelete = useCallback(() => setDeleteOpen(true), []);

  const handleCloneOpen = useCallback(() => {
    setCloneName(`${initialTool?.name ?? "Tool"} (copy)`);
    setCloneOpen(true);
  }, [initialTool?.name]);

  const handleSaveAgentPrompt = useCallback(() => {
    if (!isEditing) return;
    const currentSchema = (initialTool?.functionSchema as any) ?? {};
    agentPromptMutation.mutate({
      id: initialTool.id,
      functionSchema: { ...currentSchema, "x-agentPrompt": agentPromptDraft },
    });
  }, [isEditing, initialTool, agentPromptDraft, agentPromptMutation]);

  const handleBack = useCallback(() => {
    if (onClose) onClose();
    else router.push("/dashboard/tools");
  }, [onClose, router]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-gray-50/50">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b shrink-0 h-14 gap-3">

        {/* Left: back + name */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500 hover:text-gray-900 shrink-0" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Wrench className="w-4 h-4 text-gray-500 shrink-0" />
            <Input
              variant="ghost"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
              placeholder="Tool name…"
              className="h-7 text-sm font-semibold border-none px-0 shadow-none focus-visible:ring-0 max-w-[200px] w-full"
            />
            {!isEditing && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 font-medium shrink-0">
                Unsaved
              </span>
            )}
          </div>
        </div>

        {/* Center: Build / Logs tabs */}
        <div className="flex items-center justify-center flex-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="build" className="flex items-center gap-1.5 text-xs">
                <Hammer className="w-3 h-3" />Build
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3 h-3" />Logs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View code toggle — build tab only */}
          {activeTab === "build" && (
            <div className="flex items-center gap-1.5">
              <Label htmlFor="view-code" className="text-xs text-gray-500 whitespace-nowrap">View code</Label>
              <Switch id="view-code" checked={viewCode} onCheckedChange={setViewCode} />
            </div>
          )}

          {/* Share */}
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900"
            onClick={handleShare}
            disabled={!isEditing}
          >
            {linkCopied ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
            {linkCopied ? "Copied!" : "Share"}
          </Button>

          {/* Save */}
          <Button
            className="h-8 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSave}
            disabled={updateMutation.isPending || !isEditing}
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>

          {/* Publish */}
          <Button
            type="button"
            className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
            onClick={handlePublish}
            disabled={!isEditing}
          >
            <Globe className="h-3.5 w-3.5" />
            Publish
          </Button>

          {/* More dropdown */}
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
              <DropdownMenuItem
                className="text-xs gap-2 text-red-600 focus:text-red-700"
                onClick={handleDelete}
                disabled={!isEditing}
              >
                <Trash2 className="h-3.5 w-3.5" />Delete tool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "build" ? (
          viewCode ? (
            <ToolCodeView
              toolData={initialTool}
              inputs={inputs}
              setInputs={setInputs}
              runInput={toolRunState.runInput}
              setRunInput={toolRunState.setRunInput}
              isRunningTool={toolRunState.isRunningTool}
              runCompositeTool={toolRunState.runCompositeTool}
              runHistory={toolRunState.runHistory}
            />
          ) : (
            <ToolNoCodeView
              toolData={initialTool}
              inputs={inputs}
              runInput={toolRunState.runInput}
              setRunInput={toolRunState.setRunInput}
              isRunningTool={toolRunState.isRunningTool}
              runCompositeTool={toolRunState.runCompositeTool}
              runHistory={toolRunState.runHistory}
            />
          )
        ) : (
          <ToolLogView
            inputs={inputs}
            runHistory={toolRunState.runHistory}
            setRunHistory={toolRunState.setRunHistory}
            selectedRunId={toolRunState.selectedRunId}
            setSelectedRunId={toolRunState.setSelectedRunId}
            runInput={toolRunState.runInput}
            setRunInput={toolRunState.setRunInput}
            selectedRun={toolRunState.selectedRun}
            isRunningTool={toolRunState.isRunningTool}
            runCompositeTool={toolRunState.runCompositeTool}
            cancelCompositeTool={toolRunState.cancelCompositeTool}
            onDeleteRun={toolRunHistory.deleteRun}
          />
        )}
      </main>

      {/* ── Modals ── */}

      {/* Bug Report */}
      <BugReportModal
        isOpen={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
        entityType="tool"
        entityId={initialTool?.id}
        onOpenSupport={() => setSupportModalOpen(true)}
      />

      <SupportAssistantModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />

      <ToolVersionsSheet
        toolId={initialTool?.id}
        isOpen={versionsOpen}
        onClose={() => setVersionsOpen(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{initialTool?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The tool and all its configuration will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate({ id: initialTool!.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Clone Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm">New tool name</Label>
            <Input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="Tool name…"
              className="h-9"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloneOpen(false)}>Cancel</Button>
            <Button
              onClick={() => cloneMutation.mutate({ id: initialTool!.id, name: cloneName })}
              disabled={!cloneName.trim() || cloneMutation.isPending}
            >
              {cloneMutation.isPending ? "Cloning…" : "Clone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Prompt Dialog */}
      <Dialog open={agentPromptOpen} onOpenChange={setAgentPromptOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />Edit Agent Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-zinc-500">
              This prompt is injected when an AI agent uses this tool to understand its purpose and constraints.
            </p>
            <Textarea
              value={agentPromptDraft}
              onChange={(e) => setAgentPromptDraft(e.target.value)}
              placeholder="You are a helpful assistant that…"
              className="min-h-[180px] text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgentPromptOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAgentPrompt}
              disabled={agentPromptMutation.isPending}
            >
              {agentPromptMutation.isPending ? "Saving…" : "Save prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish */}
      {publishOpen && (
        <PublishEntityModal
          open={publishOpen}
          onOpenChange={setPublishOpen}
          entityType="tool"
          entityId={initialTool?.id || ""}
          initialTitle={initialTool?.name ?? ""}
          initialDescription={initialTool?.description ?? ""}
        />
      )}
      <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
    </div>
  );
}
