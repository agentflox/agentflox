"use client";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  resultCount: number;
  sortBy: string;
  sortOptions: Array<{ value: string; label: string }>;
  onSortChange: (value: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function Toolbar({
  resultCount,
  sortBy,
  sortOptions,
  onSortChange,
  isLoading,
  className,
}: ToolbarProps) {
  return (
    <div className={cn("flex items-center justify-between text-sm", className)}>
      <span className="text-muted-foreground">
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-16 animate-pulse rounded bg-muted" />
            <span>results</span>
          </span>
        ) : (
          <span>
            <strong>{resultCount.toLocaleString()}</strong> results
          </span>
        )}
      </span>
      <select
        className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        disabled={isLoading}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
