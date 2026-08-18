"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Info, Link2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { ActiveToggle } from "./ActiveToggle";
import { LogicSummary } from "./LogicSummary";

function formatStamp(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function IconAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AutomationListItem({
  rule,
  onEdit,
}: {
  rule: any;
  onEdit: () => void;
}) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState(rule.description || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const update = trpc.automation.update.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });
  const remove = trpc.automation.delete.useMutation({
    onSuccess: () => {
      utils.automation.list.invalidate();
      toast.success("Automation deleted");
    },
  });
  const duplicate = trpc.automation.duplicate.useMutation({
    onSuccess: () => {
      utils.automation.list.invalidate();
      toast.success("Automation duplicated");
    },
  });
  const setActive = trpc.automation.setActive.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });

  useEffect(() => {
    setDescription(rule.description || "");
  }, [rule.description]);

  useEffect(() => {
    if (editingDesc) inputRef.current?.focus();
  }, [editingDesc]);

  const saveDescription = () => {
    setEditingDesc(false);
    const next = description.trim();
    if (next === (rule.description || "").trim()) return;
    update.mutate({ id: rule.id, description: next || null });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?automationId=${rule.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const triggerType = rule.triggers?.[0]?.triggerType;
  const actionType = Array.isArray(rule.actions) ? rule.actions[0]?.type : undefined;
  const mismatch = rule.kind === "AGENT" && rule.isActive && (!rule.aiAgent || !rule.aiAgent.isActive || rule.aiAgent.isPaused);
  const ownerName = rule.owner?.name || "Unknown";

  return (
    <div className="group relative px-4 py-3.5 hover:bg-zinc-50/80">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="text-left min-w-0 flex-1 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm text-zinc-900 truncate">{rule.name}</p>
            {mismatch && <span className="text-[10px] text-amber-700 shrink-0">Agent paused</span>}
          </div>
          <div className="mt-1.5">
            <LogicSummary triggerType={triggerType} actionType={actionType} />
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="hidden group-hover:flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Info"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-left space-y-0.5 px-3 py-2">
                <p>Created: {ownerName} • {formatStamp(rule.createdAt)}</p>
                <p>Updated: {ownerName} • {formatStamp(rule.updatedAt)}</p>
              </TooltipContent>
            </Tooltip>
            <IconAction label="Delete" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => remove.mutate({ id: rule.id })}>
              <Trash2 className="h-4 w-4" />
            </IconAction>
            <IconAction label="Duplicate automation rule" onClick={() => duplicate.mutate({ id: rule.id })}>
              <Copy className="h-4 w-4" />
            </IconAction>
            <IconAction label="Copy link" onClick={copyLink}>
              <Link2 className="h-4 w-4" />
            </IconAction>
            <IconAction label="Edit automation rule" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </IconAction>
          </div>
          <ActiveToggle
            checked={rule.isActive}
            onCheckedChange={(v) => setActive.mutate({ id: rule.id, isActive: v })}
          />
        </div>
      </div>

      <div className="mt-2">
        {editingDesc ? (
          <Input
            ref={inputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDescription();
              if (e.key === "Escape") {
                setDescription(rule.description || "");
                setEditingDesc(false);
              }
            }}
            placeholder="Enter description..."
            className="h-8 text-xs bg-zinc-50"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingDesc(true);
            }}
            className="inline-flex max-w-full text-left text-xs text-zinc-400 rounded-md px-2 py-1.5 -ml-2 border border-transparent hover:border-zinc-200 hover:bg-white cursor-pointer"
          >
            <span className="truncate">{rule.description || "Enter description..."}</span>
          </button>
        )}
      </div>
    </div>
  );
}
