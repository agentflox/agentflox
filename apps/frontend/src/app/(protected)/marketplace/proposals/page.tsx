"use client";
import Shell from "@/components/layout/Shell";
import { Header, Content } from "@/features/marketplace/views/shared";
import PublicProposalCard from "@/entities/proposals/components/PublicProposalCard";
import CardSkeleton from "@/components/ui/card.skeleton";
import { usePrefetchedProposals } from "@/features/marketplace/hooks/usePrefetchedProposals";
import React, { useState, useCallback } from "react";

import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';
import { SORT_OPTIONS } from "@/features/marketplace/constants";

export default function MarketplacePage() {
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [sortBy, setSortBy] = useState<"relevance" | "latest">("latest");
  const [query, setQuery] = useState("");

  const { data, isLoading, isFetching } = usePrefetchedProposals({
    page,
    pageSize,
    sortBy,
    query,
  });

  const handleSearchSubmit = useCallback(() => {
    setPage(1);
  }, []);

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-4">
          <Header
            searchValue={query}
            onSearchChange={setQuery}
            onSearchSubmit={handleSearchSubmit}
            navigateTo={MARKETPLACE_ROUTES.PROPOSALS_SEARCH}
          />

          <Content
            resultCount={data?.total ?? 0}
            sortBy={sortBy}
            sortOptions={SORT_OPTIONS}
            onSortChange={(value) => setSortBy(value as any)}
            isLoading={isLoading || isFetching}
            isEmpty={(data?.items?.length ?? 0) === 0}
            currentPage={page}
            hasNextPage={(data?.items?.length || 0) >= pageSize}
            hasPreviousPage={page > 1}
            onPageChange={setPage}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)
                : (data?.items ?? []).map((proposal: any) => (
                    <PublicProposalCard
                      key={proposal.id}
                      proposal={{
                        ...proposal,
                        projectId: proposal.projectId ?? undefined,
                        teamId: proposal.teamId ?? undefined,
                        createdAt: typeof proposal.createdAt === 'string' ? proposal.createdAt : proposal.createdAt?.toISOString?.() ?? '',
                        updatedAt: typeof proposal.updatedAt === 'string' ? proposal.updatedAt : proposal.updatedAt?.toISOString?.() ?? '',
                        user: proposal.user ? { ...proposal.user, name: proposal.user.name ?? '' } : undefined,
                      }}
                    />
                  ))}
            </div>
          </Content>
        </div>
      </div>
    </Shell>
  );
}
