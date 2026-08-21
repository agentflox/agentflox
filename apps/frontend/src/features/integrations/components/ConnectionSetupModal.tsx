"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ConnectionSetupContent } from "./ConnectionSetupContent";
import { ConnectionCompleteContent, type ConnectionFeature } from "./ConnectionCompleteContent";
import { connectIntegrationProvider } from "../lib/oauthPopup";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type ConnectionSetupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  displayName: string;
  features?: ConnectionFeature[];
  footerNote?: string;
  onConnected?: () => void;
};

type Step = "setup" | "complete";

export function ConnectionSetupModal({
  open,
  onOpenChange,
  provider,
  displayName,
  features,
  footerNote,
  onConnected,
}: ConnectionSetupModalProps) {
  const [step, setStep] = useState<Step>("setup");
  const [status, setStatus] = useState<"connecting" | "timeout" | "idle">("idle");
  const attemptedRef = useRef(false);

  const syncVault = trpc.integration.syncVault.useMutation();

  const startOAuth = useCallback(async () => {
    setStatus("connecting");
    const result = await connectIntegrationProvider(provider);
    if (result.ok) {
      await syncVault.mutateAsync().catch(() => undefined);
      toast.success(`${displayName} connected`);
      setStep("complete");
      setStatus("idle");
      onConnected?.();
    } else {
      setStatus("timeout");
    }
  }, [provider, displayName, syncVault, onConnected]);

  useEffect(() => {
    if (open && !attemptedRef.current) {
      attemptedRef.current = true;
      startOAuth();
    }
    if (!open) {
      attemptedRef.current = false;
      setStep("setup");
      setStatus("idle");
    }
  }, [open, startOAuth]);

  const handleRetry = useCallback(() => {
    startOAuth();
  }, [startOAuth]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-w-[640px] p-0 overflow-hidden"
        showCloseButton
      >
        <VisuallyHidden>
          <DialogTitle>
            {step === "setup"
              ? `Connect ${displayName}`
              : `${displayName} connected`}
          </DialogTitle>
        </VisuallyHidden>

        {/* Breadcrumb header */}
        <div className="flex items-center gap-1.5 px-5 pt-4 pb-2 text-xs text-zinc-500 border-b">
          <span className="text-zinc-400">App Center</span>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-600 font-medium">{displayName}</span>
          <span className="text-zinc-300">/</span>
          <span className="font-semibold text-zinc-800">
            {step === "setup" ? "Setup" : "Done"}
          </span>
        </div>

        {step === "setup" ? (
          <ConnectionSetupContent
            provider={provider}
            displayName={displayName}
            onRetry={handleRetry}
            onCancel={() => onOpenChange(false)}
            onNext={() => setStep("complete")}
            status={status}
          />
        ) : (
          <ConnectionCompleteContent
            provider={provider}
            displayName={displayName}
            features={features}
            onDone={() => onOpenChange(false)}
            footerNote={
              footerNote ??
              "Agentflox doesn't allow model providers to train on your data."
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
