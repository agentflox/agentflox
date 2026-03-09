
"use client";
import Shell from "@/components/layout/Shell";
import { Header, Content } from "@/features/marketplace/views/shared";
import PublicProposalCard from "@/entities/proposals/components/PublicProposalCard";
import CardSkeleton from "@/components/ui/card.skeleton";
import ProposalFilterSidebar from "@/features/marketplace/components/ProposalFilterSidebar";
import { X } from "lucide-react";
import { usePrefetchedProposals } from "@/features/marketplace/hooks/usePrefetchedProposals";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS } from '@/features/marketplace/constants';

export default function SearchResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [filters, setFilters] = useState({
    industries: [] as string[],
    country: undefined as string | undefined,
    commitment: undefined as any,
    urgency: undefined as any,
    minFunding: undefined as number | undefined,
    maxFunding: undefined as number | undefined,
  });
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"relevance" | "latest">("latest");
  const [showFilters, setShowFilters] = useState(false);

  // Optimized data fetching with prefetching
  const { data, isLoading, isFetching } = usePrefetchedProposals({
    page,
    pageSize,
    sortBy,
    query,
    industries: filters.industries,
    category,
    country: filters.country,
    commitment: filters.commitment,
    urgency: filters.urgency,
    minFunding: filters.minFunding,
    maxFunding: filters.maxFunding,
  });

  // Hydrate from URL on mount
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const inds = (searchParams.get("industries") || "").split(",").filter(Boolean);
    const country = searchParams.get("country") || undefined;
    const commitment = searchParams.get("commitment") || undefined;
    const urgency = searchParams.get("urgency") || undefined;
    const minFunding = searchParams.get("minFunding");
    const maxFunding = searchParams.get("maxFunding");
    const sort = (searchParams.get("sort") as any) || "latest";
    const p = Number(searchParams.get("page") || 1);

    setQuery(q);
    setFilters({
      industries: inds,
      country,
      commitment: commitment as any,
      urgency: urgency as any,
      minFunding: minFunding ? Number(minFunding) : undefined,
      maxFunding: maxFunding ? Number(maxFunding) : undefined,
    });
    setSortBy(sort);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (filters.industries.length) params.set("industries", filters.industries.join(","));
    if (filters.country) params.set("country", filters.country);
    if (filters.commitment) params.set("commitment", String(filters.commitment));
    if (filters.urgency) params.set("urgency", String(filters.urgency));
    if (filters.minFunding != null) params.set("minFunding", String(filters.minFunding));
    if (filters.maxFunding != null) params.set("maxFunding", String(filters.maxFunding));
    if (sortBy) params.set("sort", sortBy);
    if (page !== 1) params.set("page", String(page));

    const url = `/search/results${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(url, { scroll: false });
  }, [query, filters, sortBy, page, router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [query, filters.industries, filters.country, filters.commitment, filters.urgency, filters.minFunding, filters.maxFunding, sortBy]);

  // Build filter chips
  const filterChips = React.useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (query) {
      chips.push({
        id: "query",
        label: `q: ${query}`,
        onRemove: () => setQuery(""),
      });
    }

    filters.industries.forEach((ind) => {
      chips.push({
        id: `industry-${ind}`,
        label: ind,
        onRemove: () =>
          setFilters((f) => ({ ...f, industries: f.industries.filter((x) => x !== ind) })),
      });
    });

    if (filters.country) {
      chips.push({
        id: "country",
        label: `country: ${filters.country}`,
        onRemove: () => setFilters((f) => ({ ...f, country: undefined })),
      });
    }

    if (filters.commitment) {
      chips.push({
        id: "commitment",
        label: `commitment: ${String(filters.commitment)}`,
        onRemove: () => setFilters((f) => ({ ...f, commitment: undefined })),
      });
    }

    if (filters.urgency) {
      chips.push({
        id: "urgency",
        label: `urgency: ${String(filters.urgency)}`,
        onRemove: () => setFilters((f) => ({ ...f, urgency: undefined })),
      });
    }

    if (filters.minFunding != null || filters.maxFunding != null) {
      chips.push({
        id: "funding",
        label: `funding: ${filters.minFunding ?? 0} - ${filters.maxFunding ?? "∞"}`,
        onRemove: () =>
          setFilters((f) => ({ ...f, minFunding: undefined, maxFunding: undefined })),
      });
    }

    return chips;
  }, [query, filters]);

  const handleClearAll = useCallback(() => {
    setQuery("");
    setFilters({
      industries: [],
      country: undefined,
      commitment: undefined,
      urgency: undefined,
      minFunding: undefined,
      maxFunding: undefined,
    });
  }, []);

  const handleFilterChange = useCallback((next: any) => {
    setFilters({
      industries: next.industries || [],
      country: next.country,
      commitment: next.commitment,
      urgency: next.urgency,
      minFunding: next.minFunding,
      maxFunding: next.maxFunding,
    });
  }, []);

  const toggleFilters = useCallback((open: boolean) => {
    setShowFilters(open);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(open ? "filters:mobile:open" : "filters:mobile:close")
      );
    }
  }, []);

  return (
    <Shell>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_var(--filter-sidebar-width,_18rem)] gap-0">
        <div className="order-2 lg:order-1 flex-1 lg:pr-4">
          <div className="space-y-4">
            <Header
              searchValue={query}
              onSearchChange={setQuery}
              onSearchSubmit={() => setPage(1)}
              showFilterButton
              onFilterClick={() => toggleFilters(true)}
            />

            <Content
              resultCount={data?.total ?? 0}
              sortBy={sortBy}
              sortOptions={SORT_OPTIONS}
              onSortChange={(value) => setSortBy(value as any)}
              filterChips={filterChips}
              onClearAllFilters={handleClearAll}
              isLoading={isLoading || isFetching}
              isEmpty={(data?.items?.length ?? 0) === 0}
              currentPage={page}
              hasNextPage={(data?.items?.length || 0) >= pageSize}
              hasPreviousPage={page > 1}
              onPageChange={setPage}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {isLoading
                  ? Array.from({ length: 9 }).map((_, i) => (
                      <CardSkeleton key={i} />
                    ))
                  : (data?.items || []).map((proposal: any) => (
                      <PublicProposalCard 
                        key={proposal.id} 
                        proposal={proposal} 
                      />
                    ))}
              </div>
            </Content>
          </div>
        </div>

        {/* Desktop Filter Sidebar */}
        <div className="order-1 lg:order-2 hidden lg:block">
          <ProposalFilterSidebar values={filters} onChange={handleFilterChange} />
        </div>

        {/* Mobile Filter Overlay */}
        {showFilters && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
              onClick={() => toggleFilters(false)}
            />
            <div className="fixed inset-y-0 right-0 z-[60] w-auto min-w-[16rem] bg-background shadow-xl lg:hidden">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-medium">Filters</span>
                <button
                  className="rounded-md border p-1.5 hover:bg-muted"
                  onClick={() => toggleFilters(false)}
                  aria-label="Close filters"
                >
                  <X size={18} />
                </button>
              </div>
              <ProposalFilterSidebar
                isOverlay
                values={filters}
                onChange={handleFilterChange}
              />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
