"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Globe,
  Loader2,
  Plus,
  Upload,
  X,
  Database
} from "lucide-react";
import { ContextKnowledgeModal } from "../ContextKnowledgeModal";
import { IntegrationBrandImage } from "@/features/integrations/components/IntegrationBrandImage";
import { useIntegrationCatalog } from "@/features/integrations/hooks/useIntegrationCatalog";
import { connectIntegrationProvider } from "@/features/integrations/lib/oauthPopup";
import { storageUtils } from "@/utils/storage/storageUtils";
import { useRegisterAgentSettingsSave } from "@/entities/agents/components/AgentSettingsSaveContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface KnowledgeTabProps {
  agentId: string;
  knowledgeConfig: any;
  isReconfiguring: boolean;
  onUpdate?: () => void;
}

type UploadedFile = {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
};

type ConnectionKind =
  | "google_drive"
  | "github"
  | "slack"
  | "gmail"
  | "notion"
  | "website"
  | "markdown";

type ExternalConnection = {
  kind: ConnectionKind;
  enabled: boolean;
  accountId?: string;
  accountLabel?: string;
  fileIds?: string[];
  fileNames?: string[];
  markdownName?: string;
  markdownContent?: string;
  websiteName?: string;
  websiteUrl?: string;
  scrapeType?: string;
  contentType?: string;
};

type KnowledgeDraft = {
  contexts: Record<string, any[]>;
  files: UploadedFile[];
  webSearch: boolean;
  connections: ExternalConnection[];
};

const ACCEPTED_EXTENSIONS = [
  ".csv",
  ".json",
  ".pdf",
  ".xlsx",
  ".xls",
  ".txt",
  ".md",
  ".docx",
  ".pptx",
];
const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

const ADDABLE_CONNECTIONS: Array<{
  kind: Exclude<ConnectionKind, "google_drive">;
  label: string;
  brandKey?: string;
  icon?: "globe" | "file";
}> = [
  { kind: "github", label: "GitHub", brandKey: "github" },
  { kind: "slack", label: "Slack", brandKey: "slack" },
  { kind: "gmail", label: "Gmail", brandKey: "gmail" },
  { kind: "notion", label: "Notion", brandKey: "notion" },
  { kind: "website", label: "Import website", icon: "globe" },
  { kind: "markdown", label: "Markdown", icon: "file" },
];

const CONNECTION_LABEL: Record<ConnectionKind, string> = {
  google_drive: "Google Drive",
  github: "GitHub",
  slack: "Slack",
  gmail: "Gmail",
  notion: "Notion",
  website: "Import website",
  markdown: "Markdown",
};

const CONNECTION_BRAND: Record<ConnectionKind, string | undefined> = {
  google_drive: "google_drive",
  github: "github",
  slack: "slack",
  gmail: "gmail",
  notion: "notion",
  website: undefined,
  markdown: undefined,
};

function cloneDraft(d: KnowledgeDraft): KnowledgeDraft {
  return JSON.parse(JSON.stringify(d));
}

function draftsEqual(a: KnowledgeDraft, b: KnowledgeDraft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function fileHasAllowedExtension(name: string) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function buildInitialDraft(knowledgeConfig: any): KnowledgeDraft {
  const external = knowledgeConfig?.external || {};
  const connections: ExternalConnection[] = Array.isArray(external.connections)
    ? external.connections
    : [{ kind: "google_drive", enabled: false }];

  if (!connections.some((c) => c.kind === "google_drive")) {
    connections.unshift({ kind: "google_drive", enabled: false });
  }

  return {
    contexts: knowledgeConfig?.contexts || {},
    files: Array.isArray(knowledgeConfig?.files) ? knowledgeConfig.files : [],
    webSearch: external.webSearch ?? false,
    connections,
  };
}

export function KnowledgeTab({
  agentId,
  knowledgeConfig = {},
  isReconfiguring,
  onUpdate,
}: KnowledgeTabProps) {
  const uploadId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<KnowledgeDraft>(() => buildInitialDraft(knowledgeConfig));
  const [saved, setSaved] = useState<KnowledgeDraft>(() => buildInitialDraft(knowledgeConfig));
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeModal, setActiveModal] = useState<ConnectionKind | null>(null);

  const utils = trpc.useUtils();
  const { providersByCatalogId } = useIntegrationCatalog();

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success("Knowledge settings saved");
      setSaved(cloneDraft(draft));
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save knowledge settings");
    },
  });

  useEffect(() => {
    const next = buildInitialDraft(knowledgeConfig);
    setDraft(next);
    setSaved(cloneDraft(next));
  }, [agentId]); // reset when switching agents; avoid wiping unsaved edits on parent refresh

  const isDirty = useMemo(() => !draftsEqual(draft, saved), [draft, saved]);

  const availableAddConnections = useMemo(
    () =>
      ADDABLE_CONNECTIONS.filter(
        (opt) => !draft.connections.some((c) => c.kind === opt.kind),
      ),
    [draft.connections],
  );

  const markDraft = useCallback((updater: (prev: KnowledgeDraft) => KnowledgeDraft) => {
    setDraft(updater);
  }, []);

  const uploadFiles = async (selected: File[]) => {
    if (selected.length === 0) return;
    if (draft.files.length + selected.length > MAX_FILES) {
      toast.error(`You can upload up to ${MAX_FILES} files`);
      return;
    }

    const valid: File[] = [];
    for (const file of selected) {
      if (!fileHasAllowedExtension(file.name)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_SIZE_MB}MB`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(
        valid.map(async (file) => {
          const path = storageUtils.generateUniquePath(
            file.name,
            `agents/${agentId}/knowledge`,
          );
          const result = await storageUtils.upload({
            file,
            bucket: "attachments",
            path,
          });
          if (!result.success || !result.url) {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }
          return {
            id: path,
            name: file.name,
            url: result.url,
            path,
            size: file.size,
            type: file.type,
          } satisfies UploadedFile;
        }),
      );
      markDraft((prev) => ({ ...prev, files: [...prev.files, ...uploaded] }));
      toast.success(`${uploaded.length} file(s) uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = async (file: UploadedFile) => {
    try {
      await storageUtils.delete({ bucket: "attachments", path: file.path });
    } catch {
      // still remove from UI
    }
    markDraft((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== file.id),
    }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: agentId,
      metadata: {
        ...knowledgeConfig,
        contexts: draft.contexts,
        files: draft.files,
        external: {
          webSearch: draft.webSearch,
          connections: draft.connections,
        },
      },
    });
  };

  const handleDiscard = () => {
    setDraft(cloneDraft(saved));
  };

  const addConnection = (kind: Exclude<ConnectionKind, "google_drive">) => {
    markDraft((prev) => ({
      ...prev,
      connections: [...prev.connections, { kind, enabled: false }],
    }));
    setAddConnectionOpen(false);
    setActiveModal(kind);
  };

  const toggleConnection = (kind: ConnectionKind) => {
    markDraft((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.kind === kind ? { ...c, enabled: !c.enabled } : c,
      ),
    }));
  };

  const updateConnection = (kind: ConnectionKind, patch: Partial<ExternalConnection>) => {
    markDraft((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.kind === kind ? { ...c, ...patch } : c,
      ),
    }));
  };

  const removeConnection = (kind: ConnectionKind) => {
    if (kind === "google_drive") return;
    markDraft((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.kind !== kind),
    }));
  };

  const driveProvider = providersByCatalogId["google_drive"];

  useRegisterAgentSettingsSave(
    "knowledge",
    {
      dirty: isDirty,
      save: handleSave,
      discard: handleDiscard,
      isPending: updateMutation.isPending,
    },
    !isReconfiguring
  );

  return (
    <div className="relative space-y-8">
       <div>
        <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-zinc-900" />
          Knowledge
        </h3>
        <p className="text-sm text-zinc-500 mt-0.5">
          What documents and data should this agent use?
        </p>
      </div>

      {/* Upload knowledge */}
      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-zinc-900">Upload knowledge</h4>

        {draft.files.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              void uploadFiles(Array.from(e.dataTransfer.files || []));
            }}
            className={cn(
              "rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center transition-colors",
              isDragging && "border-violet-400 bg-violet-50/40",
            )}
          >
            <label
              htmlFor={uploadId}
              className={cn(
                "flex flex-col items-center gap-2 cursor-pointer",
                (isUploading || isReconfiguring) && "pointer-events-none opacity-60",
              )}
            >
              <Upload className="h-8 w-8 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-800">
                Drag & drop or{" "}
                <span className="text-blue-600 underline-offset-2 hover:underline">
                  choose files
                </span>{" "}
                to upload.
              </p>
              <p className="text-xs text-zinc-400">
                Supported formats: {ACCEPTED_EXTENSIONS.join(", ")}.
              </p>
              <p className="text-xs text-zinc-400">Max {MAX_FILES} files per upload.</p>
              <input
                ref={fileInputRef}
                id={uploadId}
                type="file"
                multiple
                accept={ACCEPTED_EXTENSIONS.join(",")}
                className="hidden"
                disabled={isUploading || isReconfiguring}
                onChange={(e) => void uploadFiles(Array.from(e.target.files || []))}
              />
            </label>
            {isUploading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {draft.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50">
                  <FileText className="h-4 w-4 text-violet-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{file.name}</p>
                  <p className="text-xs text-zinc-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveFile(file)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {draft.files.length < MAX_FILES && (
              <div className="pt-1">
                <input
                  ref={fileInputRef}
                  id={`${uploadId}-more`}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  className="hidden"
                  disabled={isUploading || isReconfiguring}
                  onChange={(e) => void uploadFiles(Array.from(e.target.files || []))}
                />
                <button
                  type="button"
                  disabled={isUploading || isReconfiguring}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-violet-600 hover:bg-zinc-100 hover:text-violet-800 disabled:opacity-40 cursor-pointer"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </span>
                  Add files
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* External Search */}
      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-zinc-900">External Search</h4>

        <div className="space-y-1">
          <div
            className="flex items-center justify-between py-2.5 px-2.5 hover:bg-zinc-100 rounded-md cursor-pointer"
            onClick={() => {
              if (isReconfiguring || updateMutation.isPending) return;
              markDraft((prev) => ({ ...prev, webSearch: !prev.webSearch }));
            }}
          >
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-700">Web Search</span>
            </div>
            <Switch
              className="pointer-events-none"
              checked={draft.webSearch}
              onCheckedChange={() =>
                markDraft((prev) => ({ ...prev, webSearch: !prev.webSearch }))
              }
              disabled={isReconfiguring || updateMutation.isPending}
            />
          </div>
          {draft.connections.map((connection) => {
            const brand = CONNECTION_BRAND[connection.kind];
            return (
              <div
                key={connection.kind}
                className="flex items-center justify-between py-2.5 px-2.5 hover:bg-zinc-100 rounded-md cursor-pointer"
                onClick={() => {
                  if (isReconfiguring || updateMutation.isPending) return;
                  toggleConnection(connection.kind);
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveModal(connection.kind)}
                  className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                >
                  {brand ? (
                    <IntegrationBrandImage provider={brand} size={20} />
                  ) : connection.kind === "website" ? (
                    <Globe className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-zinc-400" />
                  )}
                  <span className="text-sm text-zinc-700 truncate">
                    {CONNECTION_LABEL[connection.kind]}
                    {connection.accountLabel ? (
                      <span className="text-zinc-400"> · {connection.accountLabel}</span>
                    ) : null}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={connection.enabled}
                    onCheckedChange={() => toggleConnection(connection.kind)}
                    disabled={isReconfiguring || updateMutation.isPending}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Popover open={addConnectionOpen} onOpenChange={setAddConnectionOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={availableAddConnections.length === 0 || isReconfiguring}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-violet-600 hover:bg-zinc-100 hover:text-violet-800 disabled:opacity-40 cursor-pointer"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                <Plus className="h-4 w-4" />
              </span>
              Add connection
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1.5 rounded-xl">
            <div className="space-y-0.5">
              {availableAddConnections.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => addConnection(opt.kind)}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-50 cursor-pointer"
                >
                  {opt.brandKey ? (
                    <IntegrationBrandImage provider={opt.brandKey} size={18} />
                  ) : opt.icon === "globe" ? (
                    <Globe className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-zinc-500" />
                  )}
                  <span className="text-sm text-zinc-800">{opt.label}</span>
                </button>
              ))}
              {availableAddConnections.length === 0 && (
                <p className="px-2 py-3 text-xs text-zinc-400 text-center">
                  All connections added
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Workspace access (compact) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-900">Workspace Access</h4>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md text-zinc-600 hover:text-zinc-800"
            onClick={() => setContextModalOpen(true)}
            disabled={isReconfiguring}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add from AgentFlox
          </Button>
        </div>
        {Object.keys(draft.contexts).length === 0 ? (
          <p className="text-xs text-zinc-400">No workspace knowledge selected.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(draft.contexts).map(([type, items]) =>
              items.map((item: any) => (
                <div
                  key={`${type}-${item.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.name || item.title || type}
                    </p>
                  </div>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          markDraft((prev) => {
                            const next = { ...prev.contexts };
                            next[type] = (next[type] || []).filter((i: any) => i.id !== item.id);
                            if (next[type].length === 0) delete next[type];
                            return { ...prev, contexts: next };
                          })
                        }
                        aria-label="Remove item"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Remove item</TooltipContent>
                  </Tooltip>
                </div>
              )),
            )}
          </div>
        )}
      </section>

      <ContextKnowledgeModal
        open={contextModalOpen}
        onOpenChange={setContextModalOpen}
        selectedContexts={draft.contexts}
        onSelect={(selectedContexts) => {
          markDraft((prev) => ({ ...prev, contexts: selectedContexts }));
          setContextModalOpen(false);
        }}
      />

      {/* Google Drive / OAuth connection modal */}
      <Dialog
        open={
          activeModal === "google_drive" ||
          activeModal === "github" ||
          activeModal === "slack" ||
          activeModal === "gmail" ||
          activeModal === "notion"
        }
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="max-w-[560px] w-[95vw] gap-0 p-0 overflow-hidden rounded-2xl">
          {activeModal &&
            ["google_drive", "github", "slack", "gmail", "notion"].includes(activeModal) && (
              <IntegrationKnowledgeModal
                kind={activeModal as ConnectionKind}
                connection={draft.connections.find((c) => c.kind === activeModal)!}
                accounts={
                  activeModal === "google_drive"
                    ? driveProvider?.accounts ?? []
                    : providersByCatalogId[
                        activeModal === "gmail" ? "google_mail" : activeModal
                      ]?.accounts ?? []
                }
                onClose={() => setActiveModal(null)}
                onConnect={async () => {
                  const uiKey =
                    activeModal === "gmail"
                      ? "gmail"
                      : activeModal === "google_drive"
                        ? "google_drive"
                        : activeModal;
                  const result = await connectIntegrationProvider(uiKey);
                  if (result.ok) {
                    toast.success("Account connected");
                    await utils.integration.listCatalog.invalidate();
                  } else {
                    toast.error(result.error);
                  }
                }}
                onSave={(patch) => {
                  updateConnection(activeModal, { ...patch, enabled: true });
                  setActiveModal(null);
                }}
              />
            )}
        </DialogContent>
      </Dialog>

      <MarkdownKnowledgeModal
        open={activeModal === "markdown"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        initial={draft.connections.find((c) => c.kind === "markdown")}
        onSave={(patch) => {
          updateConnection("markdown", { ...patch, enabled: true });
          setActiveModal(null);
        }}
      />

      <WebsiteKnowledgeModal
        open={activeModal === "website"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        initial={draft.connections.find((c) => c.kind === "website")}
        onSave={(patch) => {
          updateConnection("website", { ...patch, enabled: true });
          setActiveModal(null);
        }}
      />
    </div>
  );
}

function IntegrationKnowledgeModal({
  kind,
  connection,
  accounts,
  onClose,
  onConnect,
  onSave,
}: {
  kind: ConnectionKind;
  connection: ExternalConnection;
  accounts: Array<{
    id: string;
    primaryLabel?: string;
    secondaryLabel?: string | null;
    providerAccountId?: string;
  }>;
  onClose: () => void;
  onConnect: () => Promise<void>;
  onSave: (patch: Partial<ExternalConnection>) => void;
}) {
  const [accountId, setAccountId] = useState(connection.accountId || "");
  const [selectedFiles, setSelectedFiles] = useState<string[]>(connection.fileNames || []);
  const [connecting, setConnecting] = useState(false);
  const brand = CONNECTION_BRAND[kind];

  const canCreate = !!accountId;

  return (
    <>
      <div className="px-6 pt-5 pb-4 space-y-4">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            {brand ? <IntegrationBrandImage provider={brand} size={22} /> : null}
            {CONNECTION_LABEL[kind]}
          </DialogTitle>
          <p className="text-sm text-zinc-500 font-normal">
            {kind === "google_drive"
              ? "Add synced Google Drive files to agent knowledge. These added knowledge tables will automatically pick up file changes every few minutes."
              : `Connect ${CONNECTION_LABEL[kind]} to use it as agent knowledge.`}
          </p>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-zinc-800">
            Select account for accessing {CONNECTION_LABEL[kind]}
          </Label>
          <Select
            value={accountId || undefined}
            onValueChange={(v) => {
              setAccountId(v);
              setSelectedFiles([]);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select connected account..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <div className="px-2 py-2 text-sm text-zinc-400">No options...</div>
              ) : (
                accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.primaryLabel || a.secondaryLabel || a.providerAccountId || a.id}
                  </SelectItem>
                ))
              )}
              <div className="border-t mt-1 pt-1">
                <button
                  type="button"
                  disabled={connecting}
                  onClick={async () => {
                    setConnecting(true);
                    try {
                      await onConnect();
                    } finally {
                      setConnecting(false);
                    }
                  }}
                  className="w-full flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                >
                  {connecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add account
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-zinc-200 min-h-[180px] flex">
          <div className="flex-1 flex items-center justify-center p-6">
            <Button
              type="button"
              disabled={!accountId}
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                const name = `Selected file ${selectedFiles.length + 1}`;
                setSelectedFiles((prev) => [...prev, name]);
              }}
            >
              Select files from {CONNECTION_LABEL[kind]}
            </Button>
          </div>
          <div className="w-40 border-l border-zinc-200 p-3 flex flex-col">
            <div className="flex-1 space-y-1 overflow-auto">
              {selectedFiles.map((name, idx) => (
                <div
                  key={`${name}-${idx}`}
                  className="flex items-center justify-between gap-1 text-xs text-zinc-700"
                >
                  <span className="truncate">{name}</span>
                  <button
                    type="button"
                    className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    onClick={() =>
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                className="text-xs text-zinc-500 hover:text-zinc-800 mt-2 cursor-pointer"
              >
                Remove all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!canCreate}
          onClick={() => {
            const account = accounts.find((a) => a.id === accountId);
            onSave({
              accountId,
              accountLabel:
                account?.primaryLabel ||
                account?.secondaryLabel ||
                account?.providerAccountId ||
                undefined,
              fileNames: selectedFiles,
            });
          }}
          className={cn(
            "rounded-xl",
            canCreate
              ? "bg-zinc-900 hover:bg-zinc-800 text-white"
              : "bg-zinc-100 text-zinc-400",
          )}
        >
          Create Knowledge
        </Button>
      </div>
    </>
  );
}

function MarkdownKnowledgeModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ExternalConnection;
  onSave: (patch: Partial<ExternalConnection>) => void;
}) {
  const [name, setName] = useState(initial?.markdownName || "");
  const [content, setContent] = useState(initial?.markdownContent || "");

  useEffect(() => {
    if (!open) return;
    setName(initial?.markdownName || "");
    setContent(initial?.markdownContent || "");
  }, [open, initial]);

  const canContinue = name.trim().length > 0 && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] w-[95vw] gap-0 p-0 overflow-hidden rounded-2xl">
        <div className="px-6 pt-5 pb-4 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold">Add markdown/plain text</DialogTitle>
            <p className="text-sm text-zinc-500 font-normal">
              Provide knowledge to your agent by adding markdown or plain text.
            </p>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name..."
            className="h-11 rounded-xl"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste markdown/plain text contents..."
            className="min-h-[180px] rounded-xl resize-y"
          />
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canContinue}
            className={cn(
              "rounded-xl",
              canContinue ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400",
            )}
            onClick={() =>
              onSave({
                markdownName: name.trim(),
                markdownContent: content,
                accountLabel: name.trim(),
              })
            }
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WebsiteKnowledgeModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ExternalConnection;
  onSave: (patch: Partial<ExternalConnection>) => void;
}) {
  const [name, setName] = useState(initial?.websiteName || "");
  const [url, setUrl] = useState(initial?.websiteUrl || "https://");
  const [contentType, setContentType] = useState(initial?.contentType || "text");
  const [scrapeType, setScrapeType] = useState(initial?.scrapeType || "simple");

  useEffect(() => {
    if (!open) return;
    setName(initial?.websiteName || "");
    setUrl(initial?.websiteUrl || "https://");
    setContentType(initial?.contentType || "text");
    setScrapeType(initial?.scrapeType || "simple");
  }, [open, initial]);

  const canImport = name.trim().length > 0 && /^https?:\/\/.+/i.test(url.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] w-[95vw] gap-0 p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-4 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold">Import content from website</DialogTitle>
            <p className="text-sm text-zinc-500 font-normal">
              Import data from external sources as knowledge.
            </p>
          </DialogHeader>

          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 space-y-2">
            <Label className="text-sm font-medium text-zinc-900">Name your table</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              className="h-10 rounded-xl bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-900">
              Website URL (we will crawl through links on this page, up to 5 layers deep)
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-900">Type of content to import</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-900">Scrape type</Label>
            <Select value={scrapeType} onValueChange={setScrapeType}>
              <SelectTrigger className="h-10 rounded-xl w-full sm:w-[70%]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple HTML (cheaper)</SelectItem>
                <SelectItem value="full">Full page render</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-zinc-100 px-6 py-4">
          <Button
            type="button"
            disabled={!canImport}
            className={cn(
              "rounded-xl",
              canImport ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400",
            )}
            onClick={() =>
              onSave({
                websiteName: name.trim(),
                websiteUrl: url.trim(),
                contentType,
                scrapeType,
                accountLabel: name.trim(),
              })
            }
          >
            Import website
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
