"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TriggerEntityScope = "ALL" | "TASK" | "SUBTASK";

const OPTIONS: Array<{ value: TriggerEntityScope; label: string }> = [
  { value: "ALL", label: "Tasks or subtasks" },
  { value: "TASK", label: "Tasks" },
  { value: "SUBTASK", label: "Subtasks" },
];

export function TriggerEntityScopePicker({
  value,
  onChange,
}: {
  value: TriggerEntityScope;
  onChange: (value: TriggerEntityScope) => void;
}) {
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 h-7 rounded-md border border-zinc-200",
            "bg-zinc-50 px-2.5 text-sm font-medium text-zinc-600",
            "hover:bg-zinc-100 cursor-pointer",
          )}
        >
          {selected.label}
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 mt-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            className="text-sm cursor-pointer"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
