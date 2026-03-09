"use client";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UsePrefetchedProposalsOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  query?: string;
  industries?: string[];
  category?: string;
  country?: string;
  commitment?: string;
  urgency?: string;
  minFunding?: number;
  maxFunding?: number;
}

export function usePrefetchedProposals(options: UsePrefetchedProposalsOptions) {
  const utils = trpc.useUtils();

  const listInput = useMemo(
    () => ({
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy as any,
      query: options.query?.trim() || undefined,
      industries: options.industries,
      category: options.category as any,
      country: options.country,
      commitment: options.commitment as any,
      urgency: options.urgency as any,
      minFunding: options.minFunding,
      maxFunding: options.maxFunding,
    }),
    [options]
  );

  const { data, isLoading, isFetching } = trpc.proposal.getPublicProposals.useQuery(listInput, {
    staleTime: 30_000,
  });

  // Prefetch adjacent pages for instant navigation
  useEffect(() => {
    // Prefetch next page if current page is full
    if (data?.items?.length === options.pageSize) {
      const nextInput = { ...listInput, page: options.page + 1 };
      utils.proposal.getPublicProposals.prefetch(nextInput as any);
    }

    // Prefetch previous page if not on first page
    if (options.page > 1) {
      const prevInput = { ...listInput, page: options.page - 1 };
      utils.proposal.list.prefetch(prevInput as any);
    }
  }, [utils, listInput, options.page, options.pageSize, data?.items?.length]);

  // Prefetch first 2 pages when filters change
  useEffect(() => {
    const baseInput = { ...listInput, page: 1 };
    utils.proposal.list.prefetch(baseInput as any);
    
    const secondInput = { ...listInput, page: 2 };
    utils.proposal.list.prefetch(secondInput as any);
  }, [
    utils,
    options.query,
    options.sortBy,
    options.industries,
    options.category,
    options.country,
    options.commitment,
    options.urgency,
    options.minFunding,
    options.maxFunding,
    // Intentionally exclude page and listInput to only trigger on filter changes
  ]);

  return {
    data,
    isLoading,
    isFetching,
    listInput,
  };
}
