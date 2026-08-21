"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Play } from "lucide-react";
import { ActiveToggle } from "./ActiveToggle";
import { cn } from "@/lib/utils";

export function AgentCard({
  title,
  subtitle,
  avatar,
  color,
  active,
  recommended,
  warning,
  onToggle,
  onEdit,
  onRun,
  onClick,
}: {
  title: string;
  subtitle: string;
  avatar?: string | null;
  color?: string | null;
  active?: boolean;
  recommended?: boolean;
  warning?: string;
  onToggle?: (v: boolean) => void;
  onEdit?: () => void;
  onRun?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl p-3 min-h-[88px] bg-white",
        recommended ? "border border-dashed border-zinc-300" : "border border-zinc-200",
        warning && "border-amber-300 bg-amber-50/40",
        active && !warning && "border-violet-300 bg-violet-50/40",
      )}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {onEdit && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={onEdit} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onRun && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={onRun} title="Run">
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {onToggle && <ActiveToggle checked={!!active} onCheckedChange={onToggle} />}
      </div>
      <button type="button" className="text-left w-full pr-16 cursor-pointer" onClick={onClick}>
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 rounded-lg object-cover mb-2" />
        ) : (
          <div
            className="h-8 w-8 rounded-lg mb-2"
            style={{ background: color || "linear-gradient(to bottom right, #8b5cf6, #d946ef)" }}
          />
        )}
        <p className="text-sm font-medium text-zinc-900 truncate">{title}</p>
        <p className="text-xs text-zinc-500 truncate">{warning || subtitle}</p>
      </button>
    </div>
  );
}
