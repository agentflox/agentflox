"use client";
import React from "react";
import { BACKEND_URL } from "@/hooks/useSSEStream";
import { fetchAuthToken } from "@/utils/backend-request";
import type { RunLogEntry, RunRecord } from "./useToolRun";

export type DbRunRecord = {
  id: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";
  input: Record<string, unknown> | null;
  output: unknown;
  steps?: unknown;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

type StoredProgressLog = {
  type?: string;
  content?: string;
  stepId?: string;
  phase?: "start" | "complete" | "error";
  payload?: any;
  timestamp?: string;
  artifacts?: any[];
};

function normalizeStoredLogs(steps: unknown, run: DbRunRecord): {
  logs: RunLogEntry[];
  artifacts?: any[];
} {
  const startedAt = new Date(run.createdAt).getTime();
  const finishedAt = run.finishedAt ? new Date(run.finishedAt).getTime() : startedAt;

  if (steps && typeof steps === "object" && !Array.isArray(steps)) {
    const bag = steps as { logs?: StoredProgressLog[]; artifacts?: any[]; results?: unknown };
    const artifacts = Array.isArray(bag.artifacts) ? bag.artifacts : undefined;

    if (Array.isArray(bag.logs) && bag.logs.length > 0) {
      const logs: RunLogEntry[] = bag.logs
        .filter((e) => e && (e.type === "thinking" || e.type === "token" || e.type === "complete" || e.type === "error"))
        .map((e) => ({
          type: e.type as RunLogEntry["type"],
          content: typeof e.content === "string" ? e.content : JSON.stringify(e.content ?? ""),
          ts: e.timestamp ? new Date(e.timestamp).getTime() : startedAt,
          nodeId: e.stepId,
          phase: e.phase,
          payload: e.payload,
        }));

      // Ensure a final complete entry exists when we have output
      const hasComplete = logs.some((l) => l.type === "complete");
      if (!hasComplete && run.output != null) {
        logs.push({
          type: "complete",
          content: typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2),
          ts: finishedAt,
        });
      }
      return { logs, artifacts };
    }
  }

  // Legacy / empty steps: still surface output so the detail panel isn't blank
  const logs: RunLogEntry[] = [];
  if (run.output != null) {
    logs.push({
      type: "complete",
      content: typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2),
      ts: finishedAt,
    });
  } else if (run.error) {
    logs.push({
      type: "error",
      content: run.error,
      ts: finishedAt,
    });
  }
  return { logs };
}

function dbToRunRecord(r: DbRunRecord): RunRecord {
  const { logs, artifacts } = normalizeStoredLogs(r.steps, r);
  return {
    id: r.id,
    serverRunId: r.id,
    startedAt: new Date(r.createdAt).getTime(),
    finishedAt: r.finishedAt ? new Date(r.finishedAt).getTime() : undefined,
    status:
      r.status === "SUCCESS"
        ? "success"
        : r.status === "CANCELLED"
          ? "cancelled"
          : r.status === "FAILED" || r.status === "TIMEOUT"
            ? "error"
            : "running",
    input: (r.input as Record<string, unknown>) ?? {},
    logs,
    output: r.output ?? undefined,
    error: r.error ?? undefined,
    artifacts,
  };
}

const PAGE_SIZE = 50;

async function fetchPage(
  toolId: string,
  cursor: string | null,
): Promise<{ runs: RunRecord[]; nextCursor: string | null }> {
  const token = await fetchAuthToken();
  const url = new URL(`${BACKEND_URL}/v1/tools/composite/${encodeURIComponent(toolId)}/runs`);
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    runs: (data.runs as DbRunRecord[]).map(dbToRunRecord),
    nextCursor: data.nextCursor ?? null,
  };
}

export function useToolRunHistory(toolId: string | undefined) {
  const [dbRuns, setDbRuns] = React.useState<RunRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const nextCursorRef = React.useRef<string | null>(null);
  const initializedForToolRef = React.useRef<string | null>(null);

  // Load the first page on mount / tool change
  const fetchHistory = React.useCallback(async () => {
    if (!toolId) return;
    setLoading(true);
    try {
      const { runs, nextCursor } = await fetchPage(toolId, null);
      setDbRuns(runs);
      nextCursorRef.current = nextCursor;
      setHasMore(nextCursor !== null);
    } catch {
      // silent — network failures shouldn't break the UI
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  // Load the next page and append
  const loadMore = React.useCallback(async () => {
    if (!toolId || !nextCursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const { runs, nextCursor } = await fetchPage(toolId, nextCursorRef.current);
      setDbRuns((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const fresh = runs.filter((r) => !existingIds.has(r.id));
        return [...prev, ...fresh];
      });
      nextCursorRef.current = nextCursor;
      setHasMore(nextCursor !== null);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [toolId, loadingMore]);

  React.useEffect(() => {
    if (!toolId) return;
    if (initializedForToolRef.current === toolId) return;
    initializedForToolRef.current = toolId;
    fetchHistory();
  }, [toolId, fetchHistory]);

  /** Merge a completed live run into the DB list (replace if already present, otherwise prepend). */
  const mergeLiveRun = React.useCallback((run: RunRecord) => {
    setDbRuns((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.id === run.id ||
          r.id === run.serverRunId ||
          (run.serverRunId != null && r.serverRunId === run.serverRunId) ||
          r.serverRunId === run.id,
      );
      if (idx === -1) return [run, ...prev];
      const next = [...prev];
      const existing = next[idx];
      next[idx] = {
        ...existing,
        ...run,
        // Keep the DB id so subsequent history fetches stay consistent
        id: existing.id || run.serverRunId || run.id,
        serverRunId: run.serverRunId || existing.serverRunId || existing.id,
        logs: run.logs?.length ? run.logs : existing.logs,
        artifacts: run.artifacts ?? existing.artifacts,
        output: run.output !== undefined ? run.output : existing.output,
      };
      return next;
    });
  }, []);

  const deleteRun = React.useCallback(async (runId: string) => {
    setDbRuns((prev) => prev.filter((r) => r.id !== runId));
    try {
      const token = await fetchAuthToken();
      const res = await fetch(
        `${BACKEND_URL}/v1/tools/composite/runs/${encodeURIComponent(runId)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      fetchHistory();
    }
  }, [fetchHistory]);

  return { dbRuns, loading, loadingMore, hasMore, fetchHistory, loadMore, mergeLiveRun, deleteRun };
}
