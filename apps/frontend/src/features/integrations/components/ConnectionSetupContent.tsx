"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowLeftRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationProviderIcon } from "./IntegrationProviderIcon";
import { cn } from "@/lib/utils";

export type ConnectionSetupContentProps = {
  provider: string;
  displayName: string;
  onRetry: () => void;
  onCancel: () => void;
  onNext: () => void;
  status: "connecting" | "timeout" | "idle";
};

export function ConnectionSetupContent({
  provider,
  displayName,
  onRetry,
  onCancel,
  onNext,
  status,
}: ConnectionSetupContentProps) {
  return (
    <div className="flex flex-col items-center px-8 py-10">
      {/* Logo pair */}
      <div className="flex items-center gap-3 mb-6">
        <span className="relative inline-block h-12 w-12">
          <Image
            src="/images/logo.png"
            alt="Agentflox"
            fill
            className="object-contain"
          />
        </span>
        <ArrowLeftRight className="h-5 w-5 text-zinc-400" />
        <span className="flex h-12 w-12 items-center justify-center">
          <IntegrationProviderIcon providerId={provider} size={42} />
        </span>
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 mb-6">
        Connection instructions:
      </h2>

      {/* Step: auth notice */}
      <div className="w-full max-w-lg mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 flex items-center gap-2">
        <Lock className="h-4 w-4 text-zinc-400 shrink-0" />
        Complete authorization in the browser tab we open, then Agentflox will
        continue automatically.
      </div>

      {/* Numbered steps */}
      <div className="w-full max-w-lg space-y-3 mb-6">
        <StepRow number={1}>
          {displayName} should open automatically on a new browser tab.
          <br />
          <span className="text-sm text-zinc-500">
            If it doesn&apos;t,{" "}
            <button
              type="button"
              className="text-violet-600 hover:underline cursor-pointer"
              onClick={onRetry}
            >
              click here to retry
            </button>
            .
          </span>
        </StepRow>
        <StepRow number={2}>
          Follow {displayName}&apos;s setup instructions.
        </StepRow>
        <StepRow number={3}>
          When you&apos;re done, return to Agentflox. We&apos;ll continue
          automatically.
        </StepRow>
      </div>

      {/* Timeout warning */}
      {status === "timeout" && (
        <div className="w-full max-w-lg mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-xs font-bold">
            !
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Connection timed out
            </p>
            <p className="text-sm text-red-700 mt-0.5">
              We didn&apos;t hear back from {displayName}. This can happen if
              the window was closed or the connection took too long. Please try
              again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-red-200 text-red-700 hover:bg-red-100 cursor-pointer"
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Footer actions */}
      <div className="w-full max-w-lg flex items-center justify-between">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="cursor-pointer bg-zinc-200 text-zinc-400 hover:bg-zinc-200"
          disabled={status !== "idle"}
          onClick={onNext}
        >
          Next &rsaquo;
        </Button>
      </div>
    </div>
  );
}

function StepRow({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-200 text-xs font-semibold text-zinc-500">
        {number}
      </span>
      <div className="text-sm text-zinc-800 leading-relaxed">{children}</div>
    </div>
  );
}
