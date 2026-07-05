"use client";

import { useRouter } from "next/navigation";
import { ReactNode, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

type HeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  navigateTo?: string;
  showFilterButton?: boolean;
  onFilterClick?: () => void;
};

export function Header({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  navigateTo,
  showFilterButton,
  onFilterClick,
}: HeaderProps) {
  const router = useRouter();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (navigateTo) {
      const url = new URL(navigateTo, window.location.origin);
      const params = new URLSearchParams(url.search);
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      const queryString = params.toString();
      const target =
        url.pathname + (queryString ? `?${queryString}` : "");
      router.push(target);
    }

    onSearchSubmit();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            Search public proposals and discover new opportunities.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search proposals by title, keywords, or description..."
          />
        </div>

        <div className="flex items-center gap-2">
          {showFilterButton && onFilterClick && (
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap"
              onClick={onFilterClick}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          )}
          <Button type="submit" className="whitespace-nowrap">
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}

type SortOption = {
  value: string;
  label: string;
};

type FilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type ContentProps = {
  resultCount: number;
  sortBy: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  filterChips?: FilterChip[];
  onClearAllFilters?: () => void;
  isLoading: boolean;
  isEmpty: boolean;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  children: ReactNode;
};

export function Content(props: ContentProps) {
  const {
    resultCount,
    sortBy,
    sortOptions,
    onSortChange,
    filterChips,
    onClearAllFilters,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    onPageChange,
    children,
  } = props;

  const hasFilters = (filterChips?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {resultCount.toLocaleString()} result
          {resultCount === 1 ? "" : "s"}
        </p>

        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filterChips!.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              className="group inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span>{chip.label}</span>
            </button>
          ))}
          {onClearAllFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClearAllFilters}
              className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {children}

      <div className="pt-2">
        <Pagination
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={onPageChange}
          isLoading={false}
        />
      </div>
    </div>
  );
}

