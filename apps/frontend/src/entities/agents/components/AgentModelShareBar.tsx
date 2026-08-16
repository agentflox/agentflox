"use client";

import { Button } from "@/components/ui/button";
import { ModelSelectDropdown } from "@/entities/models/components/ModelSelectDropdown";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";

type AgentModelShareBarProps = {
  agentId: string;
  modelId?: string | null;
  onUpdated?: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  /** Taller controls for settings headers */
  size?: "sm" | "md";
  /** Optional close control shown after Share (e.g. collapse agent profile). */
  onClose?: () => void;
};

export function AgentModelShareBar({
  agentId,
  modelId,
  onUpdated,
  disabled,
  className,
  size = "sm",
  onClose,
}: AgentModelShareBarProps) {
  const utils = trpc.useUtils();
  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: async () => {
      await utils.agent.get.invalidate({ id: agentId });
      await onUpdated?.();
    },
    onError: (err) => toast.error(err.message || "Failed to update agent model"),
  });

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/agents/${agentId}`
        : `/dashboard/agents/${agentId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Agent link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const btnH = size === "md" ? "h-10" : "h-9";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <ModelSelectDropdown
        modelId={modelId ?? null}
        disabled={disabled || updateAgent.isPending}
        className={cn(btnH, "rounded-xl")}
        onModelChange={(id) => {
          updateAgent.mutate({ id: agentId, modelId: id } as any);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={handleShare}
        className={cn(
          "gap-1.5 px-2.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium rounded-xl",
          btnH,
        )}
      >
        <UserPlus className="h-4 w-4" />
        <span className="text-sm">Share</span>
      </Button>
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close agent profile"
          className={cn(
            "rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800",
            btnH,
            "w-9",
          )}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
