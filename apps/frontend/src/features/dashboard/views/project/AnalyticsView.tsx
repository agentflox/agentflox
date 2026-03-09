"use client"

import React, { useCallback, useMemo, useState } from "react";

type Props = {
  projectId: string;
};

const base = process.env.NEXT_PUBLIC_SERVER_URL;

export function AnalyticsView({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ fundingReadiness: number; advice: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    if (!base) {
      setError("Service URL is not configured");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${base}/v1/analytics/project/${projectId}/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || "Failed to compute analytics");
      }
      const data = await resp.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [base, projectId]);

  const runMatching = useCallback(async () => {
    if (!base) {
      setError("Service URL is not configured");
      return;
    }
    setError(null);
    try {
      await fetch(`${base}/v1/matching/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "full" }),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to trigger matching");
    }
  }, [base]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={compute}
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Computing..." : "Compute Analytics"}
        </button>
        <button
          onClick={runMatching}
          className="px-3 py-2 rounded bg-gray-800 text-white"
        >
          Run Matching
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {result && (
        <div className="rounded border p-4 space-y-2">
          <div className="font-semibold">Funding Readiness</div>
          <div className="text-2xl">
            {(result.fundingReadiness * 100).toFixed(0)}%
          </div>
          <div className="font-semibold pt-2">Advisor Notes</div>
          <pre className="whitespace-pre-wrap text-sm">{result.advice}</pre>
        </div>
      )}
    </div>
  );
}

