"use client";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UsePrefetchedProfilesOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  query?: string;
  skills?: string[];
  country?: string;
  commitment?: string;
}

export function usePrefetchedProfiles(options: UsePrefetchedProfilesOptions) {
  const utils = trpc.useUtils();

  const listInput = useMemo(
    () => ({
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy as any,
      query: options.query?.trim() || undefined,
      skills: options.skills,
      country: options.country,
      commitment: options.commitment as any,
    }),
    [options]
  );

  const { data, isLoading, isFetching } = trpc.profile.getPublicProfiles.useQuery(listInput as any, {
    staleTime: 30_000
  });

  useEffect(() => {
    if (data?.items?.length === options.pageSize) {
      const nextInput = { ...listInput, page: options.page + 1 };
      utils.profile.getPublicProfiles.prefetch(nextInput as any);
    }
    if (options.page > 1) {
      const prevInput = { ...listInput, page: options.page - 1 };
      utils.profile.getPublicProfiles.prefetch(prevInput as any);
    }
  }, [utils, listInput, options.page, options.pageSize, data?.items?.length]);

  useEffect(() => {
    const baseInput = { ...listInput, page: 1 };
    utils.profile.getPublicProfiles.prefetch(baseInput as any);
    const secondInput = { ...listInput, page: 2 };
    utils.profile.getPublicProfiles.prefetch(secondInput as any);
  }, [
    utils,
    options.query,
    options.sortBy,
    options.skills,
    options.country,
    options.commitment,
  ]);

  return { data, isLoading, isFetching, listInput };
}
