"use client";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UsePrefetchedTeamsOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  query?: string;
  teamType?: string;
  industry?: string[];
  location?: string;
}

export function usePrefetchedTeams(options: UsePrefetchedTeamsOptions) {
  const utils = trpc.useUtils();

  const listInput = useMemo(
    () => ({
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy as any,
      query: options.query?.trim() || undefined,
      teamType: options.teamType as any,
      industry: options.industry,
      location: options.location,
    }),
    [options]
  );

  const { data, isLoading, isFetching } = trpc.team.getPublicTeams.useQuery(listInput as any, {
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data?.items?.length === options.pageSize) {
      const nextInput = { ...listInput, page: options.page + 1 };
      utils.team.getPublicTeams.prefetch(nextInput as any);
    }
    if (options.page > 1) {
      const prevInput = { ...listInput, page: options.page - 1 };
      utils.team.getPublicTeams.prefetch(prevInput as any);
    }
  }, [utils, listInput, options.page, options.pageSize, data?.items?.length]);

  useEffect(() => {
    const baseInput = { ...listInput, page: 1 };
    utils.team.getPublicTeams.prefetch(baseInput as any);
    const secondInput = { ...listInput, page: 2 };
    utils.team.getPublicTeams.prefetch(secondInput as any);
  }, [
    utils,
    options.query,
    options.sortBy,
    options.teamType,
    options.industry,
    options.location,
  ]);

  return { data, isLoading, isFetching, listInput };
}
