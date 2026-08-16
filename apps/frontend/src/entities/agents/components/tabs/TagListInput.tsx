"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
interface TagListInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
export function TagListInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  disabled,
  className,
}: TagListInputProps) {
  const [draft, setDraft] = useState("");
  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setDraft("");
  };
  return (
    <div
      className={cn(
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      <div className="flex flex-wrap gap-1.5 mb-1.5 empty:mb-0">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
          >
            {tag}
            <button
              type="button"
              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          }
          if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
        className="h-8 rounded-xl border border-zinc-200 shadow-none focus-visible:ring-0 px-2.5 text-sm"
      />
    </div>
  );
}