"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Brain, FileText, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { DocView } from "@/features/dashboard/views/generic/DocView";
import {
  resolveAgentMemoryConfig,
  isAgentMemoryDocEnabled,
  type MemoryPrefs,
} from "@/lib/agentMemory/memoryPolicy";
import { useRegisterAgentSettingsSave } from "@/entities/agents/components/AgentSettingsSaveContext";

interface MemoryTabProps {
  agentId: string;
  agent: {
    ownerId?: string;
    owner?: { id?: string | null } | null;
    viewerIsOwner?: boolean;
    memoryType?: string | null;
    contextWindow?: number | null;
    useVectorMemory?: boolean | null;
    memoryRetention?: number | null;
    memoryViewId?: string | null;
    metadata?: unknown;
    workspaceId?: string | null;
    spaceId?: string | null;
    projectId?: string | null;
    teamId?: string | null;
  };
  isReconfiguring?: boolean;
  onUpdate?: () => void;
}

export function MemoryTab({
  agentId,
  agent,
  isReconfiguring,
  onUpdate,
}: MemoryTabProps) {
  const utils = trpc.useUtils();
  const { data: access, isLoading: accessLoading } = trpc.agent.getMemoryAccess.useQuery(
    { agentId },
    { staleTime: 30_000 }
  );
  const isOwner = access?.isOwner ?? agent.viewerIsOwner ?? false;
  const showNonOwnerWarning = !accessLoading && access != null && !access.isOwner;
  const docFeatureEnabled = isAgentMemoryDocEnabled(
    typeof process !== "undefined"
      ? (process.env as Record<string, string | undefined>)
      : undefined
  );
  const resolved = useMemo(() => resolveAgentMemoryConfig(agent), [agent]);

  const [shortTermEnabled, setShortTermEnabled] = useState(resolved.shortTermEnabled);
  const [longTermEnabled, setLongTermEnabled] = useState(resolved.enabled);
  const [contextWindow, setContextWindow] = useState(String(resolved.contextWindow || 5));
  const [retention, setRetention] = useState(
    resolved.memoryRetention === null ? "forever" : String(resolved.memoryRetention ?? 7)
  );
  const [useVectorMemory, setUseVectorMemory] = useState(resolved.useVectorMemory);
  const [prefs, setPrefs] = useState<MemoryPrefs>(resolved.prefs);
  const [showDoc, setShowDoc] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(
    agent.memoryViewId ?? access?.memoryViewId ?? null
  );

  useEffect(() => {
    const next = resolveAgentMemoryConfig(agent);
    setShortTermEnabled(next.shortTermEnabled);
    setLongTermEnabled(next.enabled);
    setContextWindow(String(next.contextWindow || 5));
    setRetention(
      next.memoryRetention === null ? "forever" : String(next.memoryRetention ?? 7)
    );
    setUseVectorMemory(next.useVectorMemory);
    setPrefs(next.prefs);
    const nextViewId = agent.memoryViewId ?? access?.memoryViewId ?? null;
    if (nextViewId) {
      setActiveViewId(nextViewId);
    }
  }, [agent, access?.memoryViewId]);

  useEffect(() => {
    if (!longTermEnabled && showDoc) {
      setShowDoc(false);
    }
  }, [longTermEnabled, showDoc]);

  const dirty = useMemo(() => {
    const r = resolveAgentMemoryConfig(agent);
    const ret =
      retention === "forever" ? null : Number.parseInt(retention, 10);
    return (
      shortTermEnabled !== r.shortTermEnabled ||
      longTermEnabled !== r.enabled ||
      Number(contextWindow) !== r.contextWindow ||
      ret !== r.memoryRetention ||
      useVectorMemory !== r.useVectorMemory ||
      prefs.rememberPreferences !== r.prefs.rememberPreferences ||
      prefs.rememberPeopleOrg !== r.prefs.rememberPeopleOrg ||
      prefs.rememberGoals !== r.prefs.rememberGoals ||
      prefs.rememberTranscripts !== r.prefs.rememberTranscripts
    );
  }, [
    agent,
    shortTermEnabled,
    longTermEnabled,
    contextWindow,
    retention,
    useVectorMemory,
    prefs,
  ]);

  const updateMutation = trpc.agent.updateMemorySettings.useMutation({
    onSuccess: (updated) => {
      toast.success("Memory settings saved");
      if (updated?.memoryViewId) setActiveViewId(updated.memoryViewId);
      void utils.agent.getMemoryAccess.invalidate({ agentId });
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || "Failed to save memory settings"),
  });

  const ensureMutation = trpc.agent.ensureMemoryDoc.useMutation({
    onSuccess: (res) => {
      setActiveViewId(res.viewId);
      setShowDoc(true);
      void utils.agent.getMemoryAccess.invalidate({ agentId });
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || "Failed to open memory document"),
  });

  const clearMutation = trpc.agent.clearMemories.useMutation({
    onSuccess: () => {
      toast.success("Memories cleared");
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || "Failed to clear memories"),
  });

  const handleSave = () => {
    updateMutation.mutate({
      agentId,
      shortTermEnabled,
      enabled: longTermEnabled,
      // Long-term on ⇒ durable store; off ⇒ short-term column only.
      memoryType: longTermEnabled ? "LONG_TERM" : "SHORT_TERM",
      contextWindow: Number(contextWindow),
      useVectorMemory,
      memoryRetention: retention === "forever" ? null : Number.parseInt(retention, 10),
      prefs,
    });
  };

  const handleDiscard = () => {
    const next = resolveAgentMemoryConfig(agent);
    setShortTermEnabled(next.shortTermEnabled);
    setLongTermEnabled(next.enabled);
    setContextWindow(String(next.contextWindow || 5));
    setRetention(
      next.memoryRetention === null ? "forever" : String(next.memoryRetention ?? 7)
    );
    setUseVectorMemory(next.useVectorMemory);
    setPrefs(next.prefs);
  };

  const handleViewMemories = () => {
    if (!longTermEnabled) {
      toast.error("Enable long-term memory to view the memory document");
      return;
    }
    if (!docFeatureEnabled) {
      toast.error("Memory documents are disabled for this environment");
      return;
    }
    if (!isOwner) {
      if (activeViewId) setShowDoc(true);
      return;
    }
    if (activeViewId) {
      setShowDoc(true);
      return;
    }
    ensureMutation.mutate({ agentId });
  };

  const showViewButton =
    docFeatureEnabled &&
    longTermEnabled &&
    (isOwner || Boolean(activeViewId));
  const readOnly = !isOwner || Boolean(isReconfiguring) || accessLoading;

  useRegisterAgentSettingsSave(
    "memory",
    {
      dirty,
      save: handleSave,
      discard: handleDiscard,
      isPending: updateMutation.isPending,
    },
    isOwner && !isReconfiguring
  );

  if (showDoc && activeViewId && longTermEnabled) {
    return (
      <div className="flex flex-col h-[min(70vh,720px)] -mx-1">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 mb-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Memory document</p>
            <p className="text-xs text-zinc-500">
              Edits here are not synced back into recall stores in v1. Expired pages may stay
              visible until you clear all or delete them.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDoc(false)}>
            Back to settings
          </Button>
        </div>
        <div className="flex-1 min-h-0 border border-zinc-200 rounded-xl overflow-hidden">
          <DocView
            viewId={activeViewId}
            workspaceId={agent.workspaceId ?? undefined}
            spaceId={agent.spaceId ?? undefined}
            projectId={agent.projectId ?? undefined}
            teamId={agent.teamId ?? undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-6 relative">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2 min-w-0">
            <Brain className="h-4 w-4 text-zinc-500 shrink-0" />
            Memory
          </h3>
          {showViewButton && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 shrink-0 shadow-none hover:bg-zinc-200"
              onClick={handleViewMemories}
              disabled={ensureMutation.isPending || accessLoading}
            >
              {ensureMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              View memories
            </Button>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1 max-w-xl">
          Short-term keeps recent chat turns. Long-term stores durable facts across conversations
          (separate from Knowledge uploads).
        </p>
        {showNonOwnerWarning && (
          <p className="text-xs text-amber-700 mt-2">
            Only the agent owner can manage memory settings.
          </p>
        )}
      </div>

      {/* Short-term */}
      <section className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-4 bg-white">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              Short-term memory
            </div>
            <p className="text-xs text-zinc-500">
              Keep recent turns in the current conversation as context.
            </p>
          </div>
          <Switch
            checked={shortTermEnabled}
            disabled={readOnly}
            onCheckedChange={setShortTermEnabled}
          />
        </div>
        {shortTermEnabled && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4 space-y-2">
            <Label className="text-sm font-medium">Recent messages</Label>
            <p className="text-xs text-zinc-500">
              How many recent turns to keep in short-term context.
            </p>
            <Select
              value={contextWindow}
              onValueChange={setContextWindow}
              disabled={readOnly}
            >
              <SelectTrigger className="w-40 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["3", "5", "10", "20"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n} messages
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      {/* Long-term */}
      <section className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-4 bg-white">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              Long-term memory
            </div>
            <p className="text-xs text-zinc-500">
              Store durable facts across chats in memory stores and the memory document.
            </p>
          </div>
          <Switch
            checked={longTermEnabled}
            disabled={readOnly}
            onCheckedChange={setLongTermEnabled}
          />
        </div>

        {longTermEnabled && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Keep memories for</Label>
              <p className="text-xs text-zinc-500">
                Applies to new memories. Existing memories keep the expiry they were given when
                saved.
              </p>
              <Select value={retention} onValueChange={setRetention} disabled={readOnly}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="forever">Forever</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">What to remember</Label>
              {(
                [
                  ["rememberPreferences", "Preferences & style"],
                  ["rememberPeopleOrg", "People & org"],
                  ["rememberGoals", "Goals & decisions"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                  <Checkbox
                    checked={prefs[key]}
                    disabled={readOnly}
                    onCheckedChange={(v) =>
                      setPrefs((p) => ({ ...p, [key]: Boolean(v) }))
                    }
                    className="cursor-pointer"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Long-term memory can include personal details from chats and runs. Clearing deletes
                remembered facts from this agent&apos;s memory stores and resets run-captured memory
                pages. Expired memories are removed from recall automatically, but may remain visible
                in the memory document until you clear all or delete that page. Uploaded Knowledge
                files are separate and are not removed.
              </p>
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-1" disabled={readOnly}>
                      Clear all memories
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes remembered facts from recall stores and resets
                        run-captured pages in the memory document. Knowledge files are not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearMutation.mutate({ agentId })}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <Accordion type="single" collapsible className="border rounded-xl px-4 bg-white">
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="text-sm font-medium cursor-pointer">Advanced</AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-start justify-between gap-4 py-2">
                    <div>
                      <Label className="text-sm font-medium">Smarter recall (vector memory)</Label>
                      <p className="text-xs text-zinc-500 mt-1">
                        Uses semantic embeddings for long-term recall when enabled.
                      </p>
                    </div>
                    <Switch
                      checked={useVectorMemory}
                      disabled={readOnly}
                      onCheckedChange={setUseVectorMemory}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </section>
    </div>
  );
}
