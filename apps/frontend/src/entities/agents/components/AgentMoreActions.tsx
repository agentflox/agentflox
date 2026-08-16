"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import {
  Copy,
  CopyPlus,
  Globe,
  MoreVertical,
  Power,
  PowerOff,
  Settings,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AgentMoreActionsAgent = {
  id: string;
  name: string;
  isActive?: boolean;
  status?: string;
};

type AgentMoreActionsProps = {
  agent: AgentMoreActionsAgent;
  onUpdated?: () => void | Promise<void>;
  /** Called after successful delete (e.g. navigate away / close modal) */
  onDeleted?: () => void;
  /** Optional: open settings from the same menu */
  onOpenSettings?: () => void;
  /** Optional: publish this agent to the marketplace */
  onPublish?: () => void;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
  /** Optional custom trigger; defaults to icon button */
  trigger?: React.ReactNode;
};

export function AgentMoreActions({
  agent,
  onUpdated,
  onDeleted,
  onOpenSettings,
  onPublish,
  triggerClassName,
  align = "end",
  trigger,
}: AgentMoreActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const utils = trpc.useUtils();

  const isActive =
    agent.isActive === true || agent.status === "ACTIVE";

  const cloneMutation = trpc.agent.clone.useMutation({
    onSuccess: async (cloned) => {
      toast.success(`Cloned as "${cloned.name}"`);
      await utils.agent.list.invalidate();
      await onUpdated?.();
      router.push(`/dashboard/agents/${cloned.id}`);
    },
    onError: (err) => toast.error(err.message || "Failed to clone agent"),
  });

  const activateMutation = trpc.agent.activate.useMutation({
    onSuccess: async () => {
      toast.success("Agent activated");
      await utils.agent.get.invalidate({ id: agent.id });
      await utils.agent.list.invalidate();
      await onUpdated?.();
    },
    onError: (err) => toast.error(err.message || "Failed to activate agent"),
  });

  const deactivateMutation = trpc.agent.deactivate.useMutation({
    onSuccess: async () => {
      toast.success("Agent deactivated");
      await utils.agent.get.invalidate({ id: agent.id });
      await utils.agent.list.invalidate();
      await onUpdated?.();
    },
    onError: (err) => toast.error(err.message || "Failed to deactivate agent"),
  });

  const deleteMutation = trpc.agent.delete.useMutation({
    onSuccess: async () => {
      toast.success("Agent deleted");
      await utils.agent.list.invalidate();
      onDeleted?.();
      if (!onDeleted) {
        router.push("/dashboard/agents");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to delete agent"),
  });

  const busy =
    cloneMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    deleteMutation.isPending;

  const handleCopyUrl = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/agents/${agent.id}`
        : `/dashboard/agents/${agent.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Agent URL copied");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy}
              className={cn(
                "h-8 w-8 border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40",
                triggerClassName,
              )}
            >
              <MoreVertical className="w-4 h-4" />
              <span className="sr-only">More options</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-52 p-1.5">
          <DropdownMenuItem
            onClick={handleCopyUrl}
            className="gap-2 rounded-md px-2 py-1.5 cursor-pointer"
          >
            <Copy className="w-4 h-4 text-zinc-500" />
            <span className="text-sm">Copy URL</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={cloneMutation.isPending}
            onClick={() => cloneMutation.mutate({ id: agent.id })}
            className="gap-2 rounded-md px-2 py-1.5 cursor-pointer"
          >
            <CopyPlus className="w-4 h-4 text-zinc-500" />
            <span className="text-sm">
              {cloneMutation.isPending ? "Cloning…" : "Clone"}
            </span>
          </DropdownMenuItem>
          {onOpenSettings && (
            <DropdownMenuItem
              onClick={onOpenSettings}
              className="gap-2 rounded-md px-2 py-1.5 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>
          )}
          {onPublish && (
            <DropdownMenuItem
              onClick={onPublish}
              className="gap-2 rounded-md px-2 py-1.5 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-zinc-500" />
              <span className="text-sm">Publish to Marketplace</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isActive ? (
            <DropdownMenuItem
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate({ agentId: agent.id })}
              className="gap-2 rounded-md px-2 py-1.5 cursor-pointer"
            >
              <PowerOff className="w-4 h-4 text-zinc-500" />
              <span className="text-sm">Deactivate</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate({ agentId: agent.id })}
              className="gap-2 rounded-md px-2 py-1.5 cursor-pointer"
            >
              <Power className="w-4 h-4 text-zinc-500" />
              <span className="text-sm">Activate</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="gap-2 rounded-md px-2 py-1.5 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Delete agent</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={agent.name}
        entityLabel="agent"
        requireConfirmText
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync({ id: agent.id });
        }}
      />
    </>
  );
}