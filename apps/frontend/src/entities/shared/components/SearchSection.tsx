"use client";
import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchSectionProps {
  searchValue: string;
  searchPlaceholder?: string;
  resultsCount?: number;
  sortBy?: string;
  sortOptions?: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSortChange?: (value: string) => void;
  onCreateNew: () => void;
  onFilterToggle?: () => void;
  createButtonText?: string;
  showFilters?: boolean;
  showSort?: boolean;
  children?: React.ReactNode;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  searchValue,
  searchPlaceholder = "Search...",
  resultsCount = 0,
  sortBy,
  sortOptions = [
    { value: "latest", label: "Latest First" },
    { value: "relevance", label: "Most Relevant" },
    { value: "oldest", label: "Oldest First" },
  ],
  onSearchChange,
  onSearchSubmit,
  onSortChange,
  onCreateNew,
  onFilterToggle,
  createButtonText = "Create New",
  showFilters = true,
  showSort = true,
  children,
}) => {
  return (
    <div className="py-6">
      <div className="flex flex-col gap-4">
        {/* Search Bar and Filter Button Row */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
                placeholder={searchPlaceholder}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {children && (
            <div className="flex items-center gap-3">
              {children}
            </div>
          )}

          {/* Mobile Filter Button - Next to Search */}
          {showFilters && onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 lg:hidden"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="hidden sm:inline">Filters</span>
            </button>
          )}
        </div>

        {/* Results Count and Sort Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-500">
              {resultsCount.toLocaleString()} {resultsCount === 1 ? "result" : "results"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            {showSort && onSortChange && (
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="h-9 cursor-pointer appearance-none rounded-md border border-zinc-200 bg-white pl-3 pr-8 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 focus:border-zinc-800 focus:outline-none focus:ring-0 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
