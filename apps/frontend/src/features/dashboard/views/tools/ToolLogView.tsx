"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  RefreshCw, Braces, Trash2, ChevronRight, CheckCircle2, XCircle,
  Clock, MoreHorizontal, ChevronDown, FileText, Code2, Image as ImageIcon, Film, FileWarning,
  Play, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { BuilderInputField } from "@/entities/tools/types/builder";
import type { RunRecord, RunLogEntry } from "../../../../entities/tools/hooks/useToolRun";
import { ArtifactViewer, buildArtifactsFromToolResult, type ExecutionArtifact } from "@/features/artifacts";


export type ToolLogViewProps = {
  inputs: BuilderInputField[];
  runHistory: RunRecord[];
  setRunHistory: React.Dispatch<React.SetStateAction<RunRecord[]>>;
  selectedRunId: string | null;
  setSelectedRunId: React.Dispatch<React.SetStateAction<string | null>>;
  runInput: Record<string, string>;
  setRunInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedRun: RunRecord | null;
  isRunningTool: boolean;
  runCompositeTool: (opts?: {
    startStepId?: string;
    endStepId?: string;
    input?: Record<string, unknown>;
  }) => void;
  cancelCompositeTool?: () => void;
  onDeleteRun?: (runId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
};

/* ── helpers ────────────────────────────────────────────────── */

function formatDuration(start: number, end: number) {
  const s = (end - start) / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

function StatusDot({ status }: { status: RunRecord["status"] }) {
  if (status === "running")
    return <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />;
  if (status === "success")
    return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />;
  if (status === "cancelled")
    return <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />;
  return <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />;
}

function StatusBadge({ status }: { status: RunRecord["status"] }) {
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
        <RefreshCw className="h-2.5 w-2.5 animate-spin" />running
      </span>
    );
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
        <CheckCircle2 className="h-2.5 w-2.5" />success
      </span>
    );
  if (status === "cancelled")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
        <XCircle className="h-2.5 w-2.5" />cancelled
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-100">
      <XCircle className="h-2.5 w-2.5" />{status}
    </span>
  );
}

/* ── artifact icon ──────────────────────────────────────────── */
const ART_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  markdown: FileText, text: FileText, code: Code2, json: Code2,
  image: ImageIcon, video: Film, unsupported: FileWarning,
};

function ArtifactCard({ artifact, onOpen }: { artifact: ExecutionArtifact; onOpen: (a: ExecutionArtifact) => void }) {
  const Icon = ART_ICON[artifact.type] ?? FileText;
  const preview = artifact.detail
    ?? (artifact.content ? artifact.content.slice(0, 100) : null)
    ?? artifact.url
    ?? null;
  return (
    <button
      type="button"
      onClick={() => onOpen(artifact)}
      className="w-full text-left flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer"
    >
      <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-indigo-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-zinc-800 truncate">{artifact.filename}</p>
        <p className="text-[11px] text-zinc-400 capitalize">{artifact.type}</p>
        {preview && (
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 font-mono">{preview}</p>
        )}
      </div>
    </button>
  );
}

/* ── collapsible log section ────────────────────────────────── */
function LogSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <span className="text-xs font-semibold text-zinc-600">{title}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-zinc-100">{children}</div>}
    </div>
  );
}

/* ── log entry pill ─────────────────────────────────────────── */
function LogEntry({ log }: { log: RunLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!log.payload;

  const bg = log.type === "thinking"
    ? "bg-zinc-900 border-zinc-800"
    : log.type === "error"
      ? "bg-red-950 border-red-900/50"
      : log.type === "complete"
        ? "bg-emerald-950 border-emerald-900/40"
        : "bg-zinc-800 border-zinc-700/50";
  const labelColor = log.type === "thinking" ? "text-indigo-400"
    : log.type === "error" ? "text-red-400"
      : log.type === "complete" ? "text-emerald-400"
        : "text-blue-400";

  return (
    <div className={cn("rounded-xl border px-3 py-2 font-mono text-xs", bg)}>
      <div className="flex items-start gap-2">
        <span className={cn("shrink-0 text-[11px] font-bold uppercase mt-0.5 w-14", labelColor)}>
          {log.type}
        </span>
        <pre className="text-zinc-200 whitespace-pre-wrap break-all flex-1 leading-relaxed">
          {log.content}
        </pre>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-zinc-600 text-[11px]">{new Date(log.ts).toLocaleTimeString()}</span>
          {hasDetail && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </button>
          )}
        </div>
      </div>
      {open && log.payload && (
        <pre className="mt-2 text-zinc-400 text-[11px] whitespace-pre-wrap break-all border-t border-zinc-700 pt-2 leading-relaxed">
          {JSON.stringify(log.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── run detail panel ───────────────────────────────────────── */
function RunDetail({
  run,
  isRunningTool,
  onOpenArtifact,
}: {
  run: RunRecord;
  isRunningTool: boolean;
  onOpenArtifact: (a: ExecutionArtifact) => void;
}) {
  // Build unique artifacts from this run only
  const artifacts: ExecutionArtifact[] = React.useMemo(() => {
    const seen = new Set<string>();
    const out: ExecutionArtifact[] = [];
    const candidates: ExecutionArtifact[] = Array.isArray(run.artifacts) && run.artifacts.length > 0
      ? run.artifacts.flatMap((a) => {
          const built = buildArtifactsFromToolResult("tool_run", a);
          return built.length ? built : buildArtifactsFromToolResult("tool_run", { content: typeof a === "string" ? a : JSON.stringify(a) });
        })
      : run.output != null && run.status === "success"
        ? buildArtifactsFromToolResult("tool_output", run.output)
        : [];
    for (const a of candidates) {
      const key = a.id ?? a.url ?? a.filename ?? JSON.stringify(a.content ?? "").slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  }, [run]);

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      {/* Scrollable log content */}
      <div className="h-full min-w-0 overflow-y-auto px-5 py-4 space-y-3">
        {/* Input */}
        {Object.keys(run.input).length > 0 && (
          <LogSection title="Input" defaultOpen={true}>
            <div className="px-4 py-3 space-y-1 font-mono text-xs">
              {Object.entries(run.input).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-indigo-500 shrink-0">{k}:</span>
                  <span className="text-zinc-700 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </LogSection>
        )}

        {/* Log entries */}
        {run.logs.length > 0 && (
          <LogSection title={`Execution Log (${run.logs.length})`} defaultOpen={true}>
            <div className="p-3 space-y-2 bg-zinc-950/50">
              {run.logs.map((log, i) => <LogEntry key={i} log={log} />)}
              {isRunningTool && run.status === "running" && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs animate-pulse px-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />Streaming…
                </div>
              )}
              {run.status === "cancelled" && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs px-1">
                  Run stopped
                </div>
              )}
            </div>
          </LogSection>
        )}

        {/* Final Output */}
        {run.output != null && (
          <LogSection title="Output" defaultOpen={true}>
            <div className="p-3 bg-emerald-950/20">
              <pre className="text-emerald-800 text-xs whitespace-pre-wrap break-all font-mono leading-relaxed max-h-72 overflow-y-auto">
                {typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2)}
              </pre>
            </div>
          </LogSection>
        )}

        {/* Artifacts list */}
        {artifacts.length > 0 && (
          <LogSection title={`Artifacts (${artifacts.length})`} defaultOpen={true}>
            <div className="p-3 space-y-2">
              {artifacts.map((a, i) => (
                <ArtifactCard key={a.id ?? i} artifact={a} onOpen={onOpenArtifact} />
              ))}
            </div>
          </LogSection>
        )}

        {run.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {run.error}
          </div>
        )}

        {Object.keys(run.input).length === 0 &&
          run.logs.length === 0 &&
          run.output === undefined &&
          !run.error && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
              No stored details for this run yet.
            </div>
          )}
      </div>
    </div>
  );
}

/* ── run history item ───────────────────────────────────────── */
function RunHistoryItem({
  run,
  isSelected,
  onSelect,
  onDelete,
  onRerun,
  isRunningTool,
}: {
  run: RunRecord;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onRerun: (run: RunRecord) => void;
  isRunningTool: boolean;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const latestLog = run.logs.length > 0 ? run.logs[run.logs.length - 1] : null;
  const isLive = run.status === "running";

  return (
    <div
      className={cn(
        "flex items-start gap-1 px-3 py-2.5 border-b border-zinc-100 hover:bg-zinc-50 transition-colors group cursor-pointer",
        isSelected && "bg-indigo-50/70 border-l-[3px] border-l-indigo-500",
        isLive && "bg-amber-50/40",
      )}
      onClick={onSelect}
    >
      {/* Dot + content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <StatusDot status={run.status} />
          <span className="text-xs font-semibold text-zinc-700 truncate flex-1">
            {Object.keys(run.input).length > 0
              ? Object.entries(run.input)
                  .slice(0, 1)
                  .map(([k, v]) => `${k}: ${String(v).slice(0, 22)}`)
                  .join(", ")
              : "No input"}
          </span>
        </div>
        {run.error && !isLive && (
          <p className="text-[11px] text-red-400 truncate pl-4">{run.error}</p>
        )}
        {isLive ? (
          <div className="pl-4 mt-0.5 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
              Running…
              <span className="text-amber-500/80 font-normal">· {run.logs.length} events</span>
            </div>
            {latestLog?.content ? (
              <p className="text-[10px] text-zinc-500 truncate leading-relaxed">
                {latestLog.type}: {latestLog.content}
              </p>
            ) : (
              <p className="text-[10px] text-zinc-400 italic">Waiting for progress…</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-4">
            <span className="text-[11px] text-zinc-400">{new Date(run.startedAt).toLocaleTimeString()}</span>
            {run.finishedAt && (
              <span className="text-[11px] text-zinc-400">
                · {formatDuration(run.startedAt, run.finishedAt)}
              </span>
            )}
            <span className="text-[11px] text-zinc-400">· {run.logs.length} events</span>
          </div>
        )}
      </div>

      {/* More button */}
      <Popover open={popOpen} onOpenChange={setPopOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); }}
            className={cn(
              "h-6 w-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0",
              popOpen && "opacity-100",
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-40 p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={isRunningTool || isLive}
                onClick={(e) => {
                  e.stopPropagation();
                  setPopOpen(false);
                  onRerun(run);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="h-3.5 w-3.5" />
                Rerun
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Rerun with the same input
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPopOpen(false);
              onDelete(run.id);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────── */
const MIN_SIDEBAR = 200;
const MAX_SIDEBAR = 480;
const DEFAULT_SIDEBAR = 280;

export function ToolLogView({
  runHistory,
  setRunHistory,
  selectedRunId,
  setSelectedRunId,
  selectedRun: selectedRunProp,
  isRunningTool,
  runCompositeTool,
  cancelCompositeTool,
  setRunInput,
  onDeleteRun,
  onLoadMore,
  hasMore,
  loadingMore,
}: ToolLogViewProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(DEFAULT_SIDEBAR);
  const [activeArtifact, setActiveArtifact] = useState<ExecutionArtifact | null>(null);

  // Always resolve from the (merged) runHistory prop — live-only selectedRun from
  // useToolRun is null for DB-loaded history items.
  const selectedRun = React.useMemo(
    () =>
      runHistory.find((r) => r.id === selectedRunId || r.serverRunId === selectedRunId) ??
      selectedRunProp ??
      null,
    [runHistory, selectedRunId, selectedRunProp],
  );

  useEffect(() => {
    setActiveArtifact(null);
  }, [selectedRunId]);

  /* ── resize logic ── */
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startW.current = sidebarWidth;
    e.preventDefault();
  }, [sidebarWidth]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      setSidebarWidth(Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startW.current + delta)));
    }
    function onUp() { isDragging.current = false; }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  /* ── delete handler ── */
  function handleDelete(runId: string) {
    if (selectedRunId === runId) {
      const idx = runHistory.findIndex((r) => r.id === runId);
      const next = runHistory[idx + 1] ?? runHistory[idx - 1] ?? null;
      setSelectedRunId(next?.id ?? null);
    }
    setRunHistory((prev) => prev.filter((r) => r.id !== runId));
    onDeleteRun?.(runId);
  }

  function handleRerun(run: RunRecord) {
    if (isRunningTool || run.status === "running") return;
    const asStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(run.input ?? {})) {
      asStrings[k] = typeof v === "string" ? v : JSON.stringify(v ?? "");
    }
    setRunInput(asStrings);
    runCompositeTool({ input: { ...(run.input ?? {}) } });
  }

  return (
    <div className="flex-1 flex w-full h-full overflow-hidden relative">
      {/* LEFT: resizable history sidebar */}
      <div
        style={{ width: sidebarWidth, minWidth: MIN_SIDEBAR, maxWidth: MAX_SIDEBAR }}
        className="flex flex-col bg-white border-r border-zinc-200 shrink-0 overflow-hidden"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Braces className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 leading-tight truncate">Run History</p>
              <p className="text-[11px] text-zinc-400">
                {runHistory.length} {runHistory.length === 1 ? "run" : "runs"}
              </p>
            </div>
          </div>
          {isRunningTool ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />live
              </span>
            </div>
          ) : null}
        </div>

        {/* Run list */}
        <div className="flex-1 overflow-y-auto">
          {runHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-zinc-300">
              <Braces className="h-5 w-5" />
              <p className="text-xs text-zinc-400">No runs yet</p>
            </div>
          ) : (
            <>
              {runHistory.map((run) => (
                <RunHistoryItem
                  key={run.id}
                  run={run}
                  isSelected={selectedRunId === run.id}
                  onSelect={() => setSelectedRunId(run.id)}
                  onDelete={handleDelete}
                  onRerun={handleRerun}
                  isRunningTool={isRunningTool}
                />
              ))}
              {hasMore && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                  className="w-full py-2.5 text-[11px] text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-1.5 border-t border-zinc-100 cursor-pointer disabled:opacity-50"
                >
                  {loadingMore
                    ? <><RefreshCw className="h-3 w-3 animate-spin" />Loading…</>
                    : "Load more runs"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 cursor-col-resize hover:bg-indigo-400 transition-colors bg-transparent active:bg-indigo-500 shrink-0 select-none"
      />

      {/* RIGHT: detail */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#f9f9fb] relative">
        {selectedRun ? (
          <>
            {/* status bar */}
            <div className="shrink-0 px-5 py-2 bg-white border-b border-zinc-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">
                  {Object.entries(selectedRun.input).length > 0
                    ? Object.entries(selectedRun.input).slice(0, 2).map(([k, v], i) => (
                        <span key={k} className="inline-block max-w-[160px] align-bottom truncate">
                          {k}: {String(v)}
                          {i === 0 && Object.entries(selectedRun.input).length > 1 ? "  ·  " : ""}
                        </span>
                      ))
                    : "No input"}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {new Date(selectedRun.startedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={selectedRun.status} />
                {selectedRun.finishedAt && (
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDuration(selectedRun.startedAt, selectedRun.finishedAt)}
                  </span>
                )}
              </div>
            </div>
            <RunDetail
              run={selectedRun}
              isRunningTool={isRunningTool}
              onOpenArtifact={setActiveArtifact}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-300">
            <Braces className="h-9 w-9 text-zinc-200" />
            <p className="text-sm font-medium text-zinc-400">Select a run</p>
            <p className="text-xs text-zinc-400">Click a run from the history to view logs & artifacts</p>
          </div>
        )}

        {/* Artifact viewer — overlays the whole right panel, including the status bar */}
        {activeArtifact && (
          <div className="absolute top-0 right-0 bottom-0 z-20">
            <ArtifactViewer artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />
          </div>
        )}
      </div>

    </div>
  );
}