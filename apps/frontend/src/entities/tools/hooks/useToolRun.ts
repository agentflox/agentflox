"use client";
import React from "react";
import { BACKEND_URL } from "@/hooks/useSSEStream";
import { fetchAuthToken } from "@/utils/backend-request";
import { useToast } from "@/hooks/useToast";
import type { BuilderInputField } from "@/entities/tools/types/builder";
import { getSocket } from "@/lib/socket";
import { useUsageCapModal } from "@/features/usage/hooks/useUsageCapModal";
import { formatUserFacingErrorMessage } from "@/entities/models/utils/formatModelError";

export type RunLogEntry = {
  type: "thinking" | "token" | "complete" | "error";
  content: string;
  ts: number;
  nodeId?: string;
  payload?: any;
  phase?: "start" | "complete" | "error";
};
export type RunRecord = {
  id: string;
  serverRunId?: string;
  startedAt: number;
  finishedAt?: number;
  status: "running" | "success" | "error" | "cancelled";
  input: Record<string, unknown>;
  logs: RunLogEntry[];
  output?: any;
  error?: string;
  artifacts?: any[];
};
export type NodeRunState = { status: "running" | "success" | "error"; output?: any };

export function useToolRun({ initialTool, inputs }: { initialTool: any; inputs: BuilderInputField[] }) {
  const { toast } = useToast();
  const { handleFetchResponse } = useUsageCapModal();
  const [isRunningTool, setIsRunningTool] = React.useState(false);
  const [runHistory, setRunHistory] = React.useState<RunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [runInput, setRunInput] = React.useState<Record<string, string>>({});
  const [liveRunState, setLiveRunState] = React.useState<Record<string, NodeRunState>>({});
  const liveRunStateRef = React.useRef(liveRunState);
  liveRunStateRef.current = liveRunState;
  const selectedRun = runHistory.find((r) => r.id === selectedRunId) ?? null;
  const activeServerRunIdRef = React.useRef<string | null>(null);
  const cleanupSocketRef = React.useRef<(() => void) | null>(null);
  /** Client run ids that were cancelled — ignore late socket events for these. */
  const cancelledRunIdsRef = React.useRef<Set<string>>(new Set());
  const activeClientRunIdRef = React.useRef<string | null>(null);

  const runCompositeTool = React.useCallback(
    async (options?: {
      startStepId?: string;
      endStepId?: string;
      input?: Record<string, unknown>;
      onRunStart?: () => void;
    }) => {
      if (!initialTool?.id) {
        toast({
          title: "Save tool first",
          description: "Please save this tool before running it.",
          variant: "destructive",
        });
        return;
      }

      if (isRunningTool) return;

      // Prefer explicit rerun input; otherwise typed run values + field defaults.
      let resolvedInput: Record<string, unknown> = {};
      if (options?.input && typeof options.input === "object") {
        resolvedInput = { ...options.input };
      } else {
        for (const field of inputs) {
          if (!field.name) continue;
          const typed = runInput[field.name];
          if (typed !== undefined && typed !== null && String(typed) !== "") {
            resolvedInput[field.name] = typed;
            continue;
          }
          if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== "") {
            resolvedInput[field.name] = field.defaultValue;
          }
        }

        for (const [key, value] of Object.entries(runInput)) {
          if (!key || key in resolvedInput) continue;
          if (value !== undefined && value !== null && value !== "") {
            resolvedInput[key] = value;
          }
        }
      }

      const missingRequired = inputs
        .filter((field) => field.required && field.name && !(field.name in resolvedInput))
        .map((field) => field.label || field.name);

      if (missingRequired.length > 0) {
        toast({
          title: "Missing required inputs",
          description: `Please fill: ${missingRequired.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Safety: generated Python often does params['pdf_file_url'] — surface a clear error
      // if the form has no schema fields but the user also typed nothing.
      if (Object.keys(resolvedInput).length === 0 && inputs.length === 0) {
        toast({
          title: "No inputs configured",
          description: "Add tool inputs (or Save the tool) before running.",
          variant: "destructive",
        });
        return;
      }

      const runId = crypto.randomUUID();
      const newRecord: RunRecord = {
        id: runId,
        startedAt: Date.now(),
        status: "running",
        input: resolvedInput,
        logs: [],
      };
      cancelledRunIdsRef.current.delete(runId);
      activeClientRunIdRef.current = runId;
      setRunHistory((prev) => [newRecord, ...prev]);
      setSelectedRunId(runId);
      setIsRunningTool(true);
      setLiveRunState({
        outputs: { status: "running" }
      });

      if (options?.onRunStart) {
        options.onRunStart();
      }

      const isCancelled = () => cancelledRunIdsRef.current.has(runId);

      const appendLog = (entry: RunLogEntry) => {
        if (isCancelled()) return;
        setRunHistory((prev) =>
          prev.map((r) => {
            if (r.id !== runId) return r;
            if (r.status === "cancelled") return r;
            // Dedupe thinking events for the same step + phase (Inngest replay safety net)
            if (entry.type === "thinking" && entry.nodeId && entry.phase) {
              const withoutDup = r.logs.filter(
                (l) =>
                  !(
                    l.type === "thinking" &&
                    l.nodeId === entry.nodeId &&
                    (l.phase === entry.phase ||
                      (!l.phase &&
                        entry.phase === "complete" &&
                        l.content?.toLowerCase().includes("completed")))
                  ),
              );
              return { ...r, logs: [...withoutDup, entry] };
            }
            return { ...r, logs: [...r.logs, entry] };
          })
        );
      };

      try {
        const token = await fetchAuthToken();
        const res = await fetch(
          `${BACKEND_URL}/v1/tools/composite/${encodeURIComponent(initialTool.id)}/run`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              input: resolvedInput,
              ...(options?.startStepId ? { startStepId: options.startStepId } : {}),
              ...(options?.endStepId ? { endStepId: options.endStepId } : {}),
            }),
          }
        );

        if (!res.ok) {
          if (await handleFetchResponse(res)) {
            throw new Error("Execution limit reached");
          }
          const text = await res.text();
          let message = text;
          try { const p = JSON.parse(text); message = p?.message || p?.error || text; } catch { }
          throw new Error(message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const serverRunId = data.runId;

        if (!serverRunId) {
          throw new Error("Server did not return a run ID");
        }

        activeServerRunIdRef.current = serverRunId;
        setRunHistory((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, serverRunId } : r))
        );

        // WebSockets streaming
        const socket = getSocket();
        if (!socket) {
          throw new Error("Real-time connection is not established");
        }

        const handleToolLog = (ev: any) => {
          if (ev.runId !== serverRunId) return;
          if (isCancelled()) return;
          const ts = Date.now();
          if (ev.type === "thinking") {
            appendLog({
              type: "thinking",
              content: ev.content || "",
              ts,
              nodeId: ev.stepId,
              payload: ev.payload,
              phase: ev.phase,
            });
            if (ev.stepId) {
              setLiveRunState((prev) => {
                if (isCancelled()) return prev;
                const contentStr = (ev.content || "");
                const isDone =
                  ev.phase === "complete" || contentStr.toLowerCase().includes("completed");
                const isError = ev.phase === "error";
                return {
                  ...prev,
                  [ev.stepId]: {
                    status: isError ? "error" : isDone ? "success" : "running",
                    output: ev.payload !== undefined ? ev.payload : prev[ev.stepId]?.output,
                  },
                };
              });
            }
          } else if (ev.type === "token") {
            appendLog({ type: "token", content: ev.content || "", ts });
          }
        };

        const handleToolComplete = (ev: any) => {
          if (ev.runId !== serverRunId) return;
          if (isCancelled()) return;
          let finalOutput = ev.result ?? ev.payload;
          if (finalOutput === undefined || finalOutput === null) {
            const stepEntries = Object.entries(liveRunStateRef.current).filter(
              ([key]) => key !== "outputs",
            );
            for (let i = stepEntries.length - 1; i >= 0; i--) {
              const stepState = stepEntries[i]?.[1];
              if (stepState?.status === "success" && stepState.output !== undefined) {
                finalOutput = stepState.output;
                break;
              }
            }
          }
          const ts = Date.now();
          const artifacts =
            Array.isArray(ev.artifacts) ? ev.artifacts
              : Array.isArray((finalOutput as any)?.artifacts) ? (finalOutput as any).artifacts
                : undefined;

          appendLog({
            type: "complete",
            content:
              typeof finalOutput === "string"
                ? finalOutput
                : JSON.stringify(finalOutput ?? null, null, 2),
            ts,
          });
          setLiveRunState((prev) => ({
            ...prev,
            outputs: { status: "success", output: finalOutput },
          }));

          setRunHistory((prev) =>
            prev.map((r) =>
              r.id === runId && r.status === "running"
                ? {
                    ...r,
                    status: "success",
                    finishedAt: Date.now(),
                    output: finalOutput,
                    artifacts,
                  }
                : r
            )
          );

          setIsRunningTool(false);
          activeServerRunIdRef.current = null;
          activeClientRunIdRef.current = null;
          cleanupSocket();
        };

        const handleToolError = (ev: any) => {
          if (ev.runId !== serverRunId) return;
          if (isCancelled()) return;
          const message = formatUserFacingErrorMessage(
            { message: ev.message, code: ev.code, kind: ev.kind },
            "Unknown error"
          );
          const ts = Date.now();
          const cancelled = /cancel/i.test(message);

          appendLog({ type: "error", content: message, ts });
          setLiveRunState((prev) => ({
            ...prev,
            outputs: { status: "error", output: message }
          }));

          setRunHistory((prev) =>
            prev.map((r) =>
              r.id === runId && r.status === "running"
                ? {
                    ...r,
                    status: cancelled ? "cancelled" : "error",
                    finishedAt: Date.now(),
                    error: message,
                  }
                : r
            )
          );

          setIsRunningTool(false);
          activeServerRunIdRef.current = null;
          activeClientRunIdRef.current = null;
          cleanupSocket();
        };

        const cleanupSocket = () => {
          socket.off('tool:log', handleToolLog);
          socket.off('tool:complete', handleToolComplete);
          socket.off('tool:error', handleToolError);
          socket.emit('tool:unsubscribe-logs', { runId: serverRunId });
          cleanupSocketRef.current = null;
        };
        cleanupSocketRef.current = cleanupSocket;

        socket.on('tool:log', handleToolLog);
        socket.on('tool:complete', handleToolComplete);
        socket.on('tool:error', handleToolError);

        socket.emit('tool:subscribe-logs', { runId: serverRunId });

      } catch (err: any) {
        appendLog({ type: "error", content: err?.message || "Failed to start tool execution.", ts: Date.now() });
        setRunHistory((prev) =>
          prev.map((r) =>
            r.id === runId ? { ...r, status: "error", finishedAt: Date.now(), error: err?.message } : r
          )
        );
        setLiveRunState((prev) => ({
          ...prev,
          outputs: { status: "error", output: err?.message }
        }));
        setIsRunningTool(false);
        activeServerRunIdRef.current = null;
        activeClientRunIdRef.current = null;
      }
    },
    [initialTool?.id, inputs, runInput, toast, isRunningTool, handleFetchResponse],
  );

  const cancelCompositeTool = React.useCallback(async () => {
    const clientRunId = activeClientRunIdRef.current;
    const serverRunId =
      activeServerRunIdRef.current ||
      runHistory.find((r) => r.id === clientRunId)?.serverRunId ||
      runHistory.find((r) => r.status === "running")?.serverRunId ||
      runHistory.find((r) => r.id === selectedRunId)?.serverRunId ||
      null;

    // Mark cancelled first so in-flight socket handlers no-op immediately.
    if (clientRunId) cancelledRunIdsRef.current.add(clientRunId);
    for (const r of runHistory) {
      if (r.status === "running") cancelledRunIdsRef.current.add(r.id);
    }

    // Tear down live stream before awaiting network so UI stops updating.
    cleanupSocketRef.current?.();
    cleanupSocketRef.current = null;
    activeServerRunIdRef.current = null;
    activeClientRunIdRef.current = null;

    const cancelMessage = "Run cancelled by user";
    const finishedAt = Date.now();

    setRunHistory((prev) =>
      prev.map((r) => {
        const match =
          r.status === "running" ||
          (serverRunId != null && r.serverRunId === serverRunId) ||
          (clientRunId != null && r.id === clientRunId);
        if (!match) return r;
        return {
          ...r,
          status: "cancelled" as const,
          finishedAt,
          error: r.error || cancelMessage,
          logs: [
            ...r.logs,
            {
              type: "error" as const,
              content: cancelMessage,
              ts: finishedAt,
            },
          ],
        };
      }),
    );

    setLiveRunState((prev) => {
      const next: Record<string, NodeRunState> = {};
      for (const [key, value] of Object.entries(prev)) {
        next[key] =
          value.status === "running"
            ? { ...value, status: "error", output: value.output ?? cancelMessage }
            : value;
      }
      next.outputs = { status: "error", output: cancelMessage };
      return next;
    });
    setIsRunningTool(false);

    if (serverRunId) {
      try {
        const token = await fetchAuthToken();
        await fetch(
          `${BACKEND_URL}/v1/tools/composite/runs/${encodeURIComponent(serverRunId)}/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
      } catch {
        // Best-effort; UI already stopped
      }
    }

    toast({
      title: "Run cancelled",
      description: "The tool execution was stopped.",
    });
  }, [runHistory, selectedRunId, toast]);

  return {
    isRunningTool,
    runHistory,
    setRunHistory,
    selectedRunId,
    setSelectedRunId,
    runInput,
    setRunInput,
    selectedRun,
    runCompositeTool,
    cancelCompositeTool,
    liveRunState,
  };
}
