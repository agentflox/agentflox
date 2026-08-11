"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bug,
  ChevronDown,
  Loader2,
  ShieldAlert,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RunLogEntry, RunRecord } from "@/entities/tools/hooks/useToolRun";

const SKIP_DETAIL_KEYS = new Set(["status", "stepType", "_truncated", "summary"]);

function normalizeOutputText(text: string): string {
  // Some tool outputs include newline characters (or escaped "\n") that we want to show
  // as a single-line JSON-friendly string in the UI.
  return text.replace(/\\n/g, " ").replace(/\r?\n/g, " ");
}

function flattenDetails(payload: any): Array<{ key: string; value: unknown }> {
  if (payload == null) return [];
  const root =
    payload.inputs && typeof payload.inputs === "object" && !Array.isArray(payload.inputs)
      ? payload.inputs
      : payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
        ? payload.result
        : typeof payload === "object" && !Array.isArray(payload)
          ? payload
          : { value: payload };

  const rows: Array<{ key: string; value: unknown }> = [];
  for (const [key, value] of Object.entries(root as Record<string, unknown>)) {
    if (SKIP_DETAIL_KEYS.has(key)) continue;
    if (value === undefined) continue;
    rows.push({ key, value });
  }
  return rows;
}

function formatDetailValue(value: unknown): { text: string; tone: "default" | "link" | "number" | "null" | "bool" } {
  if (value === null || value === undefined) return { text: "null", tone: "null" };
  if (typeof value === "boolean") return { text: String(value), tone: "bool" };
  if (typeof value === "number") return { text: String(value), tone: "number" };
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return { text: value, tone: "link" };
    return { text: value, tone: "default" };
  }
  // Compact objects like { chars, pages, preview }
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.preview === "string" && (obj.chars != null || obj.pages != null)) {
      const bits = [
        obj.pages != null ? `${obj.pages} pages` : null,
        obj.chars != null ? `${Number(obj.chars).toLocaleString()} chars` : null,
      ].filter(Boolean);
      return {
        text: `${bits.join(" · ")}\n${obj.preview}`,
        tone: "default",
      };
    }
  }
  try {
    return { text: JSON.stringify(value, null, 2), tone: "default" };
  } catch {
    return { text: String(value), tone: "default" };
  }
}

type ProgressCard = {
  id: string;
  title: string;
  phase: "start" | "complete" | "error" | "info";
  summary?: string;
  inputs: Array<{ key: string; value: unknown }>;
  results: Array<{ key: string; value: unknown }>;
  openDefault: boolean;
};

function resolvePhase(log: RunLogEntry): ProgressCard["phase"] {
  if (log.phase === "start" || log.phase === "complete" || log.phase === "error") return log.phase;
  const c = log.content?.toLowerCase() || "";
  if (c.includes("completed")) return "complete";
  if (c.includes("fail")) return "error";
  return "info";
}

/** One card per stepId — later events (complete/error) win over start; duplicates collapsed. */
function buildProgressCards(logs: RunLogEntry[]): ProgressCard[] {
  const byStep = new Map<string, ProgressCard>();
  const order: string[] = [];

  for (const log of logs) {
    if (log.type !== "thinking") continue;
    const phase = resolvePhase(log);
    const stepKey = log.nodeId || `anon:${log.content || "step"}`;
    if (stepKey === "init") {
      // Keep a single init card if it has useful inputs
      const details = flattenDetails(log.payload);
      if (details.length === 0) continue;
    }

    if (!byStep.has(stepKey)) order.push(stepKey);
    const existing = byStep.get(stepKey);

    const summary =
      typeof log.payload?.summary === "string" ? log.payload.summary : existing?.summary;
    const inputs =
      phase === "start"
        ? flattenDetails(log.payload)
        : existing?.inputs?.length
          ? existing.inputs
          : flattenDetails(
              log.payload?.inputs
                ? { inputs: log.payload.inputs }
                : null,
            );
    const results =
      phase === "complete" || phase === "error"
        ? flattenDetails(
            log.payload?.result != null
              ? { result: log.payload.result }
              : log.payload?.error != null
                ? { error: log.payload.error }
                : log.payload,
          )
        : existing?.results || [];

    // Prefer complete/error over start for title + phase
    const preferNew =
      !existing ||
      phase === "complete" ||
      phase === "error" ||
      (phase === "start" && existing.phase === "info");

    const titleBase = (log.content || existing?.title || "Step").replace(/\s+completed$/i, "").replace(/\s+failed$/i, "");
    const title =
      phase === "complete"
        ? `${titleBase} completed`
        : phase === "error"
          ? `${titleBase} failed`
          : titleBase;

    byStep.set(stepKey, {
      id: stepKey,
      title: preferNew ? title : existing!.title,
      phase: preferNew ? phase : existing!.phase,
      summary,
      inputs: inputs.length ? inputs : existing?.inputs || [],
      results: results.length ? results : existing?.results || [],
      openDefault: false,
    });
  }

  const cards = order.map((k) => byStep.get(k)!).filter(Boolean);
  if (cards.length > 0) {
    cards[cards.length - 1] = { ...cards[cards.length - 1], openDefault: true };
  }
  return cards;
}

function ProgressDetailRows({ details }: { details: Array<{ key: string; value: unknown }> }) {
  if (details.length === 0) return null;
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {details.map(({ key, value }) => {
        const formatted = formatDetailValue(value);
        return (
          <div
            key={key}
            className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2"
          >
            <div className="text-[11px] font-medium text-zinc-500 mb-0.5">{key}</div>
            {formatted.tone === "link" ? (
              <a
                href={formatted.text}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-sky-600 hover:underline break-all"
              >
                {formatted.text}
              </a>
            ) : (
              <pre
                className={cn(
                  "text-sm whitespace-pre-wrap break-words font-sans leading-relaxed max-h-32 overflow-y-auto",
                  formatted.tone === "number" && "text-sky-700 font-medium",
                  formatted.tone === "null" && "text-violet-600",
                  formatted.tone === "bool" && "text-amber-700",
                  formatted.tone === "default" && "text-zinc-800",
                )}
              >
                {formatted.text}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressCardItem({ card, forceOpen }: { card: ProgressCard; forceOpen?: boolean }) {
  const [open, setOpen] = useState(forceOpen ?? card.openDefault);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50/80 transition-colors cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {card.phase === "error" ? (
              <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
            ) : card.phase === "complete" ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            ) : card.phase === "start" ? (
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-zinc-300 shrink-0" />
            )}
            <span className="text-sm font-semibold text-zinc-900 truncate">{card.title}</span>
          </div>
          {card.summary && (
            <p className="mt-1 ml-4 text-xs text-zinc-500 line-clamp-2 text-left">{card.summary}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-400 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-100 max-h-80 overflow-y-auto">
          <div className="pt-3 space-y-3">
            {card.summary && (
              <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-zinc-800 leading-relaxed">
                {card.summary}
              </div>
            )}
            {card.inputs.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                  Inputs
                </div>
                <ProgressDetailRows details={card.inputs} />
              </div>
            )}
            {card.results.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                  Result
                </div>
                <ProgressDetailRows details={card.results} />
              </div>
            )}
            {!card.summary && card.inputs.length === 0 && card.results.length === 0 && (
              <p className="text-xs text-zinc-400 italic">No step details yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function renderOutputBody(output: unknown) {
  if (output == null || output === "") {
    return <span className="text-sm text-zinc-400 italic">Waiting for output…</span>;
  }
  if (typeof output === "string") {
    return (
      <pre className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
        {normalizeOutputText(output)}
      </pre>
    );
  }
  if (typeof output === "object" && !Array.isArray(output)) {
    const obj = output as Record<string, unknown>;
    const primary =
      (typeof obj.summary === "string" && obj.summary) ||
      (typeof obj.text === "string" && obj.text) ||
      (typeof obj.result === "string" && obj.result) ||
      null;
    const normalizedPrimary = typeof primary === "string" ? normalizeOutputText(primary) : null;
    // Drop status column / field entirely
    const meta = Object.entries(obj).filter(
      ([k]) => !["summary", "text", "result", "status"].includes(k),
    );

    // Prefer a single stacked layout (no status column)
    return (
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {normalizedPrimary ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2">
            <div className="text-[11px] font-medium text-zinc-500 mb-0.5">
              {typeof obj.summary === "string" ? "summary" : typeof obj.text === "string" ? "text" : "result"}
            </div>
            <pre className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {normalizedPrimary.length > 4000
                ? `${normalizedPrimary.slice(0, 4000)}… (${normalizedPrimary.length.toLocaleString()} chars)`
                : normalizedPrimary}
            </pre>
          </div>
        ) : null}
        {meta.map(([key, value]) => {
          const formatted = formatDetailValue(value);
          return (
            <div key={key} className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2">
              <div className="text-[11px] font-medium text-zinc-500 mb-0.5">{key}</div>
              {formatted.tone === "link" ? (
                <a href={formatted.text} target="_blank" rel="noreferrer" className="text-sm text-sky-600 hover:underline break-all">
                  {formatted.text}
                </a>
              ) : (
                <pre className="text-sm text-zinc-800 whitespace-pre-wrap break-words font-sans max-h-40 overflow-y-auto">
                  {formatted.text}
                </pre>
              )}
            </div>
          );
        })}
        {!primary && meta.length === 0 ? (
          <pre className="text-sm text-zinc-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
            {JSON.stringify(output, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }
  return (
    <pre className="text-sm text-zinc-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

export function ToolRunProgressPanel({
  run,
  isRunning,
  onFixWithAi,
}: {
  run: RunRecord | null;
  isRunning: boolean;
  onFixWithAi?: () => void;
}) {
  const [errorOpen, setErrorOpen] = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);

  const cards = useMemo(() => buildProgressCards(run?.logs ?? []), [run?.logs]);
  const hasError = run?.status === "error" || run?.status === "cancelled" || Boolean(run?.error);
  const hasOutput =
    run?.output !== undefined && run?.output !== null && run?.output !== "";
  const showPanel = isRunning || cards.length > 0 || hasError || hasOutput;

  useEffect(() => {
    if (hasError) setErrorOpen(true);
  }, [hasError, run?.id]);

  if (!showPanel) return null;

  return (
    <div className="w-full space-y-4">
      {(isRunning || cards.length > 0) && (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <Activity className="h-4 w-4 text-zinc-500" />
            <span>Tool Progress</span>
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running
              </span>
            )}
          </div>
          <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-0.5">
            {cards.length === 0 && isRunning ? (
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                Starting execution…
              </div>
            ) : (
              cards.map((card, i) => (
                <ProgressCardItem
                  key={card.id}
                  card={card}
                  forceOpen={i === cards.length - 1 && isRunning}
                />
              ))
            )}
          </div>
        </div>
      )}

      {hasError && !isRunning && (
        <div className="w-full rounded-xl border border-red-200 bg-red-50/80 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-red-800 cursor-pointer"
              onClick={() => setErrorOpen((v) => !v)}
            >
              <ShieldAlert className="h-4 w-4" />
              {run?.status === "cancelled" ? "Run cancelled" : "Your tool errored"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", errorOpen && "rotate-180")} />
            </button>
            {onFixWithAi && run?.status !== "cancelled" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-red-200 bg-white text-red-800 hover:bg-red-50 cursor-pointer"
                onClick={onFixWithAi}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Fix with AI
              </Button>
            )}
          </div>
          {errorOpen && (
            <div className="px-4 pb-4 space-y-3 max-h-60 overflow-y-auto">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">
                  {typeof run?.error === "string" && run.error.length < 80
                    ? run.error.split(/[.\n]/)[0] || "Execution failed"
                    : "Execution failed"}
                </h4>
                <p className="mt-2 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {run?.error || "The tool run failed. Check your inputs and try again."}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                  onClick={() => {
                    const body = encodeURIComponent(run?.error || "Tool execution error");
                    window.open(`mailto:support@agentflox.com?subject=Tool%20error%20report&body=${body}`, "_blank");
                  }}
                >
                  <Bug className="h-3.5 w-3.5" />
                  Report this error
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(hasOutput || (isRunning && cards.length > 0)) && !(hasError && run?.status !== "cancelled") && !hasError && (
        <div className="w-full rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setOutputOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50/80 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Output
              {isRunning && !hasOutput && (
                <span className="text-[11px] font-medium text-zinc-400">waiting…</span>
              )}
            </div>
            <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", outputOpen && "rotate-180")} />
          </button>
          {outputOpen && (
            <div className="px-4 pb-4 border-t border-zinc-100 pt-3">
              {renderOutputBody(hasOutput ? run?.output : null)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
