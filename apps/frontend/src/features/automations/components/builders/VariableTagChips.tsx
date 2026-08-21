"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const ALL_TAGS = [
  "Task ID",
  "Task Name",
  "Task Description",
  "Creator Username",
  "Assignee",
  "Due Date",
  "Start Date",
  "Priority",
  "Status",
  "List Name",
  "Space Name",
  "Project Name",
  "Workspace Name",
  "Task URL",
  "Task Type",
  "Tags",
  "Time Estimate",
  "Custom Field",
  "Comment Text",
  "Checklist Name",
  "Subtask Count",
  "Watcher Count",
  "Created Date",
  "Updated Date",
  "Folder Name",
  "Team Name",
  "Assignee Email",
  "Creator Email",
  "Task Archived",
] as const;

export function VariableTagChips({
  onInsert,
  maxVisible = 4,
  className,
}: {
  onInsert: (tag: string) => void;
  maxVisible?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ALL_TAGS : ALL_TAGS.slice(0, maxVisible);
  const remaining = ALL_TAGS.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1.5 mt-1.5", className)}>
      {visible.map((tag) => (
        <button
          key={tag}
          type="button"
          className="inline-flex h-6 items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer transition-colors"
          onClick={() => onInsert(tag)}
        >
          {tag}
        </button>
      ))}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          className="inline-flex h-6 items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          + {remaining}
        </button>
      )}
    </div>
  );
}

export function insertVariable(current: string, tag: string): string {
  const variable = `{{${tag.toLowerCase().replace(/\s+/g, "_")}}}`;
  return current ? `${current} ${variable}` : variable;
}
