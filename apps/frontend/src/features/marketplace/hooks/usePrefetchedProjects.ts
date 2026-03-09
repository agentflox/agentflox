"use client";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UsePrefetchedProjectsOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  query?: string;
  stage?: string;
  industry?: string[];
  location?: string;
}

export function usePrefetchedProjects(options: UsePrefetchedProjectsOptions) {
  const utils = trpc.useUtils();

  const listInput = useMemo(
    () => ({
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy as any,
      query: options.query?.trim() || undefined,
      stage: options.stage as any,
      industry: options.industry,
      location: options.location,
    }),
    [options]
  );

  const { data, isLoading, isFetching } = trpc.project.getPublicProjects.useQuery(listInput as any, {
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data?.items?.length === options.pageSize) {
      const nextInput = { ...listInput, page: options.page + 1 };
      utils.project.getPublicProjects.prefetch(nextInput as any);
    }
    if (options.page > 1) {
      const prevInput = { ...listInput, page: options.page - 1 };
      utils.project.getPublicProjects.prefetch(prevInput as any);
    }
  }, [utils, listInput, options.page, options.pageSize, data?.items?.length]);

  useEffect(() => {
    const baseInput = { ...listInput, page: 1 };
    utils.project.getPublicProjects.prefetch(baseInput as any);
    const secondInput = { ...listInput, page: 2 };
    utils.project.getPublicProjects.prefetch(secondInput as any);
  }, [
    utils,
    options.query,
    options.sortBy,
    options.stage,
    options.industry,
    options.location,
  ]);

  return { data, isLoading, isFetching, listInput };
}
