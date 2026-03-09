"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  isLoading,
  className,
}: PaginationProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <button
        className={cn(
          "flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors",
          "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        )}
        disabled={!hasPreviousPage || isLoading}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Page <strong>{currentPage}</strong>
          {totalPages && <span> of {totalPages}</span>}
        </span>
        {isLoading && <span className="text-xs italic">(loading...)</span>}
      </div>

      <button
        className={cn(
          "flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors",
          "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        )}
        disabled={!hasNextPage || isLoading}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
