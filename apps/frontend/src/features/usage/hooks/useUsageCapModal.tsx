"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UsageCapModal } from "@/features/usage/components/UsageCapModal";
import {
  isUsageCapPayload,
  USAGE_CAP_UPGRADE_URL,
  type UsageCapKind,
  type UsageCapPayload,
} from "@/features/usage/types";
import {
  messageForExecutionQuota,
  parseExecutionQuotaResponse,
  type ExecutionQuotaCategory,
  type ExecutionQuotaClientError,
} from "@/features/usage/utils/executionQuotaErrors";
import { emitUsageCap, registerUsageCapOpener } from "@/features/usage/utils/usageCapBridge";

type UsageCapContextValue = {
  openUsageCap: (payload: UsageCapPayload) => void;
  handleError: (error: unknown) => boolean;
  handleFetchResponse: (res: Response) => Promise<boolean>;
};

const UsageCapContext = createContext<UsageCapContextValue | null>(null);

function categoryToKind(category: ExecutionQuotaCategory): UsageCapKind {
  if (category === "SUBSCRIPTION") return "SUBSCRIPTION";
  if (category === "RATE") return "CONCURRENT";
  return "EXECUTION";
}

function payloadFromQuota(quota: ExecutionQuotaClientError): UsageCapPayload {
  const max = typeof quota.max === "number" ? quota.max : 0;
  const remaining = typeof quota.remaining === "number" ? quota.remaining : 0;
  const used =
    typeof quota.used === "number"
      ? quota.used
      : max >= 0 && remaining >= 0
        ? Math.max(0, max - remaining)
        : 0;
  return {
    code: "USAGE_CAP",
    kind: categoryToKind(quota.category),
    used,
    max,
    remaining,
    message: messageForExecutionQuota(quota.category, quota.message),
    upgradeUrl: quota.upgradeUrl || USAGE_CAP_UPGRADE_URL,
  };
}

function extractUsageCapFromTrpc(error: any): UsageCapPayload | null {
  const fromData = error?.data?.usageCap;
  if (isUsageCapPayload(fromData)) return fromData;

  const fromCause = error?.cause;
  if (isUsageCapPayload(fromCause)) return fromCause;

  const msg = String(error?.message ?? "");
  if (/plan limit|upgrade to continue|allows fewer/i.test(msg)) {
    return {
      code: "USAGE_CAP",
      kind: "PROJECT",
      used: 0,
      max: 0,
      remaining: 0,
      message: msg || "You have reached your plan limit.",
      upgradeUrl: USAGE_CAP_UPGRADE_URL,
    };
  }
  return null;
}

export function UsageCapProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<UsageCapPayload | null>(null);

  const openUsageCap = useCallback((next: UsageCapPayload) => {
    setPayload(next);
    setOpen(true);
  }, []);

  useEffect(() => {
    registerUsageCapOpener(openUsageCap);
    return () => registerUsageCapOpener(null);
  }, [openUsageCap]);

  const handleError = useCallback(
    (error: unknown) => {
      const cap = extractUsageCapFromTrpc(error);
      if (!cap) return false;
      openUsageCap(cap);
      return true;
    },
    [openUsageCap],
  );

  const handleFetchResponse = useCallback(
    async (res: Response) => {
      const quota = await parseExecutionQuotaResponse(res);
      if (!quota) return false;
      openUsageCap(payloadFromQuota(quota));
      return true;
    },
    [openUsageCap],
  );

  const value = useMemo(
    () => ({ openUsageCap, handleError, handleFetchResponse }),
    [openUsageCap, handleError, handleFetchResponse],
  );

  return (
    <UsageCapContext.Provider value={value}>
      {children}
      <UsageCapModal open={open} onOpenChange={setOpen} payload={payload} />
    </UsageCapContext.Provider>
  );
}

export function useUsageCapModal(): UsageCapContextValue {
  const ctx = useContext(UsageCapContext);
  if (!ctx) {
    return {
      openUsageCap: (payload) => {
        emitUsageCap(payload);
      },
      handleError: () => false,
      handleFetchResponse: async (res) => {
        const quota = await parseExecutionQuotaResponse(res);
        if (!quota) return false;
        return emitUsageCap(payloadFromQuota(quota));
      },
    };
  }
  return ctx;
}

/** Open the usage-cap modal from a failed fetch Response (402/429). */
export async function openUsageCapFromResponse(res: Response): Promise<boolean> {
  const quota = await parseExecutionQuotaResponse(res);
  if (!quota) return false;
  return emitUsageCap(payloadFromQuota(quota));
}
